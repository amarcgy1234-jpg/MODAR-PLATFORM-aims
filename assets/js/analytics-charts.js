/* analytics-charts.js
   Charts for analytics.html bottom cards.
   Data source: dispatched from assets/js/dashboard.js via 'modar:dataReady' (activity, users arrays).
   To switch to production: replace dashboard.mock.json fetch in dashboard.js with your API call that returns the same data shape { recentActivity:[], topUsers:[] } and keep dispatching the same event.
*/
(function(){
  'use strict';
  const hasChartJS = () => typeof window.Chart !== 'undefined';
  let charts = { activityBar: null, topUsersPie: null };

  function destroyChart(key){
    try{ charts[key]?.destroy(); charts[key]=null; }catch(_){}
  }

  function initActivityBar(activity){
    const canvas = document.getElementById('chart-activity-bar');
    if(!canvas || !hasChartJS()) return;
    // Aggregate counts by action in Arabic
    const byAction = {};
    (activity||[]).forEach(a=>{ const k=a.action||'—'; byAction[k]=(byAction[k]||0)+1; });
    const labels = Object.keys(byAction);
    const values = labels.map(k=>byAction[k]);
    destroyChart('activityBar');
    charts.activityBar = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: { labels, datasets: [{
        label: 'عدد الأحداث',
        data: values,
        backgroundColor: 'rgba(97, 72, 166, 0.6)',
        borderColor: '#6246A6',
        borderWidth: 1.5,
        borderRadius: 6,
      }]},
      options: {
        responsive: true,
        maintainAspectRatio: false,
        locale: 'ar-SA',
        scales: {
          x: { grid: { display:false }, ticks: { font: { family: 'Cairo' } } },
          y: { grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { precision:0, font: { family: 'Cairo' } } }
        },
        plugins: {
          legend: { labels: { font: { family: 'Cairo', weight: '700' } } },
          tooltip: { bodyFont: { family: 'Cairo' }, titleFont: { family: 'Cairo', weight:'700' } }
        },
        layout: { padding: { top: 4, right: 4, bottom: 0, left: 4 } }
      }
    });
  }

  function initTopUsersPie(users){
    const canvas = document.getElementById('chart-top-users-pie');
    if(!canvas || !hasChartJS()) return;
    const labels = (users||[]).map(u=>u.name);
    const values = (users||[]).map(u=>u.ticketsClosed||0);
    // Color palette aligned to Modar
    const colors = ['#19183B','#6246A6','#A1C2BD','#708993','#8e6cd3','#3b82f6','#f59e0b'];
    destroyChart('topUsersPie');
    charts.topUsersPie = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: { labels, datasets: [{ data: values, backgroundColor: labels.map((_,i)=> colors[i%colors.length]), borderColor: '#ffffff', borderWidth: 2 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        locale: 'ar-SA',
        cutout: '60%',
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: 'Cairo', weight: '700' } } },
          tooltip: { bodyFont: { family: 'Cairo' }, titleFont: { family: 'Cairo', weight:'700' } }
        }
      }
    });
  }

  function schedule(fn){
    if('requestIdleCallback' in window){ window.requestIdleCallback(()=>fn()); }
    else { setTimeout(fn, 0); }
  }

  function initChartsFrom(detail){
    const activity = detail && detail.activity || [];
    const users = detail && detail.users || [];
    schedule(()=>{
      initActivityBar(activity);
      initTopUsersPie(users);
    });
  }

  // If charts script loads after data, try to read from tables as fallback
  function fallbackFromTables(){
    const tbodyAct = document.querySelector('#tbl-activity tbody');
    const activity = [];
    if(tbodyAct){
      tbodyAct.querySelectorAll('tr').forEach(tr=>{
        const tds = tr.querySelectorAll('td');
        if(tds.length>=5){ activity.push({ timeISO: tds[0].textContent, actor: tds[1].textContent, action: tds[2].textContent, target: tds[3].textContent, severity: tds[4].textContent }); }
      });
    }
    const tbodyUsers = document.querySelector('#tbl-top-users tbody');
    const users = [];
    if(tbodyUsers){
      tbodyUsers.querySelectorAll('tr').forEach(tr=>{
        const tds = tr.querySelectorAll('td');
        if(tds.length>=4){ users.push({ name: tds[0].textContent, role: tds[1].textContent, ticketsClosed: Number((tds[2].textContent||'0').replace(/[^0-9]/g,''))||0, satisfactionPct: Number((tds[3].textContent||'0').replace(/[^0-9\.]/g,''))||0 }); }
      });
    }
    initChartsFrom({ activity, users });
  }

  // Listen for data ready
  window.addEventListener('modar:dataReady', (e)=>{
    initChartsFrom(e.detail || {});
  });

  // Resize handling
  window.addEventListener('resize', ()=>{
    if(charts.activityBar) charts.activityBar.resize();
    if(charts.topUsersPie) charts.topUsersPie.resize();
  });

  // Fallback init after DOM loaded
  document.addEventListener('DOMContentLoaded', ()=>{
    if(!hasChartJS()) return;
    // if data event already fired, charts will be inited. else, try fallback after a short delay
    setTimeout(fallbackFromTables, 300);
  });
})();
