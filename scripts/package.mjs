import {mkdir,copyFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
await mkdir('release/print-studio',{recursive:true});
for(const name of ['main.js','styles.css','manifest.json','README.md','LICENSE','THIRD_PARTY_NOTICES.md'])await copyFile(name,`release/print-studio/${name}`);
execFileSync('zip',['-rq','../print-studio-0.1.0.zip','print-studio'],{cwd:'release'});
console.log('Installable folder: release/print-studio\nArchive: print-studio-0.1.0.zip');
