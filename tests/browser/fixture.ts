import {validationMarkdown,TEST_IMAGE} from '../fixtures';
import {marked} from 'marked';
import {StudioPanel} from '../../src/panel';
import {defaults} from '../../src/settings';
import {prepareMarkdown} from '../../src/template';
import {browserUI} from '../../demo/ui';
const query=new URLSearchParams(location.search);
const settings=defaults();
const preset=settings.presets[0];
preset.paper=query.get('paper')==='Letter'?'Letter':'A4';
preset.orientation=query.get('orientation')==='landscape'?'landscape':'portrait';
preset.company='Print Studio test';
preset.header.left='PRINT-CHECK HEADER';
preset.header.right='{{title}}';
preset.footer.left='PRINT-CHECK FOOTER';
preset.footer.center='{{company}}';
preset.footer.right='{{page}} / {{pages}}';
preset.logo=TEST_IMAGE;
const markdown=validationMarkdown(preset.logo);
const panel=new StudioPanel(document.querySelector('#studio')!,{
  ui:browserUI,settings,
  source:async()=>({html:await marked.parse(prepareMarkdown(markdown)),context:{title:'Print validation',vault:'Test vault',date:'13 Sep 2026',metadata:{}},warnings:[]}),
  save:async settings=>{window.testSaved=settings;},
  notify:message=>{window.testNotices.push(message);},
});
declare global {interface Window {testPanel:StudioPanel;testSaved:unknown;testNotices:string[];testExport:string;testPages:number;}}
window.testPanel=panel;window.testNotices=[];
window.addEventListener('message',event=>{if(event.data?.type==='exported')window.testExport=event.data.html;if(event.data?.type==='ready')window.testPages=event.data.pages;});
