// ---------- Helpers ----------
const $ = (s) => document.querySelector(s);
const now = () => new Date();
function daysAgo(d){ const t=new Date(); t.setDate(t.getDate()-d); return t; }
const riyal = (n) => (n||0).toLocaleString('ar-SA');

// SLA per category (hours)
const SLA = { "سباكة": 24, "كهرباء": 24, "نظافة": 72, "بوية": 168 };

// ---------- Mock DB ----------
const DB = {
  role:'owner',
  props:[
    {id:'P1',name:'عمارة الشوقية',type:'سكني',units:5,occ:.95,rev:35000,spend:2300},
    {id:'P2',name:'عمارة النخيل',type:'سكني',units:3,occ:.82,rev:22000,spend:4100},
    {id:'P3',name:'برج جدة للأعمال',type:'تجاري',units:10,occ:.90,rev:48000,spend:3100},
  ],
  reqs:[
    {id:1001,prop:'P1',unit:'2B',cat:'سباكة',desc:'تسرب بسيط',status:'new',assignee:'',cost:0,createdAt:daysAgo(3)},
    {id:1002,prop:'P2',unit:'3A',cat:'كهرباء',desc:'قاطع يفصل',status:'assigned',assignee:'محمد',cost:0,createdAt:daysAgo(5)},
    {id:1003,prop:'P1',unit:'1A',cat:'سباكة',desc:'انسداد مجرى',status:'in_progress',assignee:'عبدالله',cost:0,createdAt:daysAgo(8)},
    {id:1004,prop:'P3',unit:'10F',cat:'نظافة',desc:'تعقيم أسبوعي',status:'closed',assignee:'عبدالله',cost:250,createdAt:daysAgo(10),closedAt:daysAgo(9)},
    {id:1005,prop:'P1',unit:'4C',cat:'بوية',desc:'دهان جدار',status:'new',assignee:'',cost:0,createdAt:daysAgo(12)},
  ],
  rentLate:true
};

// ---------- Utils ----------
function propName(id){ return DB.props.find(p=>p.id===id)?.name || id; }
function ageHours(dt){ return Math.max(0, Math.round((now()-dt)/36e5)); }
function isOverdue(req){ const lim = SLA[req.cat]||48; return req.status!=='closed' && ageHours(req.createdAt) > lim; }
function kpis(){
  const open = DB.reqs.filter(r=>r.status!=='closed').length;
  const rev = DB.props.reduce((s,p)=>s+p.rev,0);
  const cost = DB.props.reduce((s,p)=>s+p.spend,0) + DB.reqs.filter(r=>r.status==='closed').reduce((s,r)=>s+(r.cost||0),0);
  const occ = Math.round(DB.props.reduce((s,p)=>s+p.occ,0)/DB.props.length*100);
  return {open,rev,cost,occ};
}

// ---------- Render ----------
function renderItem(r){
  const overdue = isOverdue(r);
  const badge = overdue ? 'dash-chip dash-bad">متأخر' : (r.status==='closed'?'dash-chip dash-ok">مغلق':'dash-chip dash-warn">قيد المعالجة');
  return `<div class="dash-item">
    <div><b>#${r.id}</b> – ${r.desc} <span class="${badge}</span>
      <div class="dash-muted">${propName(r.prop)} — ${r.unit} — ${r.cat} — عمر ${ageHours(r.createdAt)}ساعة${r.cost?(' — تكلفة '+riyal(r.cost)):""}</div>
    </div>
    <span class="dash-pill">${r.status}${r.assignee?(' · '+r.assignee):''}</span>
  </div>`;
}
function renderList(list){
  const el = $('#req-list');
  if(!el) return;
  el.innerHTML = list.length? list.map(renderItem).join('') : '<div class="dash-muted">لا توجد طلبات.</div>';
}
function refreshTable(){
  const over = DB.reqs.filter(isOverdue).length;
  const byCat = groupBy(DB.reqs, r=>r.cat);
  const rows = [
    ['الطلبات (إجمالي)', DB.reqs.length],
    ['المتأخرة', over],
    ['سباكة', (byCat['سباكة']||[]).length],
    ['كهرباء', (byCat['كهرباء']||[]).length],
    ['نظافة', (byCat['نظافة']||[]).length],
    ['بوية', (byCat['بوية']||[]).length],
  ];
  const tbl = $('#tbl');
  if (tbl) {
    tbl.innerHTML = '<tr><th>المؤشر</th><th>القيمة</th></tr>' + rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('');
  }
}

