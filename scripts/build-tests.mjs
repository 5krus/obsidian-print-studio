import {build} from 'esbuild';
import {writeFile} from 'node:fs/promises';
const runtime=await build({entryPoints:['src/frame.ts'],bundle:true,write:false,format:'iife',platform:'browser',target:'chrome110',minify:true});
await build({entryPoints:['tests/browser/fixture.ts'],bundle:true,format:'iife',platform:'browser',target:'chrome110',outfile:'build/test.js',define:{FRAME_RUNTIME:JSON.stringify(runtime.outputFiles[0].text)}});
await writeFile('build/test.html','<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="theme.css"><link rel="stylesheet" href="styles.css"></head><body class="theme-dark"><div id="studio"></div><script src="test.js"></script></body></html>');
