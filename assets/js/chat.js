/* chat.js
   Loads chat.mock.json and binds chat UI dynamically.
   To switch to production: replace the fetch of assets/data/chat.mock.json with your API call
   that returns { participant:{name,avatar}, primary, highlight, messages:[{who:'mine'|'theirs', text:string}] }.
*/
(function(){
  'use strict';
  const $ = (s,r=document)=>r.querySelector(s);
  const titleEl = $('#chat-title');
  const avatarEl = $('.chat-avatar');
  const primaryEl = $('#msg-primary');
  const highlightEl = $('#msg-highlight');
  const threadEl = $('#chat-thread');
  const inputEl = $('#chat-text');
  const btnSend = $('#btn-send');
  const btnAdd = $('#btn-add');
  const DRAFT_KEY = 'modar-chat-draft';

  function appendMsg(who, text){
    if(!threadEl) return;
    const div = document.createElement('div');
    div.className = 'bubble ' + (who==='mine'?'mine':'theirs');
    div.textContent = text;
    threadEl.appendChild(div);
    threadEl.scrollTop = threadEl.scrollHeight;
  }

  async function loadData(){
    try{
      const res = await fetch('assets/data/chat.mock.json', {cache:'no-cache'});
      if(!res.ok) throw new Error('فشل تحميل بيانات المحادثة');
      const data = await res.json();
      bindData(data);
    }catch(err){
      console.warn(err);
      // minimal safe fallback
      bindData({ participant:{name:'محمد',avatar:'assets/img/Muhammed.jpg'}, primary:'', highlight:'', messages:[] });
    }
  }

  function bindData(d){
    // header & avatar
    const name = d?.participant?.name || '';
    const avatar = d?.participant?.avatar || 'assets/img/Muhammed.jpg';
    if(titleEl) titleEl.textContent = name;
    if(avatarEl){ avatarEl.src = avatar; avatarEl.alt = name; }
    // primary & highlight
    if(primaryEl) primaryEl.textContent = d?.primary || '';
    if(highlightEl) highlightEl.textContent = d?.highlight || '';
    // thread
    threadEl.innerHTML = '';
    (d?.messages||[]).forEach(m=> appendMsg(m.who, m.text));
  }

  function send(){
    const text = (inputEl.value||'').trim();
    if(!text) return;
    appendMsg('mine', text);
    inputEl.value = '';
    try{ sessionStorage.removeItem(DRAFT_KEY); }catch(_){ }
    // Optional: bot stub
    setTimeout(()=> appendMsg('theirs', 'تم الاستلام ✅'), 250);
  }

  function handleKey(e){
    if(e.key === 'Enter'){
      if(e.shiftKey){
        // allow newline
        return;
      }
      e.preventDefault();
      send();
    }
  }

  function persistDraft(){
    try{ sessionStorage.setItem(DRAFT_KEY, inputEl.value); }catch(_){ }
  }

  function restoreDraft(){
    try{ const v = sessionStorage.getItem(DRAFT_KEY); if(v){ inputEl.value = v; } }catch(_){ }
  }

  function onAdd(){
    // Stubbed action menu placeholder
    alert('إضافة مرفق / إجراء (قريبًا)');
  }

  document.addEventListener('DOMContentLoaded', () => {
    restoreDraft();
    loadData();
    inputEl?.addEventListener('keydown', handleKey);
    inputEl?.addEventListener('input', persistDraft);
    btnSend?.addEventListener('click', send);
    btnAdd?.addEventListener('click', onAdd);
  });
})();
