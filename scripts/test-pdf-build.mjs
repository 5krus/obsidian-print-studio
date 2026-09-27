import {build} from 'esbuild';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
import {modernPdfLib} from './pdf-lib-build.mjs';

// Run the PDF and desktop-boundary tests against the same dependency source
// build shipped to users, as well as the package build used by unit tests.
const directory=await mkdtemp(join(tmpdir(),'print-studio-pdf-build-'));
try {
  await build({entryPoints:['tests/pdf-output.test.ts','tests/native-print.test.ts'],
    bundle:true,platform:'node',format:'cjs',target:'es2022',outdir:directory,
    outExtension:{'.js':'.cjs'},plugins:[modernPdfLib],logLevel:'silent'});
  const files=['pdf-output.test.cjs','native-print.test.cjs'].map(name=>join(directory,name));
  for(const file of files)assert.doesNotMatch(await readFile(file,'utf8'),/\b__(?:awaiter|generator|spreadArrays?)\b/);
  const result=await promisify(execFile)(process.execPath,['--test',...files],{timeout:120_000,maxBuffer:1024*1024});
  process.stdout.write(result.stdout);
} finally {await rm(directory,{recursive:true,force:true});}
