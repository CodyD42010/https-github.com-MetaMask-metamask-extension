import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import madge from 'madge';
import { BASE_DIRECTORY, ENTRYPOINT_PATTERNS } from './constants';

type Module = {
  /**
   * The name of a file or NPM module.
   */
  id: string;
  /**
   * The modules which are imported by this module.
   */
  dependents: Module[];
  /**
   * How many modules it takes to import this module (at a certain point in the
   * dependency graph).
   */
  level: number;
  /**
   * Whether the module refers to a NPM module.
   */
  isExternal: boolean;
  /**
   * Whether the module was one of the files we wanted to convert to TypeScript
   * and has been thus converted.
   */
  hasBeenConverted: boolean;
};

export type ModulePartition = {
  level: number;
  children: {
    name: string;
    hasBeenConverted: boolean;
  }[];
};

/**
 * Returns the contents of a JSON file that stores the names of the files that
 * we planned on converting to TypeScript. All of the dependency information
 * will be filtered through this list.
 */
function readFilesToConvert(): string[] {
  try {
    return JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, '../filesToConvert.json'),
        'utf-8',
      ),
    );
  } catch (error: unknown) {
    throw new Error(
      'Could not read or parse list of files to convert. ' +
        'Have you tried running the following command?\n\n' +
        '    yarn ts-migration:enumerate\n\n' +
        `Original error: ${error}`,
    );
  }
}

/**
 * Filters the given set of file paths according to an allow list. As the entry
 * file paths could refer to TypeScript files, and the allow list is guaranteed
 * to be JavaScript files, the entry file paths are normalized before filtering.
 *
 * @param filePaths - A set of file paths.
 * @param allowedFilePaths - A set of allowed file paths.
 * @returns The filtered file paths.
 */
function filterFilePaths(filePaths: string[], allowedFilePaths: string[]) {
  return filePaths.filter((filePath) =>
    allowedFilePaths.includes(filePath.replace(/\.tsx?$/u, '.js')),
  );
}

/**
 * Given a file in the dependency graph, returns all of the names of the files
 * which import that file directly or through some other file.
 *
 * @param module - A module in the graph.
 * @returns The ids of the modules which are incoming connections to
 * the module.
 */
function findDirectAndIndirectDependentIdsOf(module: Module): Set<string> {
  const modulesToProcess = [module];
  const allDependentIds = new Set<string>();
  while (modulesToProcess.length > 0) {
    const currentModule = modulesToProcess.shift() as Module;
    currentModule.dependents.forEach((dependent) => {
      if (!allDependentIds.has(dependent.id)) {
        allDependentIds.add(dependent.id);
        modulesToProcess.push(dependent);
      }
    });
  }
  return allDependentIds;
}

/**
 * This function takes a flat data structure that represents the dependency
 * graph of a system, mapping the path of a module to the modules that it
 * imports, and traverses the graph to collect more information on each module,
 * notably where that module sits in the dependency graph.
 *
 * Our overall goal is that we want to partition the graph into different
 * sections. We want to find the leaves of the graph — that is, files that
 * depend on no other files — then the dependents of the leaves — those files
 * that depend on the leaves — then the dependents of the dependents, etc. We
 * can derive this information by traversing the graph, and for each module we
 * encounter, recording the number of modules it takes to reach that module. We
 * call this number the "level".
 *
 * We will discuss a couple of optimizations we've made to ensure that graph
 * traversal is performant.
 *
 * Naively, in order to calculate the level of each module, we need to follow
 * that module's dependencies, then the dependencies of the dependencies, etc.,
 * until we hit leaves. Essentially, we need to follow each connection in the
 * graph. However, this creates a performance problem, because in a large system
 * a file could get imported multiple ways. For instance:
 *
 * - `foo.js` could import `bar.js` which could import `baz.js`
 * - `foo.js` could also import `baz.js` directly
 * - `foo.js` could also import `bar.js` which imports `qux.js` which imports `baz.js`
 *
 * In this case, even if there are few modules in a system, a subset of those
 * modules may be visited multiple times in the course of traversing connections
 * between all of them. This is costly and unnecessary.
 *
 * To address this, as we are traversing the graph, we record modules we've
 * visited along with the level when we visited it. If we encounter a
 * module again through some other path, and the level this time is less than
 * the level we've already recorded, then we know we don't need to revisit that
 * module or — crucially — any of its dependencies. Therefore we can skip whole
 * sections of the graph.
 *
 * In addition, in a large enough system, some files could import files that end
 * up importing themselves later on:
 *
 * - `foo.js` could import `bar.js`, which imports `baz.js`, which imports `foo.js`, which...
 *
 * These are called circular dependencies, and we detect them by tracking the
 * files that depend on a file (dependents) in addition to the files on which
 * that file depends (dependencies). In the example above, `baz.js` has a
 * dependency `foo.js`, and its chain of dependents is `bar.js` -> `foo.js`
 * (working backward from `baz.js`). The chain of dependents of `baz.js`
 * includes `foo.js`, so we say `foo.js` is a circular dependency of `baz.js`,
 * and we don't need to follow it.
 *
 * @param dependenciesByModuleId - An object that maps a file path in the
 * dependency tree to the dependencies that it imports. This information is
 * provided by the `madge` package.
 * @param entryModuleIds - File paths which will initiate the traversal through
 * the dependency tree. These file paths will always be level 0.
 * @param allowedFilePaths - The list of original JavaScript files to
 * convert to TypeScript; governs which files will end up in the final
 * dependency tree.
 * @returns A data structure that maps the id of a module in the dependency
 * graph to an object that represents that module.
 */
