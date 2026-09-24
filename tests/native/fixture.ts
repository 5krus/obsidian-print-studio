import {readdir,readFile,writeFile} from 'node:fs/promises';
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
    for(const kind of ['pdf','print'] as const) {
      const filePath=join(folder,kind==='pdf'?'native.pdf':'linux-print.pdf');
      let submitted=false;
      const printer=new NativePrinter({BrowserWindow:desktop.BrowserWindow,dialog:{showSaveDialog:async()=>({canceled:false,filePath})}},async data=>{
        await writeFile(filePath,data);submitted=true;
      },'linux');
      try {
        await printer.output({...request,kind});
        if(submitted!==(kind==='print'))throw new Error('Unexpected print submission');
        generated.push(filePath);
      } finally {printer.dispose();}
    }
  }
  if(generated.length!==16)throw new Error(`Expected sixteen outputs; found ${generated.length}. Run npm run test:browser first.`);
  return generated;
}