// ---------- Actions ----------
let seq=1100;
function createReq(){
  const id=++seq;
  const prop=$('#r-prop').value;
  const unit=$('#r-unit').value||'شقة 1A';
  const cat=$('#r-cat').value;
  const desc=$('#r-desc').value||'طلب صيانة';
  DB.reqs.push({id,prop,unit,cat,desc,status:'new',assignee:'',cost:0,createdAt:new Date()});
  if(cat==='سباكة'){ autoAssign(id,'عبدالله'); }
  update();
}
function autoAssign(id,who){
  const r = DB.reqs.find(x=>x.id===id); if(!r) return;
  r.assignee=who; r.status='assigned';
  pushChat('bot', `تم توجيه طلب #${id} (${r.cat}) إلى ${who}. SLA=${SLA[r.cat]||48} ساعة.`);
}
function orderBy(key){
  let arr = DB.reqs.slice();
  if(key==='overdue'){
    arr = arr.filter(r=>isOverdue(r)).concat(arr.filter(r=>!isOverdue(r)));
  } else if(key==='cost'){
    arr.sort((a,b)=>(b.cost||0)-(a.cost||0));
  } else if(key==='age'){
    arr.sort((a,b)=>b.createdAt-a.createdAt);
    arr.reverse();
  } else if(key==='category'){
    arr.sort((a,b)=>a.cat.localeCompare(b.cat,'ar'));
  }
  renderList(arr);
}

// ---------- Chat ----------
const chat = [];
function pushChat(who, text){
  chat.push({who,text});
  const log=$('#chat-log');
  if(!log) return;
  const el=document.createElement('div');
  el.className='dash-bubble '+(who==='me'?'dash-me':'dash-bot');
  el.textContent=text;
  log.appendChild(el);
  log.scrollTop=log.scrollHeight;
}
function onAsk(){
  const input = $('#q');
  const q = input.value.trim(); if(!q) return; input.value='';
  ask(q);
}
function ask(q){
  pushChat('me', q);
  const a = answer(q);
  pushChat('bot', a);
  refreshTable();
}
function answer(q){
  const s = q.toLowerCase();
  const ar = (t)=> t.replace(/أ|إ|آ/g,'ا').replace(/ة/g,'ه').replace(/[^\u0600-\u06FF0-9a-z\\s]/gi,'');
  const txt = ar(s);

  if(/(متاخر|متاخره|overdue|تجاوزت)/.test(txt)){
    const list = DB.reqs.filter(isOverdue);
    if(!list.length) return 'لا توجد طلبات متأخرة حاليًا ✅';
    const lines = list.map(r=>`#${r.id} ${r.cat} – ${propName(r.prop)} – عمر ${ageHours(r.createdAt)}ساعة`);
    renderList(list);
    return 'هذه الطلبات متأخرة:\\n' + lines.join('\\n');
  }
  if(/(رتب|ترتيب).*(تكلفه|cost|الاغلى)/.test(txt)){
    orderBy('cost');
    const top = DB.reqs.slice().sort((a,b)=>(b.cost||0)-(a.cost||0)).slice(0,5);
    const lines = top.map(r=>`#${r.id} ${r.cat} – ${riyal(r.cost||0)} ر.س`);
    return 'رتبت الطلبات حسب التكلفة. أعلى 5:\\n' + lines.join('\\n');
  }
  if(/(ملخص|summary).*(سباكه|plumb)/.test(txt) || /(سباكه).*(30)/.test(txt)){
    const since = daysAgo(30);
    const list = DB.reqs.filter(r=>r.cat==='سباكة' && r.createdAt>=since);
    const closed = list.filter(r=>r.status==='closed');
    const spend = closed.reduce((s,r)=>s+(r.cost||0),0);
    return `ملخص سباكة آخر 30 يوم: ${list.length} طلب، المصروف (مغلق): ${riyal(spend)} ر.س.`;
  }
  if(/(اكثر|اعلى|most).*(عقار|property).*(صرف|spend)/.test(txt)){
    const best = DB.props.slice().sort((a,b)=>b.spend-a.spend)[0];
    return `أكثر عقار صرفًا هذا الشهر: ${best.name} — ${riyal(best.spend)} ر.س.`;
  }
  if(/(انشئ|ارسال|ذكير|remind).*(متاخرين|rent|late)/.test(txt)){
    if(!DB.rentLate) return 'لا يوجد مستأجرون متأخرون الآن.';
    DB.rentLate=false;
    return 'تم إرسال تذكير ودي للمستأجرين المتأخرين. سيتابع مُدار الحالة خلال 48 ساعة.';
  }
  if(/(نصيه|اقترح|recommend)/.test(txt) || /(صيانة وقائية)/.test(txt)){
    const p = DB.props.slice().sort((a,b)=>b.spend-a.spend)[0];
    return `اقتراح: صيانة وقائية في ${p.name} لتقليل الأعطال 25%، وتثبيت مورد بديل للسباكة.`;
  }
  if(/(kpi|ملخص|summary)/.test(txt)){
    const {open,rev,cost,occ} = kpis();
    return `الملخص: طلبات مفتوحة ${open}، الإيراد ${riyal(rev)}، المصروف ${riyal(cost)}، الإشغال ${occ}%.`;
  }
  if(/(help|مساعده|ماذا يمكن|كيف)/.test(txt)){
    return `اسألني مثلًا:
- رتب الطلبات حسب المتأخرة
- ما أكثر عقار صرفًا هذا الشهر؟
- ملخص الصيانة للسباكة آخر 30 يوم
- أنشئ تذكير للمستأجرين المتأخرين
- ملخص KPI`;
  }
  return 'لم أفهم السؤال تمامًا. جرّب: \"ما الطلبات المتأخرة؟\" أو \"ملخص KPI\".';
}

