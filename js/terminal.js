/* MASAFY OS — terminal.js : interactive terminal app + 4-flag CTF */
'use strict';
(function () {
  const M = window.MASAFY;
  M.APPS = M.APPS || {};

  const state = { history: [], hIdx: -1, out: null, input: null };

  /* ---------- codec helpers (flags are encoded at runtime) ---------- */
  const rot13 = (s) => s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
  const hexEnc = (s) => Array.from(s).map((c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  const hexDec = (s) => {
    const clean = s.replace(/[^0-9a-fA-F]/g, '');
    if (!clean || clean.length % 2) return null;
    let out = '';
    for (let i = 0; i < clean.length; i += 2) out += String.fromCharCode(parseInt(clean.slice(i, i + 2), 16));
    return out;
  };
  const rev = (s) => Array.from(s).reverse().join('');

  const FLAGS = () => M.CTF.flags;
  const ja = () => M.lang === 'ja';

  const NEOFETCH = [
    ' ███╗   ███╗ ',
    ' ████╗ ████║   masafy@masafy-os',
    ' ██╔████╔██║   ----------------',
    ' ██║╚██╔╝██║   OS      : MASAFY OS 5.0 (ja/en)',
    ' ██║ ╚═╝ ██║   Host    : Masato Suzuki (MASAFY)',
    ' ╚═╝     ╚═╝   Kernel  : security-ai-maker',
    '               Uptime  : since 1998 (est.)',
    '               Shell   : this one. hand-written.',
    '               Packages: 35 projects, 20+ live services',
    '               GPU     : RTX 3060 12GB (home server)',
    '               Patents : 2 filed (inventor)',
    '               CTF     : 4 flags hidden (`flags`)',
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

  /* ---------- output helpers ---------- */
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
      ['ls [-a] [dir]', 'ファイル・作品一覧'],
      ['open <id>', '作品やアプリを開く (例: open voyage)'],
      ['cat <file>', 'ファイルを読む'],
      ['neofetch', 'システム情報'],
      ['contact', '連絡先'],
      ['lang ja|en', '言語切替'],
      ['flags', '🚩 CTFスコアボード'],
      ['nmap', 'ポートスキャン…？'],
      ['clear / exit', '画面クリア / 終了'],
    ],
    en: [
      ['help', 'this help'],
      ['whoami', 'who am I?'],
      ['ls [-a] [dir]', 'list files / projects'],
      ['open <id>', 'open a project or app (e.g. open voyage)'],
      ['cat <file>', 'read a file'],
      ['neofetch', 'system info'],
      ['contact', 'contact links'],
      ['lang ja|en', 'switch language'],
      ['flags', '🚩 CTF scoreboard'],
      ['nmap', 'a port scan…?'],
      ['clear / exit', 'clear / quit'],
    ],
  };

  /* ---------- CTF: submit ---------- */
  function submitFlag(arg) {
    const entry = Object.entries(FLAGS()).find(([, v]) => v.flag === arg);
    if (!entry) {
      if (arg.startsWith('FLAG{')) print('submit: wrong flag. keep digging.', 'tl-err');
      else print('usage: submit FLAG{...}');
      return;
    }
    const [id] = entry;
    const res = M.ctf.capture(id);
    if (!res.isNew) {
      print(ja() ? '(そのフラグは取得済み。`flags` で確認)' : '(already captured. see `flags`)', 'tl-dim');
      return;
    }
    printPre(
      '  ██████████████████████████████\n' +
      '  █  FLAG CAPTURED — ' + id.toUpperCase().padEnd(10) + ' █\n' +
      '  ██████████████████████████████', 'tl-teal');
    const n = M.ctf.found().length, total = M.CTF.order.length;
    print((ja() ? 'スコア: ' : 'score: ') + n + '/' + total + '   (`flags`)', 'tl-gold');
    if (res.all) {
      printPre(
        '  ★ ★ ★  C T F   M A S T E R  ★ ★ ★\n' +
        (ja() ? '  全フラグ制覇。あなた、本物ですね。' : '  All flags captured. You are the real deal.'), 'tl-gold');
    }
    M.WM.open('root');
  }

  function cmdFlags() {
    const found = M.ctf.found();
    print('== CTF SCOREBOARD ' + found.length + '/' + M.CTF.order.length + ' ==', 'tl-gold');
    M.CTF.order.forEach((id) => {
      const f = FLAGS()[id];
      if (found.includes(id)) {
        print('  [x] ' + f.name[M.lang].padEnd(22) + ' ' + f.flag, 'tl-teal');
      } else {
        print('  [ ] ' + f.name[M.lang].padEnd(22) + ' hint: ' + f.hint[M.lang], 'tl-dim');
      }
    });
    if (found.length === M.CTF.order.length) print(ja() ? '🏆 CTF MASTER！' : '🏆 CTF MASTER!', 'tl-gold');
    else print(ja() ? 'フラグを見つけたら: submit FLAG{...}' : 'found one? submit FLAG{...}', 'tl-dim');
  }

  /* ---------- fake filesystem bits ---------- */
  function authLog() {
    return [
      'Jul  1 03:12:44 masafy-os sshd[1337]: Failed password for root from 203.0.113.66 port 51234 ssh2',
      'Jul  1 03:12:51 masafy-os sshd[1337]: Failed password for admin from 203.0.113.66 port 51236 ssh2',
      'Jul  1 03:13:02 masafy-os sshd[1337]: Failed password for oracle from 198.51.100.23 port 40022 ssh2',
      'Jul  1 03:13:20 masafy-os fail2ban.actions: NOTICE [sshd] Ban 203.0.113.66',
      'Jul  1 03:14:09 masafy-os sshd[1337]: Accepted publickey for ghost from 192.0.2.13 port 31337 ssh2',
      'Jul  1 03:14:10 masafy-os ghost: exfil payload=' + hexEnc(FLAGS().forensics.flag),
      'Jul  1 03:14:11 masafy-os kernel: [warn] unusual outbound traffic detected',
      'Jul  1 03:14:12 masafy-os sshd[1337]: Disconnected from 192.0.2.13 port 31337',
    ].join('\n');
  }

  function stringsCrackme() {
    return [
      '/lib/ld-masafy.so.5',
      'libflag.so.1',
      '__libc_start_main',
      'printf',
      'strcmp',
      'usage: crackme <password>',
      'ACCESS DENIED',
      'ACCESS GRANTED',
      '.rodata:',
      '  x9K#qp2..@!vv',
      '  ' + rev(M.CTF.crackmePassword),
      '  0xDEADBEEF',
      'GCC: (MASAFY) 13.3.7',
    ].join('\n');
  }

  /* ---------- command dispatch ---------- */
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
        HELP[M.lang].forEach(([a, b]) => print('  ' + a.padEnd(15) + ' ' + b));
        break;
      }
      case 'whoami':
        print('Masato Suzuki (MASAFY) — Security × AI × Maker');
        print(ja() ? 'セキュリティエンジニア。守る・自動化する・つくる。' : 'Security engineer. Protect, automate, build.');
        break;

      case 'ls': {
        const a = rest.filter((x) => x !== '-a').join(' ');
        const showHidden = rest.includes('-a');
        if (a === 'works' || a === 'works/') {
          M.CATS.forEach((cat) => {
            const ids = M.PROJECTS.filter((p) => p.cat === cat.id).map((p) => p.id).join('  ');
            print(cat.icon + ' ' + cat[M.lang] + ':', 'tl-dim');
            print('   ' + ids);
          });
          print('');
          print(ja() ? 'open <id> で開けます' : 'use: open <id>', 'tl-dim');
        } else if (a === '.vault' || a === '.vault/') {
          print('cipher.txt');
        } else if (a === '/var/log' || a === 'var/log') {
          print('auth.log   os.log');
        } else if (a === '/bin' || a === 'bin') {
          print('base64   crackme   hex   nmap   rot13   strings');
        } else if (!a) {
          print((showHidden ? '.  ..  .vault/  ' : '') + 'works/   readme.txt   flag.txt');
          if (showHidden) print(ja() ? '# .vault…？中を見てみるか (`ls .vault`)' : '# .vault…? worth a look (`ls .vault`)', 'tl-dim');
        } else {
          print('ls: cannot access \'' + a + '\': No such directory', 'tl-err');
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
          print(ja() ? '(非公開・ラボ運用のためリンクなし)' : '(private / lab — no public link)', 'tl-dim');
        }
        break;
      }

      case 'cat': {
        if (arg === 'flag.txt') {
          print('cat: flag.txt: Permission denied', 'tl-err');
          print(ja() ? 'hint: フラグは4つ。`flags` で進捗、まずは `nmap`。' : 'hint: there are 4 flags. check `flags`, start with `nmap`.', 'tl-dim');
        } else if (arg === 'readme.txt') {
          print('MASAFY OS — a portfolio you can operate.');
          print(ja() ? '外部ライブラリゼロ、vanilla JSフルスクラッチ。' : 'Zero external libraries, hand-written vanilla JS.');
          print('src: https://github.com/masafykun/masafy-os');
        } else if (arg === '.vault/cipher.txt' || arg === 'cipher.txt') {
          printPre(
            '-- encrypted with the oldest trick in the book --\n' +
            '-- (shift happens.  thirteen times.) --\n\n' +
            rot13(FLAGS().crypto.flag));
          print(ja() ? 'hint: `rot13 <文字列>`' : 'hint: `rot13 <text>`', 'tl-dim');
        } else if (arg === '/var/log/auth.log' || arg === 'auth.log') {
          printPre(authLog());
          print(ja() ? 'hint: その payload、hexっぽくない？ (`hex -d <payload>`)' : 'hint: that payload looks like hex… (`hex -d <payload>`)', 'tl-dim');
        } else if (arg === '/var/log/os.log' || arg === 'os.log') {
          print(ja() ? 'os.log はコンソールアプリで見られます → `open console`' : 'os.log lives in the Console app → `open console`');
        } else {
          print('cat: ' + (arg || '?') + ': No such file', 'tl-err');
        }
        break;
      }

      case 'rot13': {
        if (!arg) { print('usage: rot13 <text>'); break; }
        const out = rot13(arg);
        print(out, 'tl-gold');
        if (out === FLAGS().crypto.flag) {
          print(ja() ? 'それがフラグ！ → `submit ' + out + '`' : 'that is a flag! → `submit ' + out + '`', 'tl-dim');
        }
        break;
      }

      case 'hex': {
        const s = rest[0] === '-d' ? rest.slice(1).join('') : rest.join('');
        if (!s) { print('usage: hex -d <hex-string>'); break; }
        const dec = hexDec(s);
        if (dec === null) { print('hex: invalid input', 'tl-err'); break; }
        print(dec, 'tl-gold');
        if (dec === FLAGS().forensics.flag) {
          print(ja() ? 'それがフラグ！ → `submit ' + dec + '`' : 'that is a flag! → `submit ' + dec + '`', 'tl-dim');
        }
        break;
      }

      case 'strings': {
        if (arg === 'crackme' || arg === '/bin/crackme' || arg === './crackme') {
          printPre(stringsCrackme());
          print(ja() ? '# 逆さに読める文字列があるような…' : '# one of those strings reads better backwards…', 'tl-dim');
        } else {
          print('strings: \'' + (arg || '?') + '\': No such file', 'tl-err');
        }
        break;
      }

      case 'crackme':
      case './crackme': {
        if (!arg) {
          print('usage: crackme <password>');
          print(ja() ? 'hint: 中身を覗くなら `strings crackme`' : 'hint: peek inside with `strings crackme`', 'tl-dim');
          break;
        }
        if (arg === M.CTF.crackmePassword) {
          printPre('ACCESS GRANTED\n' + FLAGS().rev.flag, 'tl-gold');
          print(ja() ? '→ `submit ' + FLAGS().rev.flag + '`' : '→ `submit ' + FLAGS().rev.flag + '`', 'tl-dim');
        } else if (arg === rev(M.CTF.crackmePassword)) {
          print('ACCESS DENIED', 'tl-err');
          print(ja() ? 'hint: おしい。それ、逆さのまま入れてない？' : 'hint: so close. did you type it backwards?', 'tl-dim');
        } else {
          print('ACCESS DENIED', 'tl-err');
        }
        break;
      }

      case 'flags':
      case 'score':
        cmdFlags();
        break;

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
        print(ja()
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
        print(ja() ? 'hint: `connect 31337`' : 'hint: try `connect 31337`', 'tl-dim');
        break;
      }

      case 'connect': {
        if (arg === '31337') {
          printPre(
            '== SHADOW GATE ==\n' +
            'unauthorized access detected. leaking token before shutdown...\n' +
            'token: ' + btoa(FLAGS().recon.flag));
          print(ja() ? 'hint: これ、base64っぽくない？ → `base64 -d <token>`' : 'hint: looks like base64… → `base64 -d <token>`', 'tl-dim');
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
          if (dec === FLAGS().recon.flag) {
            print(ja() ? 'それがフラグ！ → `submit ' + dec + '`' : 'that is a flag! → `submit ' + dec + '`', 'tl-dim');
          }
        } catch (e) {
          print('base64: invalid input', 'tl-err');
        }
        break;
      }

      case 'submit':
        submitFlag(arg);
        break;

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
        print(ja() ? 'rm: 危険コマンドガードにブロックされました（本物のサーバーでも同じ仕組みで守っています）' : 'rm: blocked by the dangerous-command guard (my real servers use the same idea).', 'tl-err');
        break;

      default:
        print(c + ': command not found  (try `help`)', 'tl-err');
    }
  }

  M.termHint = function () {
    if (!state.out) return;
    print('');
    print(ja() ? '# flag.txt が読めない…？ 4つのフラグの入口は `flags` に。' : '# can\'t read flag.txt…? the 4 flags start at `flags`.', 'tl-dim');
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
      print(ja() ? '`help` でコマンド一覧。作品は `ls works` → `open <id>`。' : 'Type `help` for commands. Projects: `ls works` → `open <id>`.', 'tl-dim');
      print(ja() ? '🚩 CTFフラグが4つ隠されています → `flags`' : '🚩 4 CTF flags are hidden here → `flags`', 'tl-dim');
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
