type JsonObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

function cloneJsonLike(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneJsonLike);
  if (isPlainObject(value)) {
    const out: JsonObject = {};
    for (const [key, nested] of Object.entries(value)) out[key] = cloneJsonLike(nested);
    return out;
  }
  return value;
}

function variantUrl(value: unknown): string | null {
  if (!isPlainObject(value)) return null;
  const url = value.url;
  return typeof url === 'string' && url.trim() ? url : null;
}

export function optimizedImageUrl(value: unknown): string | null {
  if (!isPlainObject(value)) return null;

  const role = value.role;
  const variants = isPlainObject(value.variants) ? value.variants : null;
  const looksLikeOptimizedImage =
    typeof role === 'string' ||
    typeof value.originalUrl === 'string' ||
    Boolean(variants && ('fallback' in variants || 'webp' in variants || 'avif' in variants));

  if (!looksLikeOptimizedImage) return null;

  if (typeof value.originalUrl === 'string' && value.originalUrl.trim()) return value.originalUrl;
  if (variants) {
    const fallback = variantUrl(variants.fallback);
    if (fallback) return fallback;

    for (const key of ['webp', 'avif'] as const) {
      const list = variants[key];
      if (!Array.isArray(list)) continue;
      for (const candidate of list) {
        const url = variantUrl(candidate);
        if (url) return url;
      }
    }
  }
  return null;
}

function optimizedImageContainsUrl(value: unknown, url: string): boolean {
  if (!isPlainObject(value)) return false;
  if (value.originalUrl === url) return true;
  const variants = isPlainObject(value.variants) ? value.variants : null;
  if (!variants) return false;
  if (variantUrl(variants.fallback) === url) return true;
  for (const key of ['webp', 'avif'] as const) {
    const list = variants[key];
    if (Array.isArray(list) && list.some((candidate) => variantUrl(candidate) === url)) return true;
  }
  return false;
}

/**
 * Converts legacy optimized-image objects to the URL shape expected by the current renderer.
 * All non-media data is preserved structurally; validation happens after this adapter.
 */
export function normalizeLegacyRichMediaForRenderer<T>(input: T): T {
  const mediaUrl = optimizedImageUrl(input);
  if (mediaUrl) return mediaUrl as T;

  if (Array.isArray(input)) {
    return input.map((item) => normalizeLegacyRichMediaForRenderer(item)) as T;
  }

  if (!isPlainObject(input)) return input;

  const out: JsonObject = {};
  for (const [key, value] of Object.entries(input)) {
    out[key] = normalizeLegacyRichMediaForRenderer(value);
  }
  return out as T;
}

/**
 * Merges a renderer payload back into the stored JSON without deleting fields that the
 * simplified renderer does not expose. Unchanged optimized images keep their full metadata.
 */
export function mergeRendererPayloadIntoStoredContent(
  stored: unknown,
  incoming: unknown,
): unknown {
  if (incoming === undefined) return cloneJsonLike(stored);

  if (typeof incoming === 'string' && optimizedImageContainsUrl(stored, incoming)) {
    return cloneJsonLike(stored);
  }

  if (Array.isArray(incoming)) {
    const storedArray = Array.isArray(stored) ? stored : [];
    return incoming.map((item, index) =>
      mergeRendererPayloadIntoStoredContent(storedArray[index], item),
    );
  }

  if (isPlainObject(incoming)) {
    const out: JsonObject = isPlainObject(stored)
      ? (cloneJsonLike(stored) as JsonObject)
      : {};
    for (const [key, value] of Object.entries(incoming)) {
      out[key] = mergeRendererPayloadIntoStoredContent(
        isPlainObject(stored) ? stored[key] : undefined,
        value,
      );
    }
    return out;
  }

  return cloneJsonLike(incoming);
}
