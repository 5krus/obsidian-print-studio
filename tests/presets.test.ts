import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,normalizePreset} from '../src/settings';
import {exportPresets, importPresets} from '../src/presets';

test('preset backups retain logos, geometry and text while imports create independent copies', () => {
  const original = defaults();
  original.presets[0].logo = 'data:image/png;base64,aGVsbG8=';
  const backup = exportPresets(original.presets);
  const imported = importPresets(backup, original);
  assert.equal(imported.presets.length, 6);
  assert.equal(original.presets.length, 3);
  const copy = imported.presets[3];
  assert.notEqual(copy.id, original.presets[0].id);
  assert.equal(copy.name, 'Studio letterhead (imported)');
  assert.equal(copy.logo, original.presets[0].logo);
  assert.deepEqual(copy.header, original.presets[0].header);
  assert.equal(copy.marginTop, original.presets[0].marginTop);
  assert.equal(imported.activeId, copy.id);
  assert.equal(importPresets(backup, imported).presets[6].name, 'Studio letterhead (imported 2)');
});

test('imports are atomic and reject malformed, unsafe, oversized and unsupported backups', () => {
  const settings = defaults();
  const backup = JSON.parse(exportPresets(settings.presets));
  for (const text of ['{', '{}', 'null', JSON.stringify({...backup, version: 2}), JSON.stringify({...backup, presets: []})]) {
    assert.throws(() => importPresets(text, settings));
  }
  backup.presets[1].color = 'red;}body{display:none}';
  assert.throws(() => importPresets(JSON.stringify(backup), settings), /invalid color/);
  assert.equal(settings.presets.length, 3);
  backup.presets[1] = {...settings.presets[1], logo: 'data:image/svg+xml;base64,PHN2Zz4='};
  assert.throws(() => importPresets(JSON.stringify(backup), settings), /invalid logo/);
  assert.throws(() => importPresets(' '.repeat(10_000_001), settings), /10 MB/);
  const full = {...settings, presets: Array.from({length: 30}, () => settings.presets[0])};
  assert.throws(() => importPresets(exportPresets([settings.presets[0]]), full), /30 presets/);
});

test('header and footer property order does not affect a valid import',()=>{
  const settings=defaults();const data=JSON.parse(exportPresets([settings.presets[0]]));
  const {left,center,right}=data.presets[0].header;
  data.presets[0].header={right,left,center};
  assert.equal(importPresets(JSON.stringify(data),settings).presets.length,4);
});

test('uppercase choices round-trip, older backups default off, and invalid flags are rejected',()=>{
  const settings=defaults(),preset=settings.presets[0];
  const keys=['headerUppercase','footerUppercase','firstPageHeaderUppercase'] as const;
  preset.headerUppercase.left=true;preset.footerUppercase.center=true;preset.firstPageHeaderUppercase.right=true;
  const copy=importPresets(exportPresets([preset]),settings).presets[3];
  for(const key of keys)assert.deepEqual(copy[key],preset[key]);
  copy.headerUppercase.left=false;assert.equal(preset.headerUppercase.left,true);
  const old=JSON.parse(exportPresets([preset]));
  for(const key of keys)delete old.presets[0][key];
  const legacy=importPresets(JSON.stringify(old),settings).presets[3];
  for(const key of keys)assert.deepEqual(legacy[key],{left:false,center:false,right:false});
  for(const key of keys)for(const invalid of [true,null,[],{left:'true',center:false,right:false},{left:false,center:false}]) {
    const bad=JSON.parse(exportPresets([preset]));bad.presets[0][key]=invalid;
    assert.throws(()=>importPresets(JSON.stringify(bad),settings),new RegExp(`invalid ${key}`));
  }
});

test('first-page settings round-trip and older backups acquire safe defaults',()=>{
  const settings=defaults(),preset=settings.presets[0];
  preset.differentFirstPage=true;preset.firstPageMarginTop=55;preset.firstPageLogoHeight=25;
  preset.firstPageHeader={left:'Letterhead',center:'{{meta:client}}',right:''};preset.logoFirstPageOnly=true;
  const copy=importPresets(exportPresets([preset]),settings).presets[3];
  assert.deepEqual(copy.firstPageHeader,preset.firstPageHeader);assert.equal(copy.firstPageMarginTop,55);assert.equal(copy.firstPageLogoHeight,25);assert.equal(copy.logoFirstPageOnly,true);
  const old=JSON.parse(exportPresets([preset]));
  for(const key of ['differentFirstPage','firstPageMarginTop','firstPageLogoHeight','firstPageHeader','firstPageHeaderRule','logoFirstPageOnly'])delete old.presets[0][key];
  const legacy=importPresets(JSON.stringify(old),settings).presets[3];
  assert.equal(legacy.differentFirstPage,false);assert.equal(legacy.logoFirstPageOnly,false);
  assert.equal(normalizePreset({firstPageMarginTop:999,firstPageLogoHeight:-4}).firstPageMarginTop,70);
  assert.equal(normalizePreset({firstPageLogoHeight:-4}).firstPageLogoHeight,4);
  old.presets[0].firstPageMarginTop=999;assert.throws(()=>importPresets(JSON.stringify(old),settings),/invalid firstPageMarginTop/);
});
test('embedded metadata visibility saves with presets and older backups preserve existing output',()=>{
  const settings=defaults(),preset=settings.presets[0];
  assert.equal(preset.hideEmbeddedNoteMetadata,false);
  preset.hideEmbeddedNoteMetadata=true;
  assert.equal(importPresets(exportPresets([preset]),settings).presets[3].hideEmbeddedNoteMetadata,true);
  const old=JSON.parse(exportPresets([preset]));delete old.presets[0].hideEmbeddedNoteMetadata;
  assert.equal(importPresets(JSON.stringify(old),settings).presets[3].hideEmbeddedNoteMetadata,false);
  old.presets[0].hideEmbeddedNoteMetadata='true';
  assert.throws(()=>importPresets(JSON.stringify(old),settings),/invalid hideEmbeddedNoteMetadata/);
  assert.equal(normalizePreset({hideEmbeddedNoteMetadata:'true'}).hideEmbeddedNoteMetadata,false);
});
