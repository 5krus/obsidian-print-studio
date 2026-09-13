interface ImageFile {path:string;extension:string}
interface ImageLookup<T> {byPath(path:string):T|null;byLink(link:string):T|null}
const imageFile=<T extends ImageFile>(file:T|null):T|null=>file && /^(png|jpe?g|webp|gif|svg)$/i.test(file.extension)?file:null;
const hasScheme=(value:string)=>/^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('//');

/** Derive one vault-relative path from the current note's own resource URI.
 * No absolute filesystem read or directory enumeration is needed. */
export function resourceVaultPath(resource:string,noteResource:string,notePath:string):string|null {
  try {
    const image=new URL(resource),note=new URL(noteResource);
    if(image.protocol!==note.protocol || image.host!==note.host || image.username || image.password)return null;
    const source=decodeURIComponent(note.pathname),target=decodeURIComponent(image.pathname);
    if(!source.endsWith('/'+notePath))return null;
    const root=source.slice(0,-notePath.length);
    if(!target.startsWith(root))return null;
    const path=target.slice(root.length);
    if(!path || path.includes('\\') || path.includes('\0') || path.split('/').some(part=>!part || part==='.' || part==='..'))return null;
    return path;
  }catch{return null;}
}

export function resolveVaultImage<T extends ImageFile>(image:HTMLImageElement,noteResource:string,notePath:string,lookup:ImageLookup<T>):T|null {
  const src=(image.getAttribute('src')??'').trim();
  // External and already embedded images never cause a vault lookup.
  if(/^(https?:|data:|file:|blob:)/i.test(src) || src.startsWith('//'))return null;
  if(hasScheme(src)) {
    const path=resourceVaultPath(src,noteResource,notePath);
    return path===null?null:imageFile(lookup.byPath(path));
  }
  const embed=image.closest('.internal-embed');
  const references=[image.getAttribute('data-href'),embed?.getAttribute('src'),embed?.getAttribute('data-href'),src];
  for(const reference of references) {
    if(!reference || hasScheme(reference))continue;
    const link=reference.split('|')[0];
    const direct=imageFile(lookup.byLink(link));if(direct)return direct;
    try {
      const decoded=decodeURIComponent(link);
      if(decoded!==link && !hasScheme(decoded)) {const file=imageFile(lookup.byLink(decoded));if(file)return file;}
    }catch{/* Malformed URL escapes remain an unavailable image. */}
  }
  return null;
}
