import test from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument,PDFName,PDFRawStream} from 'pdf-lib';
import {preparePDF} from '../src/pdf-output';
import {defaults,paperSize} from '../src/settings';
import {TEST_IMAGE} from './fixtures';

test('PDF output preserves page count and sets exact standard media with viewer print hints',async()=>{
  for(const paper of ['A4','Letter'] as const)for(const orientation of ['portrait','landscape'] as const) {
    const preset={...defaults().presets[0],paper,orientation};
    const size=paperSize(preset).map(mm=>mm*72/25.4);
    const source=await PDFDocument.create();source.addPage([size[0]-.2,size[1]+.1]);source.addPage([size[0],size[1]]);
    const result=await PDFDocument.load(await preparePDF(await source.save(),preset));
    assert.equal(result.getPageCount(),2);
    for(const page of result.getPages())assert.deepEqual(page.getSize(),{width:size[0],height:size[1]});
    const prefs=result.catalog.getOrCreateViewerPreferences();
    assert.equal(prefs.getPrintScaling(),'None');assert.equal(prefs.getPickTrayByPDFSize(),true);
    await assert.rejects(preparePDF(await source.save(),{...preset,paper:paper==='A4'?'Letter':'A4'}),/page size/);
  }
});
test('only the known Skia sRGB profile is replaced; original image bytes and soft masks survive',async()=>{
  for(const description of ['Google/Skia/7C5FA2151397474A0486BBCC83733D59','Custom RGB profile']) {
    const source=await PDFDocument.create();const image=await source.embedPng(TEST_IMAGE);await source.flush();
    const stream=source.context.lookup(image.ref);assert.ok(stream instanceof PDFRawStream);
    const profile=source.context.register(source.context.flateStream(Uint8Array.from([...description].flatMap(c=>[0,c.charCodeAt(0)])),{N:3}));
    stream.dict.set(PDFName.of('ColorSpace'),source.context.obj(['ICCBased',profile]));
    const mask=source.context.register(source.context.flateStream(new Uint8Array([255]),{Type:'XObject',Subtype:'Image',Width:1,Height:1,ColorSpace:'DeviceGray',BitsPerComponent:8}));
    stream.dict.set(PDFName.of('SMask'),mask);
    source.addPage(paperSize(defaults().presets[0]).map(mm=>mm*72/25.4) as [number,number]).drawImage(image);
    const result=await PDFDocument.load(await preparePDF(await source.save(),defaults().presets[0]));
    const output=result.context.lookup(image.ref);assert.ok(output instanceof PDFRawStream);
    assert.deepEqual(output.contents,stream.contents);assert.equal(output.dict.get(PDFName.of('SMask'))?.toString(),mask.toString());
    if(description.startsWith('Google'))assert.equal(output.dict.get(PDFName.of('ColorSpace')),PDFName.of('DeviceRGB'));
    else assert.equal(output.dict.get(PDFName.of('ColorSpace'))?.toString(),stream.dict.get(PDFName.of('ColorSpace'))?.toString());
  }
});
