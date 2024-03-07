import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { parse } from './ini';

const BUILDS_YML_PATH = join(__dirname, '../../../builds.yml');

/**
 *
 *
 * @param filePath
 * @param env
 * @returns
 */
function loadIni(
  filePath: string,
  { definitions }: Omit<BuildConfig, 'activeFeatures'>,
) {
  for (const { key, value } of parse(readFileSync(filePath))) {
    definitions.set(key.toString('utf8'), value);
  }
  return { definitions };
}

/**
 * Creates a memoized version of a function to optimize its execution by caching
 * the results based on the arguments passed. If the memoized function is called
 * with the same arguments as a previous call, the cached result is returned
 * instead of executing the original function again. This can significantly
 * improve performance for expensive or frequently called functions with
 * identical arguments.
 *
 * @template T A function type that takes any number of arguments and returns
 * any type.
 * @param fn - The function to be memoized. It can take any number of arguments
 * and return any type.
 * @returns A memoized version of the input function. This function has the same
 * signature as the
 * original function and will return cached results for previously encountered
 * arguments.
 */
function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();

  return function (...args: Parameters<T>): ReturnType<T> {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    if (cached) return cached;

    const result = fn(...args);
    cache.set(key, result);
    return result;
  } as T;
}

/**
 *
 * @param buildType
 * @returns
 */
export function loadEnv(buildType: string) {
  return loadIni(
    join(__dirname, '../../../.metamaskrc'),
    loadFeaturesAndDefinitions(buildType),
  );
}

export type BuildYaml = {
  buildTypes: Record<
    string,
    {
      features?: string[];
      env?: (string | { [k: string]: unknown })[];
    }
  >;
  env: (string | Record<string, unknown>)[];
  features: Record<
    string,
    null | { env?: (string | { [k: string]: unknown })[] }
  >;
};

/**
 *
 */
export const loadBuildTypesConfig = memoize(function loadBuildTypesConfig(): BuildYaml {
  const data = readFileSync(BUILDS_YML_PATH, "utf8");
  return parseYaml(data);
});

export type BuildConfig = {
  definitions: Map<string, unknown>;
  activeFeatures?: string[];
};

/**
 *
 * @param buildType
 * @returns
 */
export function loadFeaturesAndDefinitions(buildType: string): BuildConfig {
  const { buildTypes, env, features } = loadBuildTypesConfig();
  const activeBuild = buildTypes[buildType];
  const activeFeatures = activeBuild.features;

  const definitions = new Map<string, any>();

  // 1. build type env
  activeBuild.env?.forEach((pair) => {
    if (typeof pair === 'string') return;
    Object.entries(pair).forEach(([key, value]) => definitions.set(key, value));
  });

  // 2. features env
  activeFeatures?.forEach((feature) => {
    features[feature]?.env?.forEach((pair) => {
      if (typeof pair === 'string') return;
      Object.entries(pair).forEach(
        ([key, value]) => !definitions.has(key) && definitions.set(key, value),
      );
    });
  });

  // 3. root env
  env.forEach((pair) => {
    if (typeof pair === 'object') {
      Object.entries(pair).forEach(([key, value]) => {
        !definitions.has(key) && definitions.set(key, value);
      });
    }
  });

  return { activeFeatures, definitions };
}
