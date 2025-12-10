const API_KEY = "oRIWz9JvUdN7NLbd30F6lTs1Ev8vbVbG";

// Calendar elements
const calendarEl = document.getElementById('calendar');
const prevBtn = document.getElementById('prevWeek');
const nextBtn = document.getElementById('nextWeek');
const todayBtn = document.getElementById('todayWeek');
const weekPicker = document.getElementById('weekStartPicker');
const detailsPanel = document.getElementById('detailsPanel');

let currentWeekStart = startOfWeek(new Date());
let earningsData = [];

// ----------------- Utilities -----------------
function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0,0,0,0);
  return d;
}
function addDays(d,n){const c=new Date(d);c.setDate(c.getDate()+n);return c;}
function sameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
function formatShort(date){return date.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});}
function formatTime(date){return date.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});}
function toDate(d){return typeof d==='string'?new Date(d):d;}

// -------------- Fetch FMP Earnings (v5 stable) -----------------
async function fetchEarnings() {
    const today = new Date();
    const from = today.toISOString().slice(0,10);
    const to = addDays(today,14).toISOString().slice(0,10);
    const url = `https://financialmodelingprep.com/stable/earnings-calendar?from=${from}&to=${to}&apikey=${API_KEY}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.map(item => ({
            ticker: item.symbol,
            company: item.symbol, // fallback if no profile API
            sector: "Unknown",
            datetime: item.date + "T09:00", // default 9am
            epsActual: item.epsActual,
            epsEstimated: item.epsEstimated,
            revenueActual: item.revenueActual,
            revenueEstimated: item.revenueEstimated
        }));
    } catch(e) {
        console.error("FMP fetch error:", e);
        return [];
    }
}

// ------------- Rendering -----------------
function groupByWeek(data, weekStart){
    const days = Array.from({length:7},()=>[]);
    data.forEach(item=>{
        const dt=toDate(item.datetime);
        for(let i=0;i<7;i++){
            const day = addDays(weekStart,i);
            if(sameDay(day,dt)) days[i].push(item);
        }
    });
    return days;
}

function renderCalendar(data){
    calendarEl.innerHTML="";
    const days = groupByWeek(data,currentWeekStart);

    for(let i=0;i<7;i++){
        const dayDate = addDays(currentWeekStart,i);

        const dayRow = document.createElement('div');
        dayRow.className = 'day';

        // Day header
        const header = document.createElement('div');
        header.className = 'day-header';
        header.innerHTML = `<div>${formatShort(dayDate)}</div><div>${dayDate.toLocaleDateString()}</div>`;
        dayRow.appendChild(header);

        const session = document.createElement('div');
        session.className='session';

        if(days[i].length===0){
            const e = document.createElement('div'); e.className='empty';
            e.textContent=`— No earnings`;
            session.appendChild(e);
        } else {
            days[i].forEach(item=>{
                session.appendChild(createCompanyCard(item));
            });
        }
        dayRow.appendChild(session);
        calendarEl.appendChild(dayRow);
    }

    weekPicker.value = currentWeekStart.toISOString().slice(0,10);
    detailsPanel.innerHTML=`<div style="color:var(--muted)">Click a company for details</div>`;
}

function createCompanyCard(item){
    const card = document.createElement('div'); card.className='card'; card.tabIndex=0;
    const badge = document.createElement('div'); badge.className='badge'; badge.textContent=item.ticker;
    const meta = document.createElement('div'); meta.className='meta';
    meta.innerHTML=`<div class="row"><div class="ticker">${item.company}</div><div class="sector">${item.sector}</div></div>
                     <div class="row"><div class="time">${formatTime(toDate(item.datetime))}</div>
                     <div class="iv">EPS est: ${item.epsEstimated || "N/A"}</div></div>`;
    card.appendChild(badge); card.appendChild(meta);
    card.addEventListener('click',()=>showDetails(item));
    card.addEventListener('keypress', e=>{if(e.key==='Enter') showDetails(item);});
    return card;
}

function showDetails(item){
    const dt = toDate(item.datetime);
    detailsPanel.innerHTML = `<h3>${item.company} (${item.ticker})</h3>
        <div>${item.sector} • ${formatShort(dt)} ${formatTime(dt
