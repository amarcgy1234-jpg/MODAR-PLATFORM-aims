(function(){
  const ROOT_ID = 'modar-sidebar-root';
  const PARTIAL_URL = 'assets/partials/sidebar.html';
  const STATE_KEY = 'mdr-drawer-open:' + (location.pathname.split('/').pop()||'index.html');
  const qs = (s,root=document)=>root.querySelector(s);
  const qsa = (s,root=document)=>Array.from(root.querySelectorAll(s));

  function isAuthed(){ try{ return localStorage.getItem('modar-auth') === 'true'; }catch(_){ return false; } }

  function setActiveLinks(container){
    const cur = location.pathname.split('/').pop();
    qsa('a', container).forEach(a=>{
      if (a.getAttribute('href') === cur) a.classList.add('active');
    });
  }

  function trapFocus(container){
    const focusables = qsa('a, button, [tabindex]:not([tabindex="-1"])', container).filter(el=>!el.hasAttribute('disabled'));
    if(focusables.length===0) return ()=>{};
    const first = focusables[0];
    const last = focusables[focusables.length-1];
    function onKey(e){
      if(e.key !== 'Tab') return;
      if(e.shiftKey){ if(document.activeElement===first){ e.preventDefault(); last.focus(); } }
      else { if(document.activeElement===last){ e.preventDefault(); first.focus(); } }
    }
    container.addEventListener('keydown', onKey);
    return ()=> container.removeEventListener('keydown', onKey);
  }

  function exposeAPI(api){ try{ window.MDRSidebar = api; }catch(_){ } }

  async function ensureSidebar(){
    if (qs('#mdr-drawer')) return qs('#mdr-drawer');
    let root = qs('#'+ROOT_ID);
    if(!root){ root = document.createElement('div'); root.id = ROOT_ID; document.body.appendChild(root); }
    try{
      const res = await fetch(PARTIAL_URL, { cache: 'no-store' });
      if(!res.ok) throw new Error('sidebar load failed');
      root.innerHTML = await res.text();
    }catch(_){ /* fail silent */ }
    return qs('#mdr-drawer');
  }

  function wireAuth(drawer){
    try{
      const btn = qs('#mdr-logout', drawer);
      if(!btn) return;
      if(isAuthed()){
        btn.hidden = false;
        btn.addEventListener('click', ()=>{
          try{ localStorage.removeItem('modar-auth'); localStorage.removeItem('modar-user'); }catch(_){ }
          location.href = 'login.html';
        });
      } else {
        btn.hidden = true;
      }
    }catch(_){ }
  }

  function init(){
    document.addEventListener('DOMContentLoaded', async ()=>{
      const burger = qs('#mdr-burger');
      const drawer = await ensureSidebar();
      if(!drawer){ return; }
      const backdrop = qs('#mdr-backdrop', drawer);
      const panel = qs('.mdr-panel', drawer);
      const closer = qs('#mdr-close', drawer);
      setActiveLinks(drawer);
      wireAuth(drawer);

      let lastFocus = null; let untrap = ()=>{};
      function open(){
        try{ sessionStorage.setItem(STATE_KEY, '1'); }catch(_){ }
        drawer.hidden = false; drawer.setAttribute('aria-expanded','true');
        lastFocus = document.activeElement; if(panel){ panel.setAttribute('tabindex','-1'); panel.focus(); }
        document.body.style.overflow = 'hidden';
        untrap = trapFocus(panel||drawer);
      }
      function close(){
        try{ sessionStorage.setItem(STATE_KEY, '0'); }catch(_){ }
        drawer.setAttribute('aria-expanded','false');
        setTimeout(()=>{ drawer.hidden = true; }, 200);
        document.body.style.overflow = '';
        untrap && untrap();
        if(lastFocus && lastFocus.focus) try{ lastFocus.focus(); }catch(_){ }
      }
      function toggle(){ (drawer.getAttribute('aria-expanded')==='true') ? close() : open(); }

      if(burger){ burger.addEventListener('click', (e)=>{ e.preventDefault(); toggle(); }); }
      if(backdrop){ backdrop.addEventListener('click', close); }
      if(closer){ closer.addEventListener('click', close); }
      document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') close(); });

      // Restore last state this page (optional)
      try{ if(sessionStorage.getItem(STATE_KEY)==='1'){ open(); } }catch(_){ }

      exposeAPI({ open, close, toggle });
    });
  }

  init();
})();
