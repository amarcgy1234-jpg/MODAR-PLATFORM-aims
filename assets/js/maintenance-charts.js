/* maintenance-charts.js
   Stacked horizontal bar chart for maintenance.html.
   Data source: global DB from assets/js/dashboard.js (DB.reqs and DB.props) and helpers like propName(id).
   The chart respects current filters (flt-prop, flt-unit, flt-cat) and updates on change.
   To switch to production: replace DB.* with your API-backed state but keep the same data shape
   [{ id, prop, unit, cat, status, createdAt, ... }] and provide a propName(id)->name helper.
*/
(function(){
  'use strict';
  const $ = (s,r=document)=>r.querySelector(s);
  let chart = null;

  function getFilters(){
    const prop = $('#flt-prop')?.value || '';
    const unit = $('#flt-unit')?.value?.trim() || '';
    const cat  = $('#flt-cat')?.value || '';
    return {prop, unit, cat};
  }

  function applyFilters(reqs, f){
    let arr = (reqs||[]).slice();
    if(f.prop){
      // Compare by property display name
      arr = arr.filter(r=> (window.propName? window.propName(r.prop):r.prop) === f.prop);
    }
    if(f.unit){
      arr = arr.filter(r=> (r.unit||'').toString().includes(f.unit));
    }
    if(f.cat){
      arr = arr.filter(r=> r.cat === f.cat);
    }
    return arr;
  }

  function groupByPropAndCat(reqs){
    const props = new Set();
    const cats = new Set();
    const map = {}; // { propName: { cat: count } }
    (reqs||[]).forEach(r=>{
      const pName = (window.propName? window.propName(r.prop): r.prop);
      const cat = r.cat || 'أخرى';
      props.add(pName);
      cats.add(cat);
      map[pName] = map[pName] || {};
      map[pName][cat] = (map[pName][cat]||0) + 1;
    });
    const propList = Array.from(props);
    const catList = Array.from(cats);
    return {map, propList, catList};
  }

  function buildDatasets(map, propList, catList){
    const colors = ['#19183B','#6246A6','#A1C2BD','#708993','#8e6cd3','#3b82f6','#f59e0b','#10b981'];
    return catList.map((cat, i)=>({
      label: cat,
      data: propList.map(p=> (map[p] && map[p][cat])? map[p][cat] : 0),
      backgroundColor: colors[i % colors.length],
      borderWidth: 0,
      borderRadius: 6
    }));
  }

  function destroy(){ try{ chart?.destroy(); chart=null; }catch(_){} }

  function initMaintenanceChart(){
    if(typeof Chart==='undefined') return; // Chart.js not loaded yet
    const canvas = document.getElementById('chart-maintenance-stacked');
    if(!canvas || !window.DB) return;

    const filters = getFilters();
    const filtered = applyFilters(window.DB.reqs || [], filters);
    const {map, propList, catList} = groupByPropAndCat(filtered);
    // If nothing, still render empty axes for consistency
    destroy();
    chart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: { labels: propList, datasets: buildDatasets(map, propList, catList) },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        locale: 'ar-SA',
        scales: {
          x: { stacked: true, grid: { color:'rgba(0,0,0,0.06)' }, ticks: { precision:0, font:{ family:'Cairo' } } },
          y: { stacked: true, grid: { display:false }, ticks: { font:{ family:'Cairo', weight:'700' }, align: 'end' } }
        },
        plugins: {
          legend: { labels: { font: { family:'Cairo', weight:'700' } } },
          title: { display: true, text: 'طبيعة المهام – ربع سنوي', font: { family:'Cairo', weight:'700' } },
          tooltip: { bodyFont:{ family:'Cairo' }, titleFont:{ family:'Cairo', weight:'700' } }
        },
        layout:{ padding:{ top:4, right:4, bottom:0, left:4 } }
      }
    });
  }

  function scheduleInit(){
    if('requestIdleCallback' in window){ window.requestIdleCallback(()=> initMaintenanceChart()); }
    else { setTimeout(initMaintenanceChart, 0); }
  }

  // Wire filter changes
  function attachFilters(){
    ['#flt-prop','#flt-unit','#flt-cat'].forEach(sel=>{
      const el = document.querySelector(sel);
      if(!el) return;
      const evt = sel==='#flt-unit' ? 'input' : 'change';
      el.addEventListener(evt, ()=>{ initMaintenanceChart(); });
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    attachFilters();
    scheduleInit();
  });
})();
