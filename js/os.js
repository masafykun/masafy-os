/* MASAFY OS — os.js : boot / window manager / dock / menubar / widgets */
'use strict';
(function () {
  const M = window.MASAFY;

  /* ---------- i18n ---------- */
  M.lang = localStorage.getItem('masafy-os-lang') || 'ja';
  M.t = (k) => (M.I18N[M.lang] && M.I18N[M.lang][k]) || (M.I18N.ja[k] !== undefined ? M.I18N.ja[k] : k);

  M.setLang = function (l) {
    if (l !== 'ja' && l !== 'en') return;
    M.lang = l;
    localStorage.setItem('masafy-os-lang', l);
    document.documentElement.lang = l;
    renderMenubar();
    renderDock();
    renderIcons();
    renderWidget();
    // re-render open windows (terminal keeps its buffer)
    Object.keys(WM.windows).forEach((id) => {
      const app = M.APPS[id];
      const win = WM.windows[id];
      win.querySelector('.win-name').textContent = M.t('win.' + id);
      if (app && app.rerenderOnLang !== false) app.render(win.querySelector('.win-body'));
    });
    OSLog.log('lang → ' + l.toUpperCase());
  };

  /* ---------- event log ---------- */
  const OSLog = M.OSLog = {
    buf: [],
    listeners: [],
    log(msg) {
      const d = new Date();
      const ts = [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
      this.buf.push('[' + ts + '] ' + msg);
      if (this.buf.length > 300) this.buf.shift();
      this.listeners.forEach((fn) => { try { fn(); } catch (e) {} });
    },
  };

  /* ---------- toast ---------- */
  M.toast = function (msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 2600);
  };

  /* ---------- root unlock (CTF) ---------- */
  M.isRootUnlocked = () => localStorage.getItem('masafy-os-root') === '1';
  M.unlockRoot = function () {
    if (M.isRootUnlocked()) return false;
    localStorage.setItem('masafy-os-root', '1');
    renderDock();
    M.toast(M.t('toast.rootUnlocked'));
    OSLog.log('CTF flag accepted — ROOT unlocked 🔓');
    return true;
  };

  /* ---------- CTF scoreboard ---------- */
  M.ctf = {
    found() {
      try { return JSON.parse(localStorage.getItem('masafy-os-flags') || '[]'); }
      catch (e) { return []; }
    },
    isFound(id) { return this.found().includes(id); },
    allFound() { return M.CTF.order.every((id) => this.isFound(id)); },
    /* returns {isNew, all} */
    capture(id) {
      const f = this.found();
      if (f.includes(id)) return { isNew: false, all: this.allFound() };
      f.push(id);
      localStorage.setItem('masafy-os-flags', JSON.stringify(f));
      OSLog.log('CTF: flag captured — ' + id + ' (' + f.length + '/' + M.CTF.order.length + ')');
      M.toast(M.t('toast.flag') + id.toUpperCase() + ' (' + f.length + '/' + M.CTF.order.length + ')');
      M.unlockRoot();
      const all = this.allFound();
      if (all) {
        setTimeout(() => { M.toast(M.t('toast.master')); M.matrixRain(); }, 700);
        OSLog.log('CTF: ALL FLAGS CAPTURED — CTF MASTER 🏆');
      }
      // refresh ROOT window if open
      if (M.WM.windows.root) M.APPS.root.render(M.WM.windows.root.querySelector('.win-body'));
      return { isNew: true, all };
    },
  };
  // migration: pre-scoreboard visitors who already unlocked ROOT get recon credited
  if (M.isRootUnlocked() && M.ctf.found().length === 0) {
    localStorage.setItem('masafy-os-flags', JSON.stringify(['recon']));
  }

  /* ---------- matrix rain (CTF MASTER celebration) ---------- */
  M.matrixRain = function (durationMs) {
    if (document.getElementById('matrix-rain')) return;
    const cv = document.createElement('canvas');
    cv.id = 'matrix-rain';
    cv.style.cssText = 'position:fixed;inset:0;z-index:5000;pointer-events:none;';
    document.body.appendChild(cv);
    cv.width = window.innerWidth; cv.height = window.innerHeight;
    const ctx = cv.getContext('2d');
    const fs = 16, cols = Math.ceil(cv.width / fs);
    const drops = Array.from({ length: cols }, () => Math.floor(-Math.random() * 40));
    const glyphs = 'MASAFYOS01<>/#$%&*+=?ﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓ';
    const t0 = performance.now();
    const dur = durationMs || 6500;
    (function frame(now) {
      const el = now - t0;
      ctx.fillStyle = 'rgba(5,7,13,0.12)';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.font = fs + 'px monospace';
      for (let i = 0; i < cols; i++) {
        const ch = glyphs[Math.floor(Math.random() * glyphs.length)];
        ctx.fillStyle = Math.random() < 0.08 ? '#F4C544' : '#12B5A8';
        ctx.fillText(ch, i * fs, drops[i] * fs);
        drops[i] = drops[i] * fs > cv.height && Math.random() > 0.975 ? 0 : drops[i] + 1;
      }
      if (el < dur) requestAnimationFrame(frame);
      else {
        cv.style.transition = 'opacity 1s';
        cv.style.opacity = '0';
        setTimeout(() => cv.remove(), 1000);
      }
    })(t0);
  };

  /* ---------- window manager ---------- */
  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

  const WM = M.WM = {
    windows: {},   // appId -> element
    zTop: 10,
    count: 0,

    open(id) {
      const app = M.APPS[id];
      if (!app) return;
      if (this.windows[id]) {
        const w = this.windows[id];
        w.style.display = '';
        this.focus(w);
        renderDock();
        return;
      }
      const w = document.createElement('div');
      w.className = 'window' + (app.dark ? ' win-dark' : '');
      w.dataset.app = id;
      w.innerHTML =
        '<div class="win-title">' +
        '<span class="tl-btns">' +
        '<button class="tl tl-close" title="close"></button>' +
        '<button class="tl tl-min" title="minimize"></button>' +
        '<button class="tl tl-max" title="maximize"></button>' +
        '</span>' +
        '<span class="win-name"></span>' +
        '</div>' +
        '<div class="win-body"></div>' +
        '<div class="win-resize"></div>';
      w.querySelector('.win-name').textContent = M.t('win.' + id);

      // geometry
      const dt = document.getElementById('desktop');
      const dw = dt.clientWidth, dh = dt.clientHeight;
      const size = app.size || [640, 460];
      const ww = Math.min(size[0], dw - 24), wh = Math.min(size[1], dh - 24);
      const n = this.count++;
      w.style.width = ww + 'px';
      w.style.height = wh + 'px';
      let pos = app.place ? app.place(dw, dh, ww, wh) : null;
      if (!pos) pos = [60 + (n % 6) * 32, 30 + (n % 6) * 26];
      w.style.left = Math.max(10, Math.min(pos[0], dw - ww - 10)) + 'px';
      w.style.top = Math.max(8, Math.min(pos[1], dh - wh - 10)) + 'px';

      dt.appendChild(w);
      this.windows[id] = w;

      // controls
      w.querySelector('.tl-close').addEventListener('click', (e) => { e.stopPropagation(); this.close(id); });
      w.querySelector('.tl-min').addEventListener('click', (e) => { e.stopPropagation(); this.minimize(id); });
      w.querySelector('.tl-max').addEventListener('click', (e) => { e.stopPropagation(); this.toggleMax(id); });
      w.addEventListener('pointerdown', () => this.focus(w));
      this.enableDrag(w);
      this.enableResize(w);

      app.render(w.querySelector('.win-body'));
      if (app.onOpen) app.onOpen(w);
      this.focus(w);
      renderDock();
      OSLog.log('open: ' + id);
    },

    close(id) {
      const w = this.windows[id];
      if (!w) return;
      const app = M.APPS[id];
      if (app && app.onClose) app.onClose(w);
      w.remove();
      delete this.windows[id];
      renderDock();
      OSLog.log('close: ' + id);
    },

    minimize(id) {
      const w = this.windows[id];
      if (!w) return;
      w.style.display = 'none';
      renderDock();
      OSLog.log('minimize: ' + id);
    },

    toggleMax(id) {
      const w = this.windows[id];
      if (!w) return;
      if (w.dataset.max === '1') {
        w.dataset.max = '';
        w.style.left = w.dataset.oldL; w.style.top = w.dataset.oldT;
        w.style.width = w.dataset.oldW; w.style.height = w.dataset.oldH;
      } else {
        w.dataset.oldL = w.style.left; w.dataset.oldT = w.style.top;
        w.dataset.oldW = w.style.width; w.dataset.oldH = w.style.height;
        w.dataset.max = '1';
        w.style.left = '0px'; w.style.top = '0px';
        w.style.width = '100%'; w.style.height = '100%';
      }
      this.focus(w);
    },

    focus(w) {
      this.zTop += 1;
      w.style.zIndex = this.zTop;
      document.querySelectorAll('.window').forEach((x) => x.classList.toggle('focused', x === w));
    },

    enableDrag(w) {
      const bar = w.querySelector('.win-title');
      let sx, sy, ox, oy, dragging = false;
      bar.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.tl') || isMobile() || w.dataset.max === '1') return;
        dragging = true;
        sx = e.clientX; sy = e.clientY;
        ox = w.offsetLeft; oy = w.offsetTop;
        bar.setPointerCapture(e.pointerId);
      });
      bar.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dt = document.getElementById('desktop');
        let nl = ox + e.clientX - sx, nt = oy + e.clientY - sy;
        nl = Math.max(-w.offsetWidth + 80, Math.min(nl, dt.clientWidth - 80));
        nt = Math.max(0, Math.min(nt, dt.clientHeight - 36));
        w.style.left = nl + 'px'; w.style.top = nt + 'px';
      });
      const stop = () => { dragging = false; };
      bar.addEventListener('pointerup', stop);
      bar.addEventListener('pointercancel', stop);
    },

    enableResize(w) {
      const h = w.querySelector('.win-resize');
      let sx, sy, ow, oh, resizing = false;
      h.addEventListener('pointerdown', (e) => {
        if (isMobile() || w.dataset.max === '1') return;
        resizing = true;
        sx = e.clientX; sy = e.clientY;
        ow = w.offsetWidth; oh = w.offsetHeight;
        h.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      h.addEventListener('pointermove', (e) => {
        if (!resizing) return;
        w.style.width = Math.max(320, ow + e.clientX - sx) + 'px';
        w.style.height = Math.max(200, oh + e.clientY - sy) + 'px';
      });
      const stop = () => { resizing = false; };
      h.addEventListener('pointerup', stop);
      h.addEventListener('pointercancel', stop);
    },
  };

  /* ---------- menubar ---------- */
  function renderMenubar() {
    const left = document.getElementById('mb-left');
    left.innerHTML = '<button id="mb-logo"><span class="mb-dot"></span> ' + M.t('menubar.os') + '</button>';
    left.querySelector('#mb-logo').addEventListener('click', () => WM.open('about'));

    const right = document.getElementById('mb-right');
    right.innerHTML =
      '<button class="mb-lang' + (M.lang === 'ja' ? ' on' : '') + '" data-l="ja">JA</button>' +
      '<span class="mb-sep">|</span>' +
      '<button class="mb-lang' + (M.lang === 'en' ? ' on' : '') + '" data-l="en">EN</button>' +
      '<span id="mb-clock"></span>';
    right.querySelectorAll('.mb-lang').forEach((b) =>
      b.addEventListener('click', () => M.setLang(b.dataset.l)));
    tickClock();
  }

  function tickClock() {
    const el = document.getElementById('mb-clock');
    if (!el) return;
    const d = new Date();
    const jst = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    el.textContent = String(jst.getHours()).padStart(2, '0') + ':' + String(jst.getMinutes()).padStart(2, '0') + ' JST';
  }
  setInterval(tickClock, 15000);

  /* ---------- dock ---------- */
  const DOCK_ORDER = ['terminal', 'works', 'about', 'security', 'mail', 'console'];

  function renderDock() {
    const dock = document.getElementById('dock');
    const ids = DOCK_ORDER.concat(M.isRootUnlocked() ? ['root'] : []);
    dock.innerHTML = '';
    ids.forEach((id) => {
      const app = M.APPS[id];
      if (!app) return;
      const b = document.createElement('button');
      b.className = 'dock-item' + (WM.windows[id] ? ' running' : '');
      b.innerHTML = '<span class="dock-ico">' + app.icon + '</span><span class="dock-label"></span><span class="dock-dot"></span>';
      b.querySelector('.dock-label').textContent = M.t('dock.' + id);
      b.addEventListener('click', () => WM.open(id));
      dock.appendChild(b);
    });
  }

  /* ---------- desktop icons ---------- */
  function renderIcons() {
    const box = document.getElementById('icons');
    box.innerHTML = '';
    const defs = [
      ['📄', 'icon.readme', () => WM.open('about')],
      ['📁', 'icon.works', () => WM.open('works')],
      ['🚩', 'icon.flag', () => {
        WM.open('terminal');
        if (M.termHint) M.termHint();
      }],
    ];
    defs.forEach(([ico, key, fn]) => {
      const d = document.createElement('button');
      d.className = 'dicon';
      d.innerHTML = '<span class="dicon-ico">' + ico + '</span><span class="dicon-label"></span>';
      d.querySelector('.dicon-label').textContent = M.t(key);
      d.addEventListener('click', fn);
      box.appendChild(d);
    });
  }

  /* ---------- live widget ---------- */
  const widgetData = { gh: null, qiita: null, failed: false };

  function renderWidget() {
    const el = document.getElementById('widget');
    if (!el) return;
    let html = '<div class="wg-head"><span class="wg-live">●</span> ' + M.t('widget.live') + '</div>';
    if (widgetData.gh) {
      html += '<div class="wg-sec">🐙 ' + M.t('widget.github') + '</div>' +
        '<div class="wg-row"><b>' + widgetData.gh.public_repos + '</b> ' + M.t('widget.repos') +
        ' · <b>' + widgetData.gh.followers + '</b> ' + M.t('widget.followers') + '</div>';
    }
    if (widgetData.qiita && widgetData.qiita.length) {
      html += '<div class="wg-sec">📝 ' + M.t('widget.qiita') + '</div>';
      widgetData.qiita.forEach((it) => {
        html += '<a class="wg-item" href="' + it.url + '" target="_blank" rel="noopener">' + escapeHtml(it.title) + '</a>';
      });
    }
    if (!widgetData.gh && !widgetData.qiita) {
      html += '<div class="wg-row wg-dim">' + (widgetData.failed ? M.t('widget.offline') : '…') + '</div>';
    }
    el.innerHTML = html;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  M.escapeHtml = escapeHtml;

  async function loadWidget() {
    try {
      const r = await fetch('https://api.github.com/users/masafykun');
      if (r.ok) widgetData.gh = await r.json();
    } catch (e) { widgetData.failed = true; }
    try {
      const r = await fetch('https://qiita.com/api/v2/users/masafy/items?per_page=3');
      if (r.ok) {
        const items = await r.json();
        widgetData.qiita = items.map((i) => ({ title: i.title, url: i.url }));
      }
    } catch (e) { widgetData.failed = true; }
    renderWidget();
    OSLog.log('live widget: GitHub ' + (widgetData.gh ? 'OK' : 'NG') + ' / Qiita ' + (widgetData.qiita ? 'OK' : 'NG'));
  }

  /* ---------- boot ---------- */
  const BOOT_LINES = [
    'MASAFY BIOS v5.0.2026',
    'Copyright (c) 1998-2026 Masato Suzuki',
    '',
    'CPU  : Human — Security x AI x Maker (est. 1998) ... OK',
    'MEM  : 20+ live services ....................... OK',
    'DISK : /works — 30 projects mounted ............ OK',
    '',
    'Loading kernel modules:',
    '  security.ko ................................. loaded',
    '  ai.ko ....................................... loaded',
    '  maker.ko .................................... loaded',
    '',
    'Starting window manager ........................ OK',
    'Starting dock .................................. OK',
    'Hiding 4 flags in the filesystem ............... [REDACTED]',
    '',
    'Welcome to MASAFY OS.',
  ];

  function boot() {
    const overlay = document.getElementById('boot');
    const pre = document.getElementById('boot-lines');
    const skip = document.getElementById('boot-skip');
    skip.textContent = M.t('boot.skip');

    const fast = sessionStorage.getItem('masafy-os-booted') === '1';
    let i = 0, done = false;

    function finish() {
      if (done) return;
      done = true;
      sessionStorage.setItem('masafy-os-booted', '1');
      overlay.classList.add('boot-out');
      setTimeout(() => { overlay.remove(); afterBoot(); }, 450);
    }

    function step() {
      if (done) return;
      if (i >= BOOT_LINES.length) { setTimeout(finish, 320); return; }
      pre.textContent += BOOT_LINES[i] + '\n';
      i += 1;
      setTimeout(step, fast ? 12 : 65 + Math.random() * 70);
    }

    overlay.addEventListener('click', finish);
    window.addEventListener('keydown', finish, { once: true });
    step();
  }

  function afterBoot() {
    OSLog.log('boot complete — MASAFY OS 5.0');
    WM.open('about');
    if (!isMobile()) WM.open('terminal');
    // a wink for people who open DevTools
    console.log(
      '%c MASAFY OS %c\n\n' +
      'curious enough to open DevTools? good instinct.\n' +
      '4 flags are hidden in this OS — open the Terminal and type `flags`.\n' +
      'places worth a look: ls -a, /var/log, /bin\n',
      'background:#101725;color:#12B5A8;font-size:18px;font-weight:bold;padding:6px 14px;border-radius:6px;', ''
    );
  }

  /* ---------- init ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.lang = M.lang;
    renderMenubar();
    renderDock();
    renderIcons();
    renderWidget();
    loadWidget();
    boot();
  });
})();
