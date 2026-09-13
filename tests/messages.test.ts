import test from 'node:test';
import assert from 'node:assert/strict';
import {frameCommand,frameMessage} from '../src/messages';
test('frame communication rejects malformed messages and impossible navigation values',()=>{
  for(const data of [null,{},42,{type:'ready',pages:3},{type:'ready',token:'t',pages:NaN},{type:'ready',token:'t',pages:0},{type:'ready',token:'t',pages:10001}])assert.equal(frameMessage(data),undefined);
  for(const data of [{type:'page',token:'t',page:-1},{type:'page',token:'t',page:Infinity},{type:'zoom',token:'t',value:'9999'},{type:'theme',token:'t',scheme:'red'}])assert.equal(frameCommand(data),undefined);
  assert.deepEqual(frameMessage({type:'ready',token:'t',pages:3}),{type:'ready',token:'t',pages:3});
  assert.deepEqual(frameCommand({type:'zoom',token:'t',value:'fit'}),{type:'zoom',token:'t',value:'fit'});
});
