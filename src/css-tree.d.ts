// The parser version also used by Paged.js. Only the API used here is declared.
declare module 'css-tree' {
  export interface CssNode {
    type:string; name?:string; property?:string; important?:boolean;
    children?:{forEach(callback:(node:CssNode)=>void):void};
    prelude?:CssNode; block?:CssNode; value?:CssNode;
  }
  export function parse(css:string,options?:{context?:string;onParseError?:(error:Error)=>void}):CssNode;
  export function generate(node:CssNode):string;
  export function walk(node:CssNode,callback:(node:CssNode)=>void):void;
  const api:{parse:typeof parse;generate:typeof generate;walk:typeof walk};
  export default api;
}
