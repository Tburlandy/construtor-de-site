import type { SupabaseClient } from '@supabase/supabase-js';
import {
  StudioPageContentRecordSchema,
  StudioPageLayoutStateSchema,
  StudioPageMetadataSchema,
  StudioPageSeoConfigSchema,
  StudioPageVersionRecordSchema,
  type StudioPageContentRecord,
  type StudioPageLayoutState,
  type StudioPageMetadata,
  type StudioPageSeoConfig,
  type StudioPageVersionRecord,
} from '../contracts/studioPages.js';
import { StudioLayoutRecordSchema, type StudioLayoutRecord } from '../contracts/studioLayouts.js';
import type { PageMetadataRepository } from './pageMetadataRepository.js';
import type { PageContentRepository } from './pageContentRepository.js';
import type { PageSeoRepository } from './pageSeoRepository.js';
import type { PageVersionRepository } from './pageVersionRepository.js';
import type { PageLayoutStateRepository } from './pageLayoutStateRepository.js';
import type { LayoutRepository } from './layoutRepository.js';

function iso(value: unknown): string { return typeof value === 'string' ? value : new Date().toISOString(); }
function throwIf(error: { message?: string } | null): void { if (error) throw new Error(error.message ?? 'Supabase error'); }

function mapPage(row: Record<string, unknown>): StudioPageMetadata {
  return StudioPageMetadataSchema.parse({pageId:row.page_id,clientId:row.client_id,name:row.name,slug:row.slug,publicPath:row.public_path,layoutId:row.layout_id,status:row.status,isDefault:row.is_default,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});
}
function mapContent(row: Record<string, unknown>): StudioPageContentRecord {
  return StudioPageContentRecordSchema.parse({pageId:row.page_id,schemaVersion:row.schema_version??undefined,content:row.content,updatedAt:iso(row.updated_at)});
}
function mapSeo(row: Record<string, unknown>): StudioPageSeoConfig {
  return StudioPageSeoConfigSchema.parse({pageId:row.page_id,title:row.title??'',description:row.description??'',canonical:row.canonical??'',ogImage:row.og_image??'',jsonLd:row.json_ld??undefined,robotsDirective:row.robots_directive??'index,follow',updatedAt:iso(row.updated_at)});
}
function mapVersion(row: Record<string, unknown>): StudioPageVersionRecord {
  return StudioPageVersionRecordSchema.parse({pageId:row.page_id,versionId:row.version_id,content:row.content,createdAt:iso(row.created_at)});
}
function mapState(row: Record<string, unknown>): StudioPageLayoutState {
  return StudioPageLayoutStateSchema.parse({pageId:row.page_id,layoutId:row.layout_id,variables:row.variables??{},overrides:row.overrides??{},overridePaths:row.override_paths??[],schemaVersion:row.schema_version??undefined,updatedAt:iso(row.updated_at)});
}
function mapLayout(row: Record<string, unknown>): StudioLayoutRecord {
  return StudioLayoutRecordSchema.parse({layoutId:row.template_key,name:row.name??row.template_key,description:row.description??'',rendererKey:row.renderer_key??row.template_key,schemaVersion:row.schema_version??undefined,defaultContent:row.default_content??row.content??{},manifest:row.manifest??{},status:row.status??'active',createdAt:iso(row.created_at??row.updated_at),updatedAt:iso(row.updated_at)});
}

