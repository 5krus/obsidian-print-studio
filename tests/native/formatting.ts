import {writeFile} from 'node:fs/promises';
import {NativePrinter,type DesktopBridge,type OutputRequest} from '../../src/native-print';

/** Real Electron output; only the filename dialog and physical submission are replaced. */
export async function captureFormatting(desktop:DesktopBridge,request:OutputRequest,prefix:string) {
  const paths:string[]=[];
  await writeFile(`${prefix}.html`,request.html);
  await writeFile(`${prefix}.json`,JSON.stringify(request));
  for(const kind of ['pdf','print'] as const) {
    const path=`${prefix}-${kind}.pdf`;
    const printer=new NativePrinter({BrowserWindow:desktop.BrowserWindow,dialog:{showSaveDialog:async()=>({canceled:false,filePath:path})}},async data=>{await writeFile(path,data);},'linux');
    try {await printer.output({...request,kind});paths.push(path);}finally{printer.dispose();}
  }
  return paths;
}
