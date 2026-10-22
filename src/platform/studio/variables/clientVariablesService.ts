import type { ProjectContentRepository } from '../../repositories/projectContentRepository.js';
import type { StudioClientTemplateStateRepository } from '../../repositories/studioClientTemplateStateRepository.js';
import { CLIENT_VARIABLE_REGISTRY } from './clientVariableRegistry.js';

export type ClientVariableMap = Record<string,string>;

function asString(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '';
}
function logoValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  const object=value as Record<string,unknown>;
  if (typeof object.originalUrl === 'string') return object.originalUrl;
  const variants=object.variants;
  if (variants && typeof variants==='object') {
    const fallback=(variants as Record<string,unknown>).fallback;
    if (fallback && typeof fallback==='object' && typeof (fallback as Record<string,unknown>).url==='string') {
      return (fallback as Record<string,string>).url;
    }
  }
  return '';
}

export async function buildClientVariableMap(params:{
  clientId:string;
  projectContentRepository:ProjectContentRepository;
  studioClientTemplateStateRepository:StudioClientTemplateStateRepository;
}):Promise<ClientVariableMap>{
  const [contentRecord,state]=await Promise.all([
    params.projectContentRepository.getByProjectId(params.clientId),
    params.studioClientTemplateStateRepository.getByProjectId(params.clientId),
  ]);
  const root=(contentRecord?.content??{}) as Record<string,unknown>;
  const global=(root.global && typeof root.global==='object' ? root.global : {}) as Record<string,unknown>;
  const stateVariables=(state?.variables??{}) as Record<string,unknown>;
  const result:ClientVariableMap={};
  for(const definition of CLIENT_VARIABLE_REGISTRY){
    const stateValue=stateVariables[definition.key];
    const globalValue=global[definition.key];
    const value=definition.key==='logo'
      ? logoValue(stateValue || globalValue)
      : asString(stateValue !== undefined && stateValue !== '' ? stateValue : globalValue);
    result[definition.key]=value;
  }
  return result;
}
