// assets/js/include.js
document.addEventListener('DOMContentLoaded', async () => {
  // إدراج الأجزاء المشار إليها بـ data-include
  const incs = document.querySelectorAll('[data-include]');
  await Promise.all(
    Array.from(incs).map(async (el) => {
      const url = el.getAttribute('data-include');
      if (!url) return;
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`Failed to load ${url}`);
        const html = await res.text();
        el.innerHTML = html;
      } catch (err) {
        console.warn('Include error:', err);
        el.innerHTML = '';
      }
    })
  );

  // حراسة الصفحات المحمية: إعادة توجيه غير المسجلين
  try {
    // Guard should NOT run on public pages, only internal ones
    const publicPages = new Set(['index.html', 'login.html', 'privacy.html', 'support.html', 'about.html']);
    const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const isPublic = publicPages.has(path) || path === '';
    const authed = !!localStorage.getItem('modar-auth');
    if (!isPublic && !authed) {
      const next = encodeURIComponent(path + location.search + location.hash);
      location.replace(`login.html?next=${next}`);
      return;
    }
  } catch (_) { /* تجاهل أخطاء الوصول إلى localStorage */ }

  // بعد الإدراج: تحديد الرابط النشط في الهيدر
  try {
    const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    document.querySelectorAll('.site-nav a').forEach((a) => {
      const href = (a.getAttribute('href') || '').split('#')[0].split('?')[0].toLowerCase();
      a.classList.toggle('active', href === current || (current === '' && href === 'index.html'));
      if (a.classList.contains('active')) a.setAttribute('aria-current', 'page');
    });
  } catch (e) {
    console.warn('Active link marking failed:', e);
  }

  // إشعار مخصص لإتمام الإدراج (يمكن أن تسمعه سكربتات أخرى)
  document.dispatchEvent(new CustomEvent('includes:ready'));
});