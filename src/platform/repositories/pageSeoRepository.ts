import fs from 'node:fs/promises';
import path from 'node:path';
import { StudioPageSeoConfigSchema, type StudioPageSeoConfig } from '../contracts/studioPages.js';

const DEFAULT_ROOT = path.resolve('data', 'projects');
export interface PageSeoRepository {
  getByPageId(clientId: string, pageId: string): Promise<StudioPageSeoConfig | null>;
  save(clientId: string, record: StudioPageSeoConfig): Promise<StudioPageSeoConfig>;
}
export function createPageSeoRepository(params: { projectsRootDir?: string } = {}): PageSeoRepository {
  const root=params.projectsRootDir ?? DEFAULT_ROOT;
  const file=(clientId:string,pageId:string)=>path.join(root,clientId,'pages',pageId,'seo.json');
  return {
    async getByPageId(clientId,pageId) {
      try { return StudioPageSeoConfigSchema.parse(JSON.parse(await fs.readFile(file(clientId,pageId),'utf8'))); }
      catch(error){ if((error as NodeJS.ErrnoException).code==='ENOENT') return null; throw error; }
    },
    async save(clientId,record) {
      const parsed=StudioPageSeoConfigSchema.parse(record);
      const target=file(clientId,parsed.pageId); await fs.mkdir(path.dirname(target),{recursive:true});
      await fs.writeFile(target,JSON.stringify(parsed,null,2)+'\n','utf8'); return parsed;
    },
  };
}
