import {Modal,Notice,Setting,type App} from 'obsidian';
import {listPrinters,submitPDF,type PrintDestination} from './cups-print';
import type {OutputRequest} from './native-print';

export class LinuxPrintDialog extends Modal {
  private complete?:(destination:PrintDestination|null)=>void;
  private canceled=false;
  constructor(app:App){super(app);}
  async print(data:Uint8Array,request:OutputRequest) {
    const {names,preferred}=await listPrinters();
    if(this.canceled)return;
    const destination=await new Promise<PrintDestination|null>(resolve=>{
      this.complete=resolve;
      this.setTitle('Print document');
      this.contentEl.createEl('p',{text:`${request.title} · ${request.preset.paper} · ${request.preset.orientation}. Fit to printable area, single-sided.`});
      let printer=preferred,copies=1;
      new Setting(this.contentEl).setName('Printer').addDropdown(input=>{
        for(const name of names)input.addOption(name,name);
        input.setValue(preferred).onChange(value=>{printer=value;});
      });
      new Setting(this.contentEl).setName('Copies').addText(input=>{
        input.setValue('1').onChange(value=>{copies=Number(value);});
        input.inputEl.type='number';input.inputEl.min='1';input.inputEl.max='999';input.inputEl.step='1';
      });
      new Setting(this.contentEl).addButton(button=>button.setButtonText('Cancel').onClick(()=>this.close())).addButton(button=>button.setButtonText('Print').setCta().onClick(()=>{
        if(!Number.isInteger(copies) || copies<1 || copies>999){new Notice('Enter a whole number of copies from 1 to 999.');return;}
        this.complete=undefined;resolve({printer,copies});this.close();
      }));
      this.open();
    });
    if(destination) {
      await submitPDF(data,request,destination);
      new Notice(`Sent to ${destination.printer} on ${request.preset.paper}.`);
    }
  }
  onClose(){this.canceled=true;this.complete?.(null);this.complete=undefined;this.contentEl.empty();}
}
