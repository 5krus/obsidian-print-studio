import {execFile} from 'node:child_process';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {promisify} from 'node:util';
import type {OutputRequest} from './native-print';

export interface PrintDestination {printer:string;copies:number}
export type RunCommand=(command:string,args:string[])=>Promise<{stdout:string}>;
const execute=promisify(execFile);
const run:RunCommand=(command,args)=>execute(command,args,{encoding:'utf8',timeout:30_000,maxBuffer:1024*1024,env:{...process.env,LC_ALL:'C'}});
export async function listPrinters(command:RunCommand=run) {
  try {
    const {stdout}=await command('lpstat',['-e']);
    const names=stdout.trim().split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    if(!names.length)throw new Error('No printers configured');
    const preferred=await command('lpstat',['-d']).then(result=>result.stdout.trim().replace(/^system default destination: /,'')).catch(()=>'');
    return {names,preferred:names.includes(preferred)?preferred:names[0]};
  }catch{throw new Error('No system printers are available. Configure a printer in your system settings, or use Save PDF.');}
}
export function cupsArguments(path:string,request:OutputRequest,destination:PrintDestination) {
  if(!destination.printer || /[\r\n\0]/.test(destination.printer))throw new Error('Choose a printer.');
  if(!Number.isInteger(destination.copies) || destination.copies<1 || destination.copies>999)throw new Error('Copies must be between 1 and 999.');
  return ['-d',destination.printer,'-t',request.title,'-n',String(destination.copies),
    '-o',`media=${request.preset.paper}`,'-o',`PageSize=${request.preset.paper}`,
    '-o',`orientation-requested=${request.preset.orientation==='landscape'?4:3}`,
    '-o','fit-to-page','-o','sides=one-sided',path];
}
export async function submitPDF(data:Uint8Array,request:OutputRequest,destination:PrintDestination,command:RunCommand=run) {
  const directory=await mkdtemp(join(tmpdir(),'print-studio-'));
  try {
    const path=join(directory,'document.pdf');
    const args=cupsArguments(path,request,destination);
    await writeFile(path,data,{mode:0o600});
    // execFile passes arguments directly, never through a shell. lp copies the
    // document into the spool before it exits; temporary data can then go away.
    return (await command('lp',args)).stdout.trim();
  }finally{await rm(directory,{recursive:true,force:true});}
}
