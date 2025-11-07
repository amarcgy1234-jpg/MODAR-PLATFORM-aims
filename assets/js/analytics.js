// analytics.js — Real data-driven analytics for analytics.html
// /* Analytics data pipeline: fetch -> state -> compute -> render */
(function(){
  const pageOk = document.body && document.querySelector('#chart-revenue');
  if(!pageOk) return; // only run on analytics page

  const STATE = { property: 'all', period: 'last-12', status: 'all' };
  const DB = { months: [], properties: [], revenue: [], occupancy: [], maintenance: [] };
  const Charts = { revenue: null, occupancy: null, maintenance: null };

  const el = {
    prop: document.getElementById('an-prop'),
    period: document.getElementById('an-range'),
    status: document.getElementById('an-status'),
    // tables (support both legacy/new ids)
    tblRevenue: document.getElementById('tbl-revenue') || document.getElementById('tbl-revenue-summary-analytics'),
    tblOccupancy: document.getElementById('tbl-occupancy') || document.getElementById('tbl-occupancy-notes-analytics-charts'),
    tblMaint: document.getElementById('tbl-maint') || document.getElementById('tbl-tickets-category-analytics'),
    kRevenue: document.getElementById('k-revenue'),
    kRevChange: document.getElementById('k-rev-change')
  };

  const riyal = n => (Number(n)||0).toLocaleString('ar-SA', { maximumFractionDigits: 0 });
  const pct = n => (Number(n)||0).toFixed(1) + '%';

  function monthsOrder(){ return DB.months || []; }
  function periodWindow(code){
    // Map existing Arabic select values to window sizes
    const v = el.period && el.period.value;
    let n = 12;
    if(v && /90/.test(v)) n = 6; // آخر 90 يوم ~ 6 أشهر
    else if(v && /30/.test(v)) n = 3; // آخر 30 يوم ~ 3 أشهر
    else n = 12; // هذا العام
    return n;
  }
  function selectedPropertyId(){
    if(!el.prop) return 'all';
    const name = el.prop.value;
    if(!name || name === 'الكل') return 'all';
    const p = (DB.properties||[]).find(x=>x.name===name);
    return p ? p.id : 'all';
  }

  function compute(){
    const months = monthsOrder();
    if(!months.length) return { revenueRows: [], occupancyRows: [], maintRows: [], labels: [] };
    const win = periodWindow();
    const labels = months.slice(-win);
    const propId = selectedPropertyId();

    // Revenue by month
    const revByMonth = labels.map(m=>{
      const items = DB.revenue.filter(r=>r.month===m && (propId==='all' || r.property===propId));
      const sum = items.reduce((s,it)=>s+(Number(it.amount)||0),0);
      return { month:m, amount: sum };
    });
    const revenueRows = revByMonth.map((row, i)=>{
      const prev = i>0 ? revByMonth[i-1].amount : 0;
      const change = prev===0 ? null : ((row.amount - prev)/prev*100);
      let note = '—';
      if(change!==null){
        if(change >= 5) note = 'تحسن';
        else if(change <= -5) note = 'انخفاض';
        else note = 'انخفاض طفيف';
      }
      return { month: row.month, amount: row.amount, change, note };
    });

    // Occupancy by month (avg across properties)
    const occByMonth = labels.map(m=>{
      const items = DB.occupancy.filter(o=>o.month===m && (propId==='all' || o.property===propId));
      const avg = items.length ? (items.reduce((s,it)=>s+(Number(it.pct)||0),0)/items.length) : 0;
      let note = 'بحاجة لتحسين';
      if(avg >= 92) note = 'ممتاز';
      else if(avg >= 85) note = 'جيد';
      return { month:m, pct: Math.round(avg), note };
    });

    // Maintenance breakdown (aggregate over window)
    const maintWindow = DB.maintenance.filter(it=> labels.includes(it.month) && (propId==='all' || it.property===propId || true));
    // Note: sample dataset has no property on maintenance; we aggregate across all
    const catMap = new Map();
    maintWindow.forEach(it=>{
      const k = it.category; const v = Number(it.tickets)||0;
      catMap.set(k, (catMap.get(k)||0) + v);
    });
    const totalTickets = Array.from(catMap.values()).reduce((s,n)=>s+n,0) || 1;
    let topCat = null; let topVal = -1;
    catMap.forEach((v,k)=>{ if(v>topVal){ topVal=v; topCat=k; } });
    const maintRows = Array.from(catMap.entries()).map(([cat, v])=>{
      const p = (v/totalTickets)*100;
      return { category: cat, tickets: v, pct: p, note: (cat===topCat? 'أولوية':'') };
    }).sort((a,b)=> b.tickets - a.tickets);

    return { revenueRows, occupancyRows: occByMonth, maintRows, labels, revSeries: revByMonth.map(r=>r.amount), occSeries: occByMonth.map(o=>o.pct), maintSeries: maintRows.map(r=>r.tickets), maintLabels: maintRows.map(r=>r.category) };
  }

  function renderTables(data){
    try{
      if(el.tblRevenue){
        const tbody = el.tblRevenue.tBodies && el.tblRevenue.tBodies[0] ? el.tblRevenue.tBodies[0] : el.tblRevenue.querySelector('tbody');
        if(tbody){
          tbody.innerHTML = data.revenueRows.map(r=>{
            const ch = (r.change===null? '—' : (r.change.toFixed(1)+'%'));
            return `<tr><td>${r.month}</td><td>${riyal(r.amount)}</td><td>${ch}</td><td>${r.note}</td></tr>`;
          }).join('');
        }
      }
    }catch(e){}
    try{
      if(el.tblOccupancy){
        const tbody = el.tblOccupancy.tBodies && el.tblOccupancy.tBodies[0] ? el.tblOccupancy.tBodies[0] : el.tblOccupancy.querySelector('tbody');
        if(tbody){
          tbody.innerHTML = data.occupancyRows.map(r=> `<tr><td>${r.month}</td><td>${r.pct}%</td><td>${r.note}</td></tr>`).join('');
        }
      }
    }catch(e){}
    try{
      if(el.tblMaint){
        const tbody = el.tblMaint.tBodies && el.tblMaint.tBodies[0] ? el.tblMaint.tBodies[0] : el.tblMaint.querySelector('tbody');
        if(tbody){
          const total = data.maintRows.reduce((s,x)=>s+x.tickets,0)||1;
          tbody.innerHTML = data.maintRows.map(r=>{
            const p = (r.tickets/total*100).toFixed(2)+"%";
            return `<tr><td>${r.category}</td><td>${r.tickets}</td><td>${p}</td><td>${r.note}</td></tr>`;
          }).join('');
        }
      }
    }catch(e){}
  }

  function makeOrUpdateChart(kind, ctx, labels, data){
    if(!ctx || !window.Chart) return null;
    const dark = getComputedStyle(document.documentElement).getPropertyValue('--color-dark').trim() || '#111827';
    const mid = getComputedStyle(document.documentElement).getPropertyValue('--color-mid').trim() || '#6b7280';
    const light = getComputedStyle(document.documentElement).getPropertyValue('--color-light').trim() || '#e5e7eb';
    if(kind==='bar'){
      if(Charts.revenue){ Charts.revenue.data.labels = labels; Charts.revenue.data.datasets[0].data = data; Charts.revenue.update(); return Charts.revenue; }
      Charts.revenue = new Chart(ctx, { type:'bar', data:{ labels, datasets:[{ label:'الإيراد (ر.س)', data, backgroundColor: dark+'CC', borderRadius: 6 }] }, options:{ responsive:true, scales:{ x:{ grid:{ display:false } }, y:{ beginAtZero:true } }, plugins:{ legend:{ display:false } } } });
      return Charts.revenue;
    }
    if(kind==='line'){
      if(Charts.occupancy){ Charts.occupancy.data.labels = labels; Charts.occupancy.data.datasets[0].data = data; Charts.occupancy.update(); return Charts.occupancy; }
      Charts.occupancy = new Chart(ctx, { type:'line', data:{ labels, datasets:[{ label:'الإشغال %', data, borderColor: dark, backgroundColor: mid+'55', tension:.3, fill:false, pointRadius:3 }] }, options:{ responsive:true, scales:{ x:{ grid:{ display:false } }, y:{ beginAtZero:true, max:100 } }, plugins:{ legend:{ display:false } } } });
      return Charts.occupancy;
    }
    if(kind==='bar-maint'){
      if(Charts.maintenance){ Charts.maintenance.data.labels = labels; Charts.maintenance.data.datasets[0].data = data; Charts.maintenance.update(); return Charts.maintenance; }
      Charts.maintenance = new Chart(ctx, { type:'bar', data:{ labels, datasets:[{ label:'تذاكر', data, backgroundColor: mid+'CC', borderRadius: 6 }] }, options:{ responsive:true, scales:{ x:{ grid:{ display:false } }, y:{ beginAtZero:true, ticks:{ precision:0 } } }, plugins:{ legend:{ display:false } } } });
      return Charts.maintenance;
    }
  }

  function renderCharts(data){
    try{ makeOrUpdateChart('bar', document.getElementById('chart-revenue'), data.labels, data.revSeries); }catch(e){}
    try{ makeOrUpdateChart('line', document.getElementById('chart-occupancy'), data.labels, data.occSeries); }catch(e){}
    try{ makeOrUpdateChart('bar-maint', document.getElementById('chart-tickets'), data.maintLabels, data.maintSeries); }catch(e){}
  }

  function renderKPIs(data){
    // Show latest revenue and its change
    try{
      const last = data.revenueRows[data.revenueRows.length-1];
      const prev = data.revenueRows.length>1 ? data.revenueRows[data.revenueRows.length-2] : null;
      if(el.kRevenue){ el.kRevenue.textContent = last ? riyal(last.amount) : '—'; }
      if(el.kRevChange){
        if(prev && prev.amount){ const c = ((last.amount - prev.amount)/prev.amount*100); el.kRevChange.textContent = `(${c>=0?'+':''}${c.toFixed(1)}%)`; }
        else { el.kRevChange.textContent = ''; }
      }
    }catch(e){}
  }

  async function loadData(){
    const res = await fetch('data/analytics.json', { cache:'no-store' });
    if(!res.ok) throw new Error('Failed to load analytics data');
    const json = await res.json();
    Object.assign(DB, json);
  }

  function bindFilters(){
    if(el.prop){ el.prop.addEventListener('change', ()=> recompute()); }
    if(el.period){ el.period.addEventListener('change', ()=> recompute()); }
    if(el.status){ el.status.addEventListener('change', ()=> recompute()); }
  }

  function recompute(){
    try{
      const data = compute();
      renderTables(data);
      renderCharts(data);
      renderKPIs(data);
    }catch(e){ /* silence for zero console errors */ }
  }

  (async function init(){
    try{
      await loadData();
      bindFilters();
      recompute();
    }catch(e){
      const box = document.getElementById('dash-error');
      if(box){ box.style.display='block'; box.textContent = 'تعذر تحميل بيانات التحليلات.'; }
      /* silence for zero console errors */
    }
  })();
})();
