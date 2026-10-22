import { describe, expect, it } from 'vitest';
import {
  mergeRendererPayloadIntoStoredContent,
  normalizeLegacyRichMediaForRenderer,
  optimizedImageUrl,
} from '../legacyContentCompatibility.js';

const image = {
  originalUrl: 'https://cdn.example/original.jpg',
  role: 'hero',
  altPolicy: 'auto',
  variants: {
    webp: [{ url: 'https://cdn.example/hero.webp', width: 1200, height: 675, format: 'webp' }],
    fallback: { url: 'https://cdn.example/fallback.webp', width: 1200, height: 675, format: 'webp' },
  },
};

describe('legacy content compatibility', () => {
  it('resolves optimized image objects to a renderer URL recursively', () => {
    expect(optimizedImageUrl(image)).toBe('https://cdn.example/original.jpg');
    expect(normalizeLegacyRichMediaForRenderer({
      global: { logo: image },
      hero: { background: image },
      projects: [{ image }],
    })).toEqual({
      global: { logo: 'https://cdn.example/original.jpg' },
      hero: { background: 'https://cdn.example/original.jpg' },
      projects: [{ image: 'https://cdn.example/original.jpg' }],
    });
  });

  it('preserves rich media and unexposed stored fields when renderer payload is unchanged', () => {
    const stored = {
      global: {
        logo: image,
        featureFlags: { trackingEnabled: true },
      },
      hero: { headline: 'Antes' },
    };
    const incoming = {
      global: { logo: 'https://cdn.example/original.jpg' },
      hero: { headline: 'Depois' },
    };

    expect(mergeRendererPayloadIntoStoredContent(stored, incoming)).toEqual({
      global: {
        logo: image,
        featureFlags: { trackingEnabled: true },
      },
      hero: { headline: 'Depois' },
    });
  });

  it('replaces a rich media object when the renderer intentionally changes its URL', () => {
    expect(mergeRendererPayloadIntoStoredContent(image, 'https://cdn.example/new.jpg'))
      .toBe('https://cdn.example/new.jpg');
  });
});
