import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import {readFile,rm} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import assert from 'node:assert/strict';
const fixture=resolve('build/native-validation.cjs'),results=resolve('test-results');
await build({entryPoints:['tests/native/fixture.ts'],bundle:true,platform:'node',format:'cjs',outfile:fixture});
const resultFile=join(results,'native-validation-result.json');
await rm(resultFile,{force:true});
const code=`delete require.cache[require.resolve(${JSON.stringify(fixture)})];require(${JSON.stringify(fixture)}).validate(require('electron').remote,${JSON.stringify(results)}).then(paths=>require('node:fs').writeFileSync(${JSON.stringify(resultFile)},JSON.stringify({paths}))).catch(error=>require('node:fs').writeFileSync(${JSON.stringify(resultFile)},JSON.stringify({error:String(error)})))`;
// CLI arguments are passed directly, without shell interpolation.
execFileSync('obsidian',['eval',`code=${code}`],{encoding:'utf8',timeout:120_000});
// Obsidian's CLI may return before the asynchronous evaluation completes.
let paths;
for(let attempt=0;attempt<60;attempt++) {
  try {
    const result=JSON.parse(await readFile(resultFile,'utf8'));
    if(result.error)throw new Error(result.error);
    paths=result.paths;break;
  } catch(error) {if(error.code!=='ENOENT')throw error;}
  await new Promise(resolve=>setTimeout(resolve,1000));
}
assert.equal(paths?.length,16,'Native validation did not finish; check obsidian dev:errors.');
for(const path of paths) {
  const folder=dirname(path),request=JSON.parse(await readFile(join(folder,'native-request.json'),'utf8'));
  const info=execFileSync('pdfinfo',['-f','1','-l','10000',path],{encoding:'utf8'});
  const expected=request.preset.paper==='A4'?[595.28,841.89]:[612,792];
  if(request.preset.orientation==='landscape')expected.reverse();
  const sizes=[...info.matchAll(/Page\s+\d+ size:\s+([\d.]+) x ([\d.]+)/g)];
  const reference=execFileSync('pdfinfo',[join(folder,'direct.pdf')],{encoding:'utf8'});
  assert.equal(sizes.length,Number(reference.match(/Pages:\s+(\d+)/)[1]));
  for(const size of sizes)for(let i=0;i<2;i++)assert.ok(Math.abs(Number(size[i+1])-expected[i])<1,`${path}: incorrect page size`);
  const text=execFileSync('pdftotext',['-layout',path,'-'],{encoding:'utf8'});
  for(let i=1;i<=65;i++)assert.equal(text.match(new RegExp(`ROW-${String(i).padStart(3,'0')}`,'g'))?.length,1);
  for(let i=1;i<=12;i++)assert.equal(text.match(new RegExp(`PARAGRAPH-${String(i).padStart(3,'0')}`,'g'))?.length,1);
  assert.ok(text.includes('END-OF-DOCUMENT'));
  console.log(`${request.preset.paper} ${request.preset.orientation}${request.preset.differentFirstPage?' first-page letterhead':''}: ${sizes.length} native PDF pages verified`);
}
