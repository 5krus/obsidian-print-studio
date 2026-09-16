import DOMPurify from 'dompurify';
import {frameDocument} from './document';
import {normalizePreset, type Settings, type Preset} from './settings';
import {frameMessage, type LayoutWarning} from './messages';
import {placeholderOptions, type DocumentContext} from './template';
import type {SettingRow, StudioUI} from './ui';
import {exportPresets, importPresets, MAX_PRESET_FILE_BYTES} from './presets';
import {PresetHistory} from './history';
let fieldId = 0;
export interface StudioHost {
  settings:Settings;
  ui:StudioUI;
  source():Promise<{html:string;context:DocumentContext;warnings:string[]}>;
  save(settings:Settings):Promise<void>;
  notify(message:string):void;
}

export class StudioPanel {
  private el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') {
    return this.host.ui.createElement(tag, cls, text);
  }
  private settings:Settings;
  private frame:HTMLIFrameElement;
  private status:HTMLElement;
  private printButton:HTMLButtonElement;
  private exportButton:HTMLButtonElement;
  private controls:HTMLElement;
  private pageInput:HTMLInputElement;
  private pageTotal:HTMLElement;
  private previousButton:HTMLButtonElement;
  private nextButton:HTMLButtonElement;
  private zoomSelect:HTMLSelectElement;
  private pageCount=0;
  private currentPage=1;
  private notes:HTMLElement;
  private noteName:HTMLElement;
  private themeObserver:MutationObserver;
  private colorScheme() {return document.body.classList.contains('theme-dark') ? 'dark' : 'light';}
  private syncTheme = () => {const scheme=this.colorScheme();this.frame.style.colorScheme=scheme;this.frame.contentWindow?.postMessage({type:'theme',scheme,token:this.token},'*');};
  private presetSelect?:HTMLSelectElement;
  private expanded = new Set(['Identity']);
  private revision=0;
  private token='';
  private timer:number|undefined;
  private timeout:number|undefined;
  private disposed=false;
  private saveQueue=Promise.resolve();
  private history:PresetHistory;
  private undoButton?:HTMLButtonElement;
  private redoButton?:HTMLButtonElement;
  private sourcePromise?:ReturnType<StudioHost['source']>;
  private metadata:Record<string,unknown>={};
  private sourceWarnings:string[]=[];
  private layoutWarnings:LayoutWarning[]=[];
  private title='document';
  private onMessage=(event:MessageEvent<unknown>)=>{
    const message=frameMessage(event.data);
    if(event.source!==this.frame.contentWindow || !message || message.token!==this.token || this.disposed) return;
    if(message.type==='ready') {this.syncTheme();window.clearTimeout(this.timeout);this.status.textContent=`${message.pages} ${message.pages===1?'page':'pages'} · Ready to print`;this.printButton.disabled=false;this.exportButton.disabled=false;this.pageCount=message.pages;this.currentPage=Math.min(this.currentPage,this.pageCount);this.updateNavigation();this.frame.contentWindow?.postMessage({type:'zoom',value:this.zoomSelect.value,token:this.token},'*');this.goToPage(this.currentPage);this.renderNotes();}
    if(message.type==='viewport' && this.pageCount && Number.isInteger(message.page)) {this.currentPage=Math.min(this.pageCount,Math.max(1,message.page));this.updateNavigation(this.pageInput.ownerDocument.activeElement===this.pageInput);}
    if(message.type==='warnings') {this.layoutWarnings=message.warnings;this.renderNotes();}
    if(message.type==='error') {this.disablePreview();window.clearTimeout(this.timeout);this.status.textContent='Preview failed';this.host.notify('Print Studio: '+String(message.message));}
    if(message.type==='exported' && typeof message.html==='string') this.download(message.html, `${this.safeFilename(this.title)} — Print Studio.html`, 'text/html;charset=utf-8');
  };
  constructor(private root:HTMLElement, private host:StudioHost) {
    this.settings = structuredClone(host.settings);
    this.history = new PresetHistory(this.settings);
    root.classList.add('ps-studio');
    const top = this.el('header', 'ps-top');
    const identity = this.el('div', 'ps-identity');
    const icon = this.el('span', 'ps-title-icon');
    icon.setAttribute('aria-hidden', 'true');
    host.ui.icon(icon, 'printer');
    identity.append(icon, this.el('span', 'ps-title', 'Print Studio'));
    this.noteName = this.el('span', 'ps-note-name');
    top.append(identity, this.noteName);
    const actions = this.el('div', 'ps-actions');
    host.ui.button(actions, 'Refresh note', () => void this.render(true), {icon: 'refresh-cw'});
    this.exportButton = host.ui.button(actions, 'Export HTML', () => this.frame.contentWindow?.postMessage({type:'export', token:this.token}, '*'), {tooltip:'Export pages as a self-contained HTML document'});
    this.printButton = host.ui.button(actions, 'Print / Save PDF', () => this.frame.contentWindow?.postMessage({type:'print', token:this.token}, '*'), {primary:true});
    this.printButton.classList.add('ps-primary');
    top.append(actions);

    const body = this.el('div', 'ps-workbench');
    const side = this.el('aside', 'ps-sidebar');
    side.setAttribute('aria-label', 'Print layout');
    this.controls = this.el('div', 'ps-controls');
    side.append(this.controls);
    const preview = this.el('section', 'ps-preview');
    preview.setAttribute('aria-label', 'Document preview');
    const bar = this.el('div', 'ps-preview-bar');
    bar.append(this.el('span', '', 'Preview'));
    this.status = this.el('span', '', 'Preparing…');
    this.status.setAttribute('role', 'status');
    const navigation = this.el('div', 'ps-preview-controls');
    this.previousButton = host.ui.button(navigation, 'Previous page', () => this.goToPage(this.currentPage-1), {icon:'chevron-left'});
    this.pageInput = host.ui.text(navigation, '1') as HTMLInputElement;
    this.pageInput.type='number'; this.pageInput.min='1'; this.pageInput.step='1';
    this.pageInput.setAttribute('aria-label','Page');
    this.pageInput.onchange=()=>this.goToPage(Number(this.pageInput.value));
    this.pageInput.onkeydown=event=>{if(event.key==='Enter')this.goToPage(Number(this.pageInput.value));};
    this.pageTotal = this.el('span', 'ps-page-total', 'of 0');
    navigation.append(this.pageTotal);
    this.nextButton = host.ui.button(navigation, 'Next page', () => this.goToPage(this.currentPage+1), {icon:'chevron-right'});
    this.zoomSelect = host.ui.dropdown(navigation, 'fit', {fit:'Fit width', '0.5':'50%', '0.75':'75%', '1':'100%', '1.25':'125%', '1.5':'150%', '2':'200%'});
    this.zoomSelect.setAttribute('aria-label','Preview zoom');
    this.zoomSelect.onchange=()=>this.frame.contentWindow?.postMessage({type:'zoom',value:this.zoomSelect.value,token:this.token},'*');
    bar.append(navigation, this.status);
    this.frame = this.el('iframe', 'ps-frame');
    this.frame.title = 'Paginated print preview';
    this.frame.setAttribute('sandbox', 'allow-scripts allow-modals');
    this.notes = this.el('div', 'ps-notes');
    this.notes.setAttribute('aria-label','Print advice');
    preview.append(bar, this.frame, this.notes);
    body.append(side, preview);
    root.append(top, body);
    this.themeObserver = new window.MutationObserver(this.syncTheme);
    this.themeObserver.observe(document.body, {attributes:true, attributeFilter:['class','style']});
    this.syncTheme();
    window.addEventListener('message', this.onMessage);
    this.renderControls();
    void this.render();
  }
  private get preset() {return this.settings.presets.find(p=>p.id===this.settings.activeId)!;}
  private persist() {const snapshot=structuredClone(this.settings);this.saveQueue=this.saveQueue.catch(()=>{}).then(()=>this.host.save(snapshot)).catch(()=>this.host.notify('Print Studio could not save your presets.'));}
  private change(group?:object,record=true) {if(record)this.history.record(this.settings,group);this.updateHistory();++this.revision;this.token='';this.persist();this.disablePreview();this.status.textContent='Updating preview…';window.clearTimeout(this.timer);this.timer=window.setTimeout(()=>void this.render(),450);}
  private updateHistory() {if(this.undoButton)this.undoButton.disabled=!this.history.canUndo;if(this.redoButton)this.redoButton.disabled=!this.history.canRedo;}
  private restore(redo=false) {
    const settings=redo?this.history.redo():this.history.undo();if(!settings)return;
    this.settings=settings;this.renderControls();this.change(undefined,false);
    const preferred=redo?this.redoButton:this.undoButton;
    (preferred?.disabled?(redo?this.undoButton:this.redoButton):preferred)?.focus();
  }
  private safeFilename(name:string) {return name.replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,100)||'document';}
  private download(content:string, filename:string, type:string) {
    const url=URL.createObjectURL(new Blob([content],{type}));
    const link=this.el('a');link.href=url;link.download=filename;link.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  private disablePreview() {
    this.printButton.disabled=true;this.exportButton.disabled=true;
    this.pageCount=0;this.updateNavigation();this.layoutWarnings=[];this.renderNotes();
  }
  private renderNotes() {
    this.notes.replaceChildren();
    for(const warning of this.sourceWarnings)this.notes.append(this.el('p','ps-tip',warning));
    const advice={header:'Header text or logo is clipped. Shorten the text or increase the top margin.',footer:'Footer text is clipped. Shorten the text or increase the bottom margin.',table:'A table row overflows or spans multiple pages. Check its contents; split the row, reduce the font size, or use landscape.',content:'Content extends beyond the printable area. Reduce its size or simplify its formatting.'};
    if(this.layoutWarnings.length) {
      const details=this.el('details','ps-warning-list');details.open=true;
      details.append(this.el('summary','',`${this.layoutWarnings.length} layout ${this.layoutWarnings.length===1?'warning':'warnings'}`));
      for(const warning of this.layoutWarnings) {
        const row=this.el('div','ps-warning');
        const button=this.host.ui.button(row,`Page ${warning.page}`,()=>this.goToPage(warning.page));button.disabled=!this.pageCount;
        row.append(this.el('span','',advice[warning.kind]));details.append(row);
      }
      this.notes.append(details);
    }
    if(!this.sourceWarnings.length && !this.layoutWarnings.length)this.notes.append(this.el('span','','Print tip: choose the same paper size, 100% scale, no browser headers/footers, and enable background graphics.'));
  }
  private updateNavigation(preserveInput=false) {
    this.previousButton.disabled=this.pageCount===0 || this.currentPage<=1;
    this.nextButton.disabled=this.pageCount===0 || this.currentPage>=this.pageCount;
    this.pageInput.disabled=this.pageCount===0;this.zoomSelect.disabled=this.pageCount===0;
    // A queued scroll report must not overwrite a page number the user is typing.
    if(!preserveInput)this.pageInput.value=String(this.currentPage || 1);
    this.pageInput.max=String(this.pageCount);
    this.pageTotal.textContent=`of ${this.pageCount}`;
  }
  private goToPage(value:number) {
    if(!this.pageCount)return;
    this.currentPage=Math.min(this.pageCount,Math.max(1,Math.round(value)||1));
    this.updateNavigation();
    this.frame.contentWindow?.postMessage({type:'page',page:this.currentPage,token:this.token},'*');
  }
  private exportPresetFile(all:boolean) {
    try {
      const presets=all?this.settings.presets:[this.preset];
      this.download(exportPresets(presets),all?'Print Studio presets.json':`${this.safeFilename(this.preset.name)}.print-studio.json`,'application/json');
    }catch(error){this.host.notify(error instanceof Error?error.message:String(error));}
  }
  async importPresetFile(file:File) {
    try {
      if(file.size>MAX_PRESET_FILE_BYTES)throw new Error('Choose a preset file smaller than 10 MB.');
      const text=await file.text();
      if(this.disposed)return;
      const settings=importPresets(text,this.settings);
      const count=settings.presets.length-this.settings.presets.length;
      this.settings=settings;this.renderControls();this.change();
      this.host.notify(`Imported ${count} ${count===1?'preset':'presets'}.`);
    }catch(error){this.host.notify(error instanceof Error?error.message:String(error));}
  }
  private section(title:string) {
    const section = this.el('details', 'ps-section');
    section.dataset.section = title;
    section.open = this.expanded.has(title);
    const summary = this.el('summary');
    const arrow = this.el('span', 'ps-disclosure');
    arrow.setAttribute('aria-hidden', 'true');
    this.host.ui.icon(arrow, 'chevron-right');
    summary.append(arrow, this.el('span', '', title));
    section.append(summary);
    const body = this.el('div', 'ps-section-body');
    section.append(body);
    this.controls.append(section);
    return body;
  }
  private row(parent:HTMLElement, title:string, hint?:string, stacked=false) {
    const row = this.host.ui.setting(parent, title, hint);
    row.element.classList.add('ps-setting');
    if(stacked) row.element.classList.add('ps-setting-stacked');
    row.name.id = `ps-field-${++fieldId}`;
    row.description.id = `${row.name.id}-description`;
    return row;
  }
  private describe(control:HTMLElement, row:SettingRow) {
    control.setAttribute('aria-labelledby', row.name.id);
    if(row.description.textContent) control.setAttribute('aria-describedby', row.description.id);
  }
  private text(parent:HTMLElement, title:string, value:string, set:(v:string)=>void, hint?:string) {
    const row = this.row(parent, title, hint, true);
    const input = this.host.ui.text(row.control, value);
    input.maxLength = 300;
    this.describe(input, row);
    input.oninput = () => {set(input.value); this.change(input);};
    return input;
  }
  private multiline(parent:HTMLElement, title:string, value:string, set:(v:string)=>void) {
    const row = this.row(parent, title, undefined, true);
    const input = this.host.ui.text(row.control, value, true) as HTMLTextAreaElement;
    input.rows = 2;
    input.maxLength = 300;
    input.placeholder = 'None';
    this.describe(input, row);
    input.oninput = () => {set(input.value); this.change(input);};
    row.control.classList.add('ps-template-control');
    const picker=this.host.ui.dropdown(row.control,'',placeholderOptions(this.metadata));
    picker.classList.add('ps-placeholder-picker');
    picker.setAttribute('aria-label',`Insert placeholder into ${parent.closest('details')?.dataset.section ?? ''} ${title.toLowerCase()}`);
    picker.onchange=()=>{
      const token=picker.value;picker.value='';if(!token)return;
      const start=input.selectionStart,end=input.selectionEnd;
      if(input.value.length-(end-start)+token.length>input.maxLength){this.host.notify('Header and footer text is limited to 300 characters.');return;}
      input.setRangeText(token,start,end,'end');set(input.value);this.change();input.focus();
    };
  }
  private updatePlaceholders() {
    for(const picker of this.controls.querySelectorAll<HTMLSelectElement>('.ps-placeholder-picker')) {
      picker.replaceChildren(...Object.entries(placeholderOptions(this.metadata)).map(([value,label])=>{const option=this.el('option','',label);option.value=value;return option;}));
    }
  }
  private select(parent:HTMLElement, title:string, value:string, options:Record<string,string>, set:(v:string)=>void) {
    const row = this.row(parent, title);
    const input = this.host.ui.dropdown(row.control, value, options);
    this.describe(input, row);
    input.onchange = () => {set(input.value); this.change();};
    return input;
  }
  private number(parent:HTMLElement, title:string, key:'marginTop'|'marginBottom'|'marginSide'|'fontSize'|'lineHeight'|'borderWidth'|'logoHeight'|'firstPageMarginTop'|'firstPageLogoHeight', min:number, max:number, step=1) {
    const row = this.row(parent, title);
    const input = this.host.ui.text(row.control, String(this.preset[key])) as HTMLInputElement;
    input.type = 'number';
    input.min = String(min); input.max = String(max); input.step = String(step);
    this.describe(input, row);
    input.onchange = () => {this.preset[key]=Number(input.value); Object.assign(this.preset,normalizePreset(this.preset)); input.value=String(this.preset[key]); this.change();};
  }
  private toggle(parent:HTMLElement, title:string, key:'headerRule'|'footerRule'|'headingBreaks'|'differentFirstPage'|'firstPageHeaderRule'|'logoFirstPageOnly', hint?:string) {
    const row = this.row(parent, title, hint);
    row.element.classList.add('mod-toggle');
    const toggle = this.host.ui.toggle(row.control, this.preset[key], value => {
      this.preset[key]=value;
      if(key==='differentFirstPage'){this.renderControls();this.controls.querySelector<HTMLElement>('[data-setting="differentFirstPage"]')?.focus();}
      this.change();
    });
    toggle.dataset.setting=key;
    this.describe(toggle, row);
  }
  private renderControls() {
    const sections = this.controls.querySelectorAll<HTMLDetailsElement>('details');
    if(sections.length) this.expanded = new Set([...sections].filter(s=>s.open).map(s=>s.dataset.section!));
    const scroll = this.controls.parentElement!.scrollTop;
    this.controls.replaceChildren();
    const presetBox = this.el('div', 'ps-preset-box');
    this.controls.append(presetBox);
    const presetRow = this.row(presetBox, 'Preset', 'Changes save automatically to this vault.', true);
    this.presetSelect = this.host.ui.dropdown(presetRow.control, this.settings.activeId, Object.fromEntries(this.settings.presets.map(p=>[p.id,p.name])));
    this.describe(this.presetSelect, presetRow);
    this.presetSelect.onchange = () => {this.settings.activeId=this.presetSelect!.value; this.renderControls(); this.change();};
    this.host.ui.button(presetRow.control, 'Duplicate preset', () => {
      if(this.settings.presets.length>=30){this.host.notify('You can keep up to 30 presets.'); return;}
      const p = structuredClone(this.preset);
      p.id = crypto.randomUUID(); p.name = `${p.name} copy`;
      this.settings.presets.push(p); this.settings.activeId=p.id;
      this.renderControls(); this.change();
    }, {icon:'copy'});
    const remove = this.host.ui.button(presetRow.control, 'Remove preset', () => void this.removePreset(), {icon:'trash-2'});
    remove.disabled = this.settings.presets.length<2;
    const transfers=this.el('div','ps-preset-transfers');
    const importInput=this.el('input');importInput.type='file';importInput.accept='.json,application/json';importInput.hidden=true;
    importInput.onchange=()=>{const file=importInput.files?.[0];if(file)void this.importPresetFile(file);importInput.value='';};
    transfers.append(importInput);
    this.host.ui.button(transfers,'Import presets',()=>importInput.click());
    const exportSelect=this.host.ui.dropdown(transfers,'',{'':'Export…',current:'Current preset',all:'All presets'});
    exportSelect.setAttribute('aria-label','Export presets');
    exportSelect.onchange=()=>{if(exportSelect.value)this.exportPresetFile(exportSelect.value==='all');exportSelect.value='';};
    presetBox.append(transfers);
    const history=this.el('div','ps-history');
    this.undoButton=this.host.ui.button(history,'Undo change',()=>this.restore(),{tooltip:'Undo the last preset change (up to 20 steps in this session)'});
    this.redoButton=this.host.ui.button(history,'Redo change',()=>this.restore(true));
    presetBox.append(history);this.updateHistory();

    const brand = this.section('Identity');
    this.text(brand, 'Preset name', this.preset.name, value => {
      this.preset.name=value;
      const option = this.presetSelect?.selectedOptions[0];
      if(option) option.textContent=value;
    });
    this.text(brand, 'Company name', this.preset.company, value => this.preset.company=value);
    const logo = this.row(brand, 'Logo', this.preset.logoName || 'PNG, JPG, WebP or SVG, up to 2 MB.', true);
    if(this.preset.logo) {
      const img = this.el('img', 'ps-logo-thumbnail'); img.src=this.preset.logo; img.alt='Current company logo';
      logo.control.append(img);
    }
    const upload = this.el('input'); upload.type='file'; upload.hidden=true;
    upload.accept='image/png,image/jpeg,image/webp,image/svg+xml';
    upload.onchange = () => {const file=upload.files?.[0]; if(file) void this.loadLogo(file);};
    logo.control.append(upload);
    this.host.ui.button(logo.control, this.preset.logo ? 'Change logo' : 'Choose logo', () => upload.click());
    if(this.preset.logo) this.host.ui.button(logo.control, 'Remove logo', () => {this.preset.logo=''; this.preset.logoName=''; this.renderControls(); this.change();}, {icon:'x'});
    this.number(brand, 'Logo height (mm)', 'logoHeight', 4, 12);

    const page = this.section('Page layout');
    this.select(page, 'Paper size', this.preset.paper, {A4:'A4', Letter:'US Letter'}, v=>this.preset.paper=v as Preset['paper']);
    this.select(page, 'Orientation', this.preset.orientation, {portrait:'Portrait',landscape:'Landscape'}, v=>this.preset.orientation=v as Preset['orientation']);
    this.number(page, 'Top margin (mm)', 'marginTop', 22, 50);
    this.number(page, 'Bottom margin (mm)', 'marginBottom', 18, 50);
    this.number(page, 'Side margins (mm)', 'marginSide', 15, 40);
    this.toggle(page, 'Page break before headings', 'headingBreaks', 'Start each top-level heading after the first on a new page.');
    page.append(this.el('p', 'ps-tip', 'For a manual page break, add ==== on its own line. Add &&&& on its own line to push the following content to the bottom of the printed page, up to the next break.'));

    const type = this.section('Typography');
    this.select(type, 'Font', this.preset.font, {sans:'Sans serif',serif:'Serif'}, v=>this.preset.font=v as Preset['font']);
    this.number(type, 'Font size (pt)', 'fontSize', 8, 18);
    this.number(type, 'Line spacing', 'lineHeight', 1.2, 2, .05);

    const border = this.section('Borders and color');
    this.select(border, 'Page border', this.preset.border, {none:'None',solid:'Solid',double:'Double',dashed:'Dashed'}, v=>this.preset.border=v as Preset['border']);
    this.number(border, 'Border width (mm)', 'borderWidth', .3, 3, .1);
    const colorRow = this.row(border, 'Document color', 'Used for headings, borders, headers and footers.');
    this.describe(this.host.ui.color(colorRow.control, this.preset.color, value=>{this.preset.color=value; this.change();}), colorRow);

    for(const location of ['header','footer'] as const) {
      const band=this.section(location==='header'?'Header':'Footer');
      for(const alignment of ['left','center','right'] as const) this.multiline(band, alignment[0].toUpperCase()+alignment.slice(1), this.preset[location][alignment], v=>this.preset[location][alignment]=v);
      this.toggle(band, 'Show dividing line', location==='header'?'headerRule':'footerRule');
    }
    const first=this.section('First page');
    this.toggle(first,'Different first-page header','differentFirstPage','Use a larger letterhead and separate text on page 1. Header settings apply to subsequent pages.');
    this.toggle(first,'Logo on first page only','logoFirstPageOnly');
    if(this.preset.differentFirstPage) {
      this.number(first,'First-page top margin (mm)','firstPageMarginTop',22,70);
      this.number(first,'First-page logo height (mm)','firstPageLogoHeight',4,30);
      for(const alignment of ['left','center','right'] as const)this.multiline(first,alignment[0].toUpperCase()+alignment.slice(1),this.preset.firstPageHeader[alignment],v=>this.preset.firstPageHeader[alignment]=v);
      this.toggle(first,'Show dividing line','firstPageHeaderRule');
    }
    const tokens = this.section('Text placeholders');
    tokens.append(this.el('p', 'ps-tip', 'Use placeholders in a header or footer to include information from your note.'));
    for(const [token,description] of Object.entries({'{{company}}':'Company name','{{title}}':'Note title','{{date}}':'Current date','{{vault}}':'Vault name','{{page}}':'Current page','{{pages}}':'Total pages','{{meta:client}}':'A note property, such as client'})) {
      const line=this.el('div','ps-token'); line.append(this.el('code','',token),this.el('span','',description)); tokens.append(line);
    }
    this.controls.parentElement!.scrollTop=scroll;
  }
  private async removePreset() {
    const {id,name}=this.preset;
    if(this.settings.presets.length<2 || !await this.host.ui.confirmRemoval(name) || this.disposed || this.settings.presets.length<2) return;
    this.settings.presets=this.settings.presets.filter(p=>p.id!==id);
    if(this.settings.activeId===id) this.settings.activeId=this.settings.presets[0].id;
    this.renderControls(); this.change();
  }
  private async loadLogo(file:File) {
    const id=this.preset.id;
    try {
      if(file.size>2_000_000)throw Error('Choose a logo smaller than 2 MB.');
      if(!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(file.type))throw Error('Choose a PNG, JPG, WebP, or SVG logo.');
      let blob:Blob=file;
      if(file.type==='image/svg+xml') {const svg=DOMPurify.sanitize(await file.text(),{USE_PROFILES:{svg:true,svgFilters:true},FORBID_TAGS:['foreignObject','style','image','use'],FORBID_ATTR:['style']});blob=new Blob([svg],{type:'image/svg+xml'});}
      const url=URL.createObjectURL(blob);let data:string;
      try {const img=new Image();img.src=url;await img.decode();const scale=Math.min(1,1200/Math.max(img.naturalWidth,img.naturalHeight));const canvas=this.el('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));canvas.getContext('2d')!.drawImage(img,0,0,canvas.width,canvas.height);data=canvas.toDataURL('image/png');}finally{URL.revokeObjectURL(url);}
      if(data.length>=3_000_000)throw Error('This logo is too detailed. Try a smaller image.');
      const preset=this.settings.presets.find(p=>p.id===id);if(!preset || this.disposed)return;preset.logo=data;preset.logoName=file.name;this.renderControls();this.change();
    }catch(error){this.host.notify(error instanceof Error?error.message:String(error));}
  }
  async render(refresh=false) {
    window.clearTimeout(this.timer);window.clearTimeout(this.timeout);const revision=++this.revision;this.token=crypto.randomUUID();this.disablePreview();this.status.textContent='Preparing pages…';
    const preset=normalizePreset(this.preset);
    try {
      if(refresh || !this.sourcePromise) {
        const pending=Promise.resolve().then(()=>this.host.source());this.sourcePromise=pending;
        void pending.catch(()=>{if(this.sourcePromise===pending)this.sourcePromise=undefined;});
      }
      const source=await this.sourcePromise;if(this.disposed || revision!==this.revision)return;
      this.title=source.context.title;this.noteName.textContent=this.title;this.noteName.title=this.title;
      this.metadata=source.context.metadata;this.updatePlaceholders();this.sourceWarnings=source.warnings;this.renderNotes();
      this.frame.srcdoc=frameDocument({html:source.html,preset,context:source.context},this.token,this.host.ui.createElement,this.colorScheme());
      this.timeout=window.setTimeout(()=>{if(!this.disposed && revision===this.revision)this.status.textContent='This note is taking longer to paginate. Try refreshing the note.';},30000);
    }catch(error){if(revision!==this.revision || this.disposed)return;this.status.textContent='Could not render this note';this.host.notify(error instanceof Error?error.message:String(error));}
  }
  dispose(){this.disposed=true;this.themeObserver.disconnect();++this.revision;window.clearTimeout(this.timer);window.clearTimeout(this.timeout);window.removeEventListener('message',this.onMessage);this.frame.remove();this.root.replaceChildren();}
}
