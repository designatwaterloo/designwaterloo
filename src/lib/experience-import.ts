/** Local-only parsing: pasted content is never executed or sent to a third party. */
export interface ImportedPosition {
  id: string;
  logo_preview?: string;
  position_title: string;
  company: string;
  start_month: string | null;
  start_year: string;
  end_month: string | null;
  end_year: string | null;
  is_current: boolean;
  description: string;
  location: string;
  employment_type: string;
  link: string | null;
}
const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const datePart = '(?:([A-Za-z]+)\\.?\\s+)?((?:19|20)\\d{2})';
const range = new RegExp(`^${datePart}\\s*[-–—−]\\s*(?:${datePart}|(Present|Current|Now))(?:\\s*[·•|].*)?$`, 'i');
const employment = /^(.*?)(?:\s*[·•]\s*(Full-time|Part-time|Internship|Freelance|Contract|Self-employed|Apprenticeship|Seasonal|Volunteer|Permanent|Temporary))$/i;
const noise = /^(Experience|Show all.*experiences?|Show all|See more|…see more|Skills:.*)$/i;
const duration = /^(?:(?:Full-time|Part-time|Contract)\s*[·•]\s*)?\d+\s+(?:yrs?|years?|mos?|months?)(?:\s+\d+\s+(?:mos?|months?))?$/i;
const locationLine = (s: string) => /(?:On-site|Hybrid|Remote)$/i.test(s) || /,/.test(s) && /(?:Canada|United States|United Kingdom|Ontario|California|Quebec|Germany|India)$/i.test(s);
const month = (s?: string) => s ? String(months.indexOf(s.toLowerCase().slice(0,3))+1).padStart(2,'0') : null;
export const newPosition = (): ImportedPosition => ({ id: crypto.randomUUID(), position_title: '', company: '', start_month: null, start_year: '', end_month: null, end_year: null, is_current: false, description: '', location: '', employment_type: '', link: null });
export function sortPositions(entries: ImportedPosition[]) {
  const date = (p: ImportedPosition) => Number((!p.is_current && p.end_year ? p.end_year : p.start_year) + ((!p.is_current && p.end_year ? p.end_month : p.start_month) || '00'));
  return [...entries].sort((a,b) => Number(b.is_current)-Number(a.is_current) || date(b)-date(a) || Number(b.start_year)-Number(a.start_year) || Number(b.start_month)-Number(a.start_month));
}
export function mergePositions(existing: ImportedPosition[], incoming: ImportedPosition[]) {
  const normalize = (s: string | null) => (s || '').trim().toLowerCase().replace(/\s+/g,' ');
  const merged = [...existing];
  for (const entry of incoming) {
    // Older saved positions may omit the month; do not duplicate those on import.
    const duplicate = merged.some(p => normalize(p.company) === normalize(entry.company)
      && normalize(p.position_title) === normalize(entry.position_title)
      && p.start_year === entry.start_year
      && (!p.start_month || !entry.start_month || p.start_month === entry.start_month));
    if (!duplicate) merged.push(entry);
  }
  return sortPositions(merged);
}
export function parseExperience(text: string): { positions: ImportedPosition[]; warning: string | null } {
  if (text.length > 100000) return { positions: [], warning: 'That paste is too long. Copy just the Experience section.' };
  const lines = text.replace(/\u00a0/g,' ').replace(/\r/g,'').split('\n').map(s=>s.trim()).filter(Boolean).filter((s,i,a)=>!noise.test(s) && (i===0 || s!==a[i-1]));
  const anchors = lines.flatMap((s,i)=>{ const m=s.match(range); return m ? [{i,m}] : []; });
  const positions: ImportedPosition[] = [];
  let previousEnd=0, groupCompany='', grouped=false;
  for (let n=0;n<anchors.length;n++) {
    const {i,m}=anchors[n];
    const before=lines.slice(previousEnd,i);
    let company='', title='', headerStart=i-2;
    const logoIndex=before.findLastIndex(s=>/ logo$/i.test(s));
    if (logoIndex>=0) {
      groupCompany=before[logoIndex].replace(/ logo$/i,'');
      const header=before.slice(logoIndex+1).filter(s=>!duration.test(s));
      grouped=header[0]===groupCompany && before.slice(logoIndex+1).some(s=>duration.test(s));
      if(grouped) header.shift();
      title=header[0] || '';
      company=grouped ? groupCompany : header.length>1 ? header[1] : groupCompany;
      headerStart=previousEnd+logoIndex;
    } else if (grouped) {
      title=before.at(-1)||''; company=groupCompany;headerStart=i-1;
      if (/^(Full-time|Part-time|Internship|Contract)$/i.test(title)) {company+=' · '+title;title=before.at(-2)||'';headerStart=i-2;}
    } else if (before.length>=2 && !duration.test(before[before.length-2])) {
      title=before[before.length-2]; company=before[before.length-1];
      // Grouped LinkedIn positions can have a standalone employment type.
      if (/^(Full-time|Part-time|Internship|Contract)$/i.test(company) && groupCompany) { title=before[before.length-2]; company=groupCompany+' · '+company; }
    } else { title=before[before.length-1] || ''; company=groupCompany; headerStart=i-1; }
    if (positions.length && headerStart>previousEnd) {
      const tail=lines.slice(previousEnd,headerStart).filter(s=>!duration.test(s));
      if (tail[0] && locationLine(tail[0])) positions.at(-1)!.location=tail.shift()!;
      positions.at(-1)!.description=tail.join('\n');
    }
    const match=company.match(employment);
    if(match) company=match[1];
    const start=month(m[1]), end=month(m[3]);
    if (start==='00'||end==='00') continue;
    positions.push({...newPosition(),position_title:title,company,start_month:start,start_year:m[2],end_month:end,end_year:m[4]||null,is_current:!!m[5],employment_type:match?.[2]||''});
    groupCompany=company || groupCompany; previousEnd=i+1;
  }
  if(positions.length) {
    const tail=lines.slice(previousEnd).filter(s=>!noise.test(s));
    if(tail[0]&&locationLine(tail[0])) positions.at(-1)!.location=tail.shift()!;
    positions.at(-1)!.description=tail.join('\n');
  }
  const incomplete=positions.some(p=>!p.company||!p.position_title);
  const unsupported=anchors.length!==positions.length || lines.some(s=>/\d{4}\s*[-–—]\s*(?:[A-Za-z]+\s+)?\d{4}/.test(s)&&!range.test(s));
  return { positions: sortPositions(positions), warning: !positions.length ? 'No positions found. Include the title, company, and date range, or add a position manually.' : unsupported ? 'Some dates couldn’t be read. Check the imported positions and add any missing ones manually.' : incomplete ? 'Some details need checking. Open the incomplete positions below.' : null };
}
export function positionError(entries: ImportedPosition[]) {
  if(entries.length>50) return 'Keep up to 50 positions.';
  for(const p of entries) {
    if(!p.company.trim()||!p.position_title.trim()||!/^\d{4}$/.test(p.start_year)) return 'Add a title, company, and start year for each position.';
    if(!p.is_current && p.end_year && (!/^\d{4}$/.test(p.end_year) || Number(p.end_year+(p.end_month||'12')) < Number(p.start_year+(p.start_month||'01')))) return 'An end date cannot come before its start date.';
  }
  return null;
}
