import { useEffect, useMemo, useState } from 'react';
import type { StudioLayoutRecord } from '@/platform/contracts/studioLayouts';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function CreatePageDialog(props:{
  open:boolean; onOpenChange:(open:boolean)=>void; layouts:StudioLayoutRecord[];
  creating:boolean; onCreate:(input:{name:string;layoutId:string;publicPath:string})=>Promise<void>;
}){
  const firstLayout=useMemo(()=>props.layouts.find(l=>l.status==='active')?.layoutId??'',[props.layouts]);
  const [name,setName]=useState(''); const [layoutId,setLayoutId]=useState(''); const [publicPath,setPublicPath]=useState('');
  useEffect(()=>{if(props.open){setName('');setLayoutId(firstLayout);setPublicPath('');}},[props.open,firstLayout]);
  useEffect(()=>{if(!publicPath && name.trim()){const slug=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');setPublicPath('/'+slug);}},[name,publicPath]);
  return <Dialog open={props.open} onOpenChange={props.onOpenChange}>
    <DialogContent className="border-[var(--builder-border)] bg-[#0f172a] text-[var(--builder-text-primary)] sm:max-w-md">
      <DialogHeader><DialogTitle>Nova página</DialogTitle></DialogHeader>
      <div className="grid gap-4 py-2">
        <div className="grid gap-2"><Label htmlFor="new-page-name">Nome</Label><Input id="new-page-name" value={name} onChange={e=>setName(e.target.value)} placeholder="Fale Conosco 2"/></div>
        <div className="grid gap-2"><Label>Layout</Label><Select value={layoutId} onValueChange={setLayoutId}><SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent>{props.layouts.filter(l=>l.status==='active').map(l=><SelectItem key={l.layoutId} value={l.layoutId}>{l.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-2"><Label htmlFor="new-page-path">Path</Label><Input id="new-page-path" value={publicPath} onChange={e=>setPublicPath(e.target.value)} placeholder="/fale-conosco-2"/></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={()=>props.onOpenChange(false)}>Cancelar</Button><Button disabled={props.creating||!name.trim()||!layoutId||!publicPath.trim()} onClick={()=>void props.onCreate({name,layoutId,publicPath})}>{props.creating?'Criando...':'Criar página'}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
