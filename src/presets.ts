import {DEFAULT_PRESET, normalizePreset, type Preset, type Settings} from './settings';

export const MAX_PRESETS = 30;
export const MAX_PRESET_FILE_BYTES = 10_000_000;
const format = 'print-studio-presets';

export function exportPresets(presets: Preset[]): string {
  const json = JSON.stringify({format, version: 1, presets: presets.map(normalizePreset)}, null, 2);
  if (new TextEncoder().encode(json).length > MAX_PRESET_FILE_BYTES) {
    throw new Error('This backup exceeds 10 MB. Export your presets individually instead.');
  }
  return json;
}

export function importPresets(text: string, settings: Settings): Settings {
  if (new TextEncoder().encode(text).length > MAX_PRESET_FILE_BYTES) throw new Error('Choose a preset file smaller than 10 MB.');
  let data: unknown;
  try {data = JSON.parse(text);} catch {throw new Error('This file is not valid JSON. Choose a Print Studio preset export.');}
  if (!data || typeof data !== 'object') throw new Error('Choose a Print Studio preset export.');
  const backup = data as Record<string, unknown>;
  if (backup.format !== format || backup.version !== 1) throw new Error('This preset format is not supported. Choose a Print Studio version 1 preset export.');
  if (!Array.isArray(backup.presets) || !backup.presets.length || backup.presets.length > MAX_PRESETS) throw new Error('A preset file must contain between 1 and 30 presets.');
  if (settings.presets.length + backup.presets.length > MAX_PRESETS) throw new Error('You can keep up to 30 presets. Remove unused presets before importing.');
  const names = new Set(settings.presets.map(p => p.name));
  const presets = backup.presets.map((raw: unknown, index: number) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`Preset ${index + 1} is invalid.`);
    const input = raw as Record<string, unknown>;
    const preset = normalizePreset(input);
    for (const key of Object.keys(DEFAULT_PRESET) as (keyof Preset)[]) {
      if (key === 'id') continue;
      // These additive settings were absent from 0.2.0 version 1 exports.
      if(['differentFirstPage','firstPageMarginTop','firstPageLogoHeight','firstPageHeader','firstPageHeaderRule','logoFirstPageOnly'].includes(key) && !Object.hasOwn(input,key))continue;
      const invalid=()=>new Error(`Preset ${index + 1} has an invalid ${key} value.`);
      if(key==='header' || key==='footer' || key==='firstPageHeader') {
        const slots=input[key];
        if(!slots || typeof slots!=='object' || Array.isArray(slots))throw invalid();
        for(const slot of ['left','center','right'] as const)if((slots as Record<string,unknown>)[slot]!==preset[key][slot])throw invalid();
      }else if(input[key]!==preset[key])throw invalid();
    }
    preset.id = crypto.randomUUID();
    const base = preset.name;
    let suffix = 1;
    while (names.has(preset.name)) {
      const end = suffix === 1 ? ' (imported)' : ` (imported ${suffix})`;
      preset.name = base.slice(0, 80 - end.length) + end;
      suffix++;
    }
    names.add(preset.name);
    return preset;
  });
  return {...settings, presets: [...settings.presets, ...presets], activeId: presets[0].id};
}
