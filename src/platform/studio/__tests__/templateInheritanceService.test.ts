import { describe, expect, it } from 'vitest';
import { ContentSchema, type Content } from '@/content/schema';
import type { StudioBaseTemplateRecord, StudioClientTemplateStateRecord } from '@/platform/contracts/studioTemplateInheritance';
import {
  buildOverridesFromResolvedContent,
  isPathInherited,
  removeOverridePath,
  resolveClientContent,
} from '../templateInheritanceService.js';

const TS = '2026-01-01T12:00:00.000Z';

/** Conteúdo mínimo válido para servir de template central nos testes. */
function minimalTemplateContent(): Content {
  return ContentSchema.parse({
    global: {
      brand: '{{brand}}',
      city: '{{city}}',
      whatsappE164: '{{whatsappE164}}',
      cnpj: '',
      address: '',
      siteUrl: '{{siteUrl}}',
      yearsInMarket: '{{yearsInMarket}}',
      projectCount: '{{projectCount}}',
    },
    seo: {
      title: '{{brand}} | Título',
      description: 'Descrição fixa',
      canonical: '{{siteUrl}}/pagina/',
      ogImage: '/og.jpg',
      jsonLd: {},
    },
    hero: {
      headline: 'Energia em {{city}} e {{unknownVar}}',
      subheadline: 'Sub',
      ctaLabel: 'CTA',
      background: '/hero.jpg',
      stats: [
        { value: '10', label: 'Baseline stat A' },
        { value: '20', label: 'Baseline stat B' },
      ],
    },
    benefits: [{ icon: 'sun', title: 'Benefício base', text: 'Texto base' }],
    showcase: { projects: [] },
    howItWorks: {
      image: '/how.jpg',
      steps: [{ number: '1', title: 'Passo base', description: 'Desc base' }],
    },
    proofBar: {
      image: '/proof.jpg',
      cards: [
        { title: 'Card base 1', description: 'D1' },
        { title: 'Card base 2', description: 'D2' },
      ],
    },
  });
}

function baseRecord(): StudioBaseTemplateRecord {
  return {
    styleId: 'style-1',
    content: minimalTemplateContent(),
    updatedAt: TS,
    createdAt: TS,
  };
}

function baseVariables() {
  return {
    brand: 'MarcaCliente',
    city: 'Niterói',
    whatsappE164: '5521999999999',
    siteUrl: 'https://cliente.example',
    yearsInMarket: '6',
    projectCount: '100',
  };
}

function emptyClientState(partial: Partial<StudioClientTemplateStateRecord> = {}): StudioClientTemplateStateRecord {
  return {
    projectId: 'proj-test',
    styleId: 'style-1',
    variables: baseVariables(),
    overrides: {},
    overriddenPaths: [],
    updatedAt: TS,
    ...partial,
  };
}

