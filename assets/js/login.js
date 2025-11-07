// assets/js/login.js - Demo auth flow with validation and remember-username (RTL)
(function(){
  'use strict';
  const $ = (s,r=document)=>r.querySelector(s);
  const form = $('#login-form');
  if(!form) return;
  const alertEl = $('#alert');
  const emailEl = $('#email');
  const passEl = $('#password');
  const rememberEl = $('#remember');
  const toggleBtn = $('#togglePass');
  const errEmail = document.getElementById('err-email');
  const errPass = document.getElementById('err-password');

  // Prefill last username
  try{ const last = localStorage.getItem('modar-last-username'); if(last){ emailEl.value = last; } }catch(_){ }

  // If already authed, redirect to next
  const params = new URLSearchParams(location.search);
  const next = params.get('next') || 'analytics.html';
  try{ if(localStorage.getItem('modar-auth')){ location.replace(next); return; } }catch(_){ }

  // Toggle password visibility
  toggleBtn?.addEventListener('click',()=>{
    const show = passEl.type === 'password';
    passEl.type = show ? 'text' : 'password';
    toggleBtn.textContent = show ? 'إخفاء' : 'إظهار';
    toggleBtn.setAttribute('aria-pressed', String(show));
  });

  // Field-level helpers
  const setError = (el, msg, fieldBox)=>{
    alertEl.textContent = msg || '';
    alertEl.classList.toggle('show', !!msg);
    if(el) el.setAttribute('aria-invalid', String(!!msg));
    if(fieldBox){ fieldBox.textContent = msg || ''; fieldBox.classList.toggle('show', !!msg); }
  };

  function validate(){
    const email = emailEl.value.trim();
    const pass = passEl.value;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const passOk = (pass||'').length >= 8;
    // clear previous
    setError(emailEl,'', errEmail); setError(passEl,'', errPass);
    if(!email){ setError(emailEl,'البريد الإلكتروني مطلوب.', errEmail); return false; }
    if(!emailOk){ setError(emailEl,'الرجاء إدخال بريد إلكتروني صحيح.', errEmail); return false; }
    if(!pass){ setError(passEl,'كلمة المرور مطلوبة.', errPass); return false; }
    if(!passOk){ setError(passEl,'كلمة المرور يجب ألا تقل عن 8 أحرف.', errPass); return false; }
    setError(null,'');
    return true;
  }

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const btn = form.querySelector('.btn-primary');
    if(btn) btn.disabled = true;
    if(!validate()){ if(btn) btn.disabled = false; return; }

    const email = emailEl.value.trim();
    const pass = passEl.value;
    // Demo credentials (not for production)
    const DEMO_USER = 'demo@modar.sa';
    const DEMO_PASS = '12345678';

    if(email !== DEMO_USER || pass !== DEMO_PASS){
      setError(null,'بيانات الدخول غير صحيحة. يرجى التحقق من البريد وكلمة المرور.');
      if(btn) btn.disabled = false;
      return;
    }

    // Remember username
    try{ if(rememberEl?.checked){ localStorage.setItem('modar-last-username', email); } }catch(_){ }
    // Set auth token (normalized to 'true') and store username for UI
    try{ localStorage.setItem('modar-auth', 'true'); localStorage.setItem('modar-user', email); }catch(_){ }
    location.href = next;
  });
})();
