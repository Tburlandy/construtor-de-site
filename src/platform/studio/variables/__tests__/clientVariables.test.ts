import { describe, expect, it } from 'vitest';
import { collectTemplatePlaceholders } from '@/lib/templateVariables';
import { CLIENT_VARIABLE_REGISTRY } from '../clientVariableRegistry';
import { buildClientVariableMap } from '../clientVariablesService';

describe('client variables', () => {
  it('collects placeholders recursively from objects and arrays', () => {
    expect(
      collectTemplatePlaceholders({
        title: 'Solar em {{city}} para {{brand}}',
        rows: ['{{prefix}}', { nested: '{{city}} / {{missing}}' }],
      }),
    ).toEqual(['brand', 'city', 'missing', 'prefix']);
  });

  it('keeps prefix unconfigured instead of inventing a value', async () => {
    const variables = await buildClientVariableMap({
      clientId: 'client-a',
      projectContentRepository: {
        async getByProjectId() {
          return {
            projectId: 'client-a',
            schemaVersion: '1',
            content: {
              global: {
                brand: 'Marca A',
                city: 'Niterói',
                siteUrl: 'https://a.example',
                whatsappE164: '+5521999999999',
              },
            },
            updatedAt: '2026-01-01T00:00:00.000Z',
          } as never;
        },
        async save(value) { return value; },
      },
      studioClientTemplateStateRepository: {
        async getByProjectId() { return null; },
        async save(value) { return value; },
      } as never,
    });

    expect(variables.brand).toBe('Marca A');
    expect(variables.prefix).toBe('');
  });

  it('does not expose operational webhook variables as insertable copy', () => {
    const webhook = CLIENT_VARIABLE_REGISTRY.find((item) => item.key === 'webhookUrl');
    const secondary = CLIENT_VARIABLE_REGISTRY.find((item) => item.key === 'secondaryWebhookUrl');
    expect(webhook?.insertable).toBe(false);
    expect(secondary?.insertable).toBe(false);
    expect(CLIENT_VARIABLE_REGISTRY.find((item) => item.key === 'prefix')?.insertable).toBe(true);
  });
});
