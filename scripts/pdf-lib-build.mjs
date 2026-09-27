import {dirname,join,resolve,sep} from 'node:path';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const root=dirname(require.resolve('pdf-lib/package.json'));
const source=join(root,'src');

// The pinned npm package includes its TypeScript sources. Compile those for our
// supported Electron runtime instead of shipping the dependency's ES5 build.
// Resolve its private "src/*" aliases only inside that dependency.
export const modernPdfLib={name:'modern-pdf-lib',setup(build) {
  // Keep PDF-Lib's original assignment-style class fields. Apply consistently
  // to the whole bundle so production and validation use the same semantics.
  build.initialOptions.tsconfigRaw={compilerOptions:{useDefineForClassFields:false}};
  build.onResolve({filter:/^pdf-lib$/},()=>({path:join(source,'index.ts')}));
  build.onResolve({filter:/^src\//},async args=>{
    if(!args.importer.startsWith(source+sep))return;
    return build.resolve(resolve(root,args.path),{kind:args.kind,resolveDir:source});
  });
}};