// ---------- Nav / Views ----------
function groupBy(arr, fn){ const m={}; arr.forEach(x=>{ const k=fn(x); (m[k]=m[k]||[]).push(x); }); return m; }
function show(id){
  document.querySelectorAll('.dash-nav').forEach(b=>b.classList.toggle('dash-active', b.dataset.view===id));
  document.querySelectorAll('.dash-main > section').forEach(s=>s.hidden = (s.id!==id));
  update();
}
function setRole(r){ DB.role=r; update(); }

function update(){
  const {open,rev,cost,occ} = kpis();
  const elOpen = $('#k-open'), elRev = $('#k-rev'), elCost = $('#k-cost'), elOcc = $('#k-occ');
  if(elOpen) elOpen.textContent=open;
  if(elRev) elRev.textContent=riyal(rev);
  if(elCost) elCost.textContent=riyal(cost);
  if(elOcc) elOcc.textContent=occ+'%';

  const recent = [...DB.reqs].slice(-5).reverse();
  const recentEl = $('#recent');
  if(recentEl) recentEl.innerHTML = recent.map(r=>renderItem(r)).join('') || '<div class="dash-muted">لا توجد طلبات.</div>';

  const max = Math.max(...DB.props.map(p=>p.spend));
  const spendEl = $('#spend');
  if(spendEl) spendEl.innerHTML = DB.props.slice().sort((a,b)=>b.spend-a.spend).map(p=>`
    <div class="dash-item" title="مصروف ${riyal(p.spend)}">
      <div style="flex:1"><div class="dash-row" style="justify-content:space-between"><b>${p.name}</b><span class="dash-muted">${riyal(p.spend)} ر.س</span></div>
      <div class="dash-bar"><i style="width:${Math.round(p.spend/max*100)}%"></i></div></div>
    </div>`).join('');

  const propSel = $('#r-prop');
  if(propSel) propSel.innerHTML = DB.props.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');

  const revEl = $('#f-rev'), costEl = $('#f-cost'), netEl = $('#f-net'), bestEl = $('#f-best');
  if(revEl) revEl.textContent = riyal(rev)+' ر.س';
  if(costEl) costEl.textContent = riyal(cost)+' ر.س';
  if(netEl) netEl.textContent = riyal(rev-cost)+' ر.س';
  if(bestEl){ const best = DB.props.slice().sort((a,b)=>(a.rev-a.spend)<(b.rev-b.spend)?1:-1)[0]; bestEl.textContent = best? best.name : '—'; }

  const max2 = Math.max(...DB.props.map(p=>p.spend));
  const barsEl = $('#bars');
  if(barsEl) barsEl.innerHTML = DB.props.map(p=>`
    <div class="dash-item"><div style="flex:1"><b>${p.name}</b><div class="dash-muted">مصروف: ${riyal(p.spend)} ر.س</div><div class="dash-bar"><i style="width:${Math.round(p.spend/max2*100)}%"></i></div></div></div>
  `).join('');

  refreshTable();
}

// ---------- Analytics (JSON-bound) ----------
async function loadDashboardData(){
  try{
    const res = await fetch('assets/data/dashboard.mock.json', {cache:'no-cache'});
    if(!res.ok) throw new Error('فشل تحميل بيانات لوحة التحكم');
    const data = await res.json();
    bindKPIs(data.kpis);
    bindTables(data.recentActivity, data.topUsers);
    bindCharts(data.charts);
  }catch(err){
    const el = document.getElementById('dash-error');
    if(el){ el.style.display='block'; el.textContent = (err && err.message) || 'تعذر تحميل البيانات. حاول مجددًا.'; }
    console.warn(err);
  }
}   

