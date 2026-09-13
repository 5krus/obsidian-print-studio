import {build,context} from 'esbuild';
import {mkdir,copyFile} from 'node:fs/promises';
const runtime=await build({entryPoints:['src/frame.ts'],bundle:true,write:false,format:'iife',platform:'browser',target:'chrome110',minify:true});
const define={FRAME_RUNTIME:JSON.stringify(runtime.outputFiles[0].text)};
const config={entryPoints:['src/main.ts'],bundle:true,external:['obsidian','electron'],format:'cjs',platform:'node',target:'es2022',outfile:'main.js',define,minify:true};
await mkdir('build',{recursive:true});
await Promise.all([build(config),build({entryPoints:['demo/demo.ts'],bundle:true,format:'iife',platform:'browser',target:'chrome110',outfile:'build/demo.js',define}),copyFile('demo/index.html','build/index.html'),copyFile('styles.css','build/styles.css'),copyFile('demo/theme.css','build/theme.css')]);
if(process.argv.includes('--watch')){const ctx=await context(config);await ctx.watch();console.log('Watching plugin source. Re-run build after changing the frame runtime.');}
console.log('Built main.js and browser demo.');
