import cssTree, {type CssNode} from 'css-tree';
import {MAX_CUSTOM_CSS} from './settings';
const {parse,generate,walk}=cssTree;

// No resource-loading, positioning, generated text, or page geometry here.
// Scope and property filtering protect the paginator as well as the application.
export const TEXT_PROPERTIES = new Set([
  'color','background-color','font-family','font-size','font-weight','font-style',
  'font-variant','font-variant-caps','font-stretch','line-height','letter-spacing','word-spacing',
  'text-decoration','text-decoration-line','text-decoration-color','text-decoration-style','text-decoration-thickness',
  'text-transform','text-align','text-indent','text-underline-offset','vertical-align',
]);
const CUSTOM_PROPERTIES=new Set([...TEXT_PROPERTIES,
  'display','align-items','align-self','justify-content','gap','row-gap','column-gap',
  'flex','flex-grow','flex-shrink','flex-basis','flex-direction','flex-wrap','order','white-space','content',
  'margin','margin-top','margin-right','margin-bottom','margin-left',
  'padding','padding-top','padding-right','padding-bottom','padding-left',
  'border','border-color','border-style','border-width','border-radius',
  ...['top','right','bottom','left'].flatMap(side=>[`border-${side}`,`border-${side}-color`,`border-${side}-style`,`border-${side}-width`]),
]);

function scopedSelectors(node:CssNode):string[] {
  let last:CssNode|undefined;
  node.children?.forEach(child=>{last=child;});
  let pseudo='';
  walk(node,child=>{
    const legacy=child.type==='PseudoClassSelector' && ['before','after'].includes((child.name??'').toLowerCase());
    if(child.type==='Raw')throw new Error('Unsupported CSS selector.');
    if(child.type!=='PseudoElementSelector' && !legacy)return;
    if(child!==last || child.children || !['before','after'].includes((child.name??'').toLowerCase()))throw new Error('Only a final ::before or ::after decoration is supported.');
    pseudo=generate(child);
  });
  const selector=generate(node);
  // Pseudo-elements are invalid inside :is(). Scope the originating element,
  // then append its decoration, keeping sibling selectors inside note content.
  const base=pseudo?selector.slice(0,-pseudo.length)||'*':selector;
  return [`.ps-content:is(${base})${pseudo}`,`.ps-content :is(${base})${pseudo}`];
}

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
    const declarations:string[]=[];
    rule.block.children?.forEach(declaration=>{
      const property=(declaration.property??'').toLowerCase();
      if(declaration.type!=='Declaration' || !CUSTOM_PROPERTIES.has(property))throw new Error(`Unsupported CSS property: ${property || declaration.type}. Use text, spacing, border or flex styles.`);
      if(!declaration.value || !safeValue(declaration.value))throw new Error(`Use a literal value for ${property}; URLs and CSS variables are not supported.`);
      const value=generate(declaration.value);
      if(property==='display' && !['block','inline','inline-block','flex','inline-flex'].includes(value.toLowerCase()))throw new Error('Supported display values: block, inline, inline-block, flex and inline-flex.');
      if(property==='content' && !['""',"''",'none','normal'].includes(value))throw new Error('Use empty content (content: "") for decorations; generated text is not supported.');
      // Ordinary cascade order determines precedence, even for imported snippets.
      declarations.push(`${property}:${value}`);
    });
    // Scope each selector separately so a grouped ID selector does not raise
    // every other selector's specificity. Siblings cannot escape the note.
    const selectors:string[]=[];
    rule.prelude.children?.forEach(node=>{
      selectors.push(...scopedSelectors(node));
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
