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

// -------------- Fetch FMP Earnings -----------------
async function fetchEarnings() {
    const today = new Date();
    const from = today.toISOString().slice(0,10);
    const to = addDays(today,14).toISOString().slice(0,10);
    const url = `https://financialmodelingprep.com/api/v3/earning_calendar?from=${from}&to=${to}&apikey=${API_KEY}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.map(item=>({
            ticker: item.symbol,
            company: item.companyName,
            sector: item.sector || "Unknown",
            datetime: item.date + "T" + (item.time==="bmo"?"07:00":"16:00"),
            when: item.time==="bmo"?"BMO":"AMC",
            iv: "N/A",
            move: "N/A"
        }));
    } catch(e) {
        console.error("FMP fetch error:",e);
        return [];
    }
}

// ------------- Rendering -----------------
function groupByWeek(data, weekStart){
    const days = Array.from({length:7},()=>({BMO:[],AMC:[]}));
    data.forEach(item=>{
        const dt=toDate(item.datetime);
        for(let i=0;i<7;i++){
            const day = addDays(weekStart,i);
            if(sameDay(day,dt)){
                if(item.when==="BMO") days[i].BMO.push(item);
                else days[i].AMC.push(item);
            }
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

        // Sessions BMO / AMC side by side
        ["BMO","AMC"].forEach(sessionType=>{
            const session = document.createElement('div');
            session.className='session';
            session.innerHTML=`<h4>${sessionType==="BMO"?"Before Market":"After Market"} (${sessionType})</h4>`;
            if(days[i][sessionType].length===0){
                const e = document.createElement('div'); e.className='empty';
                e.textContent=`— No ${sessionType} reports`;
                session.appendChild(e);
            } else {
                days[i][sessionType].forEach(item=>{
                    session.appendChild(createCompanyCard(item));
                });
            }
            dayRow.appendChild(session);
        });

        calendarEl.appendChild(dayRow);
    }

    weekPicker.value = currentWeekStart.toISOString().slice(0,10);
    detailsPanel.innerHTML=`<div style="color:var(--muted)">Click a company for details</div>`;
}

function createCompanyCard(item){
    const card = document.createElement('div'); card.className='card'; card.tabIndex=0;
    const badge = document.createElement('div'); badge.className='badge ' + (item.when==='BMO'?'bmo':'amc'); badge.textContent=item.ticker;
    const meta = document.createElement('div'); meta.className='meta';
    meta.innerHTML=`<div class="row"><div class="ticker">${item.company}</div><div class="sector">${item.sector}</div></div>
                     <div class="row"><div class="time">${item.when} • ${formatTime(toDate(item.datetime))}</div>
                     <div class="iv">IV: ${item.iv}</div></div>`;
    card.appendChild(badge); card.appendChild(meta);
    card.addEventListener('click',()=>showDetails(item));
    card.addEventListener('keypress', e=>{if(e.key==='Enter') showDetails(item);});
    return card;
}

function showDetails(item){
    const dt = toDate(item.datetime);
    detailsPanel.innerHTML = `<h3>${item.company} (${item.ticker})</h3>
        <div>${item.sector} • ${item.when} • ${formatShort(dt)} ${formatTime(dt)}</div>
        <div>IV: ${item.iv} • Expected Move: ${item.move}</div>`;
}

// ------------- Controls -----------------
prevBtn.addEventListener('click',()=>{currentWeekStart=addDays(currentWeekStart,-7);renderCalendar(earningsData);});
nextBtn.addEventListener('click',()=>{currentWeekStart=addDays(currentWeekStart,7);renderCalendar(earningsData);});
todayBtn.addEventListener('click',()=>{currentWeekStart=startOfWeek(new Date());renderCalendar(earningsData);});
weekPicker.addEventListener('change', e=>{const d=new Date(e.target.value);if(!isNaN(d)){currentWeekStart=startOfWeek(d);renderCalendar(earningsData);}});

// ------------- Init -----------------
(async function init(){
    earningsData = await fetchEarnings();
    renderCalendar(earningsData);
})();
