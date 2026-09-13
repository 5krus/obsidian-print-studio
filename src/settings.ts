export type Slots = {left: string; center: string; right: string};
export interface Preset {
  id: string; name: string; company: string; logo: string; logoName: string;
  paper: 'A4' | 'Letter'; orientation: 'portrait' | 'landscape';
  marginTop: number; marginBottom: number; marginSide: number;
  border: 'none' | 'solid' | 'double' | 'dashed'; borderWidth: number; color: string;
  font: 'sans' | 'serif'; fontSize: number; lineHeight: number; logoHeight: number;
  header: Slots; footer: Slots; headerRule: boolean; footerRule: boolean; headingBreaks: boolean;
}
export interface Settings {version: 1; activeId: string; presets: Preset[]}
export const DEFAULT_PRESET: Preset = {
  id: 'classic', name: 'Studio letterhead', company: 'Your company', logo: '', logoName: '',
  paper: 'A4', orientation: 'portrait', marginTop: 30, marginBottom: 24, marginSide: 22,
  border: 'solid', borderWidth: 0.6, color: '#354c49', font: 'sans', fontSize: 11,
  lineHeight: 1.55, logoHeight: 9, header: {left: '{{company}}', center: '', right: '{{title}}'},
  footer: {left: '{{company}}', center: '{{date}}', right: '{{page}} / {{pages}}'},
  headerRule: true, footerRule: true, headingBreaks: false,
};
export function defaults(): Settings {
  return {version: 1, activeId: 'classic', presets: [structuredClone(DEFAULT_PRESET),
    {...structuredClone(DEFAULT_PRESET), id: 'editorial', name: 'Editorial', company: '', font: 'serif', border: 'none', color: '#3c3834', header: {left: '{{title}}', center: '', right: ''}, footer: {left: '', center: '{{page}}', right: ''}, headerRule: false},
    {...structuredClone(DEFAULT_PRESET), id: 'minimal', name: 'Essential', company: '', border: 'none', color: '#444444', header: {left: '', center: '', right: ''}, footer: {left: '{{title}}', center: '', right: '{{page}} / {{pages}}'}, headerRule: false, footerRule: false}]};
}
const obj = (v: unknown): Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const str = (v: unknown, fallback: string, max = 300) => typeof v === 'string' ? v.slice(0, max) : fallback;
const num = (v: unknown, fallback: number, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const bool = (v: unknown, fallback: boolean) => typeof v === 'boolean' ? v : fallback;
export function normalizePreset(input: unknown): Preset {
  const v = obj(input), d = DEFAULT_PRESET;
  const slots = (value: unknown, base: Slots): Slots => {const s = obj(value); return {left: str(s.left, base.left), center: str(s.center, base.center), right: str(s.right, base.right)};};
  return {id: str(v.id, d.id, 100), name: str(v.name, d.name, 80) || 'Untitled preset', company: str(v.company, d.company),
    // Only raster data is persisted; SVG uploads are rasterized before reaching settings.
    logo: typeof v.logo === 'string' && /^data:image\/(png|jpeg|webp);base64,[a-z\d+/=]+$/i.test(v.logo) && v.logo.length < 3_000_000 ? v.logo : '', logoName: str(v.logoName, ''),
    paper: v.paper === 'Letter' ? 'Letter' : 'A4', orientation: v.orientation === 'landscape' ? 'landscape' : 'portrait',
    marginTop: num(v.marginTop,d.marginTop,22,50), marginBottom:num(v.marginBottom,d.marginBottom,18,50), marginSide:num(v.marginSide,d.marginSide,15,40),
    border: ['none','solid','double','dashed'].includes(String(v.border)) ? v.border as Preset['border'] : d.border,
    borderWidth: num(v.borderWidth,d.borderWidth,0.3,3), color: typeof v.color === 'string' && /^#[a-f\d]{6}$/i.test(v.color) ? v.color : d.color,
    font: v.font === 'serif' ? 'serif' : 'sans', fontSize:num(v.fontSize,d.fontSize,8,18), lineHeight:num(v.lineHeight,d.lineHeight,1.2,2), logoHeight:num(v.logoHeight,d.logoHeight,4,12),
    header:slots(v.header,d.header), footer:slots(v.footer,d.footer), headerRule:bool(v.headerRule,d.headerRule), footerRule:bool(v.footerRule,d.footerRule), headingBreaks:bool(v.headingBreaks,d.headingBreaks)};
}
export function normalizeSettings(input: unknown): Settings {
  const v=obj(input); if (!Array.isArray(v.presets) || !v.presets.length) return defaults();
  const seen=new Set<string>(); const presets=v.presets.slice(0,30).map((p,i)=>{const result=normalizePreset(p);if(!result.id || seen.has(result.id)){let suffix=i;do{result.id=`preset-${suffix++}`;}while(seen.has(result.id));}seen.add(result.id);return result;});
  return {version:1,presets,activeId:presets.some(p=>p.id===v.activeId) ? String(v.activeId) : presets[0].id};
}
export function paperSize(p: Preset): [number,number] {const size: [number,number] = p.paper === 'Letter' ? [215.9,279.4] : [210,297];return p.orientation === 'landscape' ? [size[1],size[0]] : size;}
