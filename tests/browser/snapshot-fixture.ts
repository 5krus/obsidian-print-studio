import {freezePageContent} from '../../src/page-snapshot';
import {pageCss} from '../../src/document';
import {defaults} from '../../src/settings';
declare global {interface Window {freezeSnapshot:()=>void;snapshotCss:string}}
window.freezeSnapshot=()=>{
  const lineBox=document.createElement('span');lineBox.className='ps-fixed-line';
  freezePageContent([...document.querySelectorAll<HTMLElement>('.pagedjs_page')],document.createElement('br'),lineBox);
};
window.snapshotCss=pageCss(defaults().presets[0]);