function bindKPIs(k){
  if(!k) return;
  const set = (id,val)=>{ const el=document.getElementById(id); if(el) el.textContent=val; };
  set('k-total', riyal(k.totalProperties));
  set('k-occupied', riyal(k.occupiedUnits));
  set('k-vacant', riyal(k.vacantUnits));
  set('k-revenue', riyal(k.monthlyRevenue)+' ر.س');
  set('k-rev-change', (k.revenueChangePct>0?'+':'')+k.revenueChangePct+'%');
  set('k-open-tickets', riyal(k.openTickets));
  set('k-avg-res', riyal(k.avgResolutionHours));
}

function setTbodyRows(tableId, rowsHtml){
  const table = document.getElementById(tableId);
  if(!table) return;
  const tbody = table.tBodies && table.tBodies[0] ? table.tBodies[0] : table.querySelector('tbody');
  if(tbody){ tbody.innerHTML = rowsHtml; }
}

function bindTables(activity, users){
  // recent activity -> #tbl-activity
  const rowsA = (activity||[]).map(a=>`<tr><td>${new Date(a.timeISO).toLocaleString('ar-SA')}</td><td>${a.actor}</td><td>${a.action}</td><td>${a.target}</td><td>${a.severity||''}</td></tr>`).join('');
  setTbodyRows('tbl-activity', rowsA);
  // top users -> #tbl-top-users
  const rowsU = (users||[]).map(u=>`<tr><td>${u.name}</td><td>${u.role}</td><td>${riyal(u.ticketsClosed)}</td><td>${u.satisfactionPct}%</td></tr>`).join('');
  setTbodyRows('tbl-top-users', rowsU);
  // notify charts listeners
  try{ window.dispatchEvent(new CustomEvent('modar:dataReady', { detail: { activity: activity||[], users: users||[] } })); }catch(_){ }
}

// Populate from local DB for two tables present in analytics.html
function bindLocalFromDB(){
  // Top spend by property -> #tbl-top-spend
  if(document.getElementById('tbl-top-spend')){
    const rows = DB.props.slice().sort((a,b)=>b.spend-a.spend)
      .map(p=>`<tr><td>${p.name}</td><td>${riyal(p.spend)}</td></tr>`).join('');
    setTbodyRows('tbl-top-spend', rows);
  }
  // Latest requests -> #tbl-latest-reqs
  if(document.getElementById('tbl-latest-reqs')){
    const recent = [...DB.reqs].slice(-8).reverse();
    const rows = recent.map(r=>`<tr><td>${new Date(r.createdAt).toLocaleString('ar-SA')}</td><td>${propName(r.prop)}</td><td>${r.cat}</td><td>${r.status}</td></tr>`).join('');
    setTbodyRows('tbl-latest-reqs', rows);
  }
}

