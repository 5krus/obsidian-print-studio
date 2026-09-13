export interface DocumentContext {title: string; vault: string; date: string; metadata: Record<string, unknown>}
export function placeholderOptions(metadata:Record<string,unknown>={}):Record<string,string> {
  const options:Record<string,string>={'':'Insert placeholder…','{{company}}':'Company name','{{title}}':'Note title','{{date}}':'Current date','{{vault}}':'Vault name','{{page}}':'Current page','{{pages}}':'Total pages'};
  for(const key of Object.keys(metadata).sort()) {
    if(key.trim()===key && key && !/[{}]/.test(key) && ['string','number','boolean'].includes(typeof metadata[key]) && key.length<=280)options[`{{meta:${key}}}`]=`Note property: ${key}`;
  }
  return options;
}
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function expandTemplate(template: string, context: DocumentContext, company: string, page = 1, pages = 1): string {
  const values: Record<string,string> = {title:context.title,vault:context.vault,date:context.date,company,page:String(page),pages:String(pages)};
  return template.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (raw, key: string) => {
    if (Object.hasOwn(values,key)) return values[key];
    if (key.startsWith('meta:')) {const name=key.slice(5).trim(); const value=Object.hasOwn(context.metadata,name) ? context.metadata[name] : undefined; return ['string','number','boolean'].includes(typeof value) ? String(value) : '';}
    return raw;
  });
}
/** Frontmatter must be at the beginning; do not mistake a body divider for metadata. */
export function stripFrontmatter(markdown: string): string {return markdown.replace(/^\uFEFF?---[ \t]*\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/,'');}
/** Preserve fenced examples that happen to contain our explicit break marker. */
export function prepareMarkdown(markdown: string): string {
  let fence: {char:string; length:number} | null = null;
  return stripFrontmatter(markdown).split('\n').map(line=>{
    const match=line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (match) {if(!fence) fence={char:match[1][0],length:match[1].length};else if(match[1][0]===fence.char && match[1].length>=fence.length && line.slice(match[0].length).trim()==='') fence=null;return line;}
    return !fence && /^\s*<!--\s*pagebreak\s*-->\s*$/.test(line) ? '<div class="ps-page-break"></div>' : line;
  }).join('\n');
}
