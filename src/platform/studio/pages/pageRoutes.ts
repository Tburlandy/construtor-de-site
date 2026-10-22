import express from 'express';
import { z } from 'zod';
import type { PagesService } from './pagesService.js';
import { PageDomainError } from './pagesService.js';
import { INSERTABLE_CLIENT_VARIABLES } from '../variables/clientVariableRegistry.js';

const CreateSchema=z.object({name:z.string().trim().min(1),layoutId:z.string().trim().min(1),publicPath:z.string().trim().min(1),slug:z.string().optional()});
const PatchSchema=z.object({name:z.string().optional(),slug:z.string().optional(),publicPath:z.string().optional(),status:z.enum(['draft','active','archived']).optional(),isDefault:z.boolean().optional()});
const DuplicateSchema=z.object({name:z.string().optional(),publicPath:z.string().optional()});
const LayoutSchema=z.object({layoutId:z.string().trim().min(1)});
const SeoSchema=z.object({title:z.string(),description:z.string(),canonical:z.string(),ogImage:z.string(),jsonLd:z.unknown().optional(),robotsDirective:z.enum(['index,follow','noindex,follow'])});

function sendError(res:express.Response,error:unknown){
  if(error instanceof PageDomainError)return res.status(error.statusCode).json({error:error.message,...error.payload});
  if(error instanceof z.ZodError)return res.status(400).json({error:'Payload inválido',details:error.flatten()});
  console.error('[pages-api]',error);return res.status(500).json({error:'Erro interno no domínio de páginas'});
}

export function createPagesRouter(service:PagesService, options:{ exportPageZip?: (clientId:string,pageId:string)=>Promise<unknown>; publishPage?: (clientId:string,pageId:string,payload:unknown)=>Promise<unknown> } = {}){
  const router=express.Router();
  const asyncRoute=(fn:(req:express.Request,res:express.Response)=>Promise<unknown>)=>(req:express.Request,res:express.Response)=>{void fn(req,res).catch(error=>sendError(res,error));};

  router.get('/api/layouts',asyncRoute(async(_req,res)=>res.json(await service.listLayouts())));
  router.get('/api/layouts/:layoutId',asyncRoute(async(req,res)=>res.json(await service.getLayout(req.params.layoutId))));
  router.get('/api/clients/:clientId/variables',asyncRoute(async(req,res)=>{
    const values=await service.clientVariables(req.params.clientId);
    res.json(INSERTABLE_CLIENT_VARIABLES.map(definition=>({definition,value:values[definition.key]??'',configured:Boolean(values[definition.key]?.trim())})));
  }));
  router.get('/api/clients/:clientId/pages',asyncRoute(async(req,res)=>res.json(await service.listPagesByClientId(req.params.clientId))));
  router.post('/api/clients/:clientId/pages',asyncRoute(async(req,res)=>{ const body=CreateSchema.parse(req.body); res.status(201).json(await service.createPage({clientId:req.params.clientId,name:body.name,layoutId:body.layoutId,publicPath:body.publicPath,slug:body.slug})); }));
  router.get('/api/clients/:clientId/pages/:pageId',asyncRoute(async(req,res)=>res.json(await service.assertPageBelongsToClient(req.params.clientId,req.params.pageId))));
  router.put('/api/clients/:clientId/pages/:pageId',asyncRoute(async(req,res)=>res.json(await service.updatePageMetadata(req.params.clientId,req.params.pageId,PatchSchema.parse(req.body)))));
  router.post('/api/clients/:clientId/pages/:pageId/archive',asyncRoute(async(req,res)=>res.json(await service.archivePage(req.params.clientId,req.params.pageId))));
  router.post('/api/clients/:clientId/pages/:pageId/export-zip',asyncRoute(async(req,res)=>{
    await service.assertPageBelongsToClient(req.params.clientId,req.params.pageId);
    if(!options.exportPageZip)return res.status(501).json({error:'Exportação de página não configurada neste runtime'});
    res.status(201).json(await options.exportPageZip(req.params.clientId,req.params.pageId));
  }));
  router.post('/api/clients/:clientId/pages/:pageId/publish',asyncRoute(async(req,res)=>{
    await service.assertPageBelongsToClient(req.params.clientId,req.params.pageId);
    if(!options.publishPage)return res.status(501).json({error:'Publicação de página não configurada neste runtime'});
    res.status(201).json(await options.publishPage(req.params.clientId,req.params.pageId,req.body));
  }));
  router.post('/api/clients/:clientId/pages/:pageId/duplicate',asyncRoute(async(req,res)=>res.status(201).json(await service.duplicatePage(req.params.clientId,req.params.pageId,DuplicateSchema.parse(req.body??{})))));
  router.get('/api/clients/:clientId/pages/:pageId/content',asyncRoute(async(req,res)=>{
    await service.assertPageBelongsToClient(req.params.clientId,req.params.pageId);res.json({content:await service.resolvePageContent(req.params.clientId,req.params.pageId)});
  }));
  router.put('/api/clients/:clientId/pages/:pageId/content',asyncRoute(async(req,res)=>res.json(await service.savePageContent(req.params.clientId,req.params.pageId,req.body))));
  router.get('/api/clients/:clientId/pages/:pageId/seo',asyncRoute(async(req,res)=>res.json(await service.getPageSeo(req.params.clientId,req.params.pageId))));
  router.put('/api/clients/:clientId/pages/:pageId/seo',asyncRoute(async(req,res)=>res.json(await service.savePageSeo(req.params.clientId,req.params.pageId,SeoSchema.parse(req.body)))));
  router.get('/api/clients/:clientId/pages/:pageId/versions',asyncRoute(async(req,res)=>res.json(await service.listPageVersions(req.params.clientId,req.params.pageId))));
  router.post('/api/clients/:clientId/pages/:pageId/versions/:versionId/restore',asyncRoute(async(req,res)=>res.json(await service.restorePageVersion(req.params.clientId,req.params.pageId,req.params.versionId))));
  router.put('/api/clients/:clientId/pages/:pageId/layout',asyncRoute(async(req,res)=>res.json(await service.assignLayoutToPage(req.params.clientId,req.params.pageId,LayoutSchema.parse(req.body).layoutId))));
  router.get('/api/clients/:clientId/pages/:pageId/variables/validate',asyncRoute(async(req,res)=>{const result=await service.validatePageVariables(req.params.clientId,req.params.pageId);res.status(result.ok?200:422).json(result);}));
  return router;
}
