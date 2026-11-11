import {snapshotMermaid} from '../../src/mermaid-snapshot';
import {captureNoteFormatting} from '../../src/note-formatting';
import {browserUI} from '../support/ui';

// Mermaid's HTML-label structure, scoped CSS, local marker and host CSS variable.
export function mermaidSource() {
  const root=document.createElement('div');root.className='ps-render-source markdown-preview-view markdown-rendered';
  root.innerHTML=`<h1>Mermaid regression</h1><div class="mermaid"><svg xmlns="http://www.w3.org/2000/svg" id="diagram" width="300" height="180" viewBox="0 0 300 180">
    <style>#diagram {--node-fill:rgb(255, 180, 230);font:16px sans-serif} #diagram .node rect{fill:var(--node-fill);stroke:#203040;stroke-width:2px} #diagram .nodeLabel{color:#111} #diagram .edge{fill:none;stroke:#203040;stroke-width:2px;marker-end:url(#arrow)} #diagram .arrow{fill:#203040}</style>
    <defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path class="arrow" d="M 0 0 L 10 5 L 0 10 z"/></marker></defs>
    <g class="node"><rect x="10" y="10" width="280" height="60"/><foreignObject x="20" y="20" width="260" height="40"><div xmlns="http://www.w3.org/1999/xhtml" style="text-align:center;line-height:20px"><span class="nodeLabel">Updated planning<br/><b>Create feature branch</b></span></div></foreignObject></g>
    <path class="edge" d="M150 70 L150 105"/>
    <g class="node"><rect x="10" y="110" width="280" height="60"/><text x="150" y="145" text-anchor="middle" fill="#111">SVG text label</text></g>
  </svg></div><p>END-OF-DIAGRAM</p>`;
  document.body.append(root);snapshotMermaid(root,browserUI.createElement);
  const source={html:root.innerHTML,formatting:captureNoteFormatting(root,browserUI.createElement),context:{title:'Mermaid regression',vault:'Test vault',date:'11 Nov 2026',metadata:{}},warnings:[]};
  root.remove();return source;
}
