/* MASAFY OS — apps.js : app renderers (terminal lives in terminal.js) */
'use strict';
(function () {
  const M = window.MASAFY;
  M.APPS = M.APPS || {};
  const t = (k) => M.t(k);
  const esc = (s) => M.escapeHtml(s);

  const badgeClass = { LIVE: 'b-live', OSS: 'b-oss', STORE: 'b-store', LAB: 'b-lab', PRIVATE: 'b-priv' };

  function linksHtml(p) {
    if (!p.links.length) return '';
    return '<div class="pj-links">' + p.links.map(([ty, url]) =>
      '<a href="' + url + '" target="_blank" rel="noopener">' + M.LINK_LABELS[ty][M.lang] + '</a>'
    ).join('') + '</div>';
  }

  function projectCard(p) {
    return (
      '<div class="pj-card" data-id="' + p.id + '">' +
      '<div class="pj-head"><span class="pj-name">' + esc(p.name) + '</span>' +
      '<span class="pj-badge ' + (badgeClass[p.badge] || '') + '">' + p.badge + '</span></div>' +
      '<div class="pj-desc">' + esc(p[M.lang] || p.ja) + '</div>' +
      linksHtml(p) +
      '<div class="pj-id">$ open ' + p.id + '</div>' +
      '</div>'
    );
  }

  /* ---------------- About ---------------- */
  M.APPS.about = {
    icon: '🙋', size: [620, 560], place: (dw) => [Math.max(16, dw * 0.06), 22],
    render(el) {
      el.innerHTML =
        '<div class="about">' +
        '<div class="about-head">' +
        '<div class="about-avatar">M</div>' +
        '<div><div class="about-name">' + t('about.name') + '</div>' +
        '<div class="about-role">' + t('about.role') + '</div></div>' +
        '</div>' +
        '<p class="about-lead">' + t('about.lead') + '</p>' +
        '<div class="pillars">' +
        ['p1', 'p2', 'p3'].map((p) =>
          '<div class="pillar"><div class="pillar-h">' + t('about.' + p + '.h') + '</div>' +
          '<div class="pillar-b">' + t('about.' + p + '.b') + '</div></div>'
        ).join('') +
        '</div>' +
        '<div class="sec-h">' + t('about.hl.h') + '</div>' +
        '<ul class="hl-list">' +
        ['1', '2', '3', '4'].map((n) => '<li>' + t('about.hl.' + n) + '</li>').join('') +
        '</ul>' +
        '<div class="sec-h">' + t('about.edu.h') + '</div>' +
        '<p class="about-p">' + t('about.edu.b') + '</p>' +
        '<div class="sec-h">' + t('about.link.h') + '</div>' +
        '<p class="about-p">' + t('about.link.b') + '</p>' +
        '<div class="about-more">' +
        '<a href="https://masafy.org/" target="_blank" rel="noopener">↗ masafy.org</a>' +
        '<a href="https://me.1qaz.jp/" target="_blank" rel="noopener">↗ me.1qaz.jp</a>' +
        '<a href="https://github.com/masafykun" target="_blank" rel="noopener">↗ GitHub</a>' +
        '</div>' +
        '</div>';
    },
  };

  /* ---------------- Works ---------------- */
  let worksFilter = 'all';
  M.APPS.works = {
    icon: '📁', size: [780, 540], place: (dw, dh, ww) => [Math.max(16, (dw - ww) / 2), 40],
    render(el) {
      const cats = M.CATS;
      const side =
        '<div class="works-side">' +
        '<button class="wf' + (worksFilter === 'all' ? ' on' : '') + '" data-f="all">✦ ' + t('works.all') +
        ' <span class="wf-n">' + M.PROJECTS.length + '</span></button>' +
        cats.map((c) => {
          const n = M.PROJECTS.filter((p) => p.cat === c.id).length;
          return '<button class="wf' + (worksFilter === c.id ? ' on' : '') + '" data-f="' + c.id + '">' +
            c.icon + ' ' + c[M.lang] + ' <span class="wf-n">' + n + '</span></button>';
        }).join('') +
        '</div>';
      const list = M.PROJECTS.filter((p) => worksFilter === 'all' || p.cat === worksFilter);
      const grid = '<div class="works-grid">' + list.map(projectCard).join('') + '</div>';
      el.innerHTML = '<div class="works">' + side +
        '<div class="works-main"><div class="works-hint">' + t('works.hint') + '</div>' + grid + '</div></div>';
      el.querySelectorAll('.wf').forEach((b) =>
        b.addEventListener('click', () => { worksFilter = b.dataset.f; M.APPS.works.render(el); }));
    },
  };

  /* ---------------- Security ---------------- */
  M.APPS.security = {
    icon: '🛡️', size: [640, 520], place: (dw, dh, ww) => [Math.max(16, dw - ww - 60), 50],
    render(el) {
      const secWorks = M.PROJECTS.filter((p) => p.cat === 'sec');
      el.innerHTML =
        '<div class="secapp">' +
        '<p class="about-lead">' + t('sec.lead') + '</p>' +
        '<div class="sec-h">' + t('sec.patents.h') + '</div>' +
        '<div class="pat-card"><div class="pat-no">JP 2025-056374</div><div>' + t('sec.pat1') + '</div>' +
        '<a href="https://patents.google.com/patent/JP2025056374A/ja" target="_blank" rel="noopener">' + t('sec.pat1.link') + '</a></div>' +
        '<div class="pat-card"><div class="pat-no">JP APP 2026-121582 <span class="pat-pending">PATENT PENDING</span></div><div>' + t('sec.pat2') + '</div>' +
        '<a href="https://masafy.org/patent.html" target="_blank" rel="noopener">' + t('sec.pat2.link') + '</a></div>' +
        '<div class="sec-h">' + t('sec.works.h') + '</div>' +
        '<div class="works-grid">' + secWorks.map(projectCard).join('') + '</div>' +
        '<div class="sec-h">' + t('sec.ctf.h') + '</div>' +
        '<p class="about-p ctf-tease">' + t('sec.ctf.b') + '</p>' +
        '</div>';
    },
  };

  /* ---------------- Mail / Contact ---------------- */
  M.APPS.mail = {
    icon: '✉️', size: [460, 440],
    render(el) {
      el.innerHTML =
        '<div class="mail">' +
        '<p class="about-lead">' + t('mail.lead') + '</p>' +
        M.CONTACTS.map(([ico, label, url, disp]) =>
          '<a class="mail-row" href="' + url + '" target="_blank" rel="noopener">' +
          '<span class="mail-ico">' + ico + '</span>' +
          '<span class="mail-label">' + label + '</span>' +
          '<span class="mail-disp">' + disp + '</span></a>'
        ).join('') +
        '</div>';
    },
  };

  /* ---------------- Console ---------------- */
  M.APPS.console = {
    icon: '📟', size: [560, 340], dark: true,
    place: (dw, dh, ww, wh) => [16, dh - wh - 16],
    render(el) {
      el.innerHTML = '<div class="console-lead">' + t('console.lead') + '</div><pre class="console-log"></pre>';
      const pre = el.querySelector('.console-log');
      const paint = () => {
        pre.textContent = M.OSLog.buf.join('\n');
        pre.scrollTop = pre.scrollHeight;
      };
      paint();
      this._listener = paint;
      M.OSLog.listeners.push(paint);
    },
    onClose() {
      const i = M.OSLog.listeners.indexOf(this._listener);
      if (i >= 0) M.OSLog.listeners.splice(i, 1);
    },
  };

  /* ---------------- ROOT (CTF reward) ---------------- */
  M.APPS.root = {
    icon: '🔓', size: [560, 430], dark: true,
    render(el) {
      el.innerHTML =
        '<div class="rootapp">' +
        '<div class="root-h">' + t('root.h') + '</div>' +
        '<pre class="root-flag">' + M.CTF.flag + '</pre>' +
        '<p>' + t('root.b1') + '</p>' +
        '<p>' + t('root.b2') + '</p>' +
        '<p>' + t('root.b3') + '</p>' +
        '<div class="about-more">' +
        '<a href="https://github.com/masafykun/masafy-os" target="_blank" rel="noopener">↗ masafykun/masafy-os</a>' +
        '<a href="https://github.com/masafykun/masafee-ctf-7b" target="_blank" rel="noopener">↗ masafee-ctf-7b</a>' +
        '</div>' +
        '</div>';
    },
  };
})();
