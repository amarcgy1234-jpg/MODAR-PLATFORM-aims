document.addEventListener('DOMContentLoaded', async () => {
  // إدراج الهيدر والفوتر
  const incs = document.querySelectorAll('[data-include]');
  await Promise.all([...incs].map(async el=>{
    const url = el.getAttribute('data-include');
    const html = await fetch(url).then(r=>r.text());
    el.innerHTML = html;
  }));

  // تمييز الرابط النشط
  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.site-nav a').forEach(a=>{
    const href = (a.getAttribute('href')||'').toLowerCase();
    if (href === path) a.classList.add('active');
  });
});
