import fs from 'node:fs/promises';
import path from 'node:path';
import { StudioPageLayoutStateSchema, type StudioPageLayoutState } from '../contracts/studioPages.js';

const DEFAULT_ROOT=path.resolve('data','projects');
export interface PageLayoutStateRepository{
  getByPageIdAndLayoutId(clientId:string,pageId:string,layoutId:string):Promise<StudioPageLayoutState|null>;
  save(clientId:string,state:StudioPageLayoutState):Promise<StudioPageLayoutState>;
}
export function createPageLayoutStateRepository(params:{projectsRootDir?:string}={}):PageLayoutStateRepository{
  const root=params.projectsRootDir??DEFAULT_ROOT;
  const file=(clientId:string,pageId:string)=>path.join(root,clientId,'pages',pageId,'layout-state.json');
  return {
    async getByPageIdAndLayoutId(clientId,pageId,layoutId){
      try{const state=StudioPageLayoutStateSchema.parse(JSON.parse(await fs.readFile(file(clientId,pageId),'utf8')));return state.layoutId===layoutId?state:null;}
      catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
    },
    async save(clientId,state){
      const parsed=StudioPageLayoutStateSchema.parse(state);const target=file(clientId,parsed.pageId);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,JSON.stringify(parsed,null,2)+'\n','utf8');return parsed;
    },
  };
}
