// ===== 功能：聊天页 =====
// 桌面点「聊天」进入；顶部标题/双方头像读取桌面设置；可发送消息
// 联系人回复按「通用设置」概率链生成（被动回复 + 主动发送）
// 消息持久化到 localStorage，刷新后恢复
(function () {
  const body = document.getElementById('chat-body');
  if (!body) return;

  const uid = 'xy-home-v2';
  const store = {
    get(k){ try { return localStorage.getItem(uid + ':' + k); } catch(e){ return null; } },
    set(k, v){ try { localStorage.setItem(uid + ':' + k, v); } catch(e){} }
  };

  // ---- 消息存储 ----
  let msgs = [];
  function loadMsgs() {
    try { msgs = JSON.parse(store.get('chat-msgs') || '[]'); } catch (e) { msgs = []; }
    if (!Array.isArray(msgs)) msgs = [];
    // 旧版换头像消息统一迁移为新文案：
    // 「宝宝 更换了头像」→「我 更换了 宝宝 的头像」（只匹配旧格式，迁移后不再命中）
    const pName = store.get('lbl-partner') || 'TA';
    const myName = store.get('lbl-user') || '我';
    let migrated = false;
    msgs.forEach(r => {
      if (r && r.special === 'poke' && typeof r.text === 'string' && /^.+ 更换了头像$/.test(r.text)) {
        r.text = myName + ' 更换了 ' + pName + ' 的头像';
        migrated = true;
      }
    });
    if (migrated) saveMsgs();
    // 旧消息补时间戳（仅一次，保证每条都有精确到秒的时间）
    let changed = false;
    msgs.forEach(r => { if (r && !r.ts) { r.ts = Date.now(); changed = true; } });
    if (changed) saveMsgs();
  }
  function saveMsgs() { store.set('chat-msgs', JSON.stringify(msgs)); }

  // 头像回填（接受元素或 id）
  function fillAvatar(el, key) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    const data = store.get(key);
    el.innerHTML = data
      ? '<img src="' + data + '" alt="">'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="#999999" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.5-6 8-6s8 2 8 6"/></svg>';
  }
  fillAvatar('chat-user-av', 'avatar-user');
  fillAvatar('chat-partner-av', 'avatar-partner');

  // 顶部标题 = 联系人的昵称
  const pname = document.getElementById('chat-partner-name');
  if (pname) {
    const saved = store.get('lbl-partner');
    if (saved) pname.textContent = saved;
  }

  // ---- 联系人「正在输入」状态 ----
  // 显示在底部输入栏左上角；仅在聊天页可见时展示。
  // typingOn 标志与页面可见性解耦：退出聊天页不打断输入中状态，
  // 返回时若 TA 仍在输入周期会自动恢复显示（发送消息不受页面切换影响）
  const typingEl = document.getElementById('chat-typing');
  let typingOn = false;
  function chatVisible() {
    const p = document.getElementById('page-chat');
    return !!(p && !p.hidden);
  }
  function showTyping() {
    if (!typingEl) return;
    typingOn = true;
    if (chatVisible()) typingEl.hidden = false;
    // 消息区底部留出空间，避免输入中提示压住最后一条消息的头像/时间轴
    const cb = document.getElementById('chat-body');
    if (cb) cb.classList.add('typing-on');
  }
  function hideTyping() {
    if (!typingEl) return;
    typingOn = false;
    typingEl.hidden = true;
    const cb = document.getElementById('chat-body');
    if (cb) cb.classList.remove('typing-on');
  }

  // ---- 概率工具 ----
  function cfg() { return (window.replyCfg && window.replyCfg()) || {}; }
  function hit(p) { return Math.random() * 100 < p; }
  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(arr) { return arr.length ? arr[Math.floor(Math.random() * arr.length)] : ''; }
  function pickN(arr, n) {
    const copy = arr.slice();
    const out = [];
    while (copy.length && out.length < n) {
      out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
    }
    return out;
  }

  // ---- 字卡池（按分类） ----
  function getPool() {
    const cards = (window.getCustomCards && window.getCustomCards()) || [];
    const text = [], kaomoji = [], emoji = [], sticker = [], image = [], voice = [], poke = [];
    // 媒体字卡（图片 dataURL）
    const mediaSticker = (window.getMediaCards && window.getMediaCards('sticker')) || [];
    const mediaImage = (window.getMediaCards && window.getMediaCards('image')) || [];
    sticker.push.apply(sticker, mediaSticker);
    image.push.apply(image, mediaImage);
    cards.forEach(c => {
      if (typeof c === 'string' && c.indexOf('data:') === 0) return; // dataURL 已按媒体分类
      if (/[\uD800-\uDBFF]/.test(c) || /^[😀-🙏🌀-🫿]/u.test(c)) emoji.push(c);
      else if (/[\(（｡◕(◕)(づ｡(¬)]/.test(c) && /[\)）】)]/.test(c)) kaomoji.push(c);
      else text.push(c);
    });
    return { text, kaomoji, emoji, sticker, image, voice, poke };
  }

  // ---- 消息渲染 ----
  // 时间格式：精确到秒 HH:MM:SS
  function fmtTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const p = (n) => (n < 10 ? '0' + n : '' + n);
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
  function quoteHtml(q) {
    if (typeof q === 'string' && q.indexOf('data:') === 0) {
      // 引用图片（表情包）缩略图：实显，不透明
      return '<div style="font-size:11px;border-left:2px solid currentColor;padding-left:8px;margin-bottom:4px"><img class="msg-quote-img" src="' + q + '" alt="图片"></div>';
    }
    return '<div style="font-size:11px;opacity:.55;border-left:2px solid currentColor;padding-left:8px;margin-bottom:4px">' + q + '</div>';
  }
  function bindToggle(b, side) {
    const who = side === 'out' ? '我' : '对方';
    b.style.cursor = 'pointer';
    b.onclick = function () {
      if (b.dataset.showing === '1') {
        b.innerHTML = '<span style="opacity:.6;font-size:12px;cursor:pointer">' + who + '撤回了一条消息</span>';
        b.dataset.showing = '0';
      } else {
        b.innerHTML = b.dataset.orig;
        b.dataset.showing = '1';
      }
    };
  }
  function renderMsg(rec) {
    const m = document.createElement('div');
    // 邀请/提问/通话：居中卡片
    if (rec.special === 'invite' || rec.special === 'invite-reply' || rec.special === 'ask' ||
        rec.special === 'call' || rec.special === 'call-reply') {
      m.className = 'msg-center';
      m.innerHTML = '<div class="msg-center-card">' + rec.text + '</div>';
      body.appendChild(m);
      body.scrollTop = body.scrollHeight;
      return m;
    }
    // 拍一拍 / 换头像系统提示：居中灰字小卡片，可选附带一张头像图
    if (rec.special === 'poke') {
      m.className = 'msg-poke';
      m.innerHTML = '<span>' + rec.text + '</span>' +
        (rec.img ? '<img class="msg-poke-img" src="' + rec.img + '" alt="新头像">' : '');
      body.appendChild(m);
      body.scrollTop = body.scrollHeight;
      return m;
    }
    // TA 的小问题：居中选择题卡片，未作答点击弹出选项
    if (rec.special === 'ask-choose') {
      m.className = 'msg-ask';
      m.dataset.idx = msgs.length - 1;
      const answered = rec.choiceStatus === 'answered';
      m.innerHTML = '<div class="msg-choose-card' + (answered ? ' answered' : '') + '">' +
        '<div class="msg-ask-q">' + (rec.choiceQuestion || '') + '</div>' +
        (answered
          ? '<div class="msg-ask-a">✓ 你选择了：' + rec.choiceAnswer + '</div><div class="msg-choose-r">TA：' + rec.choiceReply + '</div>'
          : '<div class="msg-ask-tip">点击选择你的答案</div>') +
        '</div>';
      if (!answered) {
        m.querySelector('.msg-choose-card').addEventListener('click', () => {
          if (window.openTC) window.openTC(Number(m.dataset.idx));
        });
      }
      body.appendChild(m);
      body.scrollTop = body.scrollHeight;
      return m;
    }
    // TA 的好奇：居中白卡显示问题，未回答可点击回答
    if (rec.special === 'ask-curious') {
      m.className = 'msg-ask';
      m.dataset.idx = msgs.length - 1;
      const answered = rec.curiousStatus === 'answered';
      m.innerHTML = '<div class="msg-choose-card' + (answered ? ' answered' : '') + '">' +
        '<div class="msg-ask-q">' + (rec.curiousQuestion || '') + '</div>' +
        (answered
          ? '<div class="msg-ask-a">✓ 你：' + rec.curiousAnswer + '</div><div class="msg-choose-r">TA：' + rec.curiousReply + '</div>'
          : '<div class="msg-ask-tip">点击回答 TA 的好奇</div>') +
        '</div>';
      if (!answered) {
        m.querySelector('.msg-choose-card').addEventListener('click', () => {
          if (window.openCurious) window.openCurious(Number(m.dataset.idx));
        });
      }
      body.appendChild(m);
      body.scrollTop = body.scrollHeight;
      return m;
    }
    // TA 的吐槽：居中白卡显示吐槽，未回应可点击回一句
    if (rec.special === 'ask-roast') {
      m.className = 'msg-ask';
      m.dataset.idx = msgs.length - 1;
      const answered = rec.roastStatus === 'answered';
      m.innerHTML = '<div class="msg-choose-card' + (answered ? ' answered' : '') + '">' +
        '<div class="msg-ask-q">' + (rec.roastText || '') + '</div>' +
        (answered
          ? '<div class="msg-ask-a">✓ 你：' + rec.roastAnswer + '</div><div class="msg-choose-r">TA：' + rec.roastReply + '</div>'
          : '<div class="msg-ask-tip">点击回 TA 一句</div>') +
        '</div>';
      if (!answered) {
        m.querySelector('.msg-choose-card').addEventListener('click', () => {
          if (window.openRoast) window.openRoast(Number(m.dataset.idx));
        });
      }
      body.appendChild(m);
      body.scrollTop = body.scrollHeight;
      return m;
    }
    // TA 的询问卡片：居中白卡显示问题，未回答可点击回答（星言 ta 的询问）
    if (rec.special === 'ask-card') {
      m.className = 'msg-ask';
      m.dataset.idx = msgs.length - 1;
      const answered = rec.askStatus === 'answered';
      m.innerHTML = '<div class="msg-ask-card' + (answered ? ' answered' : '') + '">' +
        '<div class="msg-ask-q">' + (rec.askQuestion || rec.text) + '</div>' +
        (answered
          ? '<div class="msg-ask-a">✓ 已回答：' + rec.askAnswer + '</div>'
          : '<div class="msg-ask-tip">点击回答 TA 的提问</div>') +
        '</div>';
      if (!answered) {
        m.querySelector('.msg-ask-card').addEventListener('click', () => {
          if (window.openAskReply) window.openAskReply(Number(m.dataset.idx));
        });
      }
      body.appendChild(m);
      body.scrollTop = body.scrollHeight;
      return m;
    }
    m.className = 'msg ' + (rec.side === 'out' ? 'msg-out' : 'msg-in');
    // 头像列：头像 + 时间轴（时间在头像底下）
    const timeHtml = rec.ts ? '<span class="msg-time">' + fmtTime(rec.ts) + '</span>' : '';
    const side = '<div class="msg-side"><div class="msg-av"></div>' + timeHtml + '</div>';
    // 我的消息：气泡在左、头像(带时间)在右；对方消息：头像(带时间)在左、气泡在右
    m.innerHTML = rec.side === 'out'
      ? '<div class="msg-bubble"></div>' + side
      : side + '<div class="msg-bubble"></div>';
    const av = m.querySelector('.msg-av');
    const b = m.querySelector('.msg-bubble');
    if (rec.special === 'read') {
      // 已读不回：保留正常聊天气泡
      b.innerHTML = '<span style="opacity:.5;font-size:12px">已读不回</span>';
    } else if (rec.type === 'sticker' || rec.type === 'image') {
      // 图片表情消息：气泡样式与文字消息一致（用 CSS 变量气泡色）
      b.style.padding = '6px';
      b.style.background = '';
      b.style.border = '';
      b.style.boxShadow = '';
      b.innerHTML = '<img class="msg-img" src="' + rec.text + '" alt="表情">';
    } else if (rec.retracted) {
      b.dataset.orig = rec.orig || rec.text;
      b.innerHTML = '<span style="opacity:.6;font-size:12px;cursor:pointer">' + (rec.side === 'out' ? '我' : '对方') + '撤回了一条消息</span>';
      bindToggle(b, rec.side);
    } else if (rec.parts && rec.parts.length) {
      // 组合消息：文字 + 图片/表情（同一气泡内，图片网格 + 文字）
      const imgs = rec.parts.filter(p => p.k === 'img').map(p => p.v);
      const textPart = rec.parts.filter(p => p.k === 'text').map(p => p.v).join(' ');
      let inner = '';
      if (imgs.length) {
        inner += '<div class="msg-parts-imgs' + (imgs.length > 1 ? ' multi' : '') + '">' +
          imgs.map(src => '<img class="msg-img" src="' + src + '" alt="图片">').join('') + '</div>';
      }
      if (textPart) {
        inner += '<span style="opacity:.85;word-break:break-word">' + textPart.replace(/</g, '&lt;') + '</span>';
      }
      b.innerHTML = rec.quote
        ? quoteHtml(rec.quote) + inner
        : inner;
    } else {
      b.innerHTML = rec.quote
        ? quoteHtml(rec.quote) + '<span style="opacity:.85">' + rec.text + '</span>'
        : '<span style="opacity:.85">' + rec.text + '</span>';
    }
    // 恢复情绪字卡（持久化）：所有字卡包进一个 .msg-moods 容器，
    // 容器用一条虚线与正文隔离，字卡在容器内紧凑同行、放不下才自动换行
    if (rec.mood && rec.mood.length) {
      const mm = document.createElement('div');
      mm.className = 'msg-moods';
      rec.mood.forEach(md => {
        if (md.tag === '交流意图') {
          mm.innerHTML += '<div class="msg-mood msg-intent"><span class="msg-mood-tag">' + md.tag + '</span><span>' + md.label + '</span></div>';
        } else {
          mm.innerHTML += '<div class="msg-mood"><span class="msg-mood-tag">' + md.tag + '</span><span>' + md.label + '</span></div>';
        }
      });
      b.appendChild(mm);
    }
    fillAvatar(av, rec.side === 'out' ? 'avatar-user' : 'avatar-partner');
    if (rec.side === 'in' || rec.side === 'out') m.dataset.idx = msgs.length - 1;
    body.appendChild(m);
    body.scrollTop = body.scrollHeight;
    return m;
  }

  // 拍一拍：联系人用自定义字卡【拍一拍】里的字卡，居中灰字显示 "昵称 + 字卡 + 对我"
  function performPoke() {
    // 优先用默认字卡【拍一拍】（聊天默认字卡开启时）
    let action = '';
    const dcfg = (window.defaultCardCfg && window.defaultCardCfg()) || {};
    if (dcfg.enabled && dcfg.probs && (dcfg.probs.touch || 0) > 0) {
      const d = (window.getDefaultCards && window.getDefaultCards()) || null;
      if (d && d.type === 'poke') action = d.text;
    }
    if (!action) {
      const cards = (window.getPokeCards && window.getPokeCards()) || [];
      action = cards.length ? pick(cards) : '拍了拍你';
    }
    const name = store.get('lbl-partner') || 'TA';
    const myName = store.get('lbl-user') || '我';
    // 显示：联系人昵称 + 字卡 + 我的昵称
    let text;
    if (action.indexOf('你') >= 0) {
      text = name + ' ' + action.replace(/你/g, myName);
    } else {
      text = name + ' ' + action + ' ' + myName;
    }
    addIn(text, { special: 'poke' });
  }

  // 追加记录（存 + 渲染）
  function addRec(rec) {
    if (!rec.ts) rec.ts = Date.now();
    msgs.push(rec);
    saveMsgs();
    // 后台通知：TA 的普通消息且页面不在前台时弹浏览器通知（系统提示类不弹）
    if (rec.side === 'in' && !rec.special && window.bgNotifyCheck) {
      window.bgNotifyCheck(rec.text);
    }
    return renderMsg(rec);
  }
  function addIn(text, opts) {
    opts = opts || {};
    return addRec({ side: 'in', text: text, special: opts.special, quote: opts.quote, type: opts.type, img: opts.img, parts: opts.parts, askQuestion: opts.askQuestion, askStatus: opts.askStatus, choiceQuestion: opts.choiceQuestion, choiceOptions: opts.choiceOptions, choicePref: opts.choicePref, choiceCat: opts.choiceCat, choiceStatus: opts.choiceStatus, choiceAnswer: opts.choiceAnswer, choiceReply: opts.choiceReply, choiceMatch: opts.choiceMatch, curiousQuestion: opts.curiousQuestion, curiousQuick: opts.curiousQuick, curiousReplies: opts.curiousReplies, curiousFollowup: opts.curiousFollowup, curiousQid: opts.curiousQid, curiousCat: opts.curiousCat, curiousStatus: opts.curiousStatus, curiousAnswer: opts.curiousAnswer, curiousReply: opts.curiousReply, roastText: opts.roastText, roastCat: opts.roastCat, roastStatus: opts.roastStatus, roastAnswer: opts.roastAnswer, roastReply: opts.roastReply });
  }
  function addOut(text) {
    return addRec({ side: 'out', text: text });
  }
  // 供头像库等外部模块追加"居中系统消息"（更换头像/拍一拍类）：
  // 即使聊天页当前关闭也会写入记录，下次进入聊天自动恢复
  // opts.img：可选，消息附带一张小头像图片（更换头像时显示新头像）
  // opts.choice*：TA 的小问题选择题数据
  // 注意：页面加载时 msgs 尚未 loadMsgs()（进入聊天才加载），
  // 写入前必须重新读取历史，否则会把空数组覆盖回 localStorage 导致聊天记录丢失
  window.chatAddSystem = function (text, opts) {
    opts = opts || {};
    loadMsgs();
    return addIn(text, { special: opts.special || 'poke', img: opts.img, askQuestion: opts.askQuestion, askStatus: opts.askStatus, choiceQuestion: opts.choiceQuestion, choiceOptions: opts.choiceOptions, choicePref: opts.choicePref, choiceCat: opts.choiceCat, curiousQuestion: opts.curiousQuestion, curiousQuick: opts.curiousQuick, curiousReplies: opts.curiousReplies, curiousFollowup: opts.curiousFollowup, curiousQid: opts.curiousQid, curiousCat: opts.curiousCat, roastText: opts.roastText, roastCat: opts.roastCat });
  };
  // 供外部模块推送普通"联系人消息"（如查岗日常更新），持久化 + 渲染
  window.chatAddIn = function (text) {
    loadMsgs();
    return addIn(text);
  };
  // 回答 TA 的小问题（选择题）：更新记录 + 插入"我的选择"和 TA 回应
  window.chatChooseReply = function (msgIdx, answer, reply, match) {
    loadMsgs();
    const rec = msgs[msgIdx];
    if (!rec || rec.special !== 'ask-choose' || rec.choiceStatus === 'answered') return;
    rec.choiceStatus = 'answered';
    rec.choiceAnswer = answer;
    rec.choiceReply = reply || '…';
    if (match) rec.choiceMatch = match;
    saveMsgs();
    addOut(answer);
    addIn(reply || '…');
    // 就地更新已渲染的卡片
    const el = body.querySelector('.msg-ask[data-idx="' + msgIdx + '"]');
    if (el) {
      el.innerHTML = '<div class="msg-choose-card answered"><div class="msg-ask-q">' + (rec.choiceQuestion || '') + '</div><div class="msg-ask-a">✓ 你选择了：' + answer + '</div><div class="msg-choose-r">TA：' + (reply || '…') + '</div></div>';
    }
  };
  // 回答 TA 的好奇（开放式）：更新记录 + 插入"我的回答"和 TA 回应（含 30% 追问）
  window.chatCuriousReply = function (msgIdx, answer, reply, followup) {
    loadMsgs();
    const rec = msgs[msgIdx];
    if (!rec || rec.special !== 'ask-curious' || rec.curiousStatus === 'answered') return;
    rec.curiousStatus = 'answered';
    rec.curiousAnswer = answer;
    rec.curiousReply = reply || '…';
    saveMsgs();
    addOut(answer);
    addIn(reply || '…');
    if (followup) addIn(followup);
    const el = body.querySelector('.msg-ask[data-idx="' + msgIdx + '"]');
    if (el) {
      el.innerHTML = '<div class="msg-choose-card answered"><div class="msg-ask-q">' + (rec.curiousQuestion || '') + '</div><div class="msg-ask-a">✓ 你：' + answer + '</div><div class="msg-choose-r">TA：' + (reply || '…') + '</div></div>';
    }
  };
  // 回应 TA 的吐槽：更新记录 + 插入"我的回应"和 TA 回应
  window.chatRoastReply = function (msgIdx, answer, reply) {
    loadMsgs();
    const rec = msgs[msgIdx];
    if (!rec || rec.special !== 'ask-roast' || rec.roastStatus === 'answered') return;
    rec.roastStatus = 'answered';
    rec.roastAnswer = answer;
    rec.roastReply = reply || '…';
    saveMsgs();
    addOut(answer);
    addIn(reply || '…');
    const el = body.querySelector('.msg-ask[data-idx="' + msgIdx + '"]');
    if (el) {
      el.innerHTML = '<div class="msg-choose-card answered"><div class="msg-ask-q">' + (rec.roastText || '') + '</div><div class="msg-ask-a">✓ 你：' + answer + '</div><div class="msg-choose-r">TA：' + (reply || '…') + '</div></div>';
    }
  };
  // 回答 TA 的询问：更新记录 + 插入"我的回答"和 TA 确认消息
  window.chatAskReply = function (msgIdx, answer) {
    loadMsgs();
    const rec = msgs[msgIdx];
    if (!rec || rec.special !== 'ask-card' || rec.askStatus === 'answered') return;
    rec.askStatus = 'answered';
    rec.askAnswer = answer;
    saveMsgs();
    addOut(answer);
    addIn('收到你的回答。');
    // 就地更新已渲染的询问卡片
    const el = body.querySelector('.msg-ask[data-idx="' + msgIdx + '"]');
    if (el) {
      el.innerHTML = '<div class="msg-ask-card answered"><div class="msg-ask-q">' + (rec.askQuestion || '') + '</div><div class="msg-ask-a">✓ 已回答：' + answer + '</div></div>';
    }
  };
  // 撤回：更新记录 + DOM（点击可查看原文）
  function retractMsg(msgEl, side) {
    const b = msgEl.querySelector('.msg-bubble');
    if (!b) return;
    const idx = parseInt(msgEl.dataset.idx, 10);
    if (!isNaN(idx) && msgs[idx]) {
      msgs[idx].retracted = true;
      msgs[idx].orig = b.innerHTML;
      saveMsgs();
    }
    b.dataset.orig = b.innerHTML;
    b.innerHTML = '<span style="opacity:.6;font-size:12px;cursor:pointer">' + (side === 'out' ? '我' : '对方') + '撤回了一条消息</span>';
    bindToggle(b, side);
  }

  // 按概率生成回复文本
  function genReplyText(c) {
    const pool = getPool();
    let reply = '', type = 'text';
    if (pool.sticker.length && hit(c['sticker-prob'])) {
      reply = pick(pool.sticker); type = 'sticker';
    } else if (pool.emoji.length && hit(c['emoji-prob'])) {
      reply = pick(pool.emoji); type = 'emoji';
    } else if (pool.image.length && hit(c['image-prob'])) {
      reply = pick(pool.image); type = 'image';
    } else if (pool.voice.length && hit(c['voice-prob'])) {
      reply = pick(pool.voice); type = 'voice';
    } else {
      reply = pick(pool.text) || '收到～';
    }
    if (type === 'text' && pool.kaomoji.length && hit(c['kaomoji-prob'])) {
      reply += ' ' + pick(pool.kaomoji);
    }
    return { text: reply, type: type };
  }

  // ---- 被动回复 ----
  function scheduleReply() {
    const c = cfg();
    if (hit(c['rn-prob'])) {
      setTimeout(() => addIn('', { special: 'read' }), randInt(1000, 4000));
      return;
    }
    const delay = (c['rs-min'] + Math.random() * Math.max(1, c['rs-max'] - c['rs-min'])) * 1000;
    // 等待回复期间显示「正在输入」
    showTyping();
    setTimeout(() => {
      hideTyping();
      if (hit(c['touch-prob'])) {
        performPoke();
        return;
      }
      const quote = hit(c['quote-prob']) ? (lastMineText || '…') : null;
      // 回复条数（每条消息独立生成内容）
      const count = randInt(c['reply-min'], c['reply-max']);
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          hideTyping();
          replyOnce(c, quote);
          // 还有下一条时继续显示「正在输入」
          if (i < count - 1) showTyping();
        }, i * randInt(1200, 2800));
      }
    }, delay);
  }
  // 单条回复：生成内容 + 发送 + 收藏/情绪/撤回 附带逻辑（供普通回复与「让对方继续说」共用）
  function replyOnce(c, quote) {
    const rep = genOneReply(c);
    const m = addIn(rep.text, { quote: quote, type: rep.type, parts: rep.parts });
    // TA 收藏夹：联系人有概率（30%）收藏我发的最新一条消息（独立于情绪系统，任何回复后判定）
    if (lastMineText && Math.random() * 100 < 30) {
      const fav = getFav();
      // 图片/表情按 dataURL 识别类型，避免收藏时按文本存导致显示超长乱码
      const favType = lastMineText.indexOf('data:') === 0 ? 'image' : 'text';
      fav.push({ side: 'out', text: lastMineText, type: favType, ts: Date.now(), by: 'ta' });
      saveFav(fav);
      setTimeout(() => toast('TA 收藏了你的一条消息'), 1200);
    }
    // 情绪系统触发链（星言完整版）：文字回复和表情包回复都会触发
    if (rep.type === 'text' || rep.type === 'sticker' || rep.type === 'image') {
      if (window.addChatCount) window.addChatCount();
      const chain = (window.triggerEmotionChain && window.triggerEmotionChain()) || null;
      if (chain && chain.length) {
        // 类型名映射：情绪 / 心意 / 交流意图
        const typeName = { mood: '情绪', heart: '心意', intent: '交流意图' };
        setTimeout(() => {
          // 追加到主回复气泡 m 内部下方（不新增消息）
          // 所有字卡放进同一个 .msg-moods 容器：一条虚线与正文隔离，字卡紧凑同行
          const bm = m.querySelector('.msg-bubble');
          if (bm) {
            let mm = bm.querySelector('.msg-moods');
            if (!mm) {
              mm = document.createElement('div');
              mm.className = 'msg-moods';
              bm.appendChild(mm);
            }
            chain.forEach(it => {
              const tag = typeName[it.type] || '情绪';
              mm.innerHTML += '<div class="msg-mood' + (it.type === 'intent' ? ' msg-intent' : '') + '"><span class="msg-mood-tag">' + tag + '</span><span>' + it.content + '</span></div>';
            });
            // 持久化情绪字卡
            const idx2 = Number(m.dataset.idx);
            if (!isNaN(idx2) && msgs[idx2]) {
              msgs[idx2].mood = msgs[idx2].mood || [];
              chain.forEach(it => {
                msgs[idx2].mood.push({ tag: typeName[it.type] || '情绪', label: it.content });
              });
              saveMsgs();
            }
          }
        }, 500);
      }
    }
    if (hit(c['rc-prob'])) {
      setTimeout(() => {
        retractMsg(m, 'in');
        if (hit(c['rc-refix'])) {
          showTyping();
          setTimeout(() => { hideTyping(); replyOnce(c, null); }, 600);
        }
      }, 900);
    }
  }
  // 「让对方继续说」：点击顶部联系人昵称触发，立即发 1 条（forceSingle）
  window.continueChat = function () {
    const c = cfg();
    showTyping();
    setTimeout(() => {
      hideTyping();
      replyOnce(c, null);
    }, 500);
  };
  // 点击顶部联系人昵称：让对方继续说（绑定复用顶部已声明的 pname）
  if (pname) {
    pname.addEventListener('click', () => {
      if (window.continueChat) window.continueChat();
    });
  }
  // 点击顶部联系人头像：打开查岗半框（复用 poke-card 样式）
  const pAv = document.getElementById('chat-partner-av');
  if (pAv) {
    pAv.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.openCkPanel) window.openCkPanel();
    });
  }
  let lastMineText = '';

  // 生成一条回复文本：拼字卡命中 → 多卡空格拼接；否则单卡（默认字卡按概率混入）
  function genOneReply(c) {
    const pool = getPool();
    let t, type = 'text';
    if (c['py-en'] === 1 && hit(c['py-prob']) && pool.text.length) {
      const n = randInt(c['py-min'], c['py-max']);
      t = pickN(pool.text, n).join(' ');
    } else {
      const r = genReplyText(c);
      t = r.text;
      type = r.type;
    }
    // 图片/表情包类型：直接返回图片（不附加文字类字卡）
    if (type === 'sticker' || type === 'image') {
      return { text: t, type: type };
    }
    // 默认字卡混入（对应星言 defaultCommon 逻辑）
    const defs = (window.getDefaultCards && window.getDefaultCards()) || null;
    if (defs && defs.type === 'text' && defs.text) {
      t = defs.text;
    }
    // 回应字卡（独立池，类似默认字卡）：开启时按概率直接使用一条回应字卡
    const replyWord = (window.getReplyCard && window.getReplyCard()) || '';
    if (replyWord) {
      t = replyWord;
    }
    // 回应连接词附着（cf-prob 命中 + 按回复特征选类）
    if (hit(c['cf-prob'])) {
      const w = (window.getFollowupWord && window.getFollowupWord(t)) || '';
      if (w) t += ' ' + w;
    }
    // 联系人也可组合发送：按概率附加 1 张表情包/图片到同一条消息（图片池来自自定义字卡媒体）
    const parts = [{ k: 'text', v: t }];
    if (hit(c['sticker-prob'] || 0)) {
      const st = (window.getMediaCards && window.getMediaCards('sticker')) || [];
      if (st.length) parts.push({ k: 'img', v: st[Math.floor(Math.random() * st.length)] });
    } else if (hit(c['image-prob'] || 0)) {
      const im = (window.getMediaCards && window.getMediaCards('image')) || [];
      if (im.length) parts.push({ k: 'img', v: im[Math.floor(Math.random() * im.length)] });
    }
    return { text: t, type: 'text', parts: parts.length > 1 ? parts : null };
  }

  // ---- 主动发送 ----
  let autoTimer = null;
  function scheduleAutoSend() {
    clearTimeout(autoTimer);
    const c = cfg();
    if (c['as-en'] !== 1) {
      autoTimer = setTimeout(scheduleAutoSend, 30000);
      return;
    }
    let asMin = c['as-min'], asMax = c['as-max'] * 60;
    if (c['dnd-en'] === 1) { asMin = 1; asMax = 10800; }
    const delay = (asMin + Math.random() * Math.max(1, asMax - asMin)) * 1000;
    autoTimer = setTimeout(() => {
      tryAutoSend();
      scheduleAutoSend();
    }, delay);
  }
  function tryAutoSend() {
    const c = cfg();
    if (c['as-en'] !== 1) return;
    let prob = c['as-prob'];
    if (c['dnd-en'] === 1) prob = 10;
    if (!hit(prob)) return;
    if (hit(c['touch-prob'])) { performPoke(); return; }
    const pool = getPool();
    const count = randInt(c['as-count-min'], c['as-count-max']);
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        hideTyping();
        const m = addIn(pick(pool.text) || '在吗？');
        if (hit(c['rc-prob'])) {
          setTimeout(() => {
            retractMsg(m, 'in');
            if (hit(c['rc-refix'])) {
              showTyping();
              setTimeout(() => { hideTyping(); addIn(pick(pool.text) || '…'); }, 600);
            }
          }, 900);
        }
        // 还有下一条时继续显示「正在输入」
        if (i < count - 1) showTyping();
      }, i * randInt(900, 2600));
    }
  }

  // ---- 进入聊天页：恢复历史 ----
  const chatApp = document.querySelector('.app[data-app="chat"]');
  const chatPage = document.getElementById('page-chat');
  function enterChat() {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const phoneTab = document.querySelector('.tab[data-page="page-phone"]');
    if (phoneTab) phoneTab.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.hidden = true);
    chatPage.hidden = false;
    fillAvatar('chat-user-av', 'avatar-user');
    fillAvatar('chat-partner-av', 'avatar-partner');
    if (window.applyChatSettings) window.applyChatSettings();
    // 恢复历史消息（不打断 TA 正在输入的状态，返回时自动恢复显示）
    loadMsgs();
    body.innerHTML = '';
    msgs.forEach((rec, i) => {
      const m = renderMsg(rec);
      m.dataset.idx = i;
    });
    if (typingOn && chatVisible()) typingEl.hidden = false;
    scheduleAutoSend();
  }
  if (chatApp && chatPage) {
    chatApp.addEventListener('click', () => {
      const editing = Array.from(document.querySelectorAll('.app-grid'))
        .some(g => g.classList.contains('editing'));
      if (editing) return;
      enterChat();
    });
  }

  // 返回桌面（不打断 TA 正在输入/发送的节奏）
  const back = document.getElementById('chat-back');
  if (back) {
    back.addEventListener('click', () => {
      const phonePage = document.getElementById('page-phone');
      if (phonePage) {
        document.querySelectorAll('.page').forEach(p => p.hidden = true);
        phonePage.hidden = false;
      }
    });
  }

  // 聊天设置：右上角三点进入，返回回聊天页
  const csBtn = document.getElementById('chat-settings-btn');
  const csPage = document.getElementById('page-chat-settings');
  if (csBtn && csPage) {
    csBtn.addEventListener('click', () => {
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      csPage.hidden = false;
    });
  }
  const csBack = document.getElementById('cs-back');
  if (csBack) {
    csBack.addEventListener('click', () => {
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      chatPage.hidden = false;
    });
  }

  // ---- 更多功能面板 ----
  const morePanel = document.getElementById('chat-more-panel');
  const moreBtn = document.getElementById('chat-more-btn');
  if (moreBtn && morePanel) {
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      morePanel.hidden = !morePanel.hidden;
    });
    // 点击面板外部关闭
    document.addEventListener('click', (e) => {
      if (!morePanel.hidden && !morePanel.contains(e.target) && e.target !== moreBtn && !moreBtn.contains(e.target)) {
        morePanel.hidden = true;
      }
    });
  }
  // 我方拍一拍：聊天页内浮层卡片（展示分组/字卡，点击使用）
  const pokeCard = document.getElementById('poke-card');
  const pokeList = document.getElementById('poke-list');
  const pokeRandom = document.getElementById('poke-random');
  const pokeRandomName = document.getElementById('poke-random-name');
  const pokeClose = document.getElementById('poke-card-close');
  const pokeName = document.getElementById('poke-partner-name');
  // 发送一次拍一拍（触发联系人回复）
  function sendPoke(action) {
    const name = store.get('lbl-partner') || 'TA';
    let text;
    if (action.indexOf('你') >= 0) {
      // 字卡含"你"：替换成联系人昵称，如"戳了戳你的脸蛋"→"戳了戳TA的脸蛋"
      text = '我 ' + action.replace(/你/g, name);
    } else {
      // 字卡不含"你"：在末尾补联系人昵称，如"戳一戳"→"戳一戳 TA"
      text = '我 ' + action + ' ' + name;
    }
    addRec({ side: 'in', text: text, special: 'poke' });
    if (window.logFish) window.logFish();
    // 拍一拍后联系人快速响应：1-3 秒内必回复或已读不回（不等 rs 长延迟）
    setTimeout(() => {
      const c2 = cfg();
      if (hit(c2['rn-prob'])) {
        addIn('', { special: 'read' });
        return;
      }
      showTyping();
      setTimeout(() => {
        hideTyping();
        if (hit(c2['touch-prob'])) { performPoke(); return; }
        const r = genOneReply(c2);
        const m2 = addIn(r.text, { type: r.type });
        if (hit(c2['rc-prob'])) {
          setTimeout(() => { retractMsg(m2, 'in'); }, 900);
        }
      }, randInt(800, 2000));
    }, randInt(600, 1200));
  }
  function renderPokeCard() {
    const name = store.get('lbl-partner') || 'TA';
    if (pokeName) pokeName.textContent = name;
    if (pokeRandomName) pokeRandomName.textContent = name;
    const groups = (window.getPokeGroups && window.getPokeGroups()) || [];
    if (!pokeList) return;
    pokeList.innerHTML = '';
    if (!groups.length) {
      pokeList.innerHTML = '<div class="cc-empty">暂无拍一拍字卡<br>请到 自定义聊天字卡 → 拍一拍 添加</div>';
      return;
    }
    groups.forEach(([gname, arr]) => {
      if (!arr.length) return;
      const h = document.createElement('div');
      h.className = 'cc-group-header';
      h.innerHTML = '<span class="ccg-name">' + gname + '</span><span class="ccg-count">' + arr.length + '</span>';
      pokeList.appendChild(h);
      arr.forEach(c => {
        const d = document.createElement('div');
        d.className = 'cc-item glass';
        d.innerHTML = '<div class="cc-txt"><div class="t">' + c + '</div></div>';
        d.addEventListener('click', () => { sendPoke(c); closePokeCard(); });
        pokeList.appendChild(d);
      });
    });
  }
  function closePokeCard() {
    if (pokeCard) pokeCard.hidden = true;
  }
  const morePoke = document.getElementById('more-poke');
  if (morePoke) {
    morePoke.addEventListener('click', (e) => {
      e.stopPropagation();
      openPokeCard();
    });
  }

  // ---- 占卜：打开占卜页 ----
  const moreDivine = document.getElementById('more-divine');
  if (moreDivine) {
    moreDivine.addEventListener('click', (e) => {
      e.stopPropagation();
      if (morePanel) morePanel.hidden = true;
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      const dp = document.getElementById('page-divine');
      if (dp) dp.hidden = false;
    });
  }

  // ---- TA的提问：4 个"让TA现在…"按钮（TA的询问/小问题/好奇/吐槽） ----
  function bindTaNow(id, fn) {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (morePanel) morePanel.hidden = true;
        if (fn) fn();
      });
    }
  }
  bindTaNow('more-ask-now', () => { if (window.triggerTaAskNow) window.triggerTaAskNow(); });
  bindTaNow('more-choose-now', () => { if (window.triggerTaChooseNow) window.triggerTaChooseNow(); });
  bindTaNow('more-curious-now', () => { if (window.triggerTaCuriousNow) window.triggerTaCuriousNow(); });
  bindTaNow('more-roast-now', () => { if (window.triggerTaRoastNow) window.triggerTaRoastNow(); });

  // ---- 帮我决定（星言版：输入问题 + 选项，随机决定）----
  const moreDecide = document.getElementById('more-decide');
  if (moreDecide) {
    moreDecide.addEventListener('click', (e) => {
      e.stopPropagation();
      if (morePanel) morePanel.hidden = true;
      if (window.openModal) {
        // 第一步：输入问题
        window.openModal('帮我决定 · 你的纠结', '', (q) => {
          const question = (q || '').trim() || '这个决定';
          // 第二步：输入选项（默认 是/否/半对）
          if (window.openModal) {
            window.openModal('帮我决定 · 选项（逗号分隔）', '是,否,半对', (optsRaw) => {
              const opts = String(optsRaw || '').split(/[,，]/).map(x => x.trim()).filter(Boolean);
              if (!opts.length) opts.push('是', '否');
              const pick = opts[Math.floor(Math.random() * opts.length)];
              // 第三步：显示结果
              if (window.openModal) {
                window.openModal('帮我决定', '', () => {}, {
                  noInput: true,
                  staticText: '问题：' + question + '\n\n我的建议：\n' + pick
                });
              }
            }, { textarea: true, textareaPlaceholder: '是,否,半对\n或自定义选项，逗号分隔' });
          }
        }, { textarea: true, textareaPlaceholder: '例如：我今晚该吃火锅吗？' });
      }
    });
  }

  // ---- 邀请TA（星言版：发送邀请 → TA 接受/拒绝/未回应）----
  const moreInvite = document.getElementById('more-invite');
  if (moreInvite) {
    moreInvite.addEventListener('click', (e) => {
      e.stopPropagation();
      if (morePanel) morePanel.hidden = true;
      if (window.openModal) {
        window.openModal('邀请TA · 想邀请TA做什么？', '', (v) => {
          const content = (v || '').trim();
          if (!content) return;
          addRec({ side: 'out', text: '邀请：' + content, special: 'invite' });
          if (window.logFish) window.logFish();
          setTimeout(() => {
            const roll = Math.random();
            const name = store.get('lbl-partner') || 'TA';
            if (roll < 0.55) {
              addRec({ side: 'in', text: name + ' 接受了你的邀请', special: 'invite-reply' });
              setTimeout(() => {
                const acc = ['好，我答应你。', '可以呀。', '我陪你。', '走吧。', '嗯，陪你。'][Math.floor(Math.random() * 5)];
                addIn(acc);
              }, 800);
            } else if (roll < 0.85) {
              addRec({ side: 'in', text: name + ' 拒绝了你的邀请', special: 'invite-reply' });
              setTimeout(() => {
                const rej = ['这次不行。', '下次吧。', '抱歉。', '今天不方便。'][Math.floor(Math.random() * 4)];
                addIn(rej);
              }, 800);
            } else {
              addRec({ side: 'in', text: name + ' 暂时没有回应', special: 'invite-reply' });
            }
          }, 1500 + Math.random() * 2500);
        }, { textarea: true, textareaPlaceholder: '例如：一起睡觉' });
      }
    });
  }

  // ---- 问问TA（星言版：提问 → TA 回答）----
  const moreAsk = document.getElementById('more-ask');
  if (moreAsk) {
    moreAsk.addEventListener('click', (e) => {
      e.stopPropagation();
      if (morePanel) morePanel.hidden = true;
      if (window.openModal) {
        window.openModal('问问TA · 你的问题', '', (q) => {
          const question = (q || '').trim();
          if (!question) return;
          addRec({ side: 'out', text: '问：' + question, special: 'ask' });
          if (window.logFish) window.logFish();
          setTimeout(() => {
            const defs = ['嗯嗯', '我想想…', '应该吧', '好呀', '我陪你', '可以的', '那挺好呀', '我觉得可以', '听你的'];
            const text = defs[Math.floor(Math.random() * defs.length)];
            addIn(text);
          }, 1500 + Math.random() * 2500);
        }, { textarea: true, textareaPlaceholder: '例如：周末要不要一起去看电影？' });
      }
    });
  }

  // ---- 搜索聊天记录（星言版：搜索全部历史消息）----
  const moreSearch = document.getElementById('more-search');
  if (moreSearch) {
    moreSearch.addEventListener('click', (e) => {
      e.stopPropagation();
      if (morePanel) morePanel.hidden = true;
      if (window.openModal) {
        window.openModal('搜索聊天记录', '', (kw) => {
          const q = (kw || '').trim();
          if (!q) return;
          const results = msgs.filter(m => m.text && typeof m.text === 'string' && m.text.indexOf(q) >= 0);
          if (window.openModal) {
            if (!results.length) {
              window.openModal('搜索聊天记录', '', () => {}, {
                noInput: true,
                staticText: '没有找到包含「' + q + '」的消息'
              });
            } else {
              const lines = results.slice(0, 10).map(m =>
                (m.side === 'out' ? '我：' : (store.get('lbl-partner') || 'TA') + '：') + m.text
              ).join('\n');
              window.openModal('搜索聊天记录 · ' + results.length + ' 条', '', () => {}, {
                noInput: true,
                staticText: lines + (results.length > 10 ? '\n… 还有 ' + (results.length - 10) + ' 条' : '')
              });
            }
          }
        });
      }
    });
  }

  // ---- 通话（星言版：拨号 → 接通/未接，模拟通话）----
  const moreCall = document.getElementById('more-call');
  if (moreCall) {
    moreCall.addEventListener('click', (e) => {
      e.stopPropagation();
      if (morePanel) morePanel.hidden = true;
      const name = store.get('lbl-partner') || 'TA';
      addRec({ side: 'out', text: '拨打 ' + name + ' 语音通话', special: 'call' });
      if (window.logFish) window.logFish();
      setTimeout(() => {
        const connected = Math.random() > 0.3;
        if (connected) {
          addRec({ side: 'in', text: '通话已接通 · ' + (5 + Math.floor(Math.random() * 30)) + ' 秒', special: 'call-reply' });
        } else {
          addRec({ side: 'in', text: name + ' 未接听', special: 'call-reply' });
        }
      }, 2000 + Math.random() * 2000);
    });
  }
  if (pokeClose) pokeClose.addEventListener('click', (e) => { e.stopPropagation(); closePokeCard(); });
  // 打开拍一拍：关掉其他底部半框（表情包/头像互动），露出聊天消息
  function openPokeCard() {
    if (!pokeCard) return;
    const ep = document.getElementById('emoji-panel');
    if (ep) ep.hidden = true;
    if (window.closeAvlib) window.closeAvlib();
    pokeCard.hidden = false;
    if (morePanel) morePanel.hidden = true;
    renderPokeCard();
  }
  // 点击卡片外部关闭
  document.addEventListener('click', (e) => {
    if (pokeCard && !pokeCard.hidden && !pokeCard.contains(e.target)) closePokeCard();
  });
  if (pokeRandom) {
    pokeRandom.addEventListener('click', (e) => { e.stopPropagation();
      const cards = (window.getPokeCards && window.getPokeCards()) || [];
      const action = cards.length ? pick(cards) : '拍了拍你';
      sendPoke(action);
      closePokeCard();
    });
  }

  // ---- 消息气泡操作：引用 / 收藏 / 撤回 / 编辑 ----
  const msgActions = document.getElementById('msg-actions');
  let activeMsgEl = null;   // 当前操作的消息 DOM
  let activeSide = 'in';    // 当前操作消息方向
  let lastQuote = null;     // 待引用内容

  // 收藏存储
  function getFav() { try { return JSON.parse(store.get('fav-msgs') || '[]'); } catch (e) { return []; } }
  function saveFav(list) { store.set('fav-msgs', JSON.stringify(list)); }

  function closeMsgActions() {
    if (msgActions) msgActions.hidden = true;
    activeMsgEl = null;
  }
  // 气泡点击弹出操作菜单
  if (body) {
    body.addEventListener('click', (e) => {
      const b = e.target.closest('.msg-bubble');
      if (!b) { closeMsgActions(); return; }
      const item = b.closest('.msg');
      if (!item) return;
      // 特殊消息不弹菜单（已读不回/拍一拍/撤回提示）
      const special = item.classList.contains('msg-poke');
      if (special) return;
      if (b.textContent.indexOf('撤回了一条消息') >= 0 || b.textContent.indexOf('已读不回') >= 0) return;
      e.stopPropagation();
      activeMsgEl = item;
      activeSide = item.classList.contains('msg-out') ? 'out' : 'in';
      // 显示对应按钮：我的消息多 撤回/编辑
      if (msgActions) {
        msgActions.querySelectorAll('.ma-mine').forEach(b2 => b2.hidden = activeSide !== 'out');
        msgActions.hidden = false;
        // 定位到气泡旁边：优先气泡上方，空间不足放下方
        const bRect = b.getBoundingClientRect();
        const aw = msgActions.offsetWidth || 200;
        const ah = msgActions.offsetHeight || 50;
        let x = bRect.left + bRect.width / 2 - aw / 2;
        x = Math.max(10, Math.min(window.innerWidth - aw - 10, x));
        let y = bRect.top - ah - 8;
        if (y < 50) y = bRect.bottom + 8; // 气泡上方放不下，放下方
        msgActions.style.left = x + 'px';
        msgActions.style.top = y + 'px';
      }
    });
    // 点击外部关闭
    document.addEventListener('click', (e) => {
      if (msgActions && !msgActions.hidden && !msgActions.contains(e.target)) closeMsgActions();
    });
  }
  // 操作执行
  if (msgActions) {
    msgActions.addEventListener('click', (e) => {
      const btn = e.target.closest('.ma-btn');
      if (!btn) return;
      const act = btn.dataset.act;
      const idx = activeMsgEl ? Number(activeMsgEl.dataset.idx) : -1;
      const rec = (idx >= 0 && msgs[idx]) ? msgs[idx] : null;
      if (act === 'quote') {
        // 引用：记录待引用内容，下次发送带引用块
        if (rec) {
          lastQuote = { side: rec.side, text: rec.text, type: rec.type };
          toast('已选择引用，发送消息时带上');
        }
        closeMsgActions();
      } else if (act === 'fav') {
        if (rec) {
          const fav = getFav();
          fav.push({ side: rec.side, text: rec.text, type: rec.type || 'text', ts: rec.ts || Date.now(), by: 'me', mood: (rec.mood || []).slice() });
          saveFav(fav);
          toast('已收藏到我的收藏');
        }
        closeMsgActions();
      } else if (act === 'retract') {
        if (activeMsgEl) retractMsg(activeMsgEl, 'out');
        closeMsgActions();
      } else if (act === 'edit') {
        if (rec && window.openModal) {
          const orig = rec.text;
          window.openModal('编辑消息', orig.indexOf('data:') === 0 ? '' : orig, (v) => {
            const val = (v || '').trim();
            if (!val) return;
            // 更新记录与 DOM
            rec.text = val;
            rec.type = 'text';
            saveMsgs();
            const b = activeMsgEl.querySelector('.msg-bubble');
            if (b) b.innerHTML = '<span style="opacity:.85">' + val + '</span>';
          });
        }
        closeMsgActions();
      }
    });
  }
  // 轻提示（复用 cc-toast 风格）
  function toast(msg) {
    let t = document.getElementById('cc-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'cc-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = 'cc-toast show';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = 'cc-toast'; }, 2000);
  }

  // ---- 收藏页 ----
  const favPage = document.getElementById('page-fav');
  const favList = document.getElementById('fav-list');
  let favTab = 'mine'; // mine=我的收藏 ta=联系人的收藏
  function renderFav() {
    if (!favList) return;
    const fav = getFav();
    favList.innerHTML = '';
    const partnerName = store.get('lbl-partner') || 'TA';
    const myName = store.get('lbl-user') || '我';
    // 按"谁收藏"分组：TA 收藏夹自动收藏（by==='ta'）归 TA；手动收藏（含旧数据）归我
    const myFav = fav.filter(f => f.by !== 'ta');
    const taFav = fav.filter(f => f.by === 'ta');
    // tab 高亮
    const tabsEl = document.getElementById('fav-tabs');
    if (tabsEl) {
      tabsEl.querySelectorAll('.fav-tab').forEach(t => t.classList.toggle('sel', t.dataset.tab === favTab));
    }
    const list = favTab === 'ta' ? taFav : myFav;
    const title = favTab === 'ta' ? partnerName + ' 的收藏' : myName + ' 的收藏';
    const empty = favTab === 'ta' ? 'TA 还没有收藏' : '暂无收藏';
    // 组标题
    const h = document.createElement('div');
    h.className = 'cc-group-header';
    h.innerHTML = '<span class="ccg-name">' + title + '</span><span class="ccg-count">' + list.length + '</span>';
    favList.appendChild(h);
    if (!list.length) {
      favList.innerHTML += '<div class="fav-empty">' + empty + '</div>';
      return;
    }
    list.forEach(f => renderFavItem(f));
    function renderFavItem(f) {
      const m = document.createElement('div');
      m.className = 'msg ' + (f.side === 'out' ? 'msg-out' : 'msg-in');
      const timeHtml = f.ts ? '<span class="msg-time">' + fmtTime(f.ts) + '</span>' : '';
      const side = '<div class="msg-side"><div class="msg-av"></div>' + timeHtml + '</div>';
      m.innerHTML = f.side === 'out'
        ? '<div class="msg-bubble"></div>' + side
        : side + '<div class="msg-bubble"></div>';
      const b = m.querySelector('.msg-bubble');
      // 图片/表情：按类型或按 dataURL 内容识别（兼容旧数据收藏时 type 误存为 text 的乱码）
      const isImg = f.type === 'sticker' || f.type === 'image' || (typeof f.text === 'string' && f.text.indexOf('data:') === 0);
      if (isImg) {
        b.style.padding = '6px';
        b.innerHTML = '<img class="msg-img" src="' + f.text + '" alt="表情">';
      } else {
        b.innerHTML = '<span style="opacity:.85">' + f.text + '</span>';
      }
      // 收藏消息的情绪字卡
      if (f.mood && f.mood.length) {
        f.mood.forEach(md => {
          if (md.tag === '交流意图') {
            b.innerHTML += '<div class="msg-mood msg-intent"><span class="msg-mood-tag">' + md.tag + '</span><span>' + md.label + '</span></div>';
          } else {
            b.innerHTML += '<div class="msg-mood"><span class="msg-mood-tag">' + md.tag + '</span><span>' + md.label + '</span></div>';
          }
        });
      }
      fillAvatar(m.querySelector('.msg-av'), f.side === 'out' ? 'avatar-user' : 'avatar-partner');
      // 长按删除收藏（600ms）
      let pressTimer = null;
      m.addEventListener('touchstart', (e) => {
        pressTimer = setTimeout(() => {
          const fav2 = getFav();
          const idx2 = fav2.indexOf(f);
          if (idx2 >= 0) {
            if (window.openModal) {
              window.openModal('删除这条收藏？', '', () => {
                fav2.splice(idx2, 1);
                saveFav(fav2);
                renderFav();
              }, { noInput: true });
            }
          }
        }, 600);
      }, { passive: true });
      m.addEventListener('touchend', () => clearTimeout(pressTimer));
      m.addEventListener('touchmove', () => clearTimeout(pressTimer));
      m.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const fav2 = getFav();
        const idx2 = fav2.indexOf(f);
        if (idx2 >= 0 && window.openModal) {
          window.openModal('删除这条收藏？', '', () => {
            fav2.splice(idx2, 1);
            saveFav(fav2);
            renderFav();
          }, { noInput: true });
        }
      });
      favList.appendChild(m);
    }
  }
  // 收藏 tab 切换
  const favTabs = document.getElementById('fav-tabs');
  if (favTabs) {
    favTabs.addEventListener('click', (e) => {
      const tb = e.target.closest('.fav-tab');
      if (!tb) return;
      favTab = tb.dataset.tab;
      renderFav();
    });
  }

  // 桌面收藏图标进入
  const favApp = document.querySelector('.app[data-app="note"]');
  if (favApp && favPage) {
    favApp.addEventListener('click', () => {
      const editing = Array.from(document.querySelectorAll('.app-grid')).some(g => g.classList.contains('editing'));
      if (editing) return;
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      favPage.hidden = false;
      renderFav();
    });
  }
  const favBack = document.getElementById('fav-back');
  if (favBack) {
    favBack.addEventListener('click', () => {
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      const phonePage = document.getElementById('page-phone');
      if (phonePage) phonePage.hidden = false;
    });
  }

  // ---- 表情包面板：显示「联系人昵称的表情包」分组与表情 ----
  const emojiPanel = document.getElementById('emoji-panel');
  const emojiList = document.getElementById('emoji-list');
  const emojiClose = document.getElementById('emoji-close');
  const emojiTitle = document.getElementById('emoji-panel-title');
  const emojiBtn = document.getElementById('chat-emoji-btn');
  function renderEmojiPanel() {
    const name = store.get('lbl-partner') || 'TA';
    if (emojiTitle) emojiTitle.textContent = name + ' 的表情包';
    const groups = (window.getMediaGroups && window.getMediaGroups('sticker')) || [];
    if (!emojiList) return;
    emojiList.innerHTML = '';
    if (!groups.length) {
      emojiList.innerHTML = '<div class="emoji-empty">暂无表情包<br>请到 自定义聊天字卡 → 表情包 上传</div>';
      return;
    }
    groups.forEach(([gname, arr]) => {
      if (!arr.length) return;
      const h = document.createElement('div');
      h.className = 'cc-group-header';
      h.innerHTML = '<span class="ccg-name">' + gname + '</span><span class="ccg-count">' + arr.length + '</span>';
      emojiList.appendChild(h);
      const grid = document.createElement('div');
      grid.className = 'emoji-grid';
      arr.forEach(src => {
        const d = document.createElement('div');
        d.className = 'emoji-item';
        d.innerHTML = '<img src="' + src + '" alt="表情">';
        d.addEventListener('click', () => {
          // 表情包加入待发送草稿（可与文字/图片组合成一条消息）
          draftImgs.push(src);
          renderDraft();
          closeEmojiPanel();
        });
        grid.appendChild(d);
      });
      emojiList.appendChild(grid);
    });
  }
  function openEmojiPanel() {
    if (!emojiPanel) return;
    // 关闭其他底部半框（拍一拍/头像互动）
    const pc = document.getElementById('poke-card');
    if (pc) pc.hidden = true;
    if (window.closeAvlib) window.closeAvlib();
    renderEmojiPanel();
    emojiPanel.hidden = false;
    if (morePanel) morePanel.hidden = true;
  }
  function closeEmojiPanel() {
    if (emojiPanel) emojiPanel.hidden = true;
  }
  if (emojiBtn) {
    emojiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEmojiPanel();
    });
  }
  if (emojiClose) emojiClose.addEventListener('click', (e) => { e.stopPropagation(); closeEmojiPanel(); });
  document.addEventListener('click', (e) => {
    if (emojiPanel && !emojiPanel.hidden && !emojiPanel.contains(e.target) && !emojiBtn.contains(e.target)) closeEmojiPanel();
  });

  // 发送消息（支持 文字 + 图片/表情 组合成一条消息）
  const input = document.getElementById('chat-input');
  const send = document.getElementById('chat-send');
  const draftEl = document.getElementById('chat-draft');
  const draftItems = document.getElementById('chat-draft-items');
  const draftClear = document.getElementById('chat-draft-clear');
  let draftImgs = []; // 待发送图片（表情包/图片 dataURL）
  function renderDraft() {
    if (!draftEl || !draftItems) return;
    draftEl.hidden = !draftImgs.length;
    draftItems.innerHTML = '';
    draftImgs.forEach((src, i) => {
      const it = document.createElement('div');
      it.className = 'chat-draft-item';
      it.innerHTML = '<img src="' + src + '" alt=""><button class="chat-draft-x" data-i="' + i + '">✕</button>';
      it.querySelector('.chat-draft-x').addEventListener('click', () => {
        draftImgs.splice(i, 1);
        renderDraft();
      });
      draftItems.appendChild(it);
    });
  }
  if (draftClear) {
    draftClear.addEventListener('click', () => { draftImgs = []; renderDraft(); });
  }
  // 图片按钮：多选图片 → 压缩 → 加入待发送
  const imgBtn = document.getElementById('chat-img-btn');
  if (imgBtn) {
    imgBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const fi = document.createElement('input');
      fi.type = 'file'; fi.accept = 'image/*'; fi.multiple = true;
      fi.onchange = () => {
        const files = Array.prototype.slice.call(fi.files || []);
        if (!files.length) return;
        files.forEach(f => {
          const reader = new FileReader();
          reader.onload = () => {
            const img = new Image();
            img.onload = () => {
              try {
                const c = document.createElement('canvas');
                const scale = Math.min(1, 720 / Math.max(img.width, img.height));
                c.width = Math.max(1, Math.round(img.width * scale));
                c.height = Math.max(1, Math.round(img.height * scale));
                c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                draftImgs.push(c.toDataURL('image/jpeg', 0.85));
              } catch (err) {
                draftImgs.push(reader.result);
              }
              renderDraft();
            };
            img.src = reader.result;
          };
          reader.readAsDataURL(f);
        });
      };
      fi.click();
    });
  }
  function buildParts(text) {
    const parts = [];
    const t = (text || '').trim();
    if (t) parts.push({ k: 'text', v: t });
    draftImgs.forEach(src => parts.push({ k: 'img', v: src }));
    return parts;
  }
  const addMsg = (text) => {
    const parts = buildParts(text);
    if (!parts.length) return;
    const t = (text || '').trim();
    lastMineText = t || (draftImgs.length ? draftImgs[0] : '');
    const rec = { side: 'out', text: lastMineText, parts: parts };
    if (lastQuote) {
      rec.quote = lastQuote.type === 'sticker' || lastQuote.type === 'image' ? lastQuote.text : lastQuote.text;
      rec.qside = lastQuote.side;
      lastQuote = null;
    }
    addRec(rec);
    input.value = '';
    draftImgs = [];
    renderDraft();
    if (window.logFish) window.logFish();
    scheduleReply();
  };
  if (send) send.addEventListener('click', () => addMsg(input.value));
  if (input) {
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addMsg(input.value); });
  }
})();
