import type { StudioLayoutRecord } from '@/platform/contracts/studioLayouts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function BuilderLayoutSelector({layouts,value,onChange,disabled=false}:{layouts:StudioLayoutRecord[];value:string;onChange:(layoutId:string)=>void;disabled?:boolean}){
  return <Select value={value} onValueChange={onChange} disabled={disabled}><SelectTrigger><SelectValue placeholder="Layout"/></SelectTrigger><SelectContent>{layouts.filter(l=>l.status==='active').map(layout=><SelectItem key={layout.layoutId} value={layout.layoutId}>{layout.name}</SelectItem>)}</SelectContent></Select>;
}
