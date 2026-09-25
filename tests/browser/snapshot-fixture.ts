import {freezePageContent} from '../../src/page-snapshot';
import {pageCss} from '../../src/document';
import {defaults} from '../../src/settings';
declare global {interface Window {freezeSnapshot:()=>void;snapshotCss:string}}
window.freezeSnapshot=()=>freezePageContent([...document.querySelectorAll<HTMLElement>('.pagedjs_page')]);
window.snapshotCss=pageCss(defaults().presets[0]);
