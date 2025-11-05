/* properties.js
   6-slot properties gallery renderer with dynamic binding and image add/replace/remove.
   Data source order:
   1) localStorage 'modar-properties' (persisted session/user edits)
   2) assets/data/properties.mock.json (fallback mock)
   Max tiles shown on desktop: 6 (5 property slots + 1 Add tile). Tablet: 2 cols; Mobile: 1 col.
   To switch to production: replace the fetch of properties.mock.json with your API call
   that returns the same array shape [{id,name,imageUrl,occupancy,monthlyIncome,monthlyExpenses}] and
   keep saving user edits to localStorage under the same key if needed.
*/
(function(){
  'use strict';
  const GRID_ID = 'props-grid';
  const LS_KEY = 'modar-properties';
  const FILE_INPUT_ID = 'prop-image-input';
  const MAX_SLOTS = 5; // plus one Add tile = 6 total

  const $ = (s, r=document)=>r.querySelector(s);
  const grid = document.getElementById(GRID_ID);
  if(!grid) return;

  let props = [];
  let editingIndex = null; // index within props to set image for, or 'add'

  async function loadProps(){
    // 1) localStorage
    try{
      const raw = localStorage.getItem(LS_KEY);
      if(raw){ props = JSON.parse(raw)||[]; return; }
    }catch(_){ }
    // 2) mock json
    try{
      const res = await fetch('assets/data/properties.mock.json', {cache:'no-cache'});
      if(res.ok){ props = await res.json(); return; }
    }catch(_){ }
    props = [];
  }
  function saveProps(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(props)); }catch(_){ } }

  function riyal(n){ return (n||0).toLocaleString('ar-SA'); }

  function propertyCardTemplate(p, idx){
    const hasImage = !!(p && p.imageUrl);
    const name = p?.name || '';
    const id = p?.id || '';
    const occ = typeof p?.occupancy === 'number' ? Math.round(p.occupancy*100) : null;
    const income = p?.monthlyIncome;
    const expense = p?.monthlyExpenses;

    const meta = (occ!=null || income!=null || expense!=null)
      ? `<div class="property-meta">${occ!=null?`<span>الإشغال: ${occ}%</span>`:''}${income!=null?`<span>الإيراد: ${riyal(income)} ر.س</span>`:''}${expense!=null?`<span>المصاريف: ${riyal(expense)} ر.س</span>`:''}</div>`
      : '';

    return `<article class="property-card" data-idx="${idx}" ${id?`data-id="${id}"`:''} tabindex="0" aria-label="${name||'بطاقة عقار'}">
      <div class="property-thumb ${hasImage?'has-image':''}">
        ${hasImage?`<img src="${p.imageUrl}" alt="${name}">`:`<div class="placeholder-icon" aria-hidden="true">🖼</div>`}
        <div class="thumb-actions">
          ${hasImage
            ? `<button class="thumb-btn" data-act="replace">استبدال</button><button class="thumb-btn" data-act="remove">حذف</button>`
            : `<button class="thumb-btn" data-act="add">إضافة صورة</button>`}
        </div>
      </div>
      <h3 class="property-name">${name||'—'}</h3>
      ${meta}
    </article>`;
  }

  function addTileTemplate(){
    return `<button class="property-card add-card" id="btn-add-property" type="button" aria-label="إضافة عقار">
      <span class="plus">+</span>
      <span class="add-label">إضافة عقار</span>
    </button>`;
  }

  function buildGrid(){
    // pick up to MAX_SLOTS items
    const items = props.slice(0, MAX_SLOTS);
    // fill placeholders if fewer
    while(items.length < MAX_SLOTS){ items.push({ id: '', name: '', imageUrl: '', occupancy: null, monthlyIncome: null, monthlyExpenses: null, _placeholder: true }); }
    const html = items.map((p, i)=> propertyCardTemplate(p, i)).join('') + addTileTemplate();
    grid.innerHTML = html;
    bindInteractions();
  }

  function openFilePicker(forIndex){
    editingIndex = forIndex; // number or 'add'
    const input = document.getElementById(FILE_INPUT_ID);
    if(!input) return;
    input.value = '';
    input.click();
  }

  function onFileSelected(e){
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    const url = URL.createObjectURL(file);
    if(editingIndex === 'add'){
      const name = prompt('اسم العقار');
      const id = 'prop-' + Math.random().toString(36).slice(2,7);
      const entry = { id, name: name||'عقار جديد', imageUrl: url, occupancy: null, monthlyIncome: null, monthlyExpenses: null };
      if(props.length < MAX_SLOTS){ props.push(entry); }
      else { props[MAX_SLOTS-1] = entry; }
    } else if(typeof editingIndex === 'number'){
      const p = props[editingIndex]||{ id:'', name:'', imageUrl:'', occupancy:null };
      if(!p.id){ p.id = 'prop-' + Math.random().toString(36).slice(2,7); }
      if(!p.name){ const nm = prompt('اسم العقار'); p.name = nm||'عقار'; }
      p.imageUrl = url;
      props[editingIndex] = p;
    }
    saveProps();
    buildGrid();
  }

  function onThumbAction(e){
    const btn = e.target.closest('.thumb-btn');
    if(!btn) return;
    const card = e.target.closest('.property-card');
    const idx = Number(card?.dataset.idx);
    const act = btn.dataset.act;
    if(Number.isInteger(idx)){
      if(act==='replace' || act==='add'){
        openFilePicker(idx);
      }else if(act==='remove'){
        if(props[idx]){ props[idx].imageUrl=''; saveProps(); buildGrid(); }
      }
    }
  }

  function onCardClick(e){
    const card = e.target.closest('.property-card');
    if(!card || card.classList.contains('add-card')) return;
    const id = card.dataset.id;
    if(id){ location.href = `property-details.html?id=${encodeURIComponent(id)}`; }
  }

  function bindInteractions(){
    // per-card actions
    grid.querySelectorAll('.property-thumb').forEach(el=>{
      el.addEventListener('click', (ev)=>{
        const btn = el.querySelector('.thumb-btn');
        if(btn && !el.classList.contains('has-image')){ openFilePicker(Number(el.closest('.property-card')?.dataset.idx)); }
      });
      el.addEventListener('click', onThumbAction);
    });
    // card click to details
    grid.querySelectorAll('.property-card').forEach(el=>{
      el.addEventListener('click', onCardClick);
      el.addEventListener('keydown', (ev)=>{ if(ev.key==='Enter' || ev.key===' '){ el.click(); ev.preventDefault(); } });
    });
    // add tile
    const addBtn = document.getElementById('btn-add-property');
    addBtn?.addEventListener('click', ()=> openFilePicker('add'));
  }

  document.getElementById(FILE_INPUT_ID)?.addEventListener('change', onFileSelected);

  document.addEventListener('DOMContentLoaded', async ()=>{
    await loadProps();
    buildGrid();
  });
})();
