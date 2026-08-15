// ===== 功能：信箱（仿星言简约版【星言信箱】，矢量图简约风格） =====
// 收信（TA 主动来信）/ 寄信 / 回信；信纸样式展示；聊天里插入写信/回信/来信提示
(function () {
  const uid = 'xy-home-v2';
  const store = window.xyStore(uid);
  const KEY = 'mail-letters';
  const TITLES = ['好久不见', '最近还好吗', '想你了', '给你写了封信', '深夜随想', '一些想说的话'];
  let mtab = 'in';
  let viewLetter = null;

  function partnerName() { return store.get('lbl-partner') || 'TA'; }
  function fmtDT(ts) {
    const d = new Date(ts);
    const p = (n) => (n < 10 ? '0' + n : '' + n);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function toast(msg) {
    let t = document.getElementById('cc-toast');
    if (!t) { t = document.createElement('div'); t.id = 'cc-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.className = 'cc-toast show';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = 'cc-toast'; }, 2000);
  }
  function load() { try { return JSON.parse(store.get(KEY) || '[]'); } catch (e) { return []; } }
  function save(list) { store.set(KEY, JSON.stringify(list)); }

  // 写信纸 HTML（简约卡片：标题 + 寄信人/时间 + 正文）
  // 正文支持字卡库图片（dataURL）直接显示
  function escHtml(s) { return String(s).replace(/</g, '&lt;'); }
  function renderBody(content) {
    const s = String(content || '');
    let html = '';
    const re = /(data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)/g;
    let last = 0, m;
    while ((m = re.exec(s))) {
      html += escHtml(s.slice(last, m.index));
      html += '<img class="mail-body-img" src="' + m[0] + '" alt="表情">';
      last = m.index + m[0].length;
    }
    html += escHtml(s.slice(last));
    return html;
  }
  function letterPaper(title, content, date, author) {
    return '<div class="mail-paper">' +
      '<div class="mail-paper-head"><span class="mail-paper-author">' + escHtml(author) + '</span><span class="mail-paper-date">' + date + '</span></div>' +
      (title ? '<div class="mail-paper-title">' + escHtml(title) + '</div>' : '') +
      '<div class="mail-paper-body">' + renderBody(content) + '</div>' +
      '</div>';
  }
  // 打开信详情（复用 tc-mask 弹层；v3.5.68 打开即标记已读）
  function openLetter(l) {
    viewLetter = l;
    // 收到的来信：打开后标记已读（「新来信」消失）
    if (l && l.type === 'received' && !l.read) {
      l.read = true;
      const list = load();
      const idx = list.findIndex(x => x.id === l.id);
      if (idx >= 0) { list[idx].read = true; save(list); }
    }
    const name = partnerName();
    const myName = store.get('lbl-user') || '我';
    let html = '';
    // 收到的信 / 寄出的信 都完整显示（含标题）
    if (l.type === 'received' || l.fromMe) {
      html += letterPaper(l.tt || '来信', l.content, fmtDT(l.tm), l.fromMe ? myName : name);
    } else if (l.type === 'sent') {
      html += letterPaper(l.tt || '寄出的信', l.content, fmtDT(l.tm), myName);
    }
    // 我的回信（寄出的信内容已在上方完整展示，不再重复）
    if (l.myReply && l.type !== 'sent') html += letterPaper('我的回信', l.myReply.content, fmtDT(l.myReply.tm), myName);
    if (l.partnerReply) html += letterPaper('对方的回信', l.partnerReply.content, fmtDT(l.partnerReply.tm), name);
    // 底部按钮：收到的信且未回信 → 提笔回信（打开独立回信页）
    let footer = '';
    if (l.type === 'received' && !l.myReply) {
      footer = '<div class="mail-actions"><button class="cc-tool" id="mail-reply-btn">提笔回信</button><button class="cc-tool" id="mail-close2">关闭</button></div>';
    } else {
      footer = '<div class="mail-actions"><button class="cc-tool" id="mail-close2">关闭</button></div>';
    }
    if (window.openTCPanel) window.openTCPanel('信件', html + footer);
    const close2 = document.getElementById('mail-close2');
    if (close2) close2.addEventListener('click', () => { document.getElementById('tc-mask').hidden = true; viewLetter = null; });
    const replyBtn = document.getElementById('mail-reply-btn');
    if (replyBtn) replyBtn.addEventListener('click', () => openReply(l));
  }
  function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.hidden = true);
    const el = document.getElementById(id);
    if (el) el.hidden = false;
  }
  // 回信（独立全屏页，保留原信上下文）
  function openReply(l) {
    viewLetter = l;
    const name = partnerName();
    const origEl = document.getElementById('mail-reply-original');
    if (origEl) origEl.innerHTML = letterPaper(l.tt || '来信', l.content, fmtDT(l.tm), name);
    const toEl = document.getElementById('mail-reply-to');
    if (toEl) toEl.textContent = name;
    const input = document.getElementById('mail-reply-input');
    if (input) input.value = '';
    document.getElementById('tc-mask').hidden = true;
    showPage('page-mail-reply');
  }
  function submitReply() {
    const l = viewLetter;
    if (!l) return;
    const val = document.getElementById('mail-reply-input').value.trim();
    if (!val) { toast('回信内容不能为空'); return; }
    const name = partnerName();
    const list = load();
    const idx = list.findIndex(x => x.id === l.id);
    if (idx >= 0 && !list[idx].myReply) {
      list[idx].myReply = { content: val, tm: Date.now() };
      // TA 定时回信确认（概率与时间在回复设置-信箱调整）
      const cfg = mailCfg();
      if (Math.random() * 100 < cfg.replyProb) {
        const replyMsg = taLetterContent(cfg);
        const delayMs = (cfg.replyMin + Math.random() * Math.max(1, cfg.replyMax - cfg.replyMin)) * 60000;
        const timer = setTimeout(() => {
          const l2 = load();
          const i2 = l2.findIndex(x => x.id === l.id);
          if (i2 >= 0) {
            l2[i2].partnerReply = { content: replyMsg, tm: Date.now() };
            save(l2);
            if (window.chatAddSystem) window.chatAddSystem(name + ' 给你回了信');
          }
        }, delayMs);
        list[idx]._replyTimer = timer;
      }
      save(list);
      viewLetter = null;
      render();
      showPage('page-mail');
      if (window.chatAddSystem) window.chatAddSystem('你给 ' + name + ' 回了一封信');
      toast('回信已寄出');
    }
  }
  // 渲染列表
  function render() {
    const list = load().slice().sort((a, b) => b.tm - a.tm);
    const name = partnerName();
    const inEl = document.getElementById('mail-in-list');
    const outEl = document.getElementById('mail-out-list');
    // 收到的信：TA 来信 + 已回信
    const inList = list.filter(l => l.type === 'received');
    if (inEl) {
      inEl.innerHTML = inList.length
        ? inList.map(l => '<div class="mail-item" data-id="' + l.id + '"><div class="mail-item-av"><svg viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg></div>' +
            '<div class="mail-item-body"><div class="mail-item-title">来自 ' + name +
              (l.myReply ? ' <span class="mail-tag">已回信</span>' : (l.read ? '' : ' <span class="mail-tag new">新来信</span>')) + '</div>' +
            '<div class="mail-item-desc">' + (l.content || '').slice(0, 30) + '</div></div>' +
            '<div class="mail-item-time">' + fmtDT(l.tm) + '</div></div>').join('')
        : '<div class="ta-empty">还没有收到信，等等 TA 吧</div>';
      inEl.querySelectorAll('.mail-item').forEach(it => it.addEventListener('click', () => {
        const l = list.find(x => x.id === it.dataset.id);
        if (l) openLetter(l);
      }));
    }
    // 寄出的信
    const outList = list.filter(l => l.type === 'sent');
    if (outEl) {
      outEl.innerHTML = outList.length
        ? outList.map(l => '<div class="mail-item" data-id="' + l.id + '"><div class="mail-item-av"><svg viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg></div>' +
            '<div class="mail-item-body"><div class="mail-item-title">寄给 ' + name + (l.partnerReply ? ' <span class="mail-tag">对方已回信</span>' : '') + '</div>' +
            '<div class="mail-item-desc">' + (l.content || '').slice(0, 30) + '</div></div>' +
            '<div class="mail-item-time">' + fmtDT(l.tm) + '</div></div>').join('')
        : '<div class="ta-empty">还没有寄出任何信，提笔写一封吧</div>';
      outEl.querySelectorAll('.mail-item').forEach(it => it.addEventListener('click', () => {
        const l = list.find(x => x.id === it.dataset.id);
        if (l) openLetter(l);
      }));
    }
  }
  // 寄信
  function sendLetter() {
    const input = document.getElementById('mail-input');
    const content = input ? input.value.trim() : '';
    if (!content) { toast('信件内容不能为空'); return; }
    const name = partnerName();
    const title = TITLES[Math.floor(Math.random() * TITLES.length)];
    const letter = { id: 'l_' + Date.now(), type: 'sent', tt: title, content: content, tm: Date.now(), myReply: { content: content, tm: Date.now() } };
    const list = load();
    list.unshift(letter);
    save(list);
    if (input) input.value = '';
    if (window.chatAddSystem) window.chatAddSystem('你给 ' + name + ' 写了一封信');
    toast('信件已寄出');
    render();
  }
  // ================= TA 主动来信（定时机制，概率可在回复设置-信箱调整） =================
  const TA_LETTERS = [
    '最近总是想起我们以前聊的那些话。时间过得真快，但有些东西一直没变。给我回信吧。',
    '今天路过一个地方，突然很想你。最近过得还好吗？想听听你的消息。',
    '忽然想给你写封信。有些话，用字卡说不完，写下来好像更踏实。',
    '晚安前突然想起你。最近有没有好好休息？有空给我回封信吧。',
    '今天看到一片很好看的云，第一反应是想拍给你看。想你了。'
  ];
  function mailCfg() {
    const c = (window.replyCfg && window.replyCfg()) || {};
    return {
      maxCards: c['ml-max-cards'] !== undefined ? c['ml-max-cards'] : 100,
      writeProb: c['ml-write-prob'] !== undefined ? c['ml-write-prob'] : 30,
      writeMin: c['ml-write-min'] !== undefined ? c['ml-write-min'] : 1,
      writeMax: c['ml-write-max'] !== undefined ? c['ml-write-max'] : 480,
      replyProb: c['ml-reply-prob'] !== undefined ? c['ml-reply-prob'] : 80,
      replyMin: c['ml-reply-min'] !== undefined ? c['ml-reply-min'] : 1,
      replyMax: c['ml-reply-max'] !== undefined ? c['ml-reply-max'] : 480,
      kaomojiEn: c['ml-kaomoji-en'] !== undefined ? c['ml-kaomoji-en'] : 1,
      emojiEn: c['ml-emoji-en'] !== undefined ? c['ml-emoji-en'] : 1,
      stickerEn: c['ml-sticker-en'] !== undefined ? c['ml-sticker-en'] : 1
    };
  }
  // 字卡库分类（与聊天/朋友圈同一套规则）：文字 / 颜文字 / emoji / 表情包(图片)
  function mailCardPool() {
    const custom = (window.getCustomCards && window.getCustomCards()) || [];
    const text = [], kaomoji = [], emoji = [];
    custom.forEach(s => {
      if (!s || typeof s !== 'string') return;
      if (/^data:/.test(s)) return;
      let isEmoji = false;
      for (const ch of s) {
        const c = ch.codePointAt(0);
        if ((c >= 0x1F000 && c <= 0x1FAFF) || (c >= 0x2600 && c <= 0x27BF)) { isEmoji = true; break; }
      }
      if (isEmoji) { emoji.push(s); return; }
      if (/[\(（｡◕(◕)(づ｡(¬)]/.test(s) && /[\)）】)]/.test(s)) { kaomoji.push(s); return; }
      text.push(s);
    });
    return {
      text: text,
      kaomoji: kaomoji,
      emoji: emoji,
      sticker: (window.getMediaCards && window.getMediaCards('sticker')) || [],
      image: (window.getMediaCards && window.getMediaCards('image')) || []
    };
  }
  // TA 写信内容：多个字卡（空格分隔）+ 概率加颜文字/emoji/表情包
  function taLetterContent(cfg) {
    const pool = mailCardPool();
    const words = pool.text.length ? pool.text : TA_LETTERS;
    const n = 1 + Math.floor(Math.random() * Math.min(Math.max(1, cfg.maxCards || 1), 8));
    const parts = [];
    for (let i = 0; i < n; i++) parts.push(words[Math.floor(Math.random() * words.length)]);
    let t = parts.join(' ');
    if (cfg.kaomojiEn && pool.kaomoji.length && Math.random() * 100 < 30) t += ' ' + pool.kaomoji[Math.floor(Math.random() * pool.kaomoji.length)];
    if (cfg.emojiEn && pool.emoji.length && Math.random() * 100 < 15) t += ' ' + pool.emoji[Math.floor(Math.random() * pool.emoji.length)];
    const st = pool.sticker.concat(pool.image);
    if (cfg.stickerEn && st.length && Math.random() * 100 < 20) t += ' ' + st[Math.floor(Math.random() * st.length)];
    return t;
  }
  function letterLast() { const v = parseInt(store.get('mail-letter-last'), 10); return isNaN(v) ? 0 : v; }
  function letterNext() { const v = parseFloat(store.get('mail-letter-next')); return isNaN(v) ? 0 : v; }
  function maybeIncomingLetter() {
    try {
      const now = Date.now();
      const cfg = mailCfg();
      let last = letterLast(), next = letterNext();
      if (last > now || last < 0 || isNaN(last)) { last = 0; next = 0; }
      // 星言机制：最短/最长写信时间（分钟）内随机一次间隔，间隔到点后每分钟掷一次概率，命中才来信
      if ((now - last) / 60000 < next) return;
      // 未命中：不重置间隔，下一轮 tick 继续掷（概率真实生效，不会出现"等 8 小时再掷一次"）
      if (Math.random() * 100 >= cfg.writeProb) return;
      const name = partnerName();
      const content = taLetterContent(cfg);
      const letter = { id: 'l_' + Date.now(), type: 'received', tt: TITLES[Math.floor(Math.random() * TITLES.length)], content: content, tm: Date.now() };
      const list = load();
      list.unshift(letter);
      save(list);
      store.set('mail-letter-last', String(now));
      store.set('mail-letter-next', String(cfg.writeMin + Math.random() * Math.max(1, cfg.writeMax - cfg.writeMin)));
      if (window.chatAddSystem) window.chatAddSystem('<svg class="st-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>' + name + ' 给你寄来了一封信');
      render();
    } catch (e) {}
  }
  setTimeout(() => {
    setInterval(maybeIncomingLetter, 60000);
    maybeIncomingLetter();
  }, (120 + Math.random() * 180) * 1000);

  // ================= 入口与交互 =================
  const mailApp = document.querySelector('.app[data-app="mail"]');
  const mailPage = document.getElementById('page-mail');
  if (mailApp && mailPage) {
    mailApp.addEventListener('click', () => {
      const editing = Array.from(document.querySelectorAll('.app-grid')).some(g => g.classList.contains('editing'));
      if (editing) return;
      render();
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      mailPage.hidden = false;
    });
  }
  const mailBack = document.getElementById('mail-back');
  if (mailBack) mailBack.addEventListener('click', () => {
    document.querySelectorAll('.page').forEach(p => p.hidden = true);
    const phone = document.getElementById('page-phone');
    if (phone) phone.hidden = false;
  });
  // 写信：写信 tab 按钮 / 独立写信页
  const openWriteBtn = document.getElementById('mail-open-write');
  if (openWriteBtn) {
    openWriteBtn.addEventListener('click', () => {
      const toEl = document.getElementById('mail-write-to');
      if (toEl) toEl.textContent = partnerName();
      showPage('page-mail-write');
    });
  }
  const mailWriteBack = document.getElementById('mail-write-back');
  if (mailWriteBack) mailWriteBack.addEventListener('click', () => showPage('page-mail'));
  const mailSend = document.getElementById('mail-send');
  if (mailSend) mailSend.addEventListener('click', sendLetter);
  // 回信页：返回 / 寄出
  const mailReplyBack = document.getElementById('mail-reply-back');
  if (mailReplyBack) mailReplyBack.addEventListener('click', () => { viewLetter = null; showPage('page-mail'); });
  const mailReplySend = document.getElementById('mail-reply-send');
  if (mailReplySend) mailReplySend.addEventListener('click', submitReply);
  // tab 切换
  document.querySelectorAll('#page-mail .fav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      mtab = tab.dataset.mtab;
      document.querySelectorAll('#page-mail .fav-tab').forEach(x => x.classList.toggle('sel', x === tab));
      document.querySelectorAll('#page-mail .cal-card').forEach(c => { c.hidden = c.dataset.mpanel !== mtab; });
    });
  });
  render();
})();