function buildModulesWithLevels(
  dependenciesByModuleId: Record<string, string[]>,
  entryModuleIds: string[],
  allowedFilePaths: string[],
): Record<string, Module> {
  const modulesToFill: Module[] = entryModuleIds.map((moduleId) => {
    return {
      id: moduleId,
      dependents: [],
      level: 0,
      isExternal: false,
      hasBeenConverted: /\.tsx?$/u.test(moduleId),
    };
  });
  const modulesById: Record<string, Module> = {};

  while (modulesToFill.length > 0) {
    const currentModule = modulesToFill.shift() as Module;
    const childModulesToFill: Module[] = [];
    (dependenciesByModuleId[currentModule.id] ?? []).forEach(
      (givenChildModuleId) => {
        const npmPackageMatch = givenChildModuleId.match(
          /^module_modules\/(?:(@[^/]+)\/)?([^/]+)\/.+$/u,
        );

        let childModuleId;
        if (npmPackageMatch) {
          childModuleId =
            npmPackageMatch[1] === undefined
              ? `${npmPackageMatch[2]}`
              : `${npmPackageMatch[1]}/${npmPackageMatch[2]}`;
        } else {
          childModuleId = givenChildModuleId;
        }

        // Skip circular dependencies
        if (
          findDirectAndIndirectDependentIdsOf(currentModule).has(childModuleId)
        ) {
          return;
        }

        // Skip files that weren't on the original list of JavaScript files to
        // convert, as we don't want them to show up on the status dashboard
        if (
          !npmPackageMatch &&
          !allowedFilePaths.includes(childModuleId.replace(/\.tsx?$/u, '.js'))
        ) {
          return;
        }

        const existingChildModule = modulesById[childModuleId];

        if (existingChildModule === undefined) {
          const childModule: Module = {
            id: childModuleId,
            dependents: [currentModule],
            level: currentModule.level + 1,
            isExternal: Boolean(npmPackageMatch),
            hasBeenConverted: /\.tsx?$/u.test(childModuleId),
          };
          childModulesToFill.push(childModule);
        } else {
          if (currentModule.level + 1 > existingChildModule.level) {
            existingChildModule.level = currentModule.level + 1;
            // Update descendant modules' levels
            childModulesToFill.push(existingChildModule);
          } else {
            // There is no point in descending into dependencies of this module
            // if the new level of the module would be <= the existing level,
            // because all of the dependencies from this point on are guaranteed
            // to have a higher level and are therefore already at the right
            // level.
          }

          if (!existingChildModule.dependents.includes(currentModule)) {
            existingChildModule.dependents.push(currentModule);
          }
        }
      },
    );
    if (childModulesToFill.length > 0) {
      modulesToFill.push(...childModulesToFill);
    }
    if (!(currentModule.id in modulesById)) {
      modulesById[currentModule.id] = currentModule;
    }
  }

  return modulesById;
}

/**
 * Partitions modules in the dependency graph by level (see {@link buildModulesWithLevels}
 * for an explanation). This will be used to render those modules on the
 * dashboard in groups.
 *
 * @param modulesById - An object that maps the id of a module to an object that
 * represents that module.
 * @returns An array where each item represents a level and is the module ids
 * that match that level.
 */
function partitionModulesByLevel(
  modulesById: Record<string, Module>,
): ModulePartition[] {
  const levels = Object.values(modulesById).map((module) => module.level);
  const maxLevel = Math.max(...levels);
  const groupedModules: ModulePartition[] = [];
  for (let i = 0; i <= maxLevel; i++) {
    const modulePartition: ModulePartition = { level: i + 1, children: [] };
    groupedModules[i] = modulePartition;
  }
  Object.values(modulesById).forEach((module) => {
    groupedModules[module.level].children.push({
      name: module.id,
      hasBeenConverted: module.hasBeenConverted,
    });
  });
  return groupedModules.reverse();
}

/**
 * Uses the `madge` package to traverse the dependency graph of a set of
 * entrypoints (a combination of the ones that the build script uses to build
 * the extension as well as a manually picked list), then arranges the
 * dependencies of each file by "level", which is the number of files it takes
 * to reach a certain dependency.
 *
 * @returns An array of objects which can be used to render the dashboard, where
 * each object represents an entrypoint and its dependencies.
 */
export default async function buildModulePartitions(): Promise<
  ModulePartition[]
> {
  const allowedFilePaths = readFilesToConvert();

  const possibleEntryFilePaths = (
    await Promise.all(
      ENTRYPOINT_PATTERNS.map((entrypointPattern) => {
        return fg(
          path.resolve(BASE_DIRECTORY, `${entrypointPattern}.{js,ts,tsx}`),
        );
      }),
    )
  ).flat();

  const entryFilePaths = filterFilePaths(
    possibleEntryFilePaths.map((possibleEntrypoint) =>
      path.relative(BASE_DIRECTORY, possibleEntrypoint),
    ),
    allowedFilePaths,
  );

  const result = await madge(entryFilePaths, {
    baseDir: BASE_DIRECTORY,
    tsConfig: path.join(BASE_DIRECTORY, 'tsconfig.json'),
  });
  const dependenciesByFilePath = result.obj();
  const modulesById = buildModulesWithLevels(
    dependenciesByFilePath,
    entryFilePaths,
    allowedFilePaths,
  );
  return partitionModulesByLevel(modulesById);
}