export function createSupabasePageMetadataRepository(client: SupabaseClient): PageMetadataRepository {
  return {
    async listByClientId(clientId){const {data,error}=await client.from('studio_pages').select('*').eq('client_id',clientId).order('is_default',{ascending:false}).order('name');throwIf(error);return (data??[]).map(row=>mapPage(row));},
    async getByPageId(pageId){const {data,error}=await client.from('studio_pages').select('*').eq('page_id',pageId).maybeSingle();throwIf(error);return data?mapPage(data):null;},
    async save(page){const p=StudioPageMetadataSchema.parse(page);const {data,error}=await client.from('studio_pages').upsert({page_id:p.pageId,client_id:p.clientId,name:p.name,slug:p.slug,public_path:p.publicPath,layout_id:p.layoutId,status:p.status,is_default:p.isDefault,created_at:p.createdAt,updated_at:p.updatedAt},{onConflict:'page_id'}).select('*').single();throwIf(error);return mapPage(data);},
    async setDefault(clientId,pageId){
      const target=await client.from('studio_pages').select('page_id').eq('client_id',clientId).eq('page_id',pageId).maybeSingle();throwIf(target.error);if(!target.data)throw new Error('Página não encontrada para o cliente');
      const off=await client.from('studio_pages').update({is_default:false,updated_at:new Date().toISOString()}).eq('client_id',clientId).eq('is_default',true);throwIf(off.error);
      const on=await client.from('studio_pages').update({is_default:true,updated_at:new Date().toISOString()}).eq('client_id',clientId).eq('page_id',pageId);throwIf(on.error);
    },
  };
}
export function createSupabasePageContentRepository(client:SupabaseClient):PageContentRepository{return{
  async getByPageId(_clientId,pageId){const {data,error}=await client.from('studio_page_contents').select('*').eq('page_id',pageId).maybeSingle();throwIf(error);return data?mapContent(data):null;},
  async save(_clientId,record){const r=StudioPageContentRecordSchema.parse(record);const {data,error}=await client.from('studio_page_contents').upsert({page_id:r.pageId,schema_version:r.schemaVersion??null,content:r.content,updated_at:r.updatedAt},{onConflict:'page_id'}).select('*').single();throwIf(error);return mapContent(data);}
};}
export function createSupabasePageSeoRepository(client:SupabaseClient):PageSeoRepository{return{
  async getByPageId(_clientId,pageId){const {data,error}=await client.from('studio_page_seo_configs').select('*').eq('page_id',pageId).maybeSingle();throwIf(error);return data?mapSeo(data):null;},
  async save(_clientId,record){const r=StudioPageSeoConfigSchema.parse(record);const {data,error}=await client.from('studio_page_seo_configs').upsert({page_id:r.pageId,title:r.title,description:r.description,canonical:r.canonical,og_image:r.ogImage,json_ld:r.jsonLd??null,robots_directive:r.robotsDirective,updated_at:r.updatedAt},{onConflict:'page_id'}).select('*').single();throwIf(error);return mapSeo(data);}
};}
export function createSupabasePageVersionRepository(client:SupabaseClient):PageVersionRepository{return{
  async listByPageId(_clientId,pageId){const {data,error}=await client.from('studio_page_versions').select('*').eq('page_id',pageId).order('created_at',{ascending:false});throwIf(error);return(data??[]).map(row=>mapVersion(row));},
  async getByPageIdAndVersionId(_clientId,pageId,versionId){const {data,error}=await client.from('studio_page_versions').select('*').eq('page_id',pageId).eq('version_id',versionId).maybeSingle();throwIf(error);return data?mapVersion(data):null;},
  async createSnapshot(_clientId,p){const row={page_id:p.pageId,version_id:p.versionId??('v-'+Date.now()+'-'+crypto.randomUUID()),content:p.content,created_at:p.createdAt??new Date().toISOString()};const {data,error}=await client.from('studio_page_versions').insert(row).select('*').single();throwIf(error);return mapVersion(data);}
};}
export function createSupabasePageLayoutStateRepository(client:SupabaseClient):PageLayoutStateRepository{return{
  async getByPageIdAndLayoutId(_clientId,pageId,layoutId){const {data,error}=await client.from('studio_page_layout_states').select('*').eq('page_id',pageId).eq('layout_id',layoutId).maybeSingle();throwIf(error);return data?mapState(data):null;},
  async save(_clientId,state){const s=StudioPageLayoutStateSchema.parse(state);const {data,error}=await client.from('studio_page_layout_states').upsert({page_id:s.pageId,layout_id:s.layoutId,variables:s.variables,overrides:s.overrides,override_paths:s.overridePaths,schema_version:s.schemaVersion??null,updated_at:s.updatedAt},{onConflict:'page_id,layout_id'}).select('*').single();throwIf(error);return mapState(data);}
};}
export function createSupabaseLayoutRepository(client:SupabaseClient):LayoutRepository{return{
  async list(){const {data,error}=await client.from('studio_base_templates').select('*').neq('status','archived').order('template_key');throwIf(error);return(data??[]).map(row=>mapLayout(row));},
  async getByLayoutId(layoutId){const {data,error}=await client.from('studio_base_templates').select('*').eq('template_key',layoutId).maybeSingle();throwIf(error);return data?mapLayout(data):null;}
};}
