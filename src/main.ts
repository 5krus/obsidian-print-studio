import {Component, MarkdownRenderer, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile} from 'obsidian';
import {StudioPanel} from './panel';
import {normalizeSettings, type Settings} from './settings';
import {prepareMarkdown} from './template';
import DOMPurify from 'dompurify';
export default class PrintStudioPlugin extends Plugin {
  studioSettings!:Settings;
  private studios=new Set<PrintModal>();
  async onload() {
    this.studioSettings=normalizeSettings(await this.loadData());
    this.addCommand({id:'open-print-studio',name:'Preview & print current note',checkCallback:checking=>{const file=this.app.workspace.getActiveFile();if(file?.extension!=='md')return false;if(!checking)this.openStudio(file);return true;}});
    this.addRibbonIcon('printer','Print Studio',()=>{const file=this.app.workspace.getActiveFile();if(file?.extension==='md')this.openStudio(file);else new Notice('Open a Markdown note to use Print Studio.');});
    this.registerEvent(this.app.workspace.on('file-menu',(menu,file)=>{if(file instanceof TFile && file.extension==='md')menu.addItem(item=>item.setTitle('Open in Print Studio').setIcon('printer').onClick(()=>this.openStudio(file)));}));
    this.addSettingTab(new PrintSettings(this));
  }
  openStudio(file:TFile){const modal=new PrintModal(this,file,()=>this.studios.delete(modal));this.studios.add(modal);modal.open();}
  async saveSettings(settings:Settings){await this.saveData(settings);this.studioSettings=structuredClone(settings);}
  onunload(){for(const modal of this.studios)modal.close();this.studios.clear();}
}
class PrintSettings extends PluginSettingTab {
  constructor(private plugin:PrintStudioPlugin){super(plugin.app,plugin);}
  display(){this.containerEl.empty();new Setting(this.containerEl).setName('Print Studio').setHeading();this.containerEl.createEl('p',{text:'Create reusable letterheads and print layouts from the preview. Presets and logos are stored locally in this vault’s plugin settings.'});new Setting(this.containerEl).setName('Open print designer').setDesc('Open a Markdown note first, then customize its pages, branding, headers, and footers.').addButton(button=>button.setButtonText('Open Print Studio').onClick(()=>{const file=this.app.workspace.getActiveFile();if(file?.extension==='md')this.plugin.openStudio(file);else new Notice('Open a Markdown note first.');}));this.containerEl.createEl('p',{text:'Print Studio has its own command. It does not modify Obsidian’s built-in PDF export or your original note.'});}
}
class PrintModal extends Modal {
  private panel?:StudioPanel;
  private component=new Component();
  private renderRoot?:HTMLElement;
  private renderQueue=Promise.resolve();
  private renderComponent?:Component;
  private isClosed=false;
  constructor(private plugin:PrintStudioPlugin,private file:TFile,private closed:()=>void){super(plugin.app);}
  onOpen(){this.modalEl.addClass('ps-modal');this.component.load();this.renderRoot=this.contentEl.createDiv({cls:'ps-render-source markdown-rendered'});const root=this.contentEl.createDiv();this.panel=new StudioPanel(root,{settings:this.plugin.studioSettings,save:s=>this.plugin.saveSettings(s),notify:m=>new Notice(m),source:()=>new Promise((resolve,reject)=>{this.renderQueue=this.renderQueue.catch(()=>{}).then(async()=>{try{resolve(await this.renderNote());}catch(e){reject(e);}});})});}
  private async renderNote(){
    if(this.isClosed)throw new Error('Print preview was closed.');
    const view=this.app.workspace.getActiveViewOfType(MarkdownView);
    const markdown=view?.file?.path===this.file.path ? view.editor.getValue() : await this.app.vault.read(this.file);
    const root=this.renderRoot!;root.empty();
    if(this.renderComponent)this.component.removeChild(this.renderComponent);
    this.renderComponent=this.component.addChild(new Component());
    await MarkdownRenderer.render(this.app,prepareMarkdown(markdown),root,this.file.path,this.renderComponent);
    if(this.isClosed)throw new Error('Print preview was closed.');
    const warnings:string[]=[];
    const files=this.app.vault.getFiles().filter(f=>/^(png|jpe?g|webp|gif|svg)$/i.test(f.extension));
    const resourceMap=new Map(files.map(f=>[this.app.vault.getResourcePath(f).split('?')[0],f]));
    let missing=0;
    for(const img of root.querySelectorAll('img')){
      const src=img.getAttribute('src')??'';if(src.startsWith('data:'))continue;
      const f=resourceMap.get(src.split('?')[0]) ?? this.app.metadataCache.getFirstLinkpathDest(img.getAttribute('data-href') ?? src,this.file.path);
      if(!f || !/^(png|jpe?g|webp|gif|svg)$/i.test(f.extension)){missing++;continue;}
      try {const data=await this.app.vault.readBinary(f);if(data.byteLength>10_000_000){missing++;continue;}
        if(f.extension.toLowerCase()==='svg'){const clean=DOMPurify.sanitize(new TextDecoder().decode(data),{USE_PROFILES:{svg:true,svgFilters:true},FORBID_TAGS:['foreignObject','image','use','style'],FORBID_ATTR:['style']});img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(clean);}
        else {const mime=f.extension.toLowerCase().replace('jpg','jpeg');img.src=`data:image/${mime};base64,${Buffer.from(data).toString('base64')}`;}
      }catch{missing++;}
    }
    // Preserve task state while removing interactive controls from the print document.
    for(const checkbox of root.querySelectorAll<HTMLInputElement>('input[type=checkbox]')){const mark=document.createElement('span');mark.className='ps-check';mark.textContent=checkbox.checked?'☑':'☐';checkbox.replaceWith(mark);}
    if(missing)warnings.push(`${missing} remote, missing, or oversized image(s) replaced with placeholders. Use vault attachments for self-contained printing.`);
    if(root.querySelector('.internal-embed:not(.image-embed),.block-language-dataview,.block-language-dataviewjs'))warnings.push('Embedded notes and dynamic plugin blocks may need checking in the preview.');
    const metadata=this.app.metadataCache.getFileCache(this.file)?.frontmatter ?? {};
    const title=typeof metadata.title==='string'?metadata.title:this.file.basename;
    return {html:root.innerHTML,context:{title,vault:this.app.vault.getName(),date:new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric'}).format(new Date()),metadata},warnings};
  }
  onClose(){this.isClosed=true;this.panel?.dispose();this.component.unload();this.contentEl.empty();this.closed();}
}
