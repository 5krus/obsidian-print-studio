import {StateField, type EditorState} from '@codemirror/state';
import {Decoration, EditorView, type DecorationSet} from '@codemirror/view';
import {printMarkerLines} from './template';

function decorations(state:EditorState):DecorationSet {
  const hidden=printMarkerLines(state.doc.toString()).flatMap(({line:number})=>{
    const line=state.doc.line(number);
    const active=state.selection.ranges.some(range=>range.from<=line.to && range.to>=line.from);
    return active?[]:[Decoration.replace({}).range(line.from,line.to)];
  });
  return Decoration.set(hidden);
}

export const pageBreakEditor=StateField.define<DecorationSet>({
  create:decorations,
  update:(value,transaction)=>transaction.docChanged || transaction.selection?decorations(transaction.state):value,
  provide:field=>EditorView.decorations.from(field),
});
