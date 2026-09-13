import {marked} from 'marked';
import {StudioPanel} from '../src/panel';
import {defaults,normalizeSettings} from '../src/settings';
import {prepareMarkdown} from '../src/template';
const sample=`---
title: A clearer direction
client: Acme & Co.
reference: NS-2026-014
---
# A clearer direction.
A proposal for a more considered digital experience.

**Prepared for Acme & Co.** · September 2026

## Good work starts with a shared understanding.
We help ambitious teams turn complex ideas into useful, enduring products. This proposal outlines our approach, the work we will do together, and what a successful outcome looks like.

> Make the important things clear. Give everything else room to breathe.

## What we will deliver
- A clear direction, grounded in research and conversations.
- A coherent visual language across your digital touchpoints.
- A practical design system your team can build on.

## The engagement
| Phase | Focus | Timing |
| --- | --- | --- |
| Discover | Research, interviews & alignment | Weeks 1–2 |
| Define | Strategy, structure & creative direction | Weeks 3–4 |
| Deliver | Design system & implementation support | Weeks 5–8 |

Our process is collaborative by design. You will see the work as it develops, and your team will help shape the decisions that matter.

# The details.
## A partnership, not a handoff.
The strongest work happens when the right people share the right context. We keep communication direct, the process visible, and our attention on outcomes.

${Array.from({length:7},(_,i)=>`### ${i+1}. ${['Working together','A thoughtful process','Clear communication','Room to explore','Built to last','The next chapter','Moving forward'][i]}\nWe work closely with your team to understand the challenge before reaching for a solution. Each stage has clear milestones, shared feedback, and practical documentation. The result is a product that makes sense to the people who use it, and a system that is easy for your team to maintain.\n`).join('\n')}

## Next steps
1. Review the scope and proposed timeline.
2. Share any questions or constraints with our team.
3. Schedule a kickoff and begin the discovery phase.

**We look forward to making something meaningful together.**
`;
const settings=normalizeSettings(JSON.parse(localStorage.getItem('print-studio-demo')??'null'));
if(!localStorage.getItem('print-studio-demo')){settings.presets[0].company='NORTH STUDIO';settings.presets[0].header.right='PROPOSAL\n{{meta:reference}}';settings.presets[0].footer.left='{{company}} / {{meta:client}}';settings.presets[0].footer.center='';settings.presets[0].headingBreaks=true;
const canvas=document.createElement('canvas');canvas.width=100;canvas.height=100;const c=canvas.getContext('2d')!;c.fillStyle='#354c49';c.fillRect(0,0,100,100);c.fillStyle='white';c.font='70px Georgia';c.fillText('N',21,75);settings.presets[0].logo=canvas.toDataURL();settings.presets[0].logoName='North Studio · sample logo';}
new StudioPanel(document.querySelector('#studio')!,{settings,source:async()=>({html:await marked.parse(prepareMarkdown(sample)),context:{title:'A clearer direction',date:'13 Sep 2026',vault:'Studio notes',metadata:{client:'Acme & Co.',reference:'NS-2026-014'}},warnings:[]}),save:async next=>localStorage.setItem('print-studio-demo',JSON.stringify(next)),notify:message=>{const notice=document.createElement('div');notice.className='demo-notice';notice.textContent=message;document.body.append(notice);setTimeout(()=>notice.remove(),6000);}});
