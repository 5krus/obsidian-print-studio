import {readFile,readdir,writeFile} from 'node:fs/promises';
const lock=JSON.parse(await readFile('package-lock.json','utf8'));
let output='# Third-party notices\n\nThe plugin bundles Paged.js, DOMPurify, and their applicable runtime dependencies.\n\n';
for(const [path,entry] of Object.entries(lock.packages)){
  if(!path || entry.dev)continue;
  const pkg=JSON.parse(await readFile(`${path}/package.json`,'utf8'));
  output+=`## ${pkg.name} ${pkg.version}\n\nLicense: ${pkg.license ?? 'See below'}\n\n`;
  const names=(await readdir(path)).filter(name=>/^(license|licence|copying)(\.|$)/i.test(name));
  for(const name of names)output+='```text\n'+(await readFile(`${path}/${name}`,'utf8')).trim()+'\n```\n\n';
}
await writeFile('THIRD_PARTY_NOTICES.md',output);
