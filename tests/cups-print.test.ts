import test from 'node:test';
import assert from 'node:assert/strict';
import {access,readFile} from 'node:fs/promises';
import {cupsArguments,listPrinters,submitPDF} from '../src/cups-print';
import {defaults} from '../src/settings';

const request={kind:'print' as const,title:'A title; $(not-a-command)',html:'',preset:defaults().presets[0]};
test('CUPS overrides saved paper defaults for both sizes and orientations',()=>{
  for(const paper of ['A4','Letter'] as const)for(const orientation of ['portrait','landscape'] as const) {
    const args=cupsArguments('/tmp/document.pdf',{...request,preset:{...request.preset,paper,orientation}},{printer:'Office printer',copies:2});
    assert.deepEqual(args,['-d','Office printer','-t',request.title,'-n','2','-o',`media=${paper}`,'-o',`PageSize=${paper}`,'-o',`orientation-requested=${orientation==='landscape'?4:3}`,'-o','fit-to-page','-o','sides=one-sided','/tmp/document.pdf']);
  }
  for(const copies of [0,-1,1.5,NaN,1000])assert.throws(()=>cupsArguments('/tmp/test',request,{printer:'Office',copies}),/Copies/);
});
test('printer discovery selects a known default and handles missing printers',async()=>{
  assert.deepEqual(await listPrinters(async(_,args)=>({stdout:args[0]==='-e'?'One\nTwo\n':'system default destination: Two\n'})),{names:['One','Two'],preferred:'Two'});
  assert.deepEqual(await listPrinters(async(_,args)=>{if(args[0]==='-d')throw new Error('No default');return {stdout:'One\n'};}),{names:['One'],preferred:'One'});
  await assert.rejects(listPrinters(async()=>({stdout:''})),/No system printers/);
  await assert.rejects(listPrinters(async()=>{throw new Error('ENOENT');}),/Save PDF/);
});
test('submission passes bytes without a shell and removes temporary files after success or failure',async()=>{
  for(const fail of [false,true]) {
    let path='';
    const result=submitPDF(Buffer.from('%PDF-test'),request,{printer:'Office',copies:1},async(command,args)=>{
      assert.equal(command,'lp');path=args.at(-1)!;
      assert.equal((await readFile(path)).toString(),'%PDF-test');
      if(fail)throw new Error('Queue offline');
      return {stdout:'request id is Office-42\n'};
    });
    if(fail)await assert.rejects(result,/Queue offline/);else assert.equal(await result,'request id is Office-42');
    await assert.rejects(access(path));
  }
});
