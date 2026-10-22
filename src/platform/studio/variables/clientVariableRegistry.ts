import type { ClientVariableDefinition } from '../../contracts/studioVariables.js';

export const CLIENT_VARIABLE_REGISTRY: readonly ClientVariableDefinition[] = [
  { key:'brand', label:'Nome da marca', group:'Empresa', source:'content.global.brand', insertable:true },
  { key:'cnpj', label:'CNPJ', group:'Empresa', source:'content.global.cnpj', insertable:true },
  { key:'yearsInMarket', label:'Anos de mercado', group:'Empresa', source:'template-state.variables.yearsInMarket', insertable:true },
  { key:'projectCount', label:'Número de projetos', group:'Empresa', source:'template-state.variables.projectCount', insertable:true },
  { key:'city', label:'Cidade', group:'Localização', source:'content.global.city', insertable:true },
  { key:'address', label:'Endereço', group:'Localização', source:'content.global.address', insertable:true },
  { key:'whatsappE164', label:'WhatsApp', group:'Contato', source:'content.global.whatsappE164', insertable:true },
  { key:'whatsappDigits', label:'WhatsApp (dígitos)', group:'Contato', source:'content.global.whatsappDigits', insertable:true },
  { key:'businessPhone', label:'Telefone', group:'Contato', source:'content.global.businessPhone', insertable:true },
  { key:'siteUrl', label:'URL do site', group:'Site', source:'content.global.siteUrl', insertable:true },
  { key:'prefix', label:'Prefixo', group:'Site', source:'template-state.variables.prefix', insertable:true },
  { key:'logo', label:'Logo', group:'Marca', source:'content.global.logo', insertable:true },
  { key:'webhookUrl', label:'Webhook principal', group:'Operacional', source:'content.global.webhookUrl', insertable:false },
  { key:'secondaryWebhookUrl', label:'Webhook secundário', group:'Operacional', source:'content.global.secondaryWebhookUrl', insertable:false },
] as const;

export const INSERTABLE_CLIENT_VARIABLES = CLIENT_VARIABLE_REGISTRY.filter((item) => item.insertable);
