import cssTree, {type CssNode} from 'css-tree';
import {MAX_CUSTOM_CSS} from './settings';
const {parse,generate,walk}=cssTree;

// No resource-loading, positioning, generated content, or page geometry here.
// Scope and property filtering protect the paginator as well as the application.
export const TEXT_PROPERTIES = new Set([
  'color','background-color','font-family','font-size','font-weight','font-style',
  'font-variant','font-variant-caps','font-stretch','line-height','letter-spacing','word-spacing',
  'text-decoration','text-decoration-line','text-decoration-color','text-decoration-style','text-decoration-thickness',
  'text-transform','text-align','text-indent','text-underline-offset','vertical-align',
]);
const CUSTOM_PROPERTIES=new Set([...TEXT_PROPERTIES,
  'margin','margin-top','margin-right','margin-bottom','margin-left',
  'padding','padding-top','padding-right','padding-bottom','padding-left',
  'border','border-color','border-style','border-width','border-radius',
  ...['top','right','bottom','left'].flatMap(side=>[`border-${side}`,`border-${side}-color`,`border-${side}-style`,`border-${side}-width`]),
]);

function safeValue(value:CssNode):boolean {
  let safe=true;
  walk(value,node=>{
    if(node.type==='Url' || node.type==='Raw' || (node.type==='Function' && !['rgb','rgba','hsl','hsla','hwb','lab','lch','oklab','oklch','color','color-mix','calc','min','max','clamp'].includes((node.name??'').toLowerCase())))safe=false;
  });
  return safe;
}

/** Strict parsing: never run a partially recovered stylesheet without feedback. */
export function compileContentCss(css:string):string {
  if(!css.trim())return '';
  if(css.length>MAX_CUSTOM_CSS)throw new Error('Custom CSS is limited to 50,000 characters.');
  const ast=parse(css,{onParseError:error=>{throw error;}});
  const output:string[]=[];
  ast.children?.forEach(rule=>{
    if(rule.type!=='Rule' || rule.prelude?.type!=='SelectorList' || !rule.block)throw new Error('Use ordinary CSS rules. @media, @import, @font-face and @page are not supported.');
    walk(rule.prelude,node=>{
      if(node.type==='PseudoElementSelector' || node.type==='Raw')throw new Error('Generated content and pseudo-elements are not supported.');
    });
    const declarations:string[]=[];
    rule.block.children?.forEach(declaration=>{
      const property=(declaration.property??'').toLowerCase();
      if(declaration.type!=='Declaration' || !CUSTOM_PROPERTIES.has(property))throw new Error(`Unsupported CSS property: ${property || declaration.type}. Use text, spacing or border styles.`);
      if(!declaration.value || !safeValue(declaration.value))throw new Error(`Use a literal value for ${property}; URLs and CSS variables are not supported.`);
      // Ordinary cascade order determines precedence, even for imported snippets.
      declarations.push(`${property}:${generate(declaration.value)}`);
    });
    // Scope each selector separately so a grouped ID selector does not raise
    // every other selector's specificity. Siblings cannot escape the note.
    const selectors:string[]=[];
    rule.prelude.children?.forEach(node=>{
      const selector=generate(node);
      selectors.push(`.ps-content:is(${selector})`,`.ps-content :is(${selector})`);
    });
    output.push(`${selectors.join(',')}{${declarations.join(';')}}`);
  });
  return output.join('\n');
}

/** Export data, kept separate from DOM styling. Only validated text values enter. */
export function textStyleDeclarations(style:CSSStyleDeclaration):Map<string,string> {
  const declarations=new Map<string,string>();
  for(const property of TEXT_PROPERTIES) {
    const value=style.getPropertyValue(property);
    if(!value)continue;
    try {if(safeValue(parse(value,{context:'value',onParseError:error=>{throw error;}})))declarations.set(property,value);}
    catch { /* Invalid or unsupported formatting is omitted. */ }
  }
  return declarations;
}

/** Only serialize declarations returned by textStyleDeclarations or internal defaults. */
export function serializeTextStyle(declarations:ReadonlyMap<string,string>):string {
  return [...declarations].map(([property,value])=>`${property}: ${value};`).join(' ');
}

/** Rebuild declarations from a finite list; do not trust style attributes. */
export function filterTextStyle(style:CSSStyleDeclaration,target:CSSStyleDeclaration):void {
  for(const [property,value] of textStyleDeclarations(style))target.setProperty(property,value);
}
