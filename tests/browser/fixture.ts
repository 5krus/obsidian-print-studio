import {validationMarkdown,TEST_IMAGE,embeddedNoteHtml,inlineEmbeddedNote,embeddedFigureHtml} from '../fixtures';
import {serializeRenderedNote} from '../../src/rendered-note';
import {marked} from 'marked';
import {StudioPanel} from '../../src/panel';
import {defaults} from '../../src/settings';
import {prepareMarkdown} from '../../src/template';
import {browserUI} from '../support/ui';
const query=new URLSearchParams(location.search);
const embedRoot=document.createElement('div');embedRoot.innerHTML=embeddedNoteHtml;
const embedHtml=serializeRenderedNote(inlineEmbeddedNote(embedRoot),browserUI.createElement);
const diagram=document.createElement('canvas');diagram.width=2756;diagram.height=2756;
const pen=diagram.getContext('2d')!;pen.strokeStyle='black';pen.lineWidth=20;pen.strokeRect(50,50,2656,2656);
const figureHtml=embeddedFigureHtml(diagram.toDataURL('image/png'));
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
if(query.has('figure')){preset.fontSize=9;preset.lineHeight=1.55;preset.marginTop=27;preset.marginBottom=27;preset.marginSide=15;preset.hideEmbeddedNoteMetadata=true;}
if(query.has('firstPage')) {
  preset.differentFirstPage=true;preset.firstPageMarginTop=55;preset.firstPageLogoHeight=25;preset.logoFirstPageOnly=true;
  preset.firstPageHeader={left:'FIRST-PAGE HEADER',center:'',right:'{{meta:client}}'};
}
if(query.has('overflow')) {
  preset.header.left='Long header text '.repeat(17);preset.footer.right='Long footer text '.repeat(17);
}
if(query.has('uppercase')) {
  preset.header={left:'{{title}}',center:'{{vault}}',right:'{{company}}'};
  preset.footer={left:'{{date}}',center:'{{meta:client}}',right:'Page {{page}} / {{pages}}'};
  preset.firstPageHeader={left:'Prepared for café',center:'{{title}}',right:'{{meta:client}}'};
}
const markdown=query.has('cover')?`${query.has('top')?'TOP-ANCHOR\n\n':''}&&&&\n\n# COVER-TITLE\n\n${query.has('longCover')?Array.from({length:45},(_,i)=>`COVER-ROW-${i} ${'Cover content. '.repeat(15)}\n\n`).join(''):''}Cover subtitle\n\n&&&&\n\nCOVER-AUTHOR${query.has('noBreak')?'':'\n\n====\n\n# BODY-START\n\nBody content.'}`:query.has('overflow')?'<h1>Oversized row</h1><table><tr><td>'+Array.from({length:100},(_,i)=>`Line ${i}<br>`).join('')+'</td></tr></table>':validationMarkdown(preset.logo);
window.testReads=0;
const panel=new StudioPanel(document.querySelector('#studio')!,{
  ui:browserUI,settings,
  source:async()=>{window.testReads++;return {html:query.has('figure')?figureHtml:query.has('embeds')?embedHtml:await marked.parse(prepareMarkdown(query.has('uppercase')?'# Example\n\nMixed case body stays unchanged.\n\n====\n\nSecond page.':markdown)),context:{title:query.has('uppercase')?'Example':'Print validation',vault:'Test vault',date:'13 Sep 2026',metadata:{client:'Acme'}},warnings:[]};},
  output:async request=>{window.testOutput=request;},
  save:async settings=>{window.testSaved=settings;},
  notify:message=>{window.testNotices.push(message);},
});
declare global {interface Window {testOutput:import('../../src/native-print').OutputRequest;testPanel:StudioPanel;testSaved:unknown;testNotices:string[];testExport:string;testPages:number;testReads:number;}}
window.testPanel=panel;window.testNotices=[];
window.addEventListener('message',event=>{if(event.data?.type==='exported')window.testExport=event.data.html;if(event.data?.type==='ready')window.testPages=event.data.pages;});
