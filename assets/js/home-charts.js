(function(){
  'use strict';
  const $ = (s,r=document)=>r.querySelector(s);
  const hasChart = ()=> typeof window.Chart !== 'undefined';

  function riyal(n){ return (n||0).toLocaleString('ar-SA'); }

  async function loadData(){
    // Reuse the same mock dataset used by analytics/dashboard
    const res = await fetch('assets/data/dashboard.mock.json', {cache:'no-cache'});
    if(!res.ok) throw new Error('فشل تحميل بيانات الصفحة الرئيسية');
    return res.json();
  }

  function drawRevenueBar(canvas, labels, values){
    if(!canvas || !hasChart()) return null;
    const ctx = canvas.getContext('2d');
    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'الإيراد (ر.س)',
          data: values,
          backgroundColor: 'rgba(97, 72, 166, 0.6)',
          borderColor: '#6246A6',
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        locale: 'ar-SA',
        scales: {
          x: { grid: { color: 'rgba(0,0,0,.06)' }, ticks: { font: { family: 'Cairo' } } },
          y: { grid: { display: false }, ticks: { font: { family: 'Cairo', weight: '700' } } }
        },
        plugins: {
          legend: { labels: { font: { family: 'Cairo', weight: '700' } } },
          tooltip: { bodyFont: { family: 'Cairo' }, titleFont: { family: 'Cairo', weight: '700' } }
        }
      }
    });
  }

  function drawOccLine(canvas, labels, values){
    if(!canvas || !hasChart()) return null;
    const ctx = canvas.getContext('2d');
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'الإشغال %',
          data: values,
          borderColor: '#19183B',
          backgroundColor: 'rgba(25,24,59,.08)',
          tension: .25,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        locale: 'ar-SA',
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'Cairo' } } },
          y: { grid: { color: 'rgba(0,0,0,.06)' }, suggestedMin: 0, suggestedMax: 100, ticks: { callback: (v)=> v + '%', font: { family: 'Cairo', weight: '700' } } }
        },
        plugins: {
          legend: { labels: { font: { family: 'Cairo', weight: '700' } } },
          tooltip: { bodyFont: { family: 'Cairo' }, titleFont: { family: 'Cairo', weight: '700' } }
        }
      }
    });
  }

  function fillRevenueSummary(tableId, labels, values){
    const tbody = document.querySelector(`#${tableId} tbody`);
    if(!tbody) return;
    let prev = null;
    const rows = labels.map((m,i)=>{
      const v = values[i]||0;
      let chg = 0; if(prev!=null && prev!==0){ chg = ((v - prev)/prev*100); }
      prev = v;
      const note = chg===0? '—' : (chg>0? 'تحسن' : 'انخفاض');
      return `<tr><td>${m}</td><td>${riyal(v)}</td><td>${chg?chg.toFixed(1):'0.0'}%</td><td>${note}</td></tr>`;
    }).join('');
    tbody.innerHTML = rows;
  }

  function drawTicketsBar(canvas, labels, values){
    if(!canvas || !hasChart()) return null;
    const ctx = canvas.getContext('2d');
    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'عدد التذاكر',
          data: values,
          backgroundColor: '#A1C2BD',
          borderColor: '#708993',
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        locale: 'ar-SA',
        scales: {
          x: { grid: { color: 'rgba(0,0,0,.06)' }, ticks: { font: { family: 'Cairo' } } },
          y: { grid: { display: false }, ticks: { precision: 0, font: { family: 'Cairo', weight: '700' } } }
        },
        plugins: {
          legend: { labels: { font: { family: 'Cairo', weight: '700' } } },
          tooltip: { bodyFont: { family: 'Cairo' }, titleFont: { family: 'Cairo', weight: '700' } }
        }
      }
    });
  }

  function fillTicketsTable(tableId, labels, values){
    const tbody = document.querySelector(`#${tableId} tbody`);
    if(!tbody) return;
    const total = values.reduce((s,n)=>s+(n||0),0) || 1;
    const rows = labels.map((c,i)=>{
      const v = values[i]||0;
      const pct = (v/total*100).toFixed(1);
      const note = v===0? '—' : '';
      return `<tr><td>${c}</td><td>${v}</td><td>${pct}%</td><td>${note}</td></tr>`;
    }).join('');
    tbody.innerHTML = rows;
  }

  function injectWhyModar(){
    const el = document.getElementById('why-modar'); if(!el) return;
    el.innerHTML = [
      '<p>مدار هو نظام موحّد لإدارة العقارات يُبسط كل ما يحتاجه المالك في منصة واحدة: متابعة الإيرادات والمصاريف، تتبع الصيانة والمهام، التواصل مع المستأجرين، ورفع كفاءة التشغيل بالتحليلات الذكية.</p>',
      '<p>مع مدار ستحصل على:</p>',
      '<ul>',
      '<li>رؤية مالية فورية: لوحات ورسوم توضح الأداء الشهري واتجاهات الإشغال.</li>',
      '<li>إدارة صيانة بلا تعقيد: تذاكر منظمة، أولويات واضحة، وتتبّع الحالة حتى الإغلاق.</li>',
      '<li>تواصل احترافي: رسائل وتذكيرات وجدولة تلقائية للمسؤوليات.</li>',
      '<li>قابلية نمو: إضافة مساعدين وخصائص جديدة بسهولة، مع بيانات قابلة للتصدير والتكامل.</li>',
      '<li>تجربة عربية متقنة: تصميم RTL، خطوط واضحة، وأداء سريع على الجوال وسطح المكتب.</li>',
      '</ul>'
    ].join('');
  }

  function schedule(fn){ if('requestIdleCallback' in window){ window.requestIdleCallback(()=>fn()); } else { setTimeout(fn, 0); } }

  document.addEventListener('DOMContentLoaded', async ()=>{
    injectWhyModar();
    try{
      const data = await loadData();
      const rev = data?.charts?.revenueMonthly || {labels:[], values:[]};
      const occ = data?.charts?.occupancyTrend || {labels:[], values:[]};
      const tix = data?.charts?.ticketsByCategory || {labels:[], values:[]};

      schedule(()=>{
        const c1 = drawRevenueBar(document.getElementById('chart-monthly-revenue'), rev.labels, rev.values);
        const c2 = drawOccLine(document.getElementById('chart-occupancy-trend'), occ.labels, occ.values);
        const c3 = drawTicketsBar(document.getElementById('chart-tickets-by-category'), tix.labels, tix.values);
        fillRevenueSummary('tbl-revenue-summary', rev.labels, rev.values);
        fillTicketsTable('tbl-tickets-category', tix.labels, tix.values);
        // store references if later updates are needed
        window.ModarHomeCharts = { c1, c2, c3 };
      });
    }catch(err){ console.warn(err); }
  });
})();
