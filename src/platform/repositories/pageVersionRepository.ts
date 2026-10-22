import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { StudioPageVersionRecordSchema, type StudioPageVersionRecord } from '../contracts/studioPages.js';

const DEFAULT_ROOT=path.resolve('data','projects');
export interface PageVersionRepository {
  listByPageId(clientId:string,pageId:string):Promise<StudioPageVersionRecord[]>;
  getByPageIdAndVersionId(clientId:string,pageId:string,versionId:string):Promise<StudioPageVersionRecord|null>;
  createSnapshot(clientId:string,params:{pageId:string;content:Record<string,unknown>;versionId?:string;createdAt?:string}):Promise<StudioPageVersionRecord>;
}
export function createPageVersionRepository(params:{projectsRootDir?:string}={}):PageVersionRepository{
  const root=params.projectsRootDir??DEFAULT_ROOT;
  const dir=(clientId:string,pageId:string)=>path.join(root,clientId,'pages',pageId,'versions');
  const file=(clientId:string,pageId:string,versionId:string)=>path.join(dir(clientId,pageId),versionId+'.json');
  return {
    async listByPageId(clientId,pageId){
      let names:string[]; try{names=await fs.readdir(dir(clientId,pageId));}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return[];throw error;}
      const rows=(await Promise.all(names.filter(n=>n.endsWith('.json')).map(async n=>{
        const raw=await fs.readFile(path.join(dir(clientId,pageId),n),'utf8'); return StudioPageVersionRecordSchema.parse(JSON.parse(raw));
      }))); return rows.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    },
    async getByPageIdAndVersionId(clientId,pageId,versionId){
      try{return StudioPageVersionRecordSchema.parse(JSON.parse(await fs.readFile(file(clientId,pageId,versionId),'utf8')));}
      catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
    },
    async createSnapshot(clientId,p){
      const row=StudioPageVersionRecordSchema.parse({pageId:p.pageId,versionId:p.versionId??('v-'+Date.now()+'-'+randomUUID()),content:p.content,createdAt:p.createdAt??new Date().toISOString()});
      await fs.mkdir(dir(clientId,p.pageId),{recursive:true}); await fs.writeFile(file(clientId,p.pageId,row.versionId),JSON.stringify(row,null,2)+'\n','utf8'); return row;
    },
  };
}
