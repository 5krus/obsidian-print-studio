import {chromium} from 'playwright';
import {build} from 'esbuild';
import {modernPdfLib} from './pdf-lib-build.mjs';
import {copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

// Run only against a separate profile and a synthetic vault with Dataview installed.
const results=resolve('test-results/dataview-native');await mkdir(results,{recursive:true});
const fixture=resolve('build/native-dataview.cjs');
await build({entryPoints:['tests/native/formatting.ts'],bundle:true,platform:'node',format:'cjs',target:'es2022',outfile:fixture,plugins:[modernPdfLib]});
const browser=await chromium.connectOverCDP(process.env.PRINT_STUDIO_CDP_URL??'http://127.0.0.1:9228');
let page,previousSettings;
try {
  page=browser.contexts()[0].pages().find(p=>p.url().startsWith('app://obsidian.md/'));
  assert.ok(page,'Open the isolated test vault first.');
  assert.equal(await page.evaluate(()=>app.vault.getName()),'print-studio-dataview-lab','Refusing to modify a personal vault.');
  const lab=await page.evaluate(()=>app.vault.adapter.basePath);
  const pluginPath=join(lab,'.obsidian/plugins/print-studio/main.js');
  previousSettings=await page.evaluate(()=>({...app.plugins.plugins.dataview.settings}));
  await page.evaluate(()=>{for(const modal of app.plugins.plugins['print-studio'].studios)modal.close();app.setting.close();});
  for(const other of browser.contexts()[0].pages())if(other!==page && (await other.title()).startsWith('Settings - print-studio-dataview-lab'))await other.close();
  await page.bringToFront();
  const markdown=await readFile('tests/native/fixtures/dataview-study.md','utf8');
  await page.evaluate(async markdown=>{
    for(const [path,content] of [['Dataview issue.md',markdown],['Dataview custom.md','---\nname: Custom Salve\n---\n# `dv: this.name`\n\nDefault prefix stays literal: `=this.name`\n']]) {
      const file=app.vault.getFileByPath(path);if(file)await app.vault.modify(file,content);else await app.vault.create(path,content);
    }
    await app.plugins.plugins.dataview.updateSettings({enableInlineDataview:true,inlineQueryPrefix:'=',inlineJsQueryPrefix:'$=',enableDataviewJs:false,enableInlineDataviewJs:false,inlineQueriesInCodeblocks:false});
  },markdown);
  await page.waitForFunction(()=>Boolean(app.plugins.plugins.dataview.api.page('Dataview issue.md')?.recipe?.shelf_life) && Boolean(app.plugins.plugins.dataview.api.page('Dataview custom.md')));
  const load=async path=>{
    await page.evaluate(async()=>{for(const modal of app.plugins.plugins['print-studio'].studios)modal.close();await app.plugins.disablePlugin('print-studio');});
    await copyFile(path,pluginPath);
    await page.evaluate(async()=>{await app.plugins.enablePlugin('print-studio');});
  };
  const open=async(mode,file='Dataview issue.md')=>{
    await page.evaluate(async({mode,file})=>{
      const plugin=app.plugins.plugins['print-studio'];for(const modal of plugin.studios)modal.close();
      const preset=plugin.studioSettings.presets.find(p=>p.id===plugin.studioSettings.activeId);preset.formatting=mode;
      await app.workspace.getLeaf(false).openFile(app.vault.getFileByPath(file));
      plugin.openStudio(app.vault.getFileByPath(file));
    },{mode,file});
    await page.getByRole('status').filter({hasText:'Ready to print'}).waitFor({timeout:20000});
  };
  if(process.env.PRINT_STUDIO_BASELINE_BUNDLE) {
    await load(resolve(process.env.PRINT_STUDIO_BASELINE_BUNDLE));await open('studio');
    assert.match(await page.frameLocator('.ps-frame').locator('h1').innerText(),/=this.name/);
    await page.screenshot({path:join(results,'before.png')});
  }
  await load(resolve('main.js'));
  for(const mode of ['studio','text','reading']) {
    await open(mode);
    const preview=page.frameLocator('.ps-frame');
    assert.equal(await preview.locator('h1').innerText(),'Sample Salve · v2');
    const text=await preview.locator('.ps-content').innerText();
    for(const value of ['Complex expression: 3','Shelf life: 6 months','Active: false','Amount: 0','Made: 2026-11-01','alpha','beta','const value = 2'])assert.ok(text.includes(value),value);
    assert.equal((await preview.locator('pre code').innerText()).trim(),'=this.name');
    assert.deepEqual(await page.evaluate(()=>[...app.plugins.plugins['print-studio'].studios][0].panel.sourceWarnings),[]);
    await page.screenshot({path:join(results,`after-${mode}.png`)});
    const prefix=join(results,mode);
    await page.evaluate(({fixture,prefix})=>{
      window.dataviewResult=undefined;
      const modal=[...app.plugins.plugins['print-studio'].studios][0];
      modal.panel.host.output=async request=>{
        try {window.dataviewResult={paths:await require(fixture).captureFormatting(require('electron').remote,request,prefix)};}
        catch(error){window.dataviewResult={error:String(error)};}
      };
    },{fixture,prefix});
    await page.getByRole('button',{name:'Save PDF',exact:true}).click();
    await page.waitForFunction(()=>window.dataviewResult!==undefined,{},{timeout:30000});
    const result=await page.evaluate(()=>window.dataviewResult);assert.equal(result.error,undefined);
    for(const path of result.paths) {
      const pdfText=execFileSync('pdftotext',['-layout',path,'-'],{encoding:'utf8'});
      assert.match(pdfText,/Sample Salve · v2/);assert.match(pdfText,/Complex expression: 3/);assert.doesNotMatch(pdfText,/=this.version/);
    }
    console.log(`${mode}: real Dataview values, HTML snapshot, native PDF and print PDF passed`);
  }
  await page.evaluate(()=>app.plugins.plugins.dataview.updateSettings({inlineQueryPrefix:'dv:'}));
  await open('studio','Dataview custom.md');
  assert.equal(await page.frameLocator('.ps-frame').locator('h1').innerText(),'Custom Salve');
  assert.match(await page.frameLocator('.ps-frame').locator('.ps-content').innerText(),/=this.name/);
  await page.evaluate(()=>app.plugins.plugins.dataview.updateSettings({inlineQueryPrefix:'=',enableInlineDataview:false}));
  await open('studio');
  assert.equal(await page.frameLocator('.ps-frame').locator('h1').innerText(),'=this.name · v=this.version');
  assert.deepEqual(await page.evaluate(()=>[...app.plugins.plugins['print-studio'].studios][0].panel.sourceWarnings),[]);
  await page.evaluate(async()=>{
    await app.plugins.plugins.dataview.updateSettings({enableInlineDataview:true});
    for(const [path,content] of [['Dataview embedded.md','---\nname: Embedded Balm\n---\n## Embedded: `=this.name`\n'],['Dataview parent.md','---\nname: Parent Balm\n---\n# Parent: `=this.name`\n\n![[Dataview embedded]]\n']]) {
      const file=app.vault.getFileByPath(path);if(file)await app.vault.modify(file,content);else await app.vault.create(path,content);
    }
  });
  await page.waitForFunction(()=>Boolean(app.plugins.plugins.dataview.api.page('Dataview embedded.md')) && Boolean(app.plugins.plugins.dataview.api.page('Dataview parent.md')));
  await open('studio','Dataview parent.md');
  assert.equal(await page.frameLocator('.ps-frame').locator('h1').innerText(),'Parent: Parent Balm');
  assert.equal(await page.frameLocator('.ps-frame').locator('h2').innerText(),'Embedded: Embedded Balm');
  const report=await page.evaluate(()=>({obsidian:document.title.match(/Obsidian ([\d.]+)/)?.[1],dataview:app.plugins.plugins.dataview.manifest.version}));
  await writeFile(join(results,'report.json'),JSON.stringify({...report,modes:['studio','text','reading'],customPrefix:true,disabledQueries:true,embeddedSource:true,nativePDF:true},null,2));
  console.log('Custom prefix, disabled inline queries and embedded source context passed');
} finally {
  if(page && previousSettings)await page.evaluate(async settings=>{
    for(const modal of app.plugins.plugins['print-studio'].studios)modal.close();
    await app.plugins.plugins.dataview.updateSettings(settings);
  },previousSettings);
  await browser.close();
}
