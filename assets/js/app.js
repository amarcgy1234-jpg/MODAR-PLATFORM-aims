// assets/js/app.js
// وظائف عامة للموقع + تهيئة بسيطة للواجهة

(function () {
  "use strict";

  // Helpers
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // تمييز رابط الصفحة الحالية في الهيدر
  function setActiveNav() {
    const here = location.pathname.split("/").pop() || "index.html";
    const links = $$(".site-nav a");
    links.forEach((a) => a.classList.remove("active"));
    const match =
      links.find((a) => (a.getAttribute("href") || "").endsWith(here)) ||
      links.find((a) => a.getAttribute("href") === "index.html");
    if (match) {
      match.classList.add("active");
      match.setAttribute("aria-current", "page");
    }
  }

  // تمرير ناعم للروابط الداخلية #hash
  function enableSmoothScroll() {
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href").slice(1);
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
        history.replaceState(null, "", `#${id}`);
      }
    });
  }

  // فتح الروابط الخارجية في تبويب جديد
  function externalLinksTargetBlank() {
    const originHost = location.hostname.replace(/^www\./, "");
    $$("a[href^='http']").forEach((a) => {
      try {
        const u = new URL(a.href);
        const host = u.hostname.replace(/^www\./, "");
        if (host && host !== originHost) {
          a.target = "_blank";
          a.rel = "noopener noreferrer";
        }
      } catch (_) {}
    });
  }

  // وضع خصائص صغيرة في نافذة عامة (اختياري)
  window.Modar = Object.assign(window.Modar || {}, {
    formatRiyal(n) {
      return (n || 0).toLocaleString("ar-SA");
    },
    select(selector, root) {
      return $(selector, root);
    },
    selectAll(selector, root) {
      return $$(selector, root);
    },
  });

  // Init
  document.addEventListener("DOMContentLoaded", () => {
    setActiveNav();
    enableSmoothScroll();
    externalLinksTargetBlank();

    // About section fade-in (subtle opacity animation)
    try {
      const sec = document.querySelector('.about-modar');
      if (sec) {
        const on = () => sec.classList.add('is-visible');
        // Use IntersectionObserver for no-jank entry; fallback to immediate
        if ('IntersectionObserver' in window) {
          const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => { if (e.isIntersecting) { on(); io.disconnect(); } });
          }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
          io.observe(sec);
        } else {
          on();
        }
      }
    } catch (_) {}

    // Reveal-once animation for cards/components; respects reduced motion
    try{
      const prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const els = Array.from(document.querySelectorAll('.reveal-once'));
      if(prefersReduce){ els.forEach(el=> el.classList.add('is-visible')); }
      else if('IntersectionObserver' in window){
        const io = new IntersectionObserver((entries)=>{
          entries.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add('is-visible'); io.unobserve(en.target); } });
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
        els.forEach(el=> io.observe(el));
      } else {
        els.forEach(el=> el.classList.add('is-visible'));
      }
    }catch(_){ }

    // Global print handler: buttons/links with [data-print]
    try{
      document.addEventListener('click', (e)=>{
        const btn = e.target.closest('[data-print]');
        if(!btn) return;
        e.preventDefault();
        window.print();
      });
    }catch(_){ }
  });
})();