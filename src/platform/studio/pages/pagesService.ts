import { randomUUID } from 'node:crypto';
import type { ProjectMetadataRepository } from '../../repositories/projectMetadataRepository.js';
import type { PageMetadataRepository } from '../../repositories/pageMetadataRepository.js';
import type { PageContentRepository } from '../../repositories/pageContentRepository.js';
import type { PageSeoRepository } from '../../repositories/pageSeoRepository.js';
import type { PageVersionRepository } from '../../repositories/pageVersionRepository.js';
import type { PageLayoutStateRepository } from '../../repositories/pageLayoutStateRepository.js';
import type { LayoutRepository } from '../../repositories/layoutRepository.js';
import type { ProjectContentRepository } from '../../repositories/projectContentRepository.js';
import type { ProjectSeoConfigRepository } from '../../repositories/projectSeoConfigRepository.js';
import type { ProjectVersionRepository } from '../../repositories/projectVersionRepository.js';
import type { JsonValue } from '../../contracts/index.js';
import { buildProjectSeoConfig } from '../../repositories/projectSeoConfigBridge.js';
import { ContentSchema } from '../../../content/schema.js';
import type { StudioClientTemplateStateRepository } from '../../repositories/studioClientTemplateStateRepository.js';
import type {
  StudioPageContentRecord,
  StudioPageMetadata,
  StudioPageSeoConfig,
} from '../../contracts/studioPages.js';
import type { StudioLayoutRecord } from '../../contracts/studioLayouts.js';
import { validateLayoutContent } from '../layouts/pageLayoutRenderers.js';
import { buildClientVariableMap } from '../variables/clientVariablesService.js';
import { runCrossClientContaminationAudit } from './crossClientContaminationAudit.js';
import {
  collectTemplatePlaceholders,
  resolveTemplateVariablesInObject,
} from '../../../lib/templateVariables.js';
import {
  mergeRendererPayloadIntoStoredContent,
  normalizeLegacyRichMediaForRenderer,
} from '../../../lib/legacyContentCompatibility.js';

export class PageDomainError extends Error {
  constructor(public readonly statusCode:number,message:string,public readonly payload:Record<string,unknown>={}){super(message);this.name='PageDomainError';}
}
export type PagesServiceDeps={
  pageMetadataRepository:PageMetadataRepository;
  pageContentRepository:PageContentRepository;
  pageSeoRepository:PageSeoRepository;
  pageVersionRepository:PageVersionRepository;
  pageLayoutStateRepository:PageLayoutStateRepository;
  layoutRepository:LayoutRepository;
  projectMetadataRepository:ProjectMetadataRepository;
  projectContentRepository:ProjectContentRepository;
  projectSeoConfigRepository:ProjectSeoConfigRepository;
  projectVersionRepository:ProjectVersionRepository;
  studioClientTemplateStateRepository:StudioClientTemplateStateRepository;
};

function normalizePath(raw:string):string{
  const trimmed=raw.trim()||'/'; const withSlash=trimmed.startsWith('/')?trimmed:'/'+trimmed;
  if(withSlash==='/' )return '/'; return withSlash.replace(/\/+$/,'').replace(/\/+/g,'/');
}
function slugify(raw:string):string{
  const value=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  return value||'pagina';
}
function now(){return new Date().toISOString();}
function record(value:unknown):Record<string,unknown>{return value && typeof value==='object' && !Array.isArray(value) ? value as Record<string,unknown> : {};}
function seoFromContent(pageId:string,content:Record<string,unknown>,publicPath:string):StudioPageSeoConfig{
  const seo=record(content.seo); const global=record(content.global); const siteUrl=typeof global.siteUrl==='string'?global.siteUrl.replace(/\/+$/,''):'';
  const canonical=siteUrl ? siteUrl+(publicPath==='/'?'/':publicPath) : (typeof seo.canonical==='string'?seo.canonical:'');
  const og=seo.ogImage;
  let ogImage=''; if(typeof og==='string')ogImage=og; else if(og&&typeof og==='object'){const o=og as Record<string,unknown>;ogImage=typeof o.originalUrl==='string'?o.originalUrl:'';}
  return {pageId,title:typeof seo.title==='string'?seo.title:'',description:typeof seo.description==='string'?seo.description:'',canonical,ogImage,jsonLd:seo.jsonLd,robotsDirective:'index,follow',updatedAt:now()};
}

export function createPagesService(deps:PagesServiceDeps){
  async function requireClient(clientId:string){
    const client=await deps.projectMetadataRepository.getByProjectId(clientId);
    if(!client)throw new PageDomainError(404,'Cliente não encontrado');
    return client;
  }
  async function assertPageBelongsToClient(clientId:string,pageId:string){
    const page=await deps.pageMetadataRepository.getByPageId(pageId);
    if(!page || page.clientId!==clientId)throw new PageDomainError(404,'Página não encontrada para este cliente');
    return page;
  }
  async function listPagesByClientId(clientId:string){await requireClient(clientId);return deps.pageMetadataRepository.listByClientId(clientId);}
  async function getDefaultPage(clientId:string){
    const pages=await listPagesByClientId(clientId); return pages.find(p=>p.isDefault)??null;
  }
  async function listLayouts(){return deps.layoutRepository.list();}
  async function getLayout(layoutId:string){const layout=await deps.layoutRepository.getByLayoutId(layoutId);if(!layout)throw new PageDomainError(404,'Layout não encontrado');return layout;}
  async function ensureUniquePath(clientId:string,publicPath:string,exceptPageId?:string){
    const normalized=normalizePath(publicPath);const pages=await deps.pageMetadataRepository.listByClientId(clientId);
    if(pages.some(p=>p.pageId!==exceptPageId&&p.publicPath===normalized))throw new PageDomainError(409,'Já existe uma página com este path para o cliente');
    return normalized;
  }
  async function syncLegacyDefaultContent(page:StudioPageMetadata,storageContent:Record<string,unknown>,layout:StudioLayoutRecord,options:{skipSnapshot?:boolean}={}){
    if(!page.isDefault || layout.rendererKey!=='style-1')return;
    const previous=await deps.projectContentRepository.getByProjectId(page.clientId);
    if(previous&&!options.skipSnapshot){
      await deps.projectVersionRepository.createSnapshot({projectId:page.clientId,content:previous.content});
    }
    await deps.projectContentRepository.save({
      projectId:page.clientId,
      content:storageContent as Record<string,JsonValue>,
      schemaVersion:layout.schemaVersion??previous?.schemaVersion,
      updatedAt:now(),
    });
  }
  async function syncLegacyDefaultSeo(page:StudioPageMetadata,seo:StudioPageSeoConfig){
    if(!page.isDefault)return;
    await deps.projectSeoConfigRepository.save(buildProjectSeoConfig({
      projectId:page.clientId,
      seo:{title:seo.title,description:seo.description,canonical:seo.canonical,ogImage:seo.ogImage,jsonLd:seo.jsonLd??{}},
      updatedAt:now(),
    }));
  }
  async function createPage(input:{clientId:string;name:string;layoutId:string;publicPath:string;slug?:string}){
    await requireClient(input.clientId); const layout=await getLayout(input.layoutId); const publicPath=await ensureUniquePath(input.clientId,input.publicPath);
    const stamp=now(); const page:StudioPageMetadata={pageId:'page-'+randomUUID(),clientId:input.clientId,name:input.name.trim(),slug:slugify(input.slug??input.name),publicPath,layoutId:layout.layoutId,status:'draft',isDefault:false,createdAt:stamp,updatedAt:stamp};
    if(!page.name)throw new PageDomainError(400,'Nome da página é obrigatório');
    await deps.pageMetadataRepository.save(page);
    const content=validateLayoutContent(layout.rendererKey,normalizeLegacyRichMediaForRenderer(layout.defaultContent));
    const storageContent=(mergeRendererPayloadIntoStoredContent({},layout.defaultContent)??layout.defaultContent) as Record<string,unknown>;
    await deps.pageContentRepository.save(input.clientId,{pageId:page.pageId,schemaVersion:layout.schemaVersion,content:storageContent,updatedAt:stamp});
    await deps.pageSeoRepository.save(input.clientId,seoFromContent(page.pageId,content,page.publicPath));
    await deps.pageLayoutStateRepository.save(input.clientId,{pageId:page.pageId,layoutId:layout.layoutId,variables:{},overrides:{},overridePaths:[],schemaVersion:layout.schemaVersion,updatedAt:stamp});
    await deps.pageVersionRepository.createSnapshot(input.clientId,{pageId:page.pageId,content,createdAt:stamp});
    return page;
  }
  async function updatePageMetadata(clientId:string,pageId:string,patch:{name?:string;slug?:string;publicPath?:string;status?:'draft'|'active'|'archived';isDefault?:boolean}){
    const page=await assertPageBelongsToClient(clientId,pageId); let publicPath=page.publicPath;
    if(patch.publicPath!==undefined)publicPath=await ensureUniquePath(clientId,patch.publicPath,pageId);
    if(patch.status==='archived'&&page.isDefault)throw new PageDomainError(409,'A página padrão não pode ser arquivada');
    const next={...page,...patch,publicPath,name:patch.name?.trim()||page.name,slug:patch.slug?.trim()||page.slug,updatedAt:now()};
    await deps.pageMetadataRepository.save(next);
    if(patch.isDefault===true&&!page.isDefault)return setDefaultPage(clientId,pageId);
    return assertPageBelongsToClient(clientId,pageId);
  }
  async function archivePage(clientId:string,pageId:string){return updatePageMetadata(clientId,pageId,{status:'archived'});}
  async function setDefaultPage(clientId:string,pageId:string){
    await assertPageBelongsToClient(clientId,pageId);
    await deps.pageMetadataRepository.setDefault(clientId,pageId);
    const page=await assertPageBelongsToClient(clientId,pageId);
    const [content,seo,layout]=await Promise.all([
      deps.pageContentRepository.getByPageId(clientId,pageId),
      deps.pageSeoRepository.getByPageId(clientId,pageId),
      getLayout(page.layoutId),
    ]);
    if(content)await syncLegacyDefaultContent(page,content.content,layout);
    if(seo)await syncLegacyDefaultSeo(page,seo);
    return page;
  }
  async function getPageContent(clientId:string,pageId:string){await assertPageBelongsToClient(clientId,pageId);return deps.pageContentRepository.getByPageId(clientId,pageId);}
  async function savePageContent(clientId:string,pageId:string,payload:unknown,options:{skipSnapshot?:boolean;skipLegacySync?:boolean}={}){
    const page=await assertPageBelongsToClient(clientId,pageId); const layout=await getLayout(page.layoutId);
    const content=validateLayoutContent(layout.rendererKey,normalizeLegacyRichMediaForRenderer(payload));
    const previous=await deps.pageContentRepository.getByPageId(clientId,pageId);
    if(previous&&!options.skipSnapshot)await deps.pageVersionRepository.createSnapshot(clientId,{pageId,content:previous.content});
    const storageContent=(mergeRendererPayloadIntoStoredContent(previous?.content??{},payload)??payload) as Record<string,unknown>;
    const row:StudioPageContentRecord={pageId,schemaVersion:layout.schemaVersion,content:storageContent,updatedAt:now()};
    const saved=await deps.pageContentRepository.save(clientId,row);
    if(!options.skipLegacySync)await syncLegacyDefaultContent(page,storageContent,layout,{skipSnapshot:options.skipSnapshot});
    if(layout.rendererKey==='style-1'){
      const style1Content=ContentSchema.parse(content);
      const existingSeo=await deps.pageSeoRepository.getByPageId(clientId,pageId);
      const savedSeo=await deps.pageSeoRepository.save(clientId,{
        pageId,
        title:style1Content.seo.title,
        description:style1Content.seo.description,
        canonical:style1Content.seo.canonical,
        ogImage:style1Content.seo.ogImage,
        jsonLd:style1Content.seo.jsonLd,
        robotsDirective:existingSeo?.robotsDirective??'index,follow',
        updatedAt:now(),
      });
      await syncLegacyDefaultSeo(page,savedSeo);
    }
    return saved;
  }
  async function getPageSeo(clientId:string,pageId:string){await assertPageBelongsToClient(clientId,pageId);return deps.pageSeoRepository.getByPageId(clientId,pageId);}
  async function savePageSeo(clientId:string,pageId:string,seo:Omit<StudioPageSeoConfig,'pageId'|'updatedAt'>){
    const page=await assertPageBelongsToClient(clientId,pageId);
    const saved=await deps.pageSeoRepository.save(clientId,{...seo,pageId,updatedAt:now()});
    await syncLegacyDefaultSeo(page,saved);
    return saved;
  }
  async function listPageVersions(clientId:string,pageId:string){await assertPageBelongsToClient(clientId,pageId);return deps.pageVersionRepository.listByPageId(clientId,pageId);}
  async function restorePageVersion(clientId:string,pageId:string,versionId:string){
    await assertPageBelongsToClient(clientId,pageId);const version=await deps.pageVersionRepository.getByPageIdAndVersionId(clientId,pageId,versionId);
    if(!version)throw new PageDomainError(404,'Versão não encontrada');
    return savePageContent(clientId,pageId,version.content);
  }
  async function duplicatePage(clientId:string,pageId:string,input:{name?:string;publicPath?:string}={}){
    const source=await assertPageBelongsToClient(clientId,pageId);const pages=await deps.pageMetadataRepository.listByClientId(clientId);
    let publicPath=input.publicPath?normalizePath(input.publicPath):normalizePath(source.publicPath==='/'?'/copia':source.publicPath+'-copia');let n=2;
    while(pages.some(p=>p.publicPath===publicPath)){publicPath=normalizePath((source.publicPath==='/'?'/copia':source.publicPath+'-copia')+'-'+n++);}
    const target=await createPage({clientId,name:input.name?.trim()||source.name+' — cópia',layoutId:source.layoutId,publicPath});
    const [content,seo,state]=await Promise.all([deps.pageContentRepository.getByPageId(clientId,pageId),deps.pageSeoRepository.getByPageId(clientId,pageId),deps.pageLayoutStateRepository.getByPageIdAndLayoutId(clientId,pageId,source.layoutId)]);
    if(content)await deps.pageContentRepository.save(clientId,{...content,pageId:target.pageId,updatedAt:now()});
    if(seo){let canonical=seo.canonical;try{if(canonical){const u=new URL(canonical);u.pathname=target.publicPath;canonical=u.toString();}}catch(error){
      if (!(error instanceof TypeError)) throw error;
    }
    await deps.pageSeoRepository.save(clientId,{...seo,pageId:target.pageId,canonical,updatedAt:now()});}
    if(state)await deps.pageLayoutStateRepository.save(clientId,{...state,pageId:target.pageId,updatedAt:now()});
    if(content)await deps.pageVersionRepository.createSnapshot(clientId,{pageId:target.pageId,content:content.content});
    return target;
  }
  async function assignLayoutToPage(clientId:string,pageId:string,layoutId:string){
    const page=await assertPageBelongsToClient(clientId,pageId);const target=await getLayout(layoutId);const current=await deps.pageContentRepository.getByPageId(clientId,pageId);
    if(current)await deps.pageVersionRepository.createSnapshot(clientId,{pageId,content:current.content});
    let nextContent:Record<string,unknown>;
    let nextStorageContent:Record<string,unknown>;
    if(current){
      try{
        nextContent=validateLayoutContent(target.rendererKey,normalizeLegacyRichMediaForRenderer(current.content));
        nextStorageContent=current.content;
      }catch{
        nextContent=validateLayoutContent(target.rendererKey,normalizeLegacyRichMediaForRenderer(target.defaultContent));
        nextStorageContent=(mergeRendererPayloadIntoStoredContent({},target.defaultContent)??target.defaultContent) as Record<string,unknown>;
      }
    }else{
      nextContent=validateLayoutContent(target.rendererKey,normalizeLegacyRichMediaForRenderer(target.defaultContent));
      nextStorageContent=(mergeRendererPayloadIntoStoredContent({},target.defaultContent)??target.defaultContent) as Record<string,unknown>;
    }
    await deps.pageContentRepository.save(clientId,{pageId,schemaVersion:target.schemaVersion,content:nextStorageContent,updatedAt:now()});
    await syncLegacyDefaultContent(page,nextStorageContent,target);
    await deps.pageMetadataRepository.save({...page,layoutId:target.layoutId,updatedAt:now()});
    await deps.pageLayoutStateRepository.save(clientId,{pageId,layoutId:target.layoutId,variables:{},overrides:{},overridePaths:[],schemaVersion:target.schemaVersion,updatedAt:now()});
    return assertPageBelongsToClient(clientId,pageId);
  }
  async function clientVariables(clientId:string){await requireClient(clientId);return buildClientVariableMap({clientId,projectContentRepository:deps.projectContentRepository,studioClientTemplateStateRepository:deps.studioClientTemplateStateRepository});}
  async function resolvePageContent(clientId:string,pageId:string){
    const page=await assertPageBelongsToClient(clientId,pageId);const layout=await getLayout(page.layoutId);const row=await deps.pageContentRepository.getByPageId(clientId,pageId);
    if(!row)throw new PageDomainError(404,'Conteúdo da página não encontrado');
    const variables=await clientVariables(clientId);const validated=validateLayoutContent(layout.rendererKey,normalizeLegacyRichMediaForRenderer(row.content));
    const resolved=resolveTemplateVariablesInObject(validated,variables);
    if(layout.rendererKey!=='style-1')return resolved;
    const pageSeo=await deps.pageSeoRepository.getByPageId(clientId,pageId);
    if(!pageSeo)return resolved;
    const effectiveSeo=resolveTemplateVariablesInObject({
      title:pageSeo.title,
      description:pageSeo.description,
      canonical:pageSeo.canonical,
      ogImage:pageSeo.ogImage,
      jsonLd:pageSeo.jsonLd??{},
    },variables);
    return ContentSchema.parse({...resolved,seo:effectiveSeo});
  }
  async function validatePageVariables(clientId:string,pageId:string){
    const [content,seo,variables]=await Promise.all([getPageContent(clientId,pageId),getPageSeo(clientId,pageId),clientVariables(clientId)]);
    const placeholders=new Set<string>();
    for(const key of collectTemplatePlaceholders(content?.content??{}))placeholders.add(key);
    for(const key of collectTemplatePlaceholders(seo??{}))placeholders.add(key);
    const missing=[...placeholders].filter(key=>!variables[key]?.trim());
    return {ok:missing.length===0,missing,placeholders:[...placeholders]};
  }
  async function auditCrossClientContamination(clientId:string,pageId:string){
    const resolved = await resolvePageContent(clientId,pageId);
    return runCrossClientContaminationAudit({
      clientId, artifact: resolved,
      projectMetadataRepository: deps.projectMetadataRepository,
      projectContentRepository: deps.projectContentRepository,
    });
  }
  async function preparePageExport(clientId:string,pageId:string){
    const page=await assertPageBelongsToClient(clientId,pageId);
    if(page.status==='archived')throw new PageDomainError(409,'Página arquivada não pode ser exportada normalmente');
    const validation=await validatePageVariables(clientId,pageId);
    if(!validation.ok)throw new PageDomainError(422,`Variáveis não configuradas: ${validation.missing.join(', ')}`,{missing:validation.missing,placeholders:validation.placeholders});
    const content=await resolvePageContent(clientId,pageId);
    const contamination=await auditCrossClientContamination(clientId,pageId);
    if(!contamination.ok)throw new PageDomainError(409,'Export bloqueado por possível contaminação entre clientes',{evidence:contamination.evidence});
    return {page,content,validation,contamination};
  }
  return {listPagesByClientId,getDefaultPage,assertPageBelongsToClient,createPage,updatePageMetadata,archivePage,setDefaultPage,getPageContent,savePageContent,getPageSeo,savePageSeo,listPageVersions,restorePageVersion,duplicatePage,listLayouts,getLayout,assignLayoutToPage,clientVariables,resolvePageContent,validatePageVariables,auditCrossClientContamination,preparePageExport};
}
export type PagesService=ReturnType<typeof createPagesService>;
