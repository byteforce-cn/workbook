/**
 * Framework-agnostic asset loader.
 * Manages external asset references with blob caching.
 */

import type { WorkbookAssetMap } from "../../core/types";

export class AssetLoader {
  private readonly assets: WorkbookAssetMap;
  private readonly blobCache = new Map<string, Promise<Blob>>();

  public constructor(assets: WorkbookAssetMap = {}) {
    this.assets = assets;
  }

  public resolveAssetUrl(assetKey: string): string | undefined {
    return this.assets[assetKey]?.src ?? assetKey;
  }

  public async load(assetKey: string, signal?: AbortSignal): Promise<Blob> {
    if (!this.blobCache.has(assetKey)) {
      const url = this.resolveAssetUrl(assetKey);
      if (url == null) {
        throw new Error(`Unknown asset "${assetKey}".`);
      }

      this.blobCache.set(
        assetKey,
        fetch(url, { signal }).then(async (response) => {
          if (!response.ok) {
            throw new Error(`Failed to load asset "${assetKey}" from ${url}: ${response.status}`);
          }
          return response.blob();
        }),
      );
    }

    return this.blobCache.get(assetKey) as Promise<Blob>;
  }

  public clearCache(): void {
    this.blobCache.clear();
  }
}
