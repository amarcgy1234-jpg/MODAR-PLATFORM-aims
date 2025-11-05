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

// init
document.addEventListener('DOMContentLoaded', () => {
  show('dash');
});