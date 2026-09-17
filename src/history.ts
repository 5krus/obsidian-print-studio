import type {Settings} from './settings';

// Copy mutable objects while sharing immutable logo strings between entries.
function copy(settings:Settings):Settings {
  return {...settings,presets:settings.presets.map(p=>({...p,header:{...p.header},footer:{...p.footer},firstPageHeader:{...p.firstPageHeader},headerUppercase:{...p.headerUppercase},footerUppercase:{...p.footerUppercase},firstPageHeaderUppercase:{...p.firstPageHeaderUppercase}}))};
}

export class PresetHistory {
  private past:Settings[]=[];
  private future:Settings[]=[];
  private current:Settings;
  private group:object|undefined;
  private editedAt=0;
  constructor(settings:Settings){this.current=copy(settings);}
  get canUndo(){return this.past.length>0;}
  get canRedo(){return this.future.length>0;}
  record(settings:Settings,group?:object,now=Date.now()) {
    if(!group || group!==this.group || now-this.editedAt>1000) {
      this.past.push(this.current);
      if(this.past.length>20)this.past.shift();
    }
    this.current=copy(settings);this.future=[];this.group=group;this.editedAt=now;
  }
  undo():Settings|undefined {
    const previous=this.past.pop();if(!previous)return;
    this.future.push(this.current);this.current=previous;this.group=undefined;
    return copy(this.current);
  }
  redo():Settings|undefined {
    const next=this.future.pop();if(!next)return;
    this.past.push(this.current);this.current=next;this.group=undefined;
    return copy(this.current);
  }
}
