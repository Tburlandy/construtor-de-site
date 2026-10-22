import { useEffect, useMemo, useState } from 'react';
import { Braces, Check, Copy, Search } from 'lucide-react';
import type { ClientVariableValue } from '@/platform/contracts/studioVariables';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

function insertAtFocusedField(placeholder:string):boolean{
  const element=document.activeElement;
  if(!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return false;
  const start=element.selectionStart??element.value.length; const end=element.selectionEnd??start;
  element.setRangeText(placeholder,start,end,'end');
  element.dispatchEvent(new Event('input',{bubbles:true}));
  element.focus();
  return true;
}

export function BuilderVariablesPopover({clientId}:{clientId:string}){
  const [open,setOpen]=useState(false); const [query,setQuery]=useState(''); const [values,setValues]=useState<ClientVariableValue[]>([]); const [copied,setCopied]=useState('');
  const {toast}=useToast();
  useEffect(()=>{if(!open||!clientId)return;void fetch(`/api/clients/${encodeURIComponent(clientId)}/variables`).then(r=>r.ok?r.json():[]).then(setValues).catch(()=>setValues([]));},[open,clientId]);
  const filtered=useMemo(()=>values.filter(item=>(item.definition.label+' '+item.definition.key+' '+item.definition.group).toLowerCase().includes(query.toLowerCase())),[values,query]);
  const groups=useMemo(()=>Object.entries(filtered.reduce<Record<string,ClientVariableValue[]>>((acc,item)=>{(acc[item.definition.group]??=[]).push(item);return acc;},{})),[filtered]);
  const insertOrCopyPlaceholder=async(item:ClientVariableValue)=>{
    const placeholder='{{'+item.definition.key+'}}';
    if(insertAtFocusedField(placeholder)){toast({title:'Variável inserida',description:placeholder});return;}
    await navigator.clipboard.writeText(placeholder);setCopied(item.definition.key);setTimeout(()=>setCopied(''),1200);toast({title:'Placeholder copiado',description:placeholder});
  };
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button type="button" variant="outline" className="h-10 border-[var(--builder-border)] bg-[var(--builder-bg-surface)]"><Braces className="mr-2 h-4 w-4"/>Variáveis</Button></PopoverTrigger>
    <PopoverContent className="w-[380px] border-[var(--builder-border)] bg-[#0f172a] p-3 text-[var(--builder-text-primary)]" align="end">
      <div className="mb-3 flex items-center gap-2"><Search className="h-4 w-4 opacity-60"/><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar variável..."/></div>
      <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
        {groups.map(([group,items])=><section key={group}><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--builder-text-muted)]">{group}</p><div className="space-y-1">{items.map(item=><button key={item.definition.key} type="button" onClick={()=>void insertOrCopyPlaceholder(item)} className="flex w-full items-center gap-2 rounded-md border border-transparent px-2 py-2 text-left hover:border-[var(--builder-border)] hover:bg-[var(--builder-bg-surface-highlight)]">
          <div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.definition.label}</p><p className="font-mono text-xs text-cyan-300">{'{{'+item.definition.key+'}}'}</p><p className="truncate text-xs text-[var(--builder-text-muted)]">{item.configured?item.value:'Não configurada'}</p></div>
          {copied===item.definition.key?<Check className="h-4 w-4"/>:<Copy className="h-4 w-4 opacity-60"/>}
        </button>)}</div></section>)}
        {groups.length===0?<p className="py-6 text-center text-sm text-[var(--builder-text-muted)]">Nenhuma variável encontrada.</p>:null}
      </div>
    </PopoverContent>
  </Popover>;
}
