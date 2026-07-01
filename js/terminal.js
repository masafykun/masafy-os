/* MASAFY OS — terminal.js : interactive terminal app + CTF */
'use strict';
(function () {
  const M = window.MASAFY;
  M.APPS = M.APPS || {};

  const state = { history: [], hIdx: -1, out: null, input: null };

  const NEOFETCH = [
    ' ███╗   ███╗ ',
    ' ████╗ ████║   masafy@masafy-os',
    ' ██╔████╔██║   ----------------',
    ' ██║╚██╔╝██║   OS      : MASAFY OS 5.0 (ja/en)',
    ' ██║ ╚═╝ ██║   Host    : Masato Suzuki (MASAFY)',
    ' ╚═╝     ╚═╝   Kernel  : security-ai-maker',
    '               Uptime  : since 1998 (est.)',
    '               Shell   : this one. hand-written.',
    '               Packages: 30 projects, 20+ live services',
    '               GPU     : RTX 3060 12GB (home server)',
    '               Patents : 2 filed (inventor)',
    '               Theme   : cream x teal x ink',
  ].join('\n');

  const MASAFY_ART = [
    '      /\\_____/\\        MASAFY',
    '     /  o   o  \\       the red panda',
    '    ( ==  ^  == )      -------------',
    '     )         (       official mascot of',
    '    (           )      masafy.org',
    '   ( (  )   (  ) )     (ascii tribute ver.)',
    '  (__(__)___(__)__)',
  ].join('\n');

  function print(text, cls) {
    const div = document.createElement('div');
    div.className = 'tl-line' + (cls ? ' ' + cls : '');
    div.textContent = text;
    state.out.appendChild(div);
    state.out.scrollTop = state.out.scrollHeight;
  }

  function printPre(text, cls) {
    const pre = document.createElement('pre');
    pre.className = 'tl-pre' + (cls ? ' ' + cls : '');
    pre.textContent = text;
    state.out.appendChild(pre);
    state.out.scrollTop = state.out.scrollHeight;
  }

  function prompt(cmd) {
    const div = document.createElement('div');
    div.className = 'tl-line tl-cmd';
    div.innerHTML = '<span class="tl-prompt">masafy@os:~$</span> ';
    div.appendChild(document.createTextNode(cmd));
    state.out.appendChild(div);
  }

  const HELP = {
    ja: [
      ['help', 'このヘルプ'],
      ['whoami', '私はだれ？'],
      ['ls / ls works', 'ファイル・作品一覧'],
      ['open <id>', '作品やアプリを開く (例: open voyage)'],
      ['cat <file>', 'ファイルを読む'],
      ['neofetch', 'システム情報'],
      ['contact', '連絡先'],
      ['lang ja|en', '言語切替'],
      ['nmap', 'ポートスキャン…？'],
      ['clear / exit', '画面クリア / 終了'],
    ],
    en: [
      ['help', 'this help'],
      ['whoami', 'who am I?'],
      ['ls / ls works', 'list files / projects'],
      ['open <id>', 'open a project or app (e.g. open voyage)'],
      ['cat <file>', 'read a file'],
      ['neofetch', 'system info'],
      ['contact', 'contact links'],
      ['lang ja|en', 'switch language'],
      ['nmap', 'a port scan…?'],
      ['clear / exit', 'clear / quit'],
    ],
  };

  function run(raw) {
    const cmd = raw.trim();
    if (!cmd) return;
    state.history.push(cmd);
    state.hIdx = state.history.length;
    prompt(cmd);
    M.OSLog.log('term: ' + cmd);

    const [c, ...rest] = cmd.split(/\s+/);
    const arg = rest.join(' ');

    switch (c) {
      case 'help': {
        HELP[M.lang].forEach(([a, b]) => print('  ' + a.padEnd(14) + ' ' + b));
        break;
      }
      case 'whoami':
        print('Masato Suzuki (MASAFY) — Security × AI × Maker');
        print(M.lang === 'ja' ? 'セキュリティエンジニア。守る・自動化する・つくる。' : 'Security engineer. Protect, automate, build.');
        break;
      case 'ls': {
        if (rest[0] === 'works' || rest[0] === 'works/') {
          M.CATS.forEach((cat) => {
            const ids = M.PROJECTS.filter((p) => p.cat === cat.id).map((p) => p.id).join('  ');
            print(cat.icon + ' ' + cat[M.lang] + ':', 'tl-dim');
            print('   ' + ids);
          });
          print('');
          print(M.lang === 'ja' ? 'open <id> で開けます' : 'use: open <id>', 'tl-dim');
        } else {
          print('works/   readme.txt   flag.txt');
        }
        break;
      }
      case 'open': {
        if (!arg) { print('usage: open <id>   (ls works)'); break; }
        if (M.APPS[arg]) { M.WM.open(arg); print('→ ' + arg); break; }
        const p = M.PROJECTS.find((x) => x.id === arg.toLowerCase());
        if (!p) { print('open: not found: ' + arg + '  (ls works)', 'tl-err'); break; }
        if (p.links.length) {
          window.open(p.links[0][1], '_blank', 'noopener');
          print('→ ' + p.links[0][1]);
        } else {
          print(p.name + ' — ' + (p[M.lang] || p.ja));
          print(M.lang === 'ja' ? '(非公開・ラボ運用のためリンクなし)' : '(private / lab — no public link)', 'tl-dim');
        }
        break;
      }
      case 'cat': {
        if (arg === 'flag.txt') {
          print('cat: flag.txt: Permission denied', 'tl-err');
          print(M.lang === 'ja' ? 'hint: ポートが開いてないか調べてみたら？ (`nmap`)' : 'hint: maybe scan for open ports? (`nmap`)', 'tl-dim');
        } else if (arg === 'readme.txt') {
          print('MASAFY OS — a portfolio you can operate.');
          print(M.lang === 'ja' ? '外部ライブラリゼロ、vanilla JSフルスクラッチ。' : 'Zero external libraries, hand-written vanilla JS.');
          print('src: https://github.com/masafykun/masafy-os');
        } else {
          print('cat: ' + (arg || '?') + ': No such file', 'tl-err');
        }
        break;
      }
      case 'neofetch':
        printPre(arg === '--masafy' ? MASAFY_ART : NEOFETCH, 'tl-teal');
        break;
      case 'contact':
        M.CONTACTS.forEach(([ico, label, url, disp]) => print('  ' + ico + ' ' + label.padEnd(13) + disp));
        break;
      case 'lang':
        if (arg === 'ja' || arg === 'en') { M.setLang(arg); print('lang → ' + arg); }
        else print('usage: lang ja|en');
        break;
      case 'date':
        print(new Date().toString());
        break;
      case 'uname':
        print(rest[0] === '-a'
          ? 'MASAFY-OS 5.0.2026 masafy-os x86_hito #1 SMP est.1998 JST'
          : 'MASAFY-OS');
        break;
      case 'sudo':
        print(M.lang === 'ja'
          ? 'masafy is not in the sudoers file. この件は MASAFY に報告されます。'
          : 'masafy is not in the sudoers file. This incident will be reported to MASAFY.', 'tl-err');
        break;
      case 'nmap': {
        printPre(
          'Starting Nmap ( https://os.1qaz.jp )\n' +
          'Nmap scan report for masafy-os (127.0.0.1)\n' +
          'PORT      STATE    SERVICE\n' +
          '22/tcp    filtered ssh\n' +
          '80/tcp    open     http\n' +
          '443/tcp   open     https\n' +
          '31337/tcp open     shadow-gate   <-- ?!\n' +
          '\nNmap done: 1 host up.');
        print(M.lang === 'ja' ? 'hint: `connect 31337`' : 'hint: try `connect 31337`', 'tl-dim');
        break;
      }
      case 'connect': {
        if (arg === '31337') {
          printPre(
            '== SHADOW GATE ==\n' +
            'unauthorized access detected. leaking token before shutdown...\n' +
            'token: ' + M.CTF.b64);
          print(M.lang === 'ja' ? 'hint: これ、base64っぽくない？ → `base64 -d <token>`' : 'hint: looks like base64… → `base64 -d <token>`', 'tl-dim');
        } else {
          print('connect: connection refused' + (arg ? ' (port ' + arg + ')' : ''), 'tl-err');
        }
        break;
      }
      case 'base64':
      case 'decode': {
        const s = (c === 'base64' && rest[0] === '-d') ? rest.slice(1).join('') : rest.join('');
        if (!s) { print('usage: base64 -d <string>'); break; }
        try {
          const dec = atob(s);
          print(dec, 'tl-gold');
          if (dec === M.CTF.flag) {
            print(M.lang === 'ja' ? 'それがフラグです！ → `submit ' + dec + '`' : 'That is the flag! → `submit ' + dec + '`', 'tl-dim');
          }
        } catch (e) {
          print('base64: invalid input', 'tl-err');
        }
        break;
      }
      case 'submit': {
        if (arg === M.CTF.flag) {
          printPre(
            '  ██████████████████████████\n' +
            '  █  ACCESS GRANTED — root  █\n' +
            '  ██████████████████████████', 'tl-teal');
          const first = M.unlockRoot();
          if (!first) print(M.lang === 'ja' ? '(すでにROOT解放済み)' : '(ROOT already unlocked)', 'tl-dim');
          M.WM.open('root');
        } else if (arg.startsWith('FLAG{')) {
          print('submit: wrong flag. keep digging.', 'tl-err');
        } else {
          print('usage: submit FLAG{...}');
        }
        break;
      }
      case 'history':
        state.history.forEach((h, i) => print('  ' + String(i + 1).padStart(3) + '  ' + h));
        break;
      case 'echo':
        print(arg);
        break;
      case 'clear':
        state.out.innerHTML = '';
        break;
      case 'exit':
        M.WM.close('terminal');
        break;
      case 'rm':
        print(M.lang === 'ja' ? 'rm: 危険コマンドガードにブロックされました（本物のサーバーでも同じ仕組みで守っています）' : 'rm: blocked by the dangerous-command guard (my real servers use the same idea).', 'tl-err');
        break;
      default:
        print(c + ': command not found  (try `help`)', 'tl-err');
    }
  }

  M.termHint = function () {
    if (!state.out) return;
    print('');
    print(M.lang === 'ja' ? '# flag.txt が読めない…？ まずは `nmap` かな。' : '# can\'t read flag.txt…? maybe start with `nmap`.', 'tl-dim');
  };

  M.APPS.terminal = {
    icon: '🖥️', size: [640, 420], dark: true, rerenderOnLang: false,
    place: (dw, dh, ww, wh) => [dw - ww - 40, dh - wh - 40],
    render(el) {
      el.innerHTML =
        '<div class="term">' +
        '<div class="term-out"></div>' +
        '<div class="term-inline"><span class="tl-prompt">masafy@os:~$</span>' +
        '<input class="term-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" />' +
        '</div></div>';
      state.out = el.querySelector('.term-out');
      state.input = el.querySelector('.term-input');

      print('MASAFY OS 5.0 — tty1');
      print(M.lang === 'ja' ? '`help` でコマンド一覧。作品は `ls works` → `open <id>`。' : 'Type `help` for commands. Projects: `ls works` → `open <id>`.', 'tl-dim');
      print('');

      state.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          run(state.input.value);
          state.input.value = '';
        } else if (e.key === 'ArrowUp') {
          if (state.hIdx > 0) { state.hIdx -= 1; state.input.value = state.history[state.hIdx] || ''; }
          e.preventDefault();
        } else if (e.key === 'ArrowDown') {
          if (state.hIdx < state.history.length) { state.hIdx += 1; state.input.value = state.history[state.hIdx] || ''; }
          e.preventDefault();
        }
      });
      el.addEventListener('click', () => state.input.focus());
      setTimeout(() => state.input.focus(), 50);
    },
  };
})();
