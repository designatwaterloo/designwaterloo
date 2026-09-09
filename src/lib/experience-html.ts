import { parseExperience } from './experience-import';
/** Experimental HTML paste. The template remains inert and is never mounted. */
export function parseExperienceHtml(html: string) {
  if(html.length>300000) return {positions:[],warning:'That HTML is too long. Copy just the Experience section.'};
  const template=document.createElement('template');
  template.innerHTML=html;
  template.content.querySelectorAll('script,style,iframe,object,embed').forEach(el=>el.remove());
  const logos=new Map<string,{logo_preview?:string;link:string|null}>();
  const lines:string[]=[];
  template.content.querySelectorAll('p,img').forEach(el=>{
    if(el.tagName==='IMG') {
      const alt=el.getAttribute('alt')||'';
      if(!/ logo$/i.test(alt)) return;
      lines.push(alt);
      let logo_preview:string|undefined,link:string|null=null;
      try {const url=new URL(el.getAttribute('src')||'');if(url.protocol==='https:'&&url.hostname==='media.licdn.com') logo_preview=url.href;} catch {}
      try {const url=new URL(el.closest('a')?.getAttribute('href')||'');if(url.protocol==='https:'&&url.hostname==='www.linkedin.com'&&/^\/company\/\d+\/$/.test(url.pathname)) link=url.origin+url.pathname;} catch {}
      logos.set(alt.replace(/ logo$/i,'').toLowerCase(),{logo_preview,link});
    } else if(!el.querySelector('p')) lines.push(el.textContent||'');
  });
  const result=parseExperience(lines.join('\n'));
  return {...result,positions:result.positions.map(p=>({...p,...logos.get(p.company.toLowerCase())}))};
}
