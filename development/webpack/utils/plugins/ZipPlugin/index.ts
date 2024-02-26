import path from 'node:path';
import { sources, Compilation, type Compiler } from 'webpack';
import { validate } from 'schema-utils';
import {
  Zip,
  ZipPassThrough,
  AsyncZipDeflate,
  type DeflateOptions,
} from 'fflate';
import { schema } from './schema';
import { type ZipPluginOptions } from './types';

export { type ZipPluginOptions } from './types';

type Assets = Compilation['assets'];

const { RawSource, ConcatSource } = sources;

const NAME = 'ZipPlugin';

export class ZipPlugin {
  /**
   * File types that can be compressed well using DEFLATE compression
   */
  static compressibleFileTypes = new Set([
    '.bmp',
    '.cjs',
    '.css',
    '.csv',
    '.html',
    '.js',
    '.json',
    '.log',
    '.map',
    '.md',
    '.mjs',
    '.svg',
    '.txt',
    '.wasm',
    '.wav',
    '.xml',
  ]);

  options: ZipPluginOptions;

  constructor(options: Partial<ZipPluginOptions> = {}) {
    validate(schema, options, { name: NAME });

    this.options = { ...options } as any;

    this.options.mtime ??= Date.now();
    this.options.level ??= 9;
    this.options.excludeExtensions ??= [];
    this.options.outFilePath ??= 'out.zip';
  }

  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap(NAME, this.hookIntoAssetPipeline.bind(this));
  }

  private hookIntoAssetPipeline(compilation: Compilation) {
    const options = {
      name: NAME,
      stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_TRANSFER,
    };
    const tap = (assets: Assets) => this.zipAssets(compilation, assets);
    compilation.hooks.processAssets.tapPromise(options, tap);
  }

  /**
   * Puts all assets into a zip file
   *
   * @param compilation
   * @param assets
   * @returns
   */
  private zipAssets(compilation: Compilation, assets: Assets): Promise<void> {
    return new Promise((resolve, reject) => {
      let errored = false;
      const zip = new Zip();
      const source = new ConcatSource();
      zip.ondata = (err, dat, final) => {
        if (err) {
          errored = true;
          reject(err);
          return;
        }
        source.add(new RawSource(Buffer.from(dat)));
        if (final) {
          compilation.emitAsset(this.options.outFilePath, source);
          resolve();
        }
      };

      const { mtime } = this.options;
      const compressionOptions: DeflateOptions = { level: this.options.level };

      for (const assetName in assets) {
        if (!Object.prototype.hasOwnProperty.call(assets, assetName)) {
          continue;
        }
        if (errored) {
          return;
        }

        const extName = path.extname(assetName);
        if (this.options.excludeExtensions.includes(extName)) {
          continue;
        }

        const asset = assets[assetName];

        compilation.deleteAsset(assetName);

        const zipFile = ZipPlugin.compressibleFileTypes.has(extName)
          ? new AsyncZipDeflate(assetName, compressionOptions)
          : new ZipPassThrough(assetName);
        zipFile.mtime = mtime;
        zip.add(zipFile);
        // use a copy of the Buffer, as Zip will consume it
        zipFile.push(Buffer.from(asset.buffer()), true);
      }

      zip.end();
    });
  }
}
