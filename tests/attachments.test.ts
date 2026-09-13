import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {resourceVaultPath,resolveVaultImage} from '../src/attachments';
const dom=new JSDOM('<!doctype html><body></body>');
after(()=>dom.window.close());
const note='Notes/Proposal.md',resource='app://vault-id/home/user/My%20Vault/Notes/Proposal.md?123';
const file={path:'Assets/Chart #1%.png',extension:'png'};
const img=(src:string)=>{const image=dom.window.document.createElement('img');image.setAttribute('src',src);return image;};

test('resource paths resolve only the referenced attachment, preserving encoded characters and duplicate names',()=>{
  const lookups:string[]=[];
  const image=img('app://vault-id/home/user/My%20Vault/Assets/Chart%20%231%25.png?456');
  assert.equal(resolveVaultImage(image,resource,note,{byPath:path=>{lookups.push(path);return path===file.path?file:null;},byLink:()=>{throw Error('No name guessing is needed');}}),file);
  assert.deepEqual(lookups,[file.path]);
  assert.equal(resourceVaultPath('app://vault-id/C:/Users/Example/Vault/Images/%E6%97%A5%E6%9C%AC.jpg','app://vault-id/C:/Users/Example/Vault/Note.md','Note.md'),'Images/日本.jpg');
});

test('resource lookups reject outside-vault paths, other origins, traversal, and invalid encoding',()=>{
  for(const value of ['app://vault-id/home/user/My%20Vault-other/secret.png','app://other/home/user/My%20Vault/image.png','app://vault-id/home/user/My%20Vault/../secret.png','app://vault-id/home/user/My%20Vault/%2e%2e%2fsecret.png','app://vault-id/home/user/My%20Vault/%5c..%5csecret.png','app://vault-id/home/user/My%20Vault/bad%ZZ.png','app://vault-id/home/user/My%20Vault/a%00.png','app://user:password@vault-id/home/user/My%20Vault/a.png']) {
    assert.equal(resourceVaultPath(value,resource,note),null,value);
  }
  assert.equal(resourceVaultPath(resource,resource,'Wrong.md'),null);
});

test('remote, external, inline, and malformed resource images never read or search the vault',()=>{
  const lookup={byPath:()=>{throw Error('Unexpected lookup');},byLink:()=>{throw Error('Unexpected lookup');}};
  for(const value of ['https://example.com/chart.png','//example.com/chart.png','file:///home/user/chart.png','data:image/png;base64,aGVsbG8=','blob:local','app://other/path.png']) {
    assert.equal(resolveVaultImage(img(value),resource,note,lookup),null);
  }
});

test('relative Markdown images and unsaved wiki embeds use targeted link resolution',()=>{
  const lookups:string[]=[];
  const lookup={byPath:()=>null,byLink:(path:string)=>{lookups.push(path);return path==='New image.png'?{path:'Assets/New image.png',extension:'png'}:null;}};
  assert.equal(resolveVaultImage(img('New%20image.png'),resource,note,lookup)?.path,'Assets/New image.png');
  assert.deepEqual(lookups,['New%20image.png','New image.png']);
  const embed=dom.window.document.createElement('span');embed.className='internal-embed';embed.setAttribute('src','New image.png|200');const image=img('');embed.append(image);
  assert.equal(resolveVaultImage(image,resource,note,lookup)?.path,'Assets/New image.png');
  image.setAttribute('data-href','New image.png');assert.equal(resolveVaultImage(image,resource,note,lookup)?.extension,'png');
});

test('missing references and non-image attachments stay unavailable',()=>{
  const image=img('app://vault-id/home/user/My%20Vault/Assets/Note.md');
  assert.equal(resolveVaultImage(image,resource,note,{byPath:()=>({path:'Assets/Note.md',extension:'md'}),byLink:()=>null}),null);
  assert.equal(resolveVaultImage(img('missing.png'),resource,note,{byPath:()=>null,byLink:()=>null}),null);
});
