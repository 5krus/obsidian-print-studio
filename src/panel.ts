import DOMPurify from 'dompurify';
import {frameDocument} from './document';
import {normalizePreset, type Settings, type Preset} from './settings';
import type {DocumentContext} from './template';
import type {SettingRow, StudioUI} from './ui';
let fieldId = 0;
export interface StudioHost {
  settings:Settings;
  ui:StudioUI;
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
  private noteName:HTMLElement;
  private themeObserver:MutationObserver;
  private colorScheme() {return document.body.classList.contains('theme-dark') ? 'dark' : 'light';}
  private syncTheme = () => {const scheme=this.colorScheme();this.frame.style.colorScheme=scheme;this.frame.contentWindow?.postMessage({type:'theme',scheme,token:this.token},'*');};
  private presetSelect?:HTMLSelectElement;
  private expanded = new Set(['Identity']);
  private revision=0;
  private token='';
  private timer:ReturnType<typeof setTimeout>|undefined;
  private timeout:ReturnType<typeof setTimeout>|undefined;
  private disposed=false;
  private saveQueue=Promise.resolve();
  private title='document';
  private onMessage=(event:MessageEvent)=>{
    if(event.source!==this.frame.contentWindow || event.data?.token!==this.token || this.disposed) return;
    if(event.data.type==='ready') {this.syncTheme();clearTimeout(this.timeout);this.status.textContent=`${event.data.pages} ${event.data.pages===1?'page':'pages'} · Ready to print`;this.printButton.disabled=false;this.exportButton.disabled=false;}
    if(event.data.type==='error') {clearTimeout(this.timeout);this.status.textContent='Preview failed';this.host.notify('Print Studio: '+String(event.data.message));}
    if(event.data.type==='exported' && typeof event.data.html==='string') {const blob=new Blob([event.data.html],{type:'text/html;charset=utf-8'});const url=URL.createObjectURL(blob);const a=el('a');a.href=url;a.download=`${this.title.replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,100)||'document'} — Print Studio.html`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  };
  constructor(private root:HTMLElement, private host:StudioHost) {
    this.settings = structuredClone(host.settings);
    root.classList.add('ps-studio');
    const top = el('header', 'ps-top');
    const identity = el('div', 'ps-identity');
    const icon = el('span', 'ps-title-icon');
    icon.setAttribute('aria-hidden', 'true');
    host.ui.icon(icon, 'printer');
    identity.append(icon, el('span', 'ps-title', 'Print Studio'));
    this.noteName = el('span', 'ps-note-name');
    top.append(identity, this.noteName);
    const actions = el('div', 'ps-actions');
    host.ui.button(actions, 'Refresh note', () => void this.render(), {icon: 'refresh-cw'});
    this.exportButton = host.ui.button(actions, 'Export HTML', () => this.frame.contentWindow?.postMessage({type:'export', token:this.token}, '*'), {tooltip:'Export pages as a self-contained HTML document'});
    this.printButton = host.ui.button(actions, 'Print / Save PDF', () => this.frame.contentWindow?.postMessage({type:'print', token:this.token}, '*'), {primary:true});
    this.printButton.classList.add('ps-primary');
    top.append(actions);

    const body = el('div', 'ps-workbench');
    const side = el('aside', 'ps-sidebar');
    side.setAttribute('aria-label', 'Print layout');
    this.controls = el('div', 'ps-controls');
    side.append(this.controls);
    const preview = el('section', 'ps-preview');
    preview.setAttribute('aria-label', 'Document preview');
    const bar = el('div', 'ps-preview-bar');
    bar.append(el('span', '', 'Preview'));
    this.status = el('span', '', 'Preparing…');
    this.status.setAttribute('role', 'status');
    bar.append(this.status);
    this.frame = el('iframe', 'ps-frame');
    this.frame.title = 'Paginated print preview';
    this.frame.setAttribute('sandbox', 'allow-scripts allow-modals');
    this.notes = el('div', 'ps-notes');
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
  private change() {++this.revision;this.token='';this.persist();this.printButton.disabled=true;this.exportButton.disabled=true;this.status.textContent='Updating preview…';clearTimeout(this.timer);this.timer=setTimeout(()=>void this.render(),450);}
  private section(title:string) {
    const section = el('details', 'ps-section');
    section.dataset.section = title;
    section.open = this.expanded.has(title);
    const summary = el('summary');
    const arrow = el('span', 'ps-disclosure');
    arrow.setAttribute('aria-hidden', 'true');
    this.host.ui.icon(arrow, 'chevron-right');
    summary.append(arrow, el('span', '', title));
    section.append(summary);
    const body = el('div', 'ps-section-body');
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
    input.oninput = () => {set(input.value); this.change();};
    return input;
  }
  private multiline(parent:HTMLElement, title:string, value:string, set:(v:string)=>void) {
    const row = this.row(parent, title, undefined, true);
    const input = this.host.ui.text(row.control, value, true) as HTMLTextAreaElement;
    input.rows = 2;
    input.maxLength = 300;
    input.placeholder = 'None';
    this.describe(input, row);
    input.oninput = () => {set(input.value); this.change();};
  }
  private select(parent:HTMLElement, title:string, value:string, options:Record<string,string>, set:(v:string)=>void) {
    const row = this.row(parent, title);
    const input = this.host.ui.dropdown(row.control, value, options);
    this.describe(input, row);
    input.onchange = () => {set(input.value); this.change();};
    return input;
  }
  private number(parent:HTMLElement, title:string, key:'marginTop'|'marginBottom'|'marginSide'|'fontSize'|'lineHeight'|'borderWidth'|'logoHeight', min:number, max:number, step=1) {
    const row = this.row(parent, title);
    const input = this.host.ui.text(row.control, String(this.preset[key])) as HTMLInputElement;
    input.type = 'number';
    input.min = String(min); input.max = String(max); input.step = String(step);
    this.describe(input, row);
    input.onchange = () => {this.preset[key]=Number(input.value); Object.assign(this.preset,normalizePreset(this.preset)); input.value=String(this.preset[key]); this.change();};
  }
  private toggle(parent:HTMLElement, title:string, key:'headerRule'|'footerRule'|'headingBreaks', hint?:string) {
    const row = this.row(parent, title, hint);
    row.element.classList.add('mod-toggle');
    const toggle = this.host.ui.toggle(row.control, this.preset[key], value => {this.preset[key]=value; this.change();});
    this.describe(toggle, row);
  }
  private renderControls() {
    const sections = this.controls.querySelectorAll<HTMLDetailsElement>('details');
    if(sections.length) this.expanded = new Set([...sections].filter(s=>s.open).map(s=>s.dataset.section!));
    const scroll = this.controls.parentElement!.scrollTop;
    this.controls.replaceChildren();
    const presetBox = el('div', 'ps-preset-box');
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

    const brand = this.section('Identity');
    this.text(brand, 'Preset name', this.preset.name, value => {
      this.preset.name=value;
      const option = this.presetSelect?.selectedOptions[0];
      if(option) option.textContent=value;
    });
    this.text(brand, 'Company name', this.preset.company, value => this.preset.company=value);
    const logo = this.row(brand, 'Logo', this.preset.logoName || 'PNG, JPG, WebP or SVG, up to 2 MB.', true);
    if(this.preset.logo) {
      const img = el('img', 'ps-logo-thumbnail'); img.src=this.preset.logo; img.alt='Current company logo';
      logo.control.append(img);
    }
    const upload = el('input'); upload.type='file'; upload.hidden=true;
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
    page.append(el('p', 'ps-tip', 'For a manual page break, add <!-- pagebreak --> on its own line in your note.'));

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
    const tokens = this.section('Text placeholders');
    tokens.append(el('p', 'ps-tip', 'Use placeholders in a header or footer to include information from your note.'));
    for(const [token,description] of Object.entries({'{{company}}':'Company name','{{title}}':'Note title','{{date}}':'Current date','{{vault}}':'Vault name','{{page}}':'Current page','{{pages}}':'Total pages','{{meta:client}}':'A note property, such as client'})) {
      const line=el('div','ps-token'); line.append(el('code','',token),el('span','',description)); tokens.append(line);
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
      try {const img=new Image();img.src=url;await img.decode();const scale=Math.min(1,1200/Math.max(img.naturalWidth,img.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));canvas.getContext('2d')!.drawImage(img,0,0,canvas.width,canvas.height);data=canvas.toDataURL('image/png');}finally{URL.revokeObjectURL(url);}
      if(data.length>=3_000_000)throw Error('This logo is too detailed. Try a smaller image.');
      const preset=this.settings.presets.find(p=>p.id===id);if(!preset || this.disposed)return;preset.logo=data;preset.logoName=file.name;this.renderControls();this.change();
    }catch(error){this.host.notify(error instanceof Error?error.message:String(error));}
  }
  async render() {
    clearTimeout(this.timer);clearTimeout(this.timeout);const revision=++this.revision;this.token=crypto.randomUUID();this.printButton.disabled=true;this.exportButton.disabled=true;this.status.textContent='Preparing pages…';
    const preset=normalizePreset(this.preset);
    try {const source=await this.host.source();if(this.disposed || revision!==this.revision)return;this.title=source.context.title;this.noteName.textContent=this.title;this.noteName.title=this.title;this.notes.textContent=source.warnings.length?source.warnings.join(' · '):'Print tip: choose the same paper size, 100% scale, no browser headers/footers, and enable background graphics.';this.frame.srcdoc=frameDocument({html:source.html,preset,context:source.context},this.token,this.colorScheme());this.timeout=setTimeout(()=>{if(!this.disposed && revision===this.revision)this.status.textContent='This note is taking longer to paginate. Try Refresh note.';},30000);}catch(error){if(revision!==this.revision || this.disposed)return;this.status.textContent='Could not render this note';this.host.notify(error instanceof Error?error.message:String(error));}
  }
  dispose(){this.disposed=true;this.themeObserver.disconnect();++this.revision;clearTimeout(this.timer);clearTimeout(this.timeout);window.removeEventListener('message',this.onMessage);this.frame.remove();this.root.replaceChildren();}
}
