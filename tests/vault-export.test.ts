import test from 'node:test';
import assert from 'node:assert/strict';
import type {Vault} from 'obsidian';
import {saveVaultExport} from '../src/vault-export';

test('mobile exports preserve existing files, serialize simultaneous saves and copy binary slices',async()=>{
  const files=new Map<string,unknown>();
  const vault={getAbstractFileByPath:(path:string)=>files.get(path),createFolder:async(path:string)=>{files.set(path,{});},
    create:async(path:string,data:unknown)=>{assert.ok(!files.has(path));files.set(path,data);return {path};},
    createBinary:async(path:string,data:ArrayBuffer)=>{files.set(path,new Uint8Array(data));return {path};}} as unknown as Vault;
  await Promise.all([saveVaultExport(vault,'Note.html','first'),saveVaultExport(vault,'Note.html','second')]);
  assert.equal(files.get('Print Studio Exports/Note.html'),'first');
  assert.equal(files.get('Print Studio Exports/Note (1).html'),'second');
  await saveVaultExport(vault,'../note.pdf',new Uint8Array([0,1,2,3]).subarray(1,3));
  assert.deepEqual(files.get('Print Studio Exports/_note.pdf'),new Uint8Array([1,2]));
});
