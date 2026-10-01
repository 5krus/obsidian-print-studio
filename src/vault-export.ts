import type {Vault} from 'obsidian';
const folder='Print Studio Exports';
// Serialize exports to avoid overwriting or colliding with another open studio.
let queue:Promise<unknown>=Promise.resolve();
export function saveVaultExport(vault:Vault,filename:string,content:string|Uint8Array) {
  const save=async()=>{
    if(!vault.getAbstractFileByPath(folder))await vault.createFolder(folder);
    const name=filename.replace(/[\\/:*?"<>|\p{Cc}]/gu,'_').replace(/^\.+/,'').slice(0,180)||'document';
    const dot=name.lastIndexOf('.');
    const stem=dot>0?name.slice(0,dot):name,extension=dot>0?name.slice(dot):'';
    let path=`${folder}/${name}`,number=1;
    while(vault.getAbstractFileByPath(path))path=`${folder}/${stem} (${number++})${extension}`;
    return typeof content==='string'?vault.create(path,content):vault.createBinary(path,new Uint8Array(content).buffer);
  };
  const result=queue.then(save);queue=result.catch(()=>{});return result;
}
