import { describe, expect, it } from 'vitest';
import { getPageLayoutRenderer, UnsupportedLayoutRendererError } from '../pageLayoutRenderers';

describe('page layout renderer registry', () => {
  it('registers style-1 explicitly', () => {
    expect(getPageLayoutRenderer('style-1').layoutId).toBe('style-1');
  });

  it('fails safely for unknown renderers', () => {
    expect(() => getPageLayoutRenderer('renderer-from-db')).toThrow(UnsupportedLayoutRendererError);
    expect(() => getPageLayoutRenderer('renderer-from-db')).toThrow(
      'Layout não suportado nesta versão do aplicativo.',
    );
  });
});
