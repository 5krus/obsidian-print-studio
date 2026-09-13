import type {StudioUI} from '../src/ui';

function append<K extends keyof HTMLElementTagNameMap>(parent:HTMLElement, tag:K, cls='', text='') {
  const node=document.createElement(tag); node.className=cls; node.textContent=text; parent.append(node); return node;
}
// Small standalone counterparts for the Obsidian components used by the panel.
// Production imports the real components from Obsidian through obsidian-ui.ts.
export const browserUI:StudioUI = {
  setting(parent, name, description) {
    const element=append(parent,'div','setting-item');
    const info=append(element,'div','setting-item-info');
    const nameEl=append(info,'div','setting-item-name',name);
    const desc=append(info,'div','setting-item-description',description);
    return {element,control:append(element,'div','setting-item-control'),name:nameEl,description:desc};
  },
  text(parent, value, multiline) {
    const input=multiline?append(parent,'textarea'):append(parent,'input');
    if(input instanceof HTMLInputElement) input.type='text';
    input.value=value; return input;
  },
  dropdown(parent, value, options) {
    const select=append(parent,'select','dropdown');
    for(const [key,label] of Object.entries(options)) append(select,'option','',label).value=key;
    select.value=value; return select;
  },
  toggle(parent, value, change) {
    const toggle=append(parent,'div','checkbox-container'); toggle.tabIndex=0; toggle.setAttribute('role','switch');
    const update=()=>{toggle.classList.toggle('is-enabled',value); toggle.setAttribute('aria-checked',String(value));};
    update(); toggle.onclick=()=>{value=!value; update(); change(value);};
    toggle.onkeydown=event=>{if(event.key===' ' || event.key==='Enter'){event.preventDefault(); toggle.click();}};
    return toggle;
  },
  color(parent, value, change) {const input=append(parent,'input'); input.type='color'; input.value=value; input.oninput=()=>change(input.value); return input;},
  button(parent, label, action, options={}) {
    const button=append(parent,'button',options.primary?'mod-cta':'', options.icon?'':label);
    button.type='button'; button.onclick=action; button.setAttribute('aria-label',label);
    if(options.icon){button.classList.add('clickable-icon'); browserUI.icon(button,options.icon);}
    if(options.tooltip || options.icon) button.title=options.tooltip ?? label;
    return button;
  },
  icon(parent, name) {
    const paths:Record<string,string[]>={
      printer:['M6 9V3h12v6','M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2','M6 14h12v8H6z','M18 12h.01'],
      'refresh-cw':['M20 11a8 8 0 0 0-14-5L3 9','M3 3v6h6','M4 13a8 8 0 0 0 14 5l3-3','M15 15h6v6'],
      copy:['M9 9h13v13H9z','M5 15H2V2h13v3'],
      'trash-2':['M3 6h18','M19 6l-1 14H6L5 6','M9 6V3h6v3','M10 10v6','M14 10v6'],
      x:['M18 6 6 18','M6 6l12 12'],
      'chevron-right':['m9 18 6-6-6-6'],
      'chevron-left':['m15 18-6-6 6-6'],
    };
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    for(const [key,value] of Object.entries({viewBox:'0 0 24 24',width:'18',height:'18',fill:'none',stroke:'currentColor','stroke-width':'1.75','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'})) svg.setAttribute(key,value);
    for(const d of paths[name]??[]){const path=document.createElementNS(svg.namespaceURI,'path'); path.setAttribute('d',d); svg.append(path);}
    parent.replaceChildren(svg);
  },
  confirmRemoval:async name=>window.confirm(`Remove “${name}”? This cannot be undone.`),
};