function bindCharts(ch){
  if(!ch) return;
  drawBarChart(document.getElementById('chart-revenue'), ch.revenueMonthly?.labels||[], ch.revenueMonthly?.values||[]);
  drawLineChart(document.getElementById('chart-occupancy'), ch.occupancyTrend?.labels||[], ch.occupancyTrend?.values||[]);
  drawBarChart(document.getElementById('chart-tickets'), ch.ticketsByCategory?.labels||[], ch.ticketsByCategory?.values||[]);
  // Fill compact explanatory table under charts if present
  try{
    // Revenue summary (Table A)
    const tblA = document.getElementById('tbl-revenue-summary-analytics');
    if(tblA){
      const labels = ch.revenueMonthly?.labels||[];
      const vals = ch.revenueMonthly?.values||[];
      let prev = null;
      const rows = labels.map((m,i)=>{
        const v = vals[i]||0;
        let chg = 0; if(prev!=null && prev!==0){ chg = ((v - prev)/prev*100); }
        prev = v;
        const note = chg===0? '—' : (chg>0? 'تحسن' : 'انخفاض');
        return `<tr><td>${m}</td><td>${riyal(v)}</td><td>${chg?chg.toFixed(1):'0.0'}%</td><td>${note}</td></tr>`;
      }).join('');
      const tbodyA = tblA.tBodies && tblA.tBodies[0] ? tblA.tBodies[0] : tblA.querySelector('tbody');
      if(tbodyA) tbodyA.innerHTML = rows;
    }
    // Occupancy notes under charts (Table B)
    const tblB = document.getElementById('tbl-occupancy-notes-analytics-charts');
    if(tblB){
      const labels = ch.occupancyTrend?.labels||[];
      const vals = ch.occupancyTrend?.values||[];
      const rows = labels.map((m,i)=>{
        const v = Number(vals[i]||0);
        let note = '—';
        if(v >= 90) note = 'ممتاز';
        else if(v >= 80) note = 'جيد';
        else if(v >= 60) note = 'متوسط';
        else note = 'منخفض';
        return `<tr><td>${m}</td><td>${v}%</td><td>${note}</td></tr>`;
      }).join('');
      const tbodyB = tblB.tBodies && tblB.tBodies[0] ? tblB.tBodies[0] : tblB.querySelector('tbody');
      if(tbodyB) tbodyB.innerHTML = rows;
    }
  }catch(_){ }
  // Fill mirrored occupancy notes table at the bottom if present
  try{
    const tbl2 = document.getElementById('tbl-occupancy-notes-analytics');
    if(tbl2){
      const labels = ch.occupancyTrend?.labels||[];
      const occVals = ch.occupancyTrend?.values||[];
      const rows = labels.map((m,i)=>{
        const v = Number(occVals[i]||0);
        let note = '—';
        if(v >= 90) note = 'ممتاز';
        else if(v >= 80) note = 'جيد';
        else if(v >= 60) note = 'متوسط';
        else note = 'منخفض';
        return `<tr><td>${m}</td><td>${v}%</td><td>${note}</td></tr>`;
      }).join('');
      const tbody2 = tbl2.tBodies && tbl2.tBodies[0] ? tbl2.tBodies[0] : tbl2.querySelector('tbody');
      if(tbody2) tbody2.innerHTML = rows;
    }
  }catch(_){ }
  // Tickets by category table under the chart (analytics page)
  try{
    const tbl = document.getElementById('tbl-tickets-category-analytics');
    if(tbl){
      const labels = ch.ticketsByCategory?.labels||[];
      const vals = ch.ticketsByCategory?.values||[];
      const total = (vals||[]).reduce((s,n)=>s+(n||0),0) || 1;
      const rows = labels.map((c,i)=>{
        const v = vals[i]||0; const pct = (v/total*100).toFixed(1);
        const note = v===0? '—' : '';
        return `<tr><td>${c}</td><td>${v}</td><td>${pct}%</td><td>${note}</td></tr>`;
      }).join('');
      const tbody = tbl.tBodies && tbl.tBodies[0] ? tbl.tBodies[0] : tbl.querySelector('tbody');
      if(tbody) tbody.innerHTML = rows;
    }
  }catch(_){ }
}

function drawLineChart(canvas, labels, values){ if(!canvas) return; const ctx=canvas.getContext('2d'); const w=canvas.width, h=canvas.height; ctx.clearRect(0,0,w,h); ctx.font='12px Cairo, sans-serif'; ctx.fillStyle='#111827'; const pad=30; const max=Math.max(1, ...values); const step=(w-pad*2)/(Math.max(1,values.length-1)); ctx.strokeStyle='#6246A6'; ctx.lineWidth=2; ctx.beginPath(); values.forEach((v,i)=>{ const x=pad+i*step; const y=h-pad-(v/max)*(h-pad*2); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.stroke(); ctx.fillStyle='#6b7280'; labels.forEach((lb,i)=>{ const x=pad+i*step; ctx.fillText(lb, x-10, h-8); }); }
function drawBarChart(canvas, labels, values){ if(!canvas) return; const ctx=canvas.getContext('2d'); const w=canvas.width, h=canvas.height; ctx.clearRect(0,0,w,h); ctx.font='12px Cairo, sans-serif'; const pad=30; const max=Math.max(1, ...values); const barW=(w-pad*2)/(values.length||1)*0.6; values.forEach((v,i)=>{ const x=pad+i*((w-pad*2)/(values.length||1))+((w-pad*2)/(values.length||1)-barW)/2; const barH=(v/max)*(h-pad*2); const y=h-pad-barH; ctx.fillStyle='#8e6cd3'; ctx.fillRect(x,y,barW,barH); ctx.fillStyle='#6b7280'; ctx.fillText(labels[i]||'', x, h-8); }); }

// init
document.addEventListener('DOMContentLoaded', () => {
  // Only run old demo view switcher on pages that have it
  if(document.querySelector('.dash-main')){ show('dash'); }
  // Bind local DB-driven tables if present
  bindLocalFromDB();
  // Load analytics dataset if any analytics tables are present
  if(document.getElementById('tbl-activity') || document.getElementById('tbl-top-users')){
    loadDashboardData();
  }
});