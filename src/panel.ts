import DOMPurify from 'dompurify';
import {frameDocument} from './document';
import {defaults, normalizePreset, type Settings, type Preset, type Slots} from './settings';
import type {DocumentContext} from './template';
export interface StudioHost {
  settings:Settings;
  source():Promise<{html:string;context:DocumentContext;warnings:string[]}>;
  save(settings:Settings):Promise<void>;
  notify(message:string):void;
}
function el<K extends keyof HTMLElementTagNameMap>(tag:K, cls='', text=''):HTMLElementTagNameMap[K] {const node=document.createElement(tag);node.className=cls;if(text)node.textContent=text;return node;}
export class StudioPanel {
  private settings:Settings;
  private frame:HTMLIFrameElement;
  private status:HTMLElement;
  private printButton:HTMLButtonElement;
  private exportButton:HTMLButtonElement;
  private controls:HTMLElement;
  private notes:HTMLElement;
  private revision=0;
  private token='';
  private timer:ReturnType<typeof setTimeout>|undefined;
  private timeout:ReturnType<typeof setTimeout>|undefined;
  private disposed=false;
  private saveQueue=Promise.resolve();
  private title='document';
  private onMessage=(event:MessageEvent)=>{
    if(event.source!==this.frame.contentWindow || event.data?.token!==this.token || this.disposed) return;
    if(event.data.type==='ready') {clearTimeout(this.timeout);this.status.textContent=`${event.data.pages} ${event.data.pages===1?'page':'pages'} · Ready to print`;this.printButton.disabled=false;this.exportButton.disabled=false;}
    if(event.data.type==='error') {clearTimeout(this.timeout);this.status.textContent='Preview failed';this.host.notify('Print Studio: '+String(event.data.message));}
    if(event.data.type==='exported' && typeof event.data.html==='string') {const blob=new Blob([event.data.html],{type:'text/html;charset=utf-8'});const url=URL.createObjectURL(blob);const a=el('a');a.href=url;a.download=`${this.title.replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,100)||'document'} — Print Studio.html`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  };
  constructor(private root:HTMLElement,private host:StudioHost) {
    this.settings=structuredClone(host.settings);root.classList.add('ps-studio');
    const top=el('header','ps-top');const identity=el('div','ps-identity');identity.append(el('span','ps-mark','P.'),el('div','ps-wordmark','Print Studio'));top.append(identity,el('span','ps-tag','A LITTLE MORE CONSIDERED.'));
    const actions=el('div','ps-actions');const refresh=el('button','ps-button','Refresh note');refresh.onclick=()=>void this.render();this.exportButton=el('button','ps-button','Export HTML');this.exportButton.title='Download a self-contained, paginated document';this.exportButton.onclick=()=>this.frame.contentWindow?.postMessage({type:'export',token:this.token},'*');this.printButton=el('button','ps-button ps-primary','Print / Save PDF ↗');this.printButton.onclick=()=>this.frame.contentWindow?.postMessage({type:'print',token:this.token},'*');actions.append(refresh,this.exportButton,this.printButton);top.append(actions);
    const body=el('div','ps-workbench');const side=el('aside','ps-sidebar');const intro=el('div','ps-intro');intro.append(el('span','ps-eyebrow','YOUR NOTE, WELL DRESSED.'),el('h2','','Make it worth\nprinting.'),el('p','','A familiar note. A considered document.'));side.append(intro);this.controls=el('div','ps-controls');side.append(this.controls);
    const preview=el('section','ps-preview');const bar=el('div','ps-preview-bar');bar.append(el('span','','DOCUMENT PREVIEW'));this.status=el('span','','Preparing…');this.status.setAttribute('role','status');bar.append(this.status);this.frame=el('iframe','ps-frame');this.frame.title='Paginated print preview';this.frame.setAttribute('sandbox','allow-scripts allow-modals');this.notes=el('div','ps-notes');preview.append(bar,this.frame,this.notes);body.append(side,preview);root.append(top,body);
    window.addEventListener('message',this.onMessage);this.renderControls();void this.render();
  }
  private get preset() {return this.settings.presets.find(p=>p.id===this.settings.activeId)!;}
  private persist() {const snapshot=structuredClone(this.settings);this.saveQueue=this.saveQueue.catch(()=>{}).then(()=>this.host.save(snapshot)).catch(()=>this.host.notify('Print Studio could not save your presets.'));}
  private change() {++this.revision;this.token='';this.persist();this.printButton.disabled=true;this.exportButton.disabled=true;this.status.textContent='Updating preview…';clearTimeout(this.timer);this.timer=setTimeout(()=>void this.render(),450);}
  private section(title:string,open=false) {const section=el('details','ps-section');section.open=open;section.append(el('summary','',title));const body=el('div','ps-section-body');section.append(body);this.controls.append(section);return body;}
  private label(parent:HTMLElement,title:string,hint?:string) {const label=el('label','ps-field');label.append(el('span','ps-field-label',title));parent.append(label);if(hint)label.append(el('small','ps-field-hint',hint));return label;}
  private text(parent:HTMLElement,title:string,value:string,set:(v:string)=>void,hint?:string) {const label=this.label(parent,title,hint);const input=el('input');input.type='text';input.value=value;input.maxLength=300;input.oninput=()=>{set(input.value);this.change();};label.append(input);return input;}
  private multiline(parent:HTMLElement,title:string,value:string,set:(v:string)=>void) {const label=this.label(parent,title);const input=el('textarea');input.rows=2;input.value=value;input.maxLength=300;input.oninput=()=>{set(input.value);this.change();};label.append(input);}
  private select(parent:HTMLElement,title:string,value:string,options:Record<string,string>,set:(v:string)=>void) {const label=this.label(parent,title);const input=el('select');for(const [key,name] of Object.entries(options)){const opt=el('option','',name);opt.value=key;input.append(opt);}input.value=value;input.onchange=()=>{set(input.value);this.change();};label.append(input);}
  private number(parent:HTMLElement,title:string,key:'marginTop'|'marginBottom'|'marginSide'|'fontSize'|'lineHeight'|'borderWidth'|'logoHeight',min:number,max:number,step=1) {const label=this.label(parent,title);const input=el('input');input.type='number';input.min=String(min);input.max=String(max);input.step=String(step);input.value=String(this.preset[key]);input.onchange=()=>{this.preset[key]=Number(input.value);Object.assign(this.preset,normalizePreset(this.preset));input.value=String(this.preset[key]);this.change();};label.append(input);}
  private toggle(parent:HTMLElement,title:string,key:'headerRule'|'footerRule'|'headingBreaks') {const label=el('label','ps-toggle');const input=el('input');input.type='checkbox';input.checked=this.preset[key];input.onchange=()=>{this.preset[key]=input.checked;this.change();};label.append(input,el('span','',title));parent.append(label);}
  private renderControls() {
    this.controls.replaceChildren();const presetBox=el('div','ps-preset-box');this.controls.append(presetBox);
    this.select(presetBox,'PRINT PRESET',this.settings.activeId,Object.fromEntries(this.settings.presets.map(p=>[p.id,p.name])),id=>{this.settings.activeId=id;this.renderControls();});
    const row=el('div','ps-preset-actions');const duplicate=el('button','ps-link','＋ Duplicate');duplicate.onclick=()=>{if(this.settings.presets.length>=30){this.host.notify('You can keep up to 30 presets.');return;}const p=structuredClone(this.preset);p.id=crypto.randomUUID();p.name=`${p.name} copy`;this.settings.presets.push(p);this.settings.activeId=p.id;this.renderControls();this.change();};const remove=el('button','ps-link','Remove');remove.disabled=this.settings.presets.length<2;remove.onclick=()=>{if(!window.confirm(`Remove the “${this.preset.name}” preset?`))return;this.settings.presets=this.settings.presets.filter(p=>p.id!==this.settings.activeId);this.settings.activeId=this.settings.presets[0].id;this.renderControls();this.change();};row.append(duplicate,remove);presetBox.append(row);
    const brand=this.section('01  Identity',true);this.text(brand,'Preset name',this.preset.name,v=>this.preset.name=v);this.text(brand,'Company / brand',this.preset.company,v=>this.preset.company=v);
    const logo=el('div','ps-logo-control');if(this.preset.logo){const img=el('img');img.src=this.preset.logo;img.alt='Current company logo';logo.append(img);}const uploadLabel=this.label(logo,this.preset.logoName || 'Company logo','PNG, JPG, WebP or SVG · up to 2 MB');const upload=el('input');upload.type='file';upload.accept='image/png,image/jpeg,image/webp,image/svg+xml';upload.onchange=()=>{const file=upload.files?.[0];if(file)void this.loadLogo(file);};uploadLabel.append(upload);if(this.preset.logo){const clear=el('button','ps-link','Remove logo');clear.onclick=()=>{this.preset.logo='';this.preset.logoName='';this.renderControls();this.change();};logo.append(clear);}brand.append(logo);this.number(brand,'Logo height · mm','logoHeight',4,12);
    const page=this.section('02  Paper & typography');const grid=el('div','ps-field-grid');page.append(grid);this.select(grid,'Paper',this.preset.paper,{A4:'A4',Letter:'US Letter'},v=>this.preset.paper=v as Preset['paper']);this.select(grid,'Orientation',this.preset.orientation,{portrait:'Portrait',landscape:'Landscape'},v=>this.preset.orientation=v as Preset['orientation']);this.select(page,'Typeface',this.preset.font,{sans:'Sans serif · clean',serif:'Serif · editorial'},v=>this.preset.font=v as Preset['font']);this.number(page,'Body size · pt','fontSize',8,18);this.number(page,'Line spacing','lineHeight',1.2,2,.05);this.number(page,'Top margin · mm','marginTop',22,50);this.number(page,'Bottom margin · mm','marginBottom',18,50);this.number(page,'Side margins · mm','marginSide',15,40);this.toggle(page,'Start each top-level heading on a new page','headingBreaks');page.append(el('p','ps-tip','For a manual page break, add <!-- pagebreak --> on its own line in your note.'));
    const border=this.section('03  Borders & color');this.select(border,'Page border',this.preset.border,{none:'None',solid:'Fine line',double:'Double line',dashed:'Dashed'},v=>this.preset.border=v as Preset['border']);this.number(border,'Border thickness · mm','borderWidth',.3,3,.1);const colorLabel=this.label(border,'Accent & border color');const color=el('input');color.type='color';color.value=this.preset.color;color.oninput=()=>{this.preset.color=color.value;this.change();};colorLabel.append(color);
    for(const location of ['header','footer'] as const){const band=this.section(location==='header'?'04  Header':'05  Footer');for(const alignment of ['left','center','right'] as const)this.multiline(band,alignment[0].toUpperCase()+alignment.slice(1),this.preset[location][alignment],v=>this.preset[location][alignment]=v);this.toggle(band,'Show dividing line',location==='header'?'headerRule':'footerRule');}
    const tokens=this.section('06  Dynamic text');tokens.append(el('p','ps-tip','Use these in any header or footer. Values come from the note being printed.'));
    for(const [token,description] of Object.entries({'{{company}}':'Company name','{{title}}':'Note title','{{date}}':'Today’s date','{{vault}}':'Vault name','{{page}}':'Current page','{{pages}}':'Total pages','{{meta:client}}':'A note property, such as client'})){const line=el('div','ps-token');line.append(el('code','',token),el('span','',description));tokens.append(line);}
    this.controls.append(el('p','ps-autosave','Presets save automatically to this vault.'));
  }
  private async loadLogo(file:File) {
    const id=this.preset.id;
    try {
      if(file.size>2_000_000)throw Error('Choose a logo smaller than 2 MB.');
      if(!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(file.type))throw Error('Choose a PNG, JPG, WebP, or SVG logo.');
      let blob:Blob=file;
      if(file.type==='image/svg+xml') {const svg=DOMPurify.sanitize(await file.text(),{USE_PROFILES:{svg:true,svgFilters:true},FORBID_TAGS:['foreignObject','style','image','use'],FORBID_ATTR:['style']});blob=new Blob([svg],{type:'image/svg+xml'});}
      const url=URL.createObjectURL(blob);let data:string;
      try {const img=new Image();img.src=url;await img.decode();const scale=Math.min(1,1200/Math.max(img.naturalWidth,img.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));canvas.getContext('2d')!.drawImage(img,0,0,canvas.width,canvas.height);data=canvas.toDataURL('image/png');}finally{URL.revokeObjectURL(url);}
      if(data.length>=3_000_000)throw Error('This logo is too detailed. Try a smaller image.');
      const preset=this.settings.presets.find(p=>p.id===id);if(!preset || this.disposed)return;preset.logo=data;preset.logoName=file.name;this.renderControls();this.change();
    }catch(error){this.host.notify(error instanceof Error?error.message:String(error));}
  }
  async render() {
    clearTimeout(this.timer);clearTimeout(this.timeout);const revision=++this.revision;this.token=crypto.randomUUID();this.printButton.disabled=true;this.exportButton.disabled=true;this.status.textContent='Preparing pages…';
    const preset=normalizePreset(this.preset);
    try {const source=await this.host.source();if(this.disposed || revision!==this.revision)return;this.title=source.context.title;this.notes.textContent=source.warnings.length?source.warnings.join(' · '):'Print tip: choose the same paper size, 100% scale, no browser headers/footers, and enable background graphics.';this.frame.srcdoc=frameDocument({html:source.html,preset,context:source.context},this.token);this.timeout=setTimeout(()=>{if(!this.disposed && revision===this.revision)this.status.textContent='This note is taking longer to paginate. Try Refresh note.';},30000);}catch(error){if(revision!==this.revision || this.disposed)return;this.status.textContent='Could not render this note';this.host.notify(error instanceof Error?error.message:String(error));}
  }
  dispose(){this.disposed=true;++this.revision;clearTimeout(this.timer);clearTimeout(this.timeout);window.removeEventListener('message',this.onMessage);this.frame.remove();this.root.replaceChildren();}
}
