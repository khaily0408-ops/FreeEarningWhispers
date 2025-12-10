if (!window.GEMINI_API_KEY) alert("Gemini API key missing! Check GitHub Secrets.");
const API_KEY = window.GEMINI_API_KEY;

// Calendar elements
const calendarEl = document.getElementById('calendar');
const prevBtn = document.getElementById('prevWeek');
const nextBtn = document.getElementById('nextWeek');
const todayBtn = document.getElementById('todayWeek');
const weekPicker = document.getElementById('weekStartPicker');
const detailsPanel = document.getElementById('detailsPanel');

let currentWeekStart = startOfWeek(new Date());
let earningsData = [];

// ------------- Utilities -------------
function startOfWeek(date){const d=new Date(date);const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);d.setHours(0,0,0,0);return d;}
function addDays(d,n){const c=new Date(d);c.setDate(c.getDate()+n);return c;}
function sameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
function formatShort(date){return date.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});}
function formatTime(date){return date.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});}
function toDate(d){return typeof d==='string'?new Date(d):d;}

// ------------- Parse Gemini AI response -------------
function parseEarningsText(text){
  const reports = [];
  const lines = text.split("\n");
  const regex = /^DATA_ROW:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)$/i;

  lines.forEach(line=>{
    const match = line.trim().match(regex);
    if(match){
      const [, dateStr, ticker, company, sector, timeStr, iv] = match;
      let time = 'Unknown';
      if(/BMO|BEFORE/i.test(timeStr)) time='BMO';
      if(/AMC|AFTER/i.test(timeStr)) time='AMC';
      reports.push({id:`${ticker}-${Date.now()}-${Math.random()}`,date:dateStr,ticker:ticker.toUpperCase(),companyName:company,sector:sector,time,iv});
    }
  });
  return reports;
}

// ------------- Fetch Gemini AI earnings -------------
async function fetchEarningsGemini(){
  try{
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const prompt = `
      Search for "most anticipated earnings reports" for current week + next week.
      Include Date, Ticker, Company Name, Sector, Time (BMO/AMC), IV.
      Output strictly as:
      DATA_ROW: YYYY-MM-DD | TICKER | COMPANY_NAME | SECTOR | TIME | IV
    `;
    const response = await ai.models.generateContent({ model:"gemini-2.5-flash", contents:prompt, config:{tools:[{googleSearch:{}}]} });
    const text = response.text||"";
    return parseEarningsText(text);
  }catch(e){console.error("Gemini fetch error:",e);return [];}
}

// ------------- Rendering -------------
function groupByWeek(data, weekStart){
  const days = Array.from({length:7},()=>({BMO:[],AMC:[]}));
  data.forEach(item=>{
    const dt=toDate(item.date + "T" + (item.time==="BMO"?"07:00":"16:00"));
    for(let i=0;i<7;i++){
      const day=addDays(weekStart,i);
      if(sameDay(day,dt)){ if(item.time==="BMO") days[i].BMO.push(item); else days[i].AMC.push(item); }
    }
  });
  return days;
}

function renderCalendar(data){
  calendarEl.innerHTML="";
  const days=groupByWeek(data,currentWeekStart);
  for(let i=0;i<7;i++){
    const dayDate=addDays(currentWeekStart,i);
    const dayRow=document.createElement('div'); dayRow.className='day';

    const header=document.createElement('div'); header.className='day-header';
    header.innerHTML=`<div>${formatShort(dayDate)}</div><div>${dayDate.toLocaleDateString()}</div>`;
    dayRow.appendChild(header);

    ["BMO","AMC"].forEach(sessionType=>{
      const session=document.createElement('div'); session.className='session';
      session.innerHTML=`<h4>${sessionType==="BMO"?"Before Market":"After Market"} (${sessionType})</h4>`;
      if(days[i][sessionType].length===0){
        const e=document.createElement('div'); e.className='empty';
        e.textContent=`— No ${sessionType} reports`;
        session.appendChild(e);
      } else days[i][sessionType].forEach(item=>session.appendChild(createCompanyCard(item)));
      dayRow.appendChild(session);
    });

    calendarEl.appendChild(dayRow);
  }
  weekPicker.value=currentWeekStart.toISOString().slice(0,10);
  detailsPanel.innerHTML=`<div style="color:var(--muted)">Click a company for details</div>`;
}

function createCompanyCard(item){
  const card=document.createElement('div'); card.className='card'; card.tabIndex=0;
  const badge=document.createElement('div'); badge.className='badge '+(item.time==='BMO'?'bmo':'amc'); badge.textContent=item.ticker;
  const meta=document.createElement('div'); meta.className='meta';
  meta.innerHTML=`<div class="row"><div class="ticker">${item.companyName}</div><div class="sector">${item.sector}</div></div>
  <div class="row"><div class="time">${item.time} • ${formatTime(toDate(item.date+"T00:00"))}</div><div class="iv">IV: ${item.iv}</div></div>`;
  card.appendChild(badge); card.appendChild(meta);
  card.addEventListener('click',()=>showDetails(item));
  return card;
}

function showDetails(item){
  const dt=toDate(item.date+"T00:00");
  detailsPanel.innerHTML=`<h3>${item.companyName} (${item.ticker})</h3>
    <div>${item.sector} • ${item.time} • ${formatShort(dt)} ${formatTime(dt)}</div>
    <div>IV: ${item.iv}</div>`;
}

// ------------- Controls -------------
prevBtn.addEventListener('click',()=>{currentWeekStart=addDays(currentWeekStart,-7);renderCalendar(earningsData);});
nextBtn.addEventListener('click',()=>{currentWeekStart=addDays(currentWeekStart,7);renderCalendar(earningsData);});
todayBtn.addEventListener('click',()=>{currentWeekStart=startOfWeek(new Date());renderCalendar(earningsData);});
weekPicker.addEventListener('change',e=>{const d=new Date(e.target.value);if(!isNaN(d)){currentWeekStart=startOfWeek(d);renderCalendar(earningsData);}});

// ------------- Init -------------
(async function init(){
  earningsData = await fetchEarningsGemini();
  renderCalendar(earningsData);
})();
