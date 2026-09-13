import {mkdir,copyFile,readFile,rm,cp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const manifest=JSON.parse(await readFile('manifest.json','utf8'));
const pkg=JSON.parse(await readFile('package.json','utf8'));
const versions=JSON.parse(await readFile('versions.json','utf8'));
if(!/^\d+\.\d+\.\d+$/.test(manifest.version) || manifest.version!==pkg.version)throw new Error('Package and manifest versions must match (x.y.z).');
if(versions[manifest.version]!==manifest.minAppVersion)throw new Error('versions.json must record the current minimum Obsidian version.');
if(manifest.id!=='print-studio' || manifest.description.length>250 || !manifest.description.endsWith('.'))throw new Error('Invalid plugin ID or description.');
const folder='release/print-studio';
const archive=`print-studio-${manifest.version}.zip`;
await rm(folder,{recursive:true,force:true});
await mkdir(folder,{recursive:true});
for(const name of ['main.js','styles.css','manifest.json','README.md','LICENSE','THIRD_PARTY_NOTICES.md'])await copyFile(name,`${folder}/${name}`);
await cp('docs',`${folder}/docs`,{recursive:true});
// Start a fresh archive so a previous build cannot leave obsolete entries in it.
await rm(archive,{force:true});
execFileSync('zip',['-rq',`../${archive}`,'print-studio'],{cwd:'release'});
console.log(`Installable folder: ${folder}\nArchive: ${archive}`);
