import {chromium} from 'playwright';
import {build} from 'esbuild';
import {modernPdfLib} from './pdf-lib-build.mjs';
import {copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

// Use a separate Obsidian profile and a synthetic vault with Mermaid enabled.
const results=resolve('test-results/mermaid-native');await mkdir(results,{recursive:true});
const fixture=resolve('build/native-mermaid.cjs');
await build({entryPoints:['tests/native/formatting.ts'],bundle:true,platform:'node',format:'cjs',target:'es2022',outfile:fixture,plugins:[modernPdfLib]});
const browser=await chromium.connectOverCDP(process.env.PRINT_STUDIO_CDP_URL??'http://127.0.0.1:9229');
try {
  const page=browser.contexts()[0].pages().find(p=>p.url().startsWith('app://obsidian.md/'));
  assert.ok(page,'Open the isolated test vault first.');
  assert.equal(await page.evaluate(()=>app.vault.getName()),'print-studio-mermaid-lab','Refusing to modify a personal vault.');
  const lab=await page.evaluate(()=>app.vault.adapter.basePath);
  await page.evaluate(async()=>{for(const modal of app.plugins.plugins['print-studio'].studios)modal.close();app.setting.close();await app.plugins.disablePlugin('print-studio');});
  await copyFile(resolve('main.js'),join(lab,'.obsidian/plugins/print-studio/main.js'));
  await page.evaluate(async()=>{await app.plugins.enablePlugin('print-studio');});
  const markdown=await readFile('tests/native/fixtures/mermaid-study.md','utf8');
  await page.evaluate(async markdown=>{
    await app.workspace.getLeaf(false).setViewState({type:'empty'});
    const file=app.vault.getFileByPath('Mermaid issue.md');if(file)await app.vault.modify(file,markdown);else await app.vault.create('Mermaid issue.md',markdown);
  },markdown);
  for(const theme of ['light','dark'])for(const mode of ['studio','text','reading']) {
    await page.evaluate(theme=>{document.body.classList.toggle('theme-dark',theme==='dark');document.body.classList.toggle('theme-light',theme==='light');},theme);
    await page.evaluate(async mode=>{
      const plugin=app.plugins.plugins['print-studio'];for(const modal of plugin.studios)modal.close();
      plugin.studioSettings.presets.find(p=>p.id===plugin.studioSettings.activeId).formatting=mode;
      await app.workspace.getLeaf(false).openFile(app.vault.getFileByPath('Mermaid issue.md'));
      plugin.openStudio(app.vault.getFileByPath('Mermaid issue.md'));
    },mode);
    await page.getByRole('status').filter({hasText:'Ready to print'}).waitFor({timeout:20000});
    const images=page.frameLocator('.ps-frame').locator('img.ps-mermaid');
    const snapshots=await images.evaluateAll(images=>images.map(img=>({loaded:img.complete && img.naturalWidth>0,svg:decodeURIComponent(img.src.split(',')[1])})));
    assert.equal(snapshots.length,2);assert.ok(snapshots.every(image=>image.loaded));
    for(const label of ['Updated planning','Create feature branch','Update local planning'])assert.ok(snapshots[0].svg.includes(label),label);
    assert.ok(snapshots[0].svg.includes('fill:rgb(236, 236, 255)'));
    assert.ok(snapshots[1].svg.includes('Custom theme'));assert.ok(snapshots[1].svg.includes('fill:rgb(255, 255, 255)'));
    await page.screenshot({path:join(results,`after-${theme}-${mode}.png`)});
    await writeFile(join(results,`${theme}-${mode}.svg`),snapshots[0].svg);
    const prefix=join(results,`${theme}-${mode}`);
    await page.evaluate(({fixture,prefix})=>{
      window.mermaidResult=undefined;
      const modal=[...app.plugins.plugins['print-studio'].studios][0];
      modal.panel.host.output=async request=>{
        try {window.mermaidResult={paths:await require(fixture).captureFormatting(require('electron').remote,request,prefix)};}
        catch(error){window.mermaidResult={error:String(error)};}
      };
    },{fixture,prefix});
    await page.getByRole('button',{name:'Save PDF',exact:true}).click();
    await page.waitForFunction(()=>window.mermaidResult!==undefined,{},{timeout:30000});
    const result=await page.evaluate(()=>window.mermaidResult);assert.equal(result.error,undefined);
    for(const path of result.paths) {
      execFileSync('pdftoppm',['-scale-to','1200','-png',path,path.replace('.pdf','')]);
    }
    console.log(`${theme} ${mode}: styled Mermaid labels, HTML, native PDF and print PDF captured`);
  }
} finally {await browser.close();}
