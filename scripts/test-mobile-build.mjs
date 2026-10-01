import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const calls=[];
class Component {}
class Modal extends Component {
  constructor(app){super();this.app=app;this.contentEl={};}
  open(){} close(){}
}
class Plugin extends Component {
  app={workspace:{on:()=>({})}};
  async loadData(){return null;}
  addCommand(){} addRibbonIcon(){} registerEvent(){} addSettingTab(){} registerEditorExtension(){}
}
const obsidian={Plugin,Component,Modal,PluginSettingTab:Component,
  Platform:{isDesktopApp:false,isMobileApp:true,isIosApp:true}};
const module={exports:{}};
runInNewContext(await readFile('main.js','utf8'),{module,exports:module.exports,console,setTimeout,clearTimeout,structuredClone,
  createEl:()=>{throw new Error('Reached mobile DOM renderer');},
  require:id=>{
    calls.push(id);
    if(id==='obsidian')return obsidian;
    if(id==='@codemirror/state' || id==='@codemirror/view')return require(id);
    throw new Error(`Mobile attempted to load ${id}`);
  },
},{timeout:10000});
const plugin=new module.exports.default();await plugin.onload();
plugin.openStudio({});
const modal=[...plugin.studios][0];
// Exercise the lazy mobile imports as well as plugin registration. Browser
// tests cover the real DOM/PDF stages beyond this deliberately stubbed boundary.
await assert.rejects(modal.output({kind:'pdf'}),/Reached mobile DOM renderer/);
plugin.onunload();
assert.ok(calls.includes('obsidian'));
assert.equal(JSON.parse(await readFile('manifest.json','utf8')).isDesktopOnly,false);
console.log('Mobile bundle loads, enables and enters PDF export without Electron, Node APIs, process or Buffer.');
