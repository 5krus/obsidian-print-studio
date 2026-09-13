import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../src/settings';
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
