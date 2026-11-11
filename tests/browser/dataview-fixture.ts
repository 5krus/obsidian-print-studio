import {captureNoteFormatting} from '../../src/note-formatting';
import {serializeRenderedNote} from '../../src/rendered-note';
import {settleDataviewInline} from '../../src/dataview-inline';
import {browserUI} from '../support/ui';

/** Model the asynchronous plugin API; native validation also runs real Dataview. */
export async function dataviewSource(disabled=false) {
  const root=browserUI.createElement('div','ps-render-source');document.body.append(root);
  root.innerHTML='<h1><code>=this.name</code> · v<code>=this.version</code></h1><p>Complex expression: <code>=this.version + 1</code></p><p>Ordinary code: <code>const value = 2</code></p><pre><code>=this.name</code></pre>';
  try {
    const values:Record<string,unknown>={'this.name':'Sample Salve','this.version':2,'this.version + 1':3};
    const pending=await settleDataviewInline(root,{
      settings:{enableInlineDataview:!disabled,inlineQueriesInCodeblocks:false},
      api:{
        evaluateInline:expression=>({successful:Object.hasOwn(values,expression),value:values[expression]}),
        renderValue:async(value,container)=>{await new Promise(resolve=>setTimeout(resolve,value===2?100:20));container.textContent=String(value);},
      },
    },{render:{component:{} as import('obsidian').Component,createElement:browserUI.createElement,sourcePathFor:()=> 'Recipe.md'}});
    return {html:serializeRenderedNote(root,browserUI.createElement),formatting:captureNoteFormatting(root,browserUI.createElement),context:{title:'Dataview test',vault:'Test vault',date:'Today',metadata:{}},warnings:pending?['Dataview queries did not finish']:[]};
  } finally {root.remove();}
}
