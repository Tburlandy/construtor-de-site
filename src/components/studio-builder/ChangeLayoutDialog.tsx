import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function ChangeLayoutDialog({open,onOpenChange,onConfirm,changing}:{open:boolean;onOpenChange:(open:boolean)=>void;onConfirm:()=>void;changing:boolean}){
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="border-[var(--builder-border)] bg-[#0f172a] text-[var(--builder-text-primary)]"><DialogHeader><DialogTitle>Trocar layout?</DialogTitle></DialogHeader><p className="text-sm text-[var(--builder-text-secondary)]">A estrutura pode ser incompatível. O sistema criará um snapshot antes da troca e usará o conteúdo padrão do novo layout quando não houver compatibilidade.</p><DialogFooter><Button variant="outline" onClick={()=>onOpenChange(false)}>Cancelar</Button><Button disabled={changing} onClick={onConfirm}>{changing?'Trocando...':'Trocar layout'}</Button></DialogFooter></DialogContent></Dialog>;
}
