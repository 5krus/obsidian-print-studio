// Imported only inside Platform.isDesktopApp. No desktop module is evaluated
// during mobile plugin loading or preview creation.
import {remote} from 'electron';
import type {App} from 'obsidian';
import {NativePrinter} from './native-print';
import {LinuxPrintDialog} from './linux-print-dialog';
export class DesktopPrinter extends NativePrinter {
  private dialog?:LinuxPrintDialog;
  constructor(app:App) {
    super(remote,async(data,request)=>{
      const dialog=new LinuxPrintDialog(app);this.dialog=dialog;
      try {await dialog.print(data,request);}finally{if(this.dialog===dialog)this.dialog=undefined;}
    });
  }
  override dispose(){this.dialog?.close();super.dispose();}
}
