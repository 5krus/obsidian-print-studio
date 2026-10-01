import {chromium} from 'playwright';
import {build} from 'esbuild';
import {modernPdfLib} from './pdf-lib-build.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

// Start a separate Obsidian profile with --remote-debugging-port=9227 and open
// the supplied synthetic lab vault. Never run this against a personal vault.
const results=resolve('test-results-native-formatting');await mkdir(results,{recursive:true});
const fixture=resolve('build/native-formatting.cjs');
await build({entryPoints:['tests/native/formatting.ts'],bundle:true,platform:'node',format:'cjs',target:'es2022',outfile:fixture,plugins:[modernPdfLib]});
const browser=await chromium.connectOverCDP('http://127.0.0.1:9227');
try {
  const page=browser.contexts()[0].pages().find(p=>p.url().startsWith('app://obsidian.md/'));
  assert.ok(page,'Open the isolated test vault first.');
  assert.equal(await page.evaluate(()=>app.vault.getName()),'print-studio-lab','Refusing to modify a personal vault.');
  for(const other of browser.contexts()[0].pages())if(other!==page && (await other.title()).startsWith('Settings - print-studio-lab'))await other.close();
  await page.bringToFront();
  await page.evaluate(async fixture=>{
    delete require.cache[require.resolve(fixture)];
    const plugin=app.plugins.plugins['print-studio'];for(const modal of plugin?.studios??[])modal.close();
    await app.plugins.disablePlugin('print-studio');await app.plugins.enablePlugin('print-studio');
    await app.workspace.getLeaf(false).openFile(app.vault.getFileByPath('Formatting study.md'));
    const leaf=app.workspace.getMostRecentLeaf();await leaf.setViewState({type:'markdown',state:{file:'Formatting study.md',mode:'preview'}});
  },fixture);
  const matrix=[['light','studio'],['light','text'],['light','reading'],['dark','text'],['dark','reading'],['light','custom']];
  const report=[];
  for(const [theme,mode] of matrix) {
    const prefix=resolve(results,`${theme}-${mode}`);
    await page.evaluate(async({theme,mode,prefix,fixture})=>{
      const plugin=app.plugins.plugins['print-studio'];for(const modal of plugin.studios)modal.close();
      // Switch the same body classes used by Obsidian's light/dark themes.
      document.body.classList.toggle('theme-dark',theme==='dark');document.body.classList.toggle('theme-light',theme==='light');
      const preset=plugin.studioSettings.presets.find(p=>p.id===plugin.studioSettings.activeId);
      // Start each case from the same built-in layout, regardless of lab edits.
      const identity={id:preset.id,name:preset.name};
      Object.assign(preset,require(fixture).formattingDefaults().presets.find(p=>p.id==='minimal'),identity);
      preset.formatting=mode==='custom'?'text':mode;preset.customCssEnabled=mode!=='studio';
      preset.customCss='p {text-align:justify; text-indent:12px}'+(mode==='custom'?'strong {color:#cc00cc} .ftc-color-default-blue {background-color:#a5f3fc}':'');
      // Fix every slot so prior lab edits and today's date cannot change the
      // reference output while comparing renderer/library builds.
      preset.header={left:'Native formatting check',center:'',right:''};
      preset.footer={left:'Print Studio prototype',center:'',right:'{{page}} / {{pages}}'};
      plugin.openStudio(app.vault.getFileByPath('Formatting study.md'));
      const modal=[...plugin.studios][0];
      window.formattingResult=undefined;
      modal.panel.host.output=async request=>{
        try {const paths=await require(fixture).captureFormatting(require('electron').remote,request,prefix);window.formattingResult={paths};}
        catch(error){window.formattingResult={error:String(error)};throw error;}
      };
    },{theme,mode,prefix,fixture});
    await page.getByRole('status').filter({hasText:'Ready to print'}).waitFor({timeout:60_000});
    const frame=page.frameLocator('.ps-frame');
    const expectedColor=mode==='custom'?'rgb(204, 0, 204)':mode==='studio'?'rgb(38, 39, 39)':'rgb(180, 35, 24)';
    assert.equal(await frame.getByText('BOLD-CHECK',{exact:true}).evaluate(el=>getComputedStyle(el).color),expectedColor);
    if(mode!=='studio') {
      assert.equal(await frame.getByText('FTC-RED-CHECK',{exact:true}).evaluate(el=>getComputedStyle(el).color),'rgb(255, 0, 0)');
      assert.equal(await frame.getByText('FTC-BLUE-CHECK',{exact:true}).evaluate(el=>getComputedStyle(el).color),'rgb(0, 0, 255)');
      assert.equal(await frame.getByText('HIGHLIGHT-CHECK',{exact:true}).evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(254, 240, 138)');
    }
    if(mode!=='studio') {
      const result=await frame.locator('.pagedjs_page_content p').evaluateAll(paragraphs=>{
        const colored=paragraphs.filter(p=>p.textContent.includes('Long colored paragraphs'));
        const errors=[];let words=0;
        for(const paragraph of colored) {
          const bounds=paragraph.closest('.pagedjs_page_content').getBoundingClientRect();
          const walker=document.createTreeWalker(paragraph,NodeFilter.SHOW_TEXT),range=document.createRange();
          let node;
          while((node=walker.nextNode())) {
            if(!node.textContent.trim())continue;
            words+=node.textContent.trim().split(/\s+/u).length;
            const style=getComputedStyle(node.parentElement);
            if(style.color!=='rgb(255, 0, 0)' || !style.fontFamily.includes('Times New Roman'))errors.push('Lost FTC style');
            range.selectNodeContents(node);
            for(const rect of range.getClientRects())if(rect.left<bounds.left-1 || rect.right>bounds.right+1 || rect.bottom>bounds.bottom+1)errors.push('Text outside print margins');
          }
        }
        return {words,errors};
      });
      assert.ok(result.words>300,'The whole FTC paragraph must render');assert.deepEqual(result.errors,[]);
      await frame.locator('.pagedjs_page').first().screenshot({path:`${prefix}-preview.png`});
    }
    const pages=await frame.locator('.pagedjs_page').count();
    await page.getByRole('button',{name:'Save PDF',exact:true}).click();
    await page.waitForFunction(()=>window.formattingResult,undefined,{timeout:90_000});
    const result=await page.evaluate(()=>window.formattingResult);assert.ok(!result.error,result.error);
    for(const path of result.paths) {
      const info=execFileSync('pdfinfo',[path],{encoding:'utf8'});assert.equal(Number(info.match(/Pages:\s+(\d+)/)[1]),pages);
      const text=execFileSync('pdftotext',['-layout',path,'-'],{encoding:'utf8'});
      assert.ok(!text.includes('ftcTheme:') && !text.includes('cssclasses:'),'Frontmatter must not print');
      for(const marker of ['BOLD-CHECK','ITALIC-CHECK','HIGHLIGHT-CHECK','FTC-RED-CHECK','FTC-BLUE-CHECK','INLINE-CHECK','FTC-LONG-START','FTC-LONG-END','END-OF-STUDY'])assert.ok(text.includes(marker),`${path}: missing ${marker}`);
      for(let i=0;i<24;i++)assert.equal(text.match(new RegExp(`ROW-${String(i).padStart(2,'0')}`,'g'))?.length,1);
      const size=info.match(/Page size:\s+([\d.]+) x ([\d.]+)/);assert.ok(Math.abs(Number(size[1])-595.28)<1 && Math.abs(Number(size[2])-841.89)<1);
    }
    assert.equal(execFileSync('pdftotext',['-layout',result.paths[0],'-'],{encoding:'utf8'}),execFileSync('pdftotext',['-layout',result.paths[1],'-'],{encoding:'utf8'}));
    execFileSync('pdftoppm',['-f','1','-singlefile','-scale-to','1200','-png',result.paths[0],`${prefix}-page-1`]);
    report.push({theme,mode,pages,paths:result.paths});console.log(`${theme} ${mode}: ${pages} pages, both native output paths retain all text`);
  }
  await writeFile(resolve(results,'report.json'),JSON.stringify(report,null,2));
} finally {await browser.close();}
