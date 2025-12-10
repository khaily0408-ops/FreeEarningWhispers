// Simple client-only earnings calendar demo
// - Week view (Mon-Sun). Each day has BMO and AMC sections.
// - Demo dataset is included. You may upload your own JSON file matching the schema.
// - Expected move is estimated from IV and price for a ~1 trading-day window:
//     move ≈ price * (IV/100) * sqrt(1/252)
//   This is a simplification — use a proper analytics library for production.

// ---------------- Demo data ----------------
// Each item: {
//   company: "Apple Inc.",
//   ticker: "AAPL",
//   sector: "Technology",
//   datetime: "2025-12-11T07:00:00-05:00", // ISO string - local timezone recommended
//   when: "BMO" or "AMC",
//   iv: 28.5, // percent (annualized)
//   price: 175.32 // current underlying price in USD
// }
const DEMO_DATA = [
  {company:"Apple Inc.", ticker:"AAPL", sector:"Technology", datetime:"2025-12-11T07:00:00-05:00", when:"BMO", iv:28.5, price:175.32},
  {company:"Tesla, Inc.", ticker:"TSLA", sector:"Automotive", datetime:"2025-12-12T16:15:00-05:00", when:"AMC", iv:60.2, price:316.45},
  {company:"Nvidia Corp.", ticker:"NVDA", sector:"Semiconductors", datetime:"2025-12-10T07:30:00-05:00", when:"BMO", iv:45.1, price:142.88},
  {company:"Zoom Video", ticker:"ZM", sector:"Communications", datetime:"2025-12-14T16:10:00-05:00", when:"AMC", iv:52.9, price:79.12},
  {company:"Starbucks", ticker:"SBUX", sector:"Consumer", datetime:"2025-12-13T07:00:00-05:00", when:"BMO", iv:33.7, price:95.55},
  {company:"Disney", ticker:"DIS", sector:"Entertainment", datetime:"2025-12-15T16:30:00-05:00", when:"AMC", iv:38.0, price:87.34},
  {company:"Costco", ticker:"COST", sector:"Retail", datetime:"2025-12-10T16:05:00-05:00", when:"AMC", iv:20.4, price:613.22},
  {company:"Shopify", ticker:"SHOP", sector:"E-Commerce", datetime:"2025-12-11T07:00:00-05:00", when:"BMO", iv:58.7, price:54.10},
  {company:"Microsoft", ticker:"MSFT", sector:"Technology", datetime:"2025-12-12T07:00:00-05:00", when:"BMO", iv:25.0, price:401.22},
  {company:"Airbnb", ticker:"ABNB", sector:"Travel", datetime:"2025-12-13T16:02:00-05:00", when:"AMC", iv:47.9, price:133.47}
];