describe('templateInheritanceService', () => {
  describe('resolveClientContent', () => {
    it('cliente sem override: conteúdo final igual ao baseline interpolado', () => {
      const baseTemplate = baseRecord();
      const clientState = emptyClientState();

      const { content, inheritedBaseline, appliedOverrideCount } = resolveClientContent({
        baseTemplate,
        clientState,
      });

      expect(appliedOverrideCount).toBe(0);
      expect(content).toEqual(inheritedBaseline);
      expect(content.hero.headline).toBe('Energia em Niterói e {{unknownVar}}');
      expect(content.global.brand).toBe('MarcaCliente');
    });

    it('interpolação: variáveis conhecidas substituídas no baseline', () => {
      const { inheritedBaseline } = resolveClientContent({
        baseTemplate: baseRecord(),
        clientState: emptyClientState(),
      });

      expect(inheritedBaseline.seo.title).toBe('MarcaCliente | Título');
      expect(inheritedBaseline.seo.canonical).toBe('https://cliente.example/pagina/');
    });

    it('placeholder desconhecido {{unknownVar}} permanece literal após interpolação', () => {
      const { content } = resolveClientContent({
        baseTemplate: baseRecord(),
        clientState: emptyClientState(),
      });

      expect(content.hero.headline).toContain('{{unknownVar}}');
    });

    it('cliente com override simples (path folha): sobrescreve apenas o campo', () => {
      const baseTemplate = baseRecord();
      const clientState = emptyClientState({
        overrides: { 'hero.headline': 'Título 100% personalizado' },
        overriddenPaths: ['hero.headline'],
      });

      const { content, inheritedBaseline, appliedOverrideCount } = resolveClientContent({
        baseTemplate,
        clientState,
      });

      expect(appliedOverrideCount).toBe(1);
      expect(content.hero.headline).toBe('Título 100% personalizado');
      expect(inheritedBaseline.hero.headline).toBe('Energia em Niterói e {{unknownVar}}');
      expect(content.hero.subheadline).toBe(inheritedBaseline.hero.subheadline);
    });

    it('cliente com override de bloco composto (hero.stats): troca o array inteiro', () => {
      const baseTemplate = baseRecord();
      const newStats = [{ value: '99', label: 'Único stat override' }];
      const clientState = emptyClientState({
        overrides: { 'hero.stats': newStats },
        overriddenPaths: ['hero.stats'],
      });

      const { content, inheritedBaseline, appliedOverrideCount } = resolveClientContent({
        baseTemplate,
        clientState,
      });

      expect(appliedOverrideCount).toBe(1);
      expect(content.hero.stats).toEqual(newStats);
      expect(inheritedBaseline.hero.stats).toHaveLength(2);
      expect(inheritedBaseline.hero.stats?.[0]?.label).toBe('Baseline stat A');
    });
  });

  describe('removeOverridePath + isPathInherited', () => {
    it('reset de path: remove override e path volta a refletir baseline após novo resolve', () => {
      const baseTemplate = baseRecord();
      let clientState = emptyClientState({
        overrides: {
          'hero.headline': 'Override temporário',
          'seo.title': 'Outro override',
        },
        overriddenPaths: ['hero.headline', 'seo.title'],
      });

      expect(isPathInherited({ clientState, path: 'hero.headline' })).toBe(false);

      clientState = removeOverridePath({ clientState, path: 'hero.headline' });

      expect(isPathInherited({ clientState, path: 'hero.headline' })).toBe(true);
      expect(clientState.overrides['hero.headline']).toBeUndefined();
      expect(clientState.overriddenPaths).toEqual(['seo.title']);

      const { content, inheritedBaseline } = resolveClientContent({ baseTemplate, clientState });

      expect(content.hero.headline).toBe(inheritedBaseline.hero.headline);
      expect(content.seo.title).toBe('Outro override');
    });
  });

  describe('buildOverridesFromResolvedContent', () => {
    it('deriva overrides e paths quando resolved difere do baseline interpolado', () => {
      const baseTemplate = baseRecord();
      const variables = baseVariables();
      const inherited = resolveClientContent({
        baseTemplate,
        clientState: emptyClientState({ variables }),
      }).inheritedBaseline;

      const resolvedContent = ContentSchema.parse({
        ...inherited,
        hero: { ...inherited.hero, headline: 'Só este campo mudou' },
      });

      const { overrides, overriddenPaths } = buildOverridesFromResolvedContent({
        baseTemplate,
        variables,
        resolvedContent,
      });

      expect(overriddenPaths).toContain('hero.headline');
      expect(overrides['hero.headline']).toBe('Só este campo mudou');
    });

    it('roundtrip: estado derivado + resolve reproduz o Content resolvido de entrada', () => {
      const baseTemplate = baseRecord();
      const variables = baseVariables();
      const inherited = resolveClientContent({
        baseTemplate,
        clientState: emptyClientState({ variables }),
      }).inheritedBaseline;

      const resolvedContent = ContentSchema.parse({
        ...inherited,
        proofBar: inherited.proofBar
          ? {
              ...inherited.proofBar,
              cards: [{ title: 'Só um card', description: 'Override bloco' }],
            }
          : inherited.proofBar,
      });

      const { overrides, overriddenPaths } = buildOverridesFromResolvedContent({
        baseTemplate,
        variables,
        resolvedContent,
      });

      const roundtrip = resolveClientContent({
        baseTemplate,
        clientState: emptyClientState({ variables, overrides, overriddenPaths }),
      }).content;

      expect(roundtrip).toEqual(resolvedContent);
    });
  });
});
