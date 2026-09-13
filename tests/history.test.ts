import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../src/settings';
import {PresetHistory} from '../src/history';

test('history groups typing, restores independent snapshots, and drops redo after a new edit',()=>{
  const settings=defaults(),history=new PresetHistory(settings),field={};
  const original=settings.presets[0].company;
  settings.presets[0].company='A';history.record(settings,field,100);
  settings.presets[0].company='Acme';history.record(settings,field,200);
  assert.equal(history.undo()?.presets[0].company,original);
  assert.equal(history.canUndo,false);
  const restored=history.redo()!;assert.equal(restored.presets[0].company,'Acme');
  restored.presets[0].header.left='Changed';
  history.undo();assert.equal(history.redo()?.presets[0].header.left,'{{company}}');
  history.undo();history.record(settings);assert.equal(history.canRedo,false);
});

test('history is bounded and restores imports and removals along with active selection',()=>{
  const settings=defaults(),history=new PresetHistory(settings);
  settings.presets.splice(0,1);settings.activeId=settings.presets[0].id;history.record(settings);
  const restored=history.undo()!;assert.equal(restored.presets.length,3);assert.equal(restored.activeId,'classic');
  for(let i=0;i<25;i++){settings.presets[0].company=String(i);history.record(settings);}
  let steps=0;while(history.undo())steps++;
  assert.equal(steps,20);
});
