import {mkdir,readdir,copyFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const lab=resolve(process.argv[2]??'../print-studio-lab');
try {if((await readdir(lab)).length)throw new Error('Choose a new or empty test-vault directory; existing data will not be overwritten.');}
catch(error){if(error.code!=='ENOENT')throw error;}
const config=join(lab,'.obsidian'),plugin=join(config,'plugins/print-studio');
await mkdir(plugin,{recursive:true});await mkdir(join(config,'snippets'),{recursive:true});
for(const name of ['main.js','manifest.json','styles.css','LICENSE','THIRD_PARTY_NOTICES.md'])await copyFile(name,join(plugin,name));
await copyFile('tests/native/fixtures/formatting-study.md',join(lab,'Formatting study.md'));
await copyFile('tests/native/fixtures/study-styles.css',join(config,'snippets/study-styles.css'));
await copyFile('docs/FORMATTING.md',join(lab,'Testing guide.md'));
await writeFile(join(config,'community-plugins.json'),JSON.stringify(['print-studio','fast-text-color']));
await writeFile(join(config,'appearance.json'),JSON.stringify({theme:'obsidian',enabledCssSnippets:['study-styles']}));
const settingsFile=resolve('build/lab-settings.cjs');await build({entryPoints:['src/settings.ts'],bundle:true,platform:'node',format:'cjs',outfile:settingsFile});
const settings=createRequire(import.meta.url)(settingsFile).defaults();
for(const mode of ['text','reading','custom']) {
  const p=structuredClone(settings.presets[2]);p.id=`prototype-${mode}`;p.name=`Prototype — ${mode}`;
  p.formatting=mode==='custom'?'text':mode;p.customCssEnabled=mode==='custom';
  p.customCss=mode==='custom'?'strong { color: #cc00cc; }\n.ftc-color-default-blue { background-color: #a5f3fc; }':'';
  settings.presets.push(p);
}
settings.activeId='prototype-text';await writeFile(join(plugin,'data.json'),JSON.stringify(settings,null,2));
console.log(`Created ${lab}\nOpen it as a vault in Obsidian, enable Print Studio, and install Fast Text Color from Community plugins.`);
