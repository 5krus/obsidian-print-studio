import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {NativePrinter,type DesktopBridge,type OutputRequest} from '../../src/native-print';

// Called inside Obsidian by scripts/validate-native.mjs. Use synthetic snapshots
// from the browser suite and substitute only the save dialog, never the engine.
export async function validate(desktop:DesktopBridge,results:string) {
  const generated:string[]=[];
  for(const entry of await readdir(results,{withFileTypes:true})) {
    if(!entry.isDirectory())continue;
    const folder=join(results,entry.name);
    let request:OutputRequest;
    try {request=JSON.parse(await readFile(join(folder,'native-request.json'),'utf8'));}
    catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')continue;throw error;}
    const filePath=join(folder,'native.pdf');
    const printer=new NativePrinter({BrowserWindow:desktop.BrowserWindow,dialog:{showSaveDialog:async()=>({canceled:false,filePath})}});
    try {await printer.output(request);generated.push(filePath);}
    finally {printer.dispose();}
  }
  if(generated.length!==8)throw new Error(`Expected eight browser snapshots; found ${generated.length}. Run npm run test:browser first.`);
  return generated;
}
