export interface LayoutWarning {page:number;kind:'header'|'footer'|'table'|'content'}
export type FrameMessage =
  | {type:'ready'; token:string; pages:number}
  | {type:'viewport'; token:string; page:number}
  | {type:'warnings'; token:string; warnings:LayoutWarning[]}
  | {type:'error'; token:string; message:string}
  | {type:'exported'; token:string; html:string};
export type FrameCommand =
  | {type:'theme'; token:string; scheme:'light'|'dark'}
  | {type:'page'; token:string; page:number}
  | {type:'zoom'; token:string; value:string}
  | {type:'print'|'export'; token:string};
const record=(data:unknown):Record<string,unknown>|undefined=>data!==null && typeof data==='object'?data as Record<string,unknown>:undefined;
const pageNumber=(value:unknown):value is number=>typeof value==='number' && Number.isInteger(value) && value>0 && value<=10000;
export function frameMessage(data:unknown):FrameMessage|undefined {
  const value=record(data);if(!value || typeof value.token!=='string')return;
  const token=value.token;
  if(value.type==='ready' && pageNumber(value.pages))return {type:'ready',token,pages:value.pages};
  if(value.type==='viewport' && pageNumber(value.page))return {type:'viewport',token,page:value.page};
  if(value.type==='warnings' && Array.isArray(value.warnings) && value.warnings.length<=200) {
    const warnings:LayoutWarning[]=[];
    for(const item of value.warnings) {
      const warning=record(item);
      if(!warning || !pageNumber(warning.page) || !['header','footer','table','content'].includes(String(warning.kind)))return;
      warnings.push({page:warning.page,kind:warning.kind as LayoutWarning['kind']});
    }
    return {type:'warnings',token,warnings};
  }
  if(value.type==='error' && typeof value.message==='string')return {type:'error',token,message:value.message.slice(0,1000)};
  if(value.type==='exported' && typeof value.html==='string')return {type:'exported',token,html:value.html};
}
export function frameCommand(data:unknown):FrameCommand|undefined {
  const value=record(data);if(!value || typeof value.token!=='string')return;
  const token=value.token;
  if(value.type==='print' || value.type==='export')return {type:value.type,token};
  if(value.type==='theme' && (value.scheme==='dark' || value.scheme==='light'))return {type:'theme',token,scheme:value.scheme};
  if(value.type==='page' && pageNumber(value.page))return {type:'page',token,page:value.page};
  if(value.type==='zoom' && typeof value.value==='string' && ['fit','0.5','0.75','1','1.25','1.5','2'].includes(value.value))return {type:'zoom',token,value:value.value};
}
