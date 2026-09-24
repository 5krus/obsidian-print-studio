import {decodePDFRawStream,PDFArray,PDFDocument,PDFName,PDFNumber,PDFRawStream,PrintScaling} from 'pdf-lib';
import {paperSize,type Preset} from './settings';

// Chromium's compact Skia sRGB profile can make Ghostscript drop an entire
// image (including transparent PNGs). Use ordinary RGB for this known profile
// only; retain custom/wide-gamut profiles, image bytes and soft masks untouched.
const skiaSRGB=Uint8Array.from([...('Google/Skia/7C5FA2151397474A0486BBCC83733D59')].flatMap(c=>[0,c.charCodeAt(0)]));
function isSkiaSRGB(stream:PDFRawStream) {
  if(stream.dict.lookup(PDFName.of('N'),PDFNumber).asNumber()!==3)return false;
  const bytes=decodePDFRawStream(stream).decode();
  return bytes.some((_,index)=>skiaSRGB.every((byte,offset)=>bytes[index+offset]===byte));
}
export async function preparePDF(data:Uint8Array,preset:Preset):Promise<Uint8Array> {
  const pdf=await PDFDocument.load(data,{updateMetadata:false});
  const [width,height]=paperSize(preset).map(mm=>mm*72/25.4);
  for(const page of pdf.getPages()) {
    const size=page.getSize();
    if(Math.abs(size.width-width)>1 || Math.abs(size.height-height)>1)throw new Error('The PDF page size does not match the preview. Please refresh and try again.');
    // Remove Chromium's sub-point rounding so viewers recognize standard media.
    page.setMediaBox(0,0,width,height);
  }
  for(const [,object] of pdf.context.enumerateIndirectObjects()) {
    if(!(object instanceof PDFRawStream) || object.dict.get(PDFName.of('Subtype'))!==PDFName.of('Image'))continue;
    const space=object.dict.lookup(PDFName.of('ColorSpace'));
    if(!(space instanceof PDFArray) || space.get(0)!==PDFName.of('ICCBased'))continue;
    const profile=space.lookup(1);
    if(profile instanceof PDFRawStream && isSkiaSRGB(profile))object.dict.set(PDFName.of('ColorSpace'),PDFName.of('DeviceRGB'));
  }
  const preferences=pdf.catalog.getOrCreateViewerPreferences();
  preferences.setPrintScaling(PrintScaling.None);
  preferences.setPickTrayByPDFSize(true);
  return pdf.save({useObjectStreams:false});
}
