import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import type { StudioPageMetadata } from '@/platform/contracts/studioPages';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export type BuilderPageSwitcherProps = {
  pages: StudioPageMetadata[];
  currentPageId?: string | null;
  loading?: boolean;
  onSelect: (pageId: string) => void;
  onCreate: () => void;
  className?: string;
};

export function BuilderPageSwitcher({pages,currentPageId,loading=false,onSelect,onCreate,className}:BuilderPageSwitcherProps){
  const [open,setOpen]=useState(false);
  const options=useMemo(()=>pages.filter(p=>p.status!=='archived').sort((a,b)=>Number(b.isDefault)-Number(a.isDefault)||a.name.localeCompare(b.name,'pt-BR',{numeric:true})),[pages]);
  const current=options.find(p=>p.pageId===currentPageId)??pages.find(p=>p.pageId===currentPageId);
  return <div className={cn('min-w-[220px] shrink-0',className)}>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="builder-focus-ring flex h-10 w-full items-center justify-between rounded-[var(--builder-radius-md)] border border-[var(--builder-border)] bg-[var(--builder-bg-surface)] px-3 text-left text-sm font-medium text-[var(--builder-text-primary)] hover:bg-[var(--builder-bg-surface-highlight)]">
          <span className="min-w-0 truncate">{loading?'Carregando páginas...':current?.name??'Selecione uma página'}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60"/>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] border-[var(--builder-border)] bg-[#0f172a] p-0" align="start">
        <Command className="bg-transparent text-[var(--builder-text-primary)]">
          <CommandInput placeholder="Buscar página..." />
          <CommandList>
            <CommandEmpty>Nenhuma página encontrada.</CommandEmpty>
            {options.map(page=><CommandItem key={page.pageId} value={page.name+' '+page.publicPath} onSelect={()=>{onSelect(page.pageId);setOpen(false);}}>
              <Check className={cn('mr-2 h-4 w-4',page.pageId===currentPageId?'opacity-100':'opacity-0')}/>
              <span className="min-w-0 flex-1 truncate">{page.name}</span>
              <span className="ml-2 text-xs opacity-60">{page.publicPath}</span>
            </CommandItem>)}
            <CommandSeparator/>
            <CommandItem value="nova pagina" onSelect={()=>{setOpen(false);onCreate();}}>
              <Plus className="mr-2 h-4 w-4"/>Nova página
            </CommandItem>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  </div>;
}