// ------------ Utilities -------------
function toLocalDate(d) {
  // ensure Date object
  return typeof d === 'string' ? new Date(d) : new Date(d);
}
function startOfWeek(date) {
  // return Monday as start of week
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Mon=0..Sun=6
  d.setDate(d.getDate() - day);
  d.setHours(0,0,0,0);
  return d;
}
function addDays(d, n) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
function sameDay(a,b){
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function formatShort(date){
  return date.toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
}
function formatTime(date){
  return date.toLocaleTimeString(undefined, {hour:'2-digit', minute:'2-digit'});
}

// expected move calc for ~1 trading day
function expectedMove(price, ivPercent){
  const days = 1/252; // trading-day fraction
  const std = Math.sqrt(days);
  const move = price * (ivPercent/100) * std;
  return move;
}

// -------------- App State & Rendering --------------
let dataset = JSON.parse(JSON.stringify(DEMO_DATA)); // clone
let currentWeekStart = startOfWeek(new Date());

const calendarEl = document.getElementById('calendar');
const prevBtn = document.getElementById('prevWeek');
const nextBtn = document.getElementById('nextWeek');
const todayBtn = document.getElementById('todayWeek');
const weekPicker = document.getElementById('weekStartPicker');
const detailsPanel = document.getElementById('detailsPanel');
const fileInput = document.getElementById('fileInput');
const resetData = document.getElementById('resetData');

function groupByWeek(data, weekStart) {
  // returns map dayIndex(0..6) => { BMO:[], AMC:[] }
  const days = Array.from({length:7}, ()=>({BMO:[], AMC:[]}));
  data.forEach(item => {
    const dt = toLocalDate(item.datetime);
    // note: dt in user's locale if ISO includes timezone offsets
    for(let i=0;i<7;i++){
      const day = addDays(weekStart,i);
      if(sameDay(day, dt)) {
        const copy = Object.assign({}, item);
        copy._dateObj = dt;
        // ensure 'when' normalized
        if(copy.when && copy.when.toUpperCase().includes('BMO')) days[i].BMO.push(copy);
        else days[i].AMC.push(copy);
      }
    }
  });
  // sort each session by IV desc (most anticipated)
  days.forEach(d=>{
    d.BMO.sort((a,b)=>b.iv - a.iv);
    d.AMC.sort((a,b)=>b.iv - a.iv);
  });
  return days;
}

function renderCalendar(){
  calendarEl.innerHTML = '';
  const days = groupByWeek(dataset, currentWeekStart);

  for(let i=0;i<7;i++){
    const dayDate = addDays(currentWeekStart, i);
    const dayCol = document.createElement('div');
    dayCol.className = 'day';
    const head = document.createElement('div');
    head.className = 'date';
    const h3 = document.createElement('h3');
    h3.textContent = formatShort(dayDate);
    const span = document.createElement('span');
    span.textContent = dayDate.toLocaleDateString();
    head.appendChild(h3);
    head.appendChild(span);
    dayCol.appendChild(head);

    // BMO session
    const bmo = document.createElement('div');
    bmo.className = 'session';
    const bmoTitle = document.createElement('h4');
    bmoTitle.textContent = 'Before Market (BMO)';
    bmo.appendChild(bmoTitle);
    if(days[i].BMO.length === 0){
      const e = document.createElement('div'); e.className='empty'; e.textContent='— No BMO reports';
      bmo.appendChild(e);
    } else {
      days[i].BMO.forEach(item => {
        bmo.appendChild(createCompanyCard(item));
      });
    }
    dayCol.appendChild(bmo);

    // AMC session
    const amc = document.createElement('div');
    amc.className = 'session';
    const amcTitle = document.createElement('h4');
    amcTitle.textContent = 'After Market (AMC)';
    amc.appendChild(amcTitle);
    if(days[i].AMC.length === 0){
      const e = document.createElement('div'); e.className='empty'; e.textContent='— No AMC reports';
      amc.appendChild(e);
    } else {
      days[i].AMC.forEach(item => {
        amc.appendChild(createCompanyCard(item));
      });
    }
    dayCol.appendChild(amc);

    calendarEl.appendChild(dayCol);
  }

  // set week picker to currentWeekStart
  weekPicker.value = currentWeekStart.toISOString().slice(0,10);
  // clear details panel
  detailsPanel.innerHTML = `<div style="color:var(--muted)">Click a company for details</div>`;
}

function createCompanyCard(item){
  const card = document.createElement('div');
  card.className = 'card';
  card.tabIndex = 0;

  const badge = document.createElement('div');
  badge.className = 'badge ' + (item.when && item.when.toUpperCase().includes('BMO') ? 'bmo' : 'amc');
  badge.textContent = item.ticker;

  const meta = document.createElement('div');
  meta.className = 'meta';
  const row1 = document.createElement('div'); row1.className='row';
  const company = document.createElement('div'); company.innerHTML = `<div class="ticker">${item.company}</div><div class="sector">${item.sector}</div>`;
  const iv = document.createElement('div'); iv.className='iv'; iv.textContent = (item.iv||0).toFixed(1) + '%';
  row1.appendChild(company);
  row1.appendChild(iv);

  const row2 = document.createElement('div'); row2.className='row';
  const when = document.createElement('div'); when.innerHTML = `<small>${item.when} • ${formatTime(item._dateObj || new Date(item.datetime))}</small>`;
  const move = document.createElement('div'); move.className='move';
  const moveAmount = expectedMove(item.price, item.iv);
  move.textContent = `± $${moveAmount.toFixed(2)} (${(moveAmount/item.price*100).toFixed(1)}%)`;

  row2.appendChild(when);
  row2.appendChild(move);

  meta.appendChild(row1);
  meta.appendChild(row2);

  card.appendChild(badge);
  card.appendChild(meta);

  card.addEventListener('click', ()=> showDetails(item));
  card.addEventListener('keypress', (e)=>{ if(e.key === 'Enter') showDetails(item); });

  return card;
}

function showDetails(item){
  const dt = toLocalDate(item.datetime);
  const moveAmount = expectedMove(item.price, item.iv);
  detailsPanel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
      <div>
        <h3 style="margin:0">${item.company} <small style="color:var(--muted)">(${item.ticker})</small></h3>
        <div style="color:var(--muted);margin-top:6px">${item.sector} • ${item.when} • ${formatShort(dt)} ${formatTime(dt)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:800;font-size:20px">$${item.price.toFixed(2)}</div>
        <div style="color:var(--muted)">IV ${item.iv.toFixed(1)}%</div>
      </div>
    </div>

    <hr style="opacity:0.06;margin:10px 0">

    <div style="display:flex;gap:18px;flex-wrap:wrap">
      <div><strong>Estimated 1-day move (approx):</strong><br>± $${moveAmount.toFixed(2)} (${(moveAmount/item.price*100).toFixed(1)}%)</div>
      <div><strong>Report time (local):</strong><br>${formatTime(dt)} on ${formatShort(dt)}</div>
      <div><strong>Notes:</strong><br>Move estimation uses IV and assumes a 1 trading-day window. For multi-day periods or precise option-based expectations use an options analytics library.</div>
    </div>
  `;
}

// ------------- Controls --------------
prevBtn.addEventListener('click', ()=>{
  currentWeekStart = addDays(currentWeekStart, -7);
  renderCalendar();
});
nextBtn.addEventListener('click', ()=>{
  currentWeekStart = addDays(currentWeekStart, 7);
  renderCalendar();
});
todayBtn.addEventListener('click', ()=>{
  currentWeekStart = startOfWeek(new Date());
  renderCalendar();
});
weekPicker.addEventListener('change', (e)=>{
  const d = new Date(e.target.value);
  if(isNaN(d)) return;
  currentWeekStart = startOfWeek(d);
  renderCalendar();
});

// file upload - user can provide JSON array of items like DEMO_DATA
fileInput.addEventListener('change', (e)=>{
  const f = e.target.files && e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = (ev)=>{
    try{
      const parsed = JSON.parse(ev.target.result);
      if(!Array.isArray(parsed)) throw new Error('Expected an array of objects');
      dataset = parsed.map(it=>{
        // minimal normalization: ensure datetime, when, iv, price, company, ticker
        return {
          company: it.company||it.name||'Unknown',
          ticker: it.ticker||'TICK',
          sector: it.sector||'Unknown',
          datetime: it.datetime || it.date || new Date().toISOString(),
          when: (it.when || ( (it.datetime && new Date(it.datetime).getHours()>=15) ? 'AMC' : 'BMO') || 'AMC'),
          iv: Number(it.iv)||0,
          price: Number(it.price)||0
        };
      });
      currentWeekStart = startOfWeek(new Date());
      renderCalendar();
    }catch(err){
      alert('Failed to parse JSON: ' + err.message);
    }
  };
  reader.readAsText(f);
});

// reset
resetData.addEventListener('click', ()=>{
  dataset = JSON.parse(JSON.stringify(DEMO_DATA));
  currentWeekStart = startOfWeek(new Date());
  renderCalendar();
});

// init
(function init(){
  // ensure demo items have Date objects
  dataset.forEach(it => it._dateObj = toLocalDate(it.datetime));
  renderCalendar();
})();
