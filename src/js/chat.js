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
    // 注意：换头像消息不做文案迁移——
    // 「昵称 更换了头像」是联系人自己换的头像（avatar-lib 自动随机/手动切换），
    // 「我 更换了 TA 的头像」是"我"给联系人换头像，两者都要保留原样
  // 旧消息迁移：来电消息里的铃铛图标 → 电话图标（历史消息的图标数据不会自动变）
  {
    const bellSvg = '<svg class="st-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v3M4.2 4.2l2.2 2.2M2 12h3M19 12h3M4.2 19.8l2.2-2.2M17.6 17.6l2.2 2.2"/><path d="M12 6a6 6 0 016 6v4h-3v-4a3 3 0 00-6 0v4H6v-4a6 6 0 016-6z"/><path d="M9 20h6"/></svg>';
    const telSvg = '<svg class="st-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>';
    let iconMigrated = false;
    msgs.forEach(r => {
      if (r && typeof r.text === 'string' && r.text.indexOf(bellSvg) >= 0) {
        r.text = r.text.split(bellSvg).join(telSvg);
        iconMigrated = true;
      }
    });
    if (iconMigrated) saveMsgs();
  }
  // 旧消息迁移：来信提示里的 ✉️ emoji → 信封 SVG（历史消息的 emoji 不会自动变）
  {
    const envSvg = '<svg class="st-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>';
    let envMigrated = false;
    msgs.forEach(r => {
      if (r && r.special === 'poke' && typeof r.text === 'string') {
        const t = r.text.replace(/✉️\s*/g, '').replace(/✉\s*/g, '');
        if (t !== r.text) { r.text = envSvg + t; envMigrated = true; }
      }
    });
    if (envMigrated) saveMsgs();
  }
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
    if (chatVisible()) {
      typingEl.hidden = false;
      // 给消息区底部留出提示位，避免「正在输入」遮挡最后一条消息
      const cb = document.getElementById('chat-body');
      if (cb) cb.classList.add('typing-active');
    }
  }
  function hideTyping() {
    if (!typingEl) return;
    typingOn = false;
    typingEl.hidden = true;
    const cb = document.getElementById('chat-body');
    if (cb) cb.classList.remove('typing-active');
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
  function quoteHtml(q, side) {
    // side = 被引用消息的发送方（'out'=我发，'in'=TA发）
    const who = side === 'out' ? (store.get('lbl-user') || '我') : (store.get('lbl-partner') || 'TA');
    if (typeof q === 'string' && q.indexOf('data:') === 0) {
      // 引用图片（表情包）缩略图
      return '<div class="msg-quote"><span class="msg-quote-label">引用 ' + who + '</span><img class="msg-quote-img" src="' + q + '" alt="图片"></div>';
    }
    return '<div class="msg-quote"><span class="msg-quote-label">引用 ' + who + '</span><span class="msg-quote-text">' + String(q || '').replace(/</g, '&lt;') + '</span></div>';
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
      // 表情包：小图；图片：大图可点击查看
      b.style.padding = '6px';
      b.style.background = '';
      b.style.border = '';
      b.style.boxShadow = '';
      b.innerHTML = rec.type === 'image'
        ? '<img class="msg-img msg-img-big" src="' + rec.text + '" alt="图片">'
        : '<img class="msg-img msg-img-sm" src="' + rec.text + '" alt="表情">';
      if (rec.type === 'image') {
        b.querySelector('.msg-img-big').addEventListener('click', () => { if (window.viewChatImage) window.viewChatImage(rec.text); });
      }
    } else if (rec.retracted) {
      b.dataset.orig = rec.orig || rec.text;
      b.innerHTML = '<span style="opacity:.6;font-size:12px;cursor:pointer">' + (rec.side === 'out' ? '我' : '对方') + '撤回了一条消息</span>';
      bindToggle(b, rec.side);
    } else if (rec.parts && rec.parts.length) {
      // 组合消息：文字 + 图片/表情（同一气泡内，图片网格 + 文字）
      // 图片 → 大图可点击；表情包 → 小图（sub 字段区分，旧数据按图片处理）
      const imgs = rec.parts.filter(p => p.k === 'img').map(p => p);
      const textPart = rec.parts.filter(p => p.k === 'text').map(p => p.v).join(' ');
      let inner = '';
      if (imgs.length) {
        inner += '<div class="msg-parts-imgs' + (imgs.length > 1 ? ' multi' : '') + '">' +
          imgs.map(p => {
            const isSticker = p.sub === 'sticker';
            return '<img class="msg-img' + (isSticker ? ' msg-img-sm' : ' msg-img-big') + '" src="' + p.v + '" alt="' + (isSticker ? '表情' : '图片') + '">';
          }).join('') + '</div>';
      }
      if (textPart) {
        inner += '<span style="opacity:.85;word-break:break-word">' + textPart.replace(/</g, '&lt;') + '</span>';
      }
      b.innerHTML = rec.quote
        ? quoteHtml(rec.quote, rec.qside) + inner
        : inner;
      // 组合消息里的图片（大图）可点击查看
      b.querySelectorAll('.msg-img-big').forEach(img => {
        img.addEventListener('click', () => { if (window.viewChatImage) window.viewChatImage(img.src); });
      });
    } else if (rec.retractedSegs && rec.retractedSegs.length) {
      // ★ 字卡级局部撤回：正文隐藏被撤段，下方胶囊可展开查看
      const segs = splitCardSegs(rec.text);
      const rcs = rec.retractedSegs || [];
      let segHtml = '';
      for (let i = 0; i < segs.length; i++) {
        if (!rcs.some(r => r.idx === i)) {
          if (segHtml) segHtml += ' ';
          segHtml += String(segs[i]).replace(/</g, '&lt;');
        }
      }
      let sub = '';
      rcs.forEach(r => { sub += '<div style="padding:2px 0">（已撤回）' + String(r.text || '').replace(/</g, '&lt;') + '</div>'; });
      b.innerHTML = (rec.quote ? quoteHtml(rec.quote, rec.qside) : '') +
        '<span style="opacity:.85;word-break:break-word">' + (segHtml || '…') + '</span>' +
        '<div style="margin-top:6px;text-align:left">' +
        '<span class="msg-poke-seg" data-rc="1">' + (rec.side === 'out' ? '我' : '对方') + '撤回了 ' + rcs.length + ' 条字卡 ▾</span>' +
        '<div class="msg-poke-seg-detail" style="display:none">' + sub + '</div>' +
        '</div>';
      const tip = b.querySelector('.msg-poke-seg');
      if (tip) {
        tip.addEventListener('click', () => {
          const d = tip.nextElementSibling;
          if (d) d.style.display = d.style.display === 'block' ? 'none' : 'block';
        });
      }
    } else {
      b.innerHTML = rec.quote
        ? quoteHtml(rec.quote, rec.qside) + '<span style="opacity:.85">' + rec.text + '</span>'
        : '<span style="opacity:.85">' + rec.text + '</span>';
    }
    // 恢复情绪字卡（持久化）：所有字卡包进一个 .msg-moods 容器，
    // 容器用一条虚线与正文隔离，字卡在容器内紧凑同行、放不下才自动换行
    if (rec.mood && rec.mood.length) {
      const mm = document.createElement('div');
      mm.className = 'msg-moods';
      rec.mood.forEach((md, mi) => {
        // 局部撤回：被撤的情绪字卡不显示
        if (rec.retractedMood && rec.retractedMood.indexOf(mi) >= 0) return;
        if (md.tag === '交流意图') {
          mm.innerHTML += '<div class="msg-mood msg-intent"><span class="msg-mood-tag">' + md.tag + '</span><span>' + md.label + '</span></div>';
        } else {
          mm.innerHTML += '<div class="msg-mood"><span class="msg-mood-tag">' + md.tag + '</span><span>' + md.label + '</span></div>';
        }
      });
      if (mm.children.length) b.appendChild(mm);
    }
    fillAvatar(av, rec.side === 'out' ? 'avatar-user' : 'avatar-partner');
    // 点击联系人消息左侧头像 → 打开拍一拍半框，对 TA 使用拍一拍
    if (rec.side === 'in') {
      av.style.cursor = 'pointer';
      av.title = '对 TA 拍一拍';
      av.addEventListener('click', (e) => {
        e.stopPropagation();
        openPokeCard();
      });
    }
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

// ★ 字卡级局部撤回（仿星言）：按标点/空格/换行把消息文本拆成多个「字卡段」，
// 联系人可只撤回其中 1~3 个段，正文隐藏被撤段，下方胶囊可展开查看撤了什么
function splitCardSegs(text) {
  const out = [];
  let cur = '';
  const str = String(text || '');
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    cur += ch;
    if (ch === '。' || ch === '！' || ch === '？' || ch === '；' || ch === ';' || ch === '!' || ch === '?' || ch === '\n' || ch === ',' || ch === '，' || ch === ' ') {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
    }
  }
  if (cur.trim()) out.push(cur.trim());
  if (out.length < 2 && str.trim()) out = [str.trim()];
  return out;
}
// 局部撤回：优先撤文本字卡段；文本单段则撤一条情绪/心意/意图字卡；都没有才整条撤回
function partialRetractMsg(msgEl, side) {
  const idx = parseInt(msgEl.dataset.idx, 10);
  const rec = (idx >= 0 && msgs[idx]) ? msgs[idx] : null;
  if (!rec || rec.retracted || rec.parts) { retractMsg(msgEl, side); return; }
  const segs = splitCardSegs(rec.text);
  if (segs.length > 1) {
    rec.retractedSegs = rec.retractedSegs || [];
    const remain = [];
    for (let i = 0; i < segs.length; i++) {
      if (!rec.retractedSegs.some(r => r.idx === i)) remain.push(i);
    }
    if (remain.length) {
      const n = 1 + Math.floor(Math.random() * Math.min(remain.length, 3));
      const k = Math.min(n, remain.length);
      for (let r = 0; r < k; r++) {
        const si = remain.splice(Math.floor(Math.random() * remain.length), 1)[0];
        rec.retractedSegs.push({ text: segs[si], idx: si });
      }
      saveMsgs();
      // 重建该条消息 DOM（沿用 renderMsg 渲染局部撤回样式）
      const m = renderMsg(rec);
      m.dataset.idx = idx;
      if (msgEl.parentNode) msgEl.parentNode.replaceChild(m, msgEl);
      return;
    }
  }
  // 无多段文本：撤一条情绪/心意/意图字卡
  if (rec.mood && rec.mood.length) {
    rec.retractedMood = rec.retractedMood || [];
    const remain = [];
    for (let i = 0; i < rec.mood.length; i++) {
      if (rec.retractedMood.indexOf(i) < 0) remain.push(i);
    }
    if (remain.length) {
      const pick = remain[Math.floor(Math.random() * remain.length)];
      rec.retractedMood.push(pick);
      saveMsgs();
      const m = renderMsg(rec);
      m.dataset.idx = idx;
      if (msgEl.parentNode) msgEl.parentNode.replaceChild(m, msgEl);
      return;
    }
  }
  retractMsg(msgEl, side);
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
          // 最后一条回复完成后：音乐 TA 可能请求一起听歌（延后 2 秒）
          if (i === count - 1) {
            setTimeout(() => { if (window.maybeMusicRequest) window.maybeMusicRequest(); }, 2000);
          }
        }, i * randInt(1200, 2800));
      }
    }, delay);
  }
  // 单条回复：生成内容 + 发送 + 收藏/情绪/撤回 附带逻辑（供普通回复与「让对方继续说」共用）
  function replyOnce(c, quote) {
    const rep = genOneReply(c);
    // 引用我的消息：quote 是我发的文本，qside='out'（我发）
    const m = addIn(rep.text, { quote: quote, qside: 'out', type: rep.type, parts: rep.parts });
    // TA 收藏夹：联系人有概率（30%）收藏我发的最新一条消息（独立于情绪系统，任何回复后判定）
    if (lastMineText && Math.random() * 100 < 30) {
      const fav = getFav();
      // 同一条内容不重复收藏（已收藏过则跳过）
      if (!fav.some(f => f.side === 'out' && f.text === lastMineText)) {
        // 图片/表情按 dataURL 识别类型，避免收藏时按文本存导致显示超长乱码
        const favType = lastMineText.indexOf('data:') === 0 ? 'image' : 'text';
        fav.push({ side: 'out', text: lastMineText, type: favType, ts: Date.now(), by: 'ta' });
        saveFav(fav);
        setTimeout(() => toast('TA 收藏了你的一条消息'), 1200);
      }
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
        // ★ 字卡级局部撤回（仿星言）：多段文本/情绪卡优先局部撤回，否则整条撤回
        partialRetractMsg(m, 'in');
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
      setTimeout(() => { if (window.maybeMusicRequest) window.maybeMusicRequest(); }, 2000);
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

  // 生成一条回复文本：每条消息多字卡回复命中 → 多卡空格拼接；否则单卡（默认字卡按概率混入）
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
    // 表情包 → 小图 sub:'sticker'；图片 → 大图 sub:'image'
    const parts = [{ k: 'text', v: t }];
    if (hit(c['sticker-prob'] || 0)) {
      const st = (window.getMediaCards && window.getMediaCards('sticker')) || [];
      if (st.length) parts.push({ k: 'img', v: st[Math.floor(Math.random() * st.length)], sub: 'sticker' });
    } else if (hit(c['image-prob'] || 0)) {
      const im = (window.getMediaCards && window.getMediaCards('image')) || [];
      if (im.length) parts.push({ k: 'img', v: im[Math.floor(Math.random() * im.length)], sub: 'image' });
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

  // ---- 帮我决定（完整版：是/否/半对 + 自定义选项 + 思考时间 + 历史记录，参考 @FelixFelicis）----
  const moreDecide = document.getElementById('more-decide');
  if (moreDecide) {
    moreDecide.addEventListener('click', (e) => {
      e.stopPropagation();
      if (morePanel) morePanel.hidden = true;
      if (window.openDecision) window.openDecision();
      else toast('帮我决定加载失败');
    });
  }

  // ---- 邀请TA（完整版：发送邀请卡片 → TA 必回答 接受/拒绝/未回应）----
  // 记录到「邀请/问问历史」（主页提问记录页展示）
  const moreInvite = document.getElementById('more-invite');
  if (moreInvite) {
    moreInvite.addEventListener('click', (e) => {
      e.stopPropagation();
      if (morePanel) morePanel.hidden = true;
      if (window.openModal) {
        window.openModal('邀请TA · 想邀请TA做什么？', '', (v) => {
          const content = (v || '').trim();
          if (!content) return;
          // 我的邀请：居中卡片
          addRec({ side: 'out', text: '邀请：' + content, special: 'invite' });
          if (window.logFish) window.logFish();
          // 记录等待状态（联系人回答后补写答案）
          const histKey = 'invite-ask-history';
          const recTs = Date.now();
          setTimeout(() => {
            const roll = Math.random();
            const name = store.get('lbl-partner') || 'TA';
            let status, reply = null;
            if (roll < 0.6) {
              status = '接受';
              addRec({ side: 'in', text: name + ' 接受了你的邀请', special: 'invite-reply' });
              reply = ['好，我答应你。', '可以呀。', '我陪你。', '走吧。', '嗯，陪你。'][Math.floor(Math.random() * 5)];
              setTimeout(() => addIn(reply), 800);
            } else if (roll < 0.85) {
              status = '拒绝';
              addRec({ side: 'in', text: name + ' 拒绝了你的邀请', special: 'invite-reply' });
              reply = ['这次不行。', '下次吧。', '抱歉。', '今天不方便。'][Math.floor(Math.random() * 4)];
              setTimeout(() => addIn(reply), 800);
            } else {
              status = '未回应';
              addRec({ side: 'in', text: name + ' 暂时没有回应', special: 'invite-reply' });
            }
            // 写入历史（含答案）
            try {
              const list = JSON.parse(store.get(histKey) || '[]');
              list.unshift({ type: 'invite', q: content, a: reply || status, ts: recTs });
              if (list.length > 200) list.length = 200;
              store.set(histKey, JSON.stringify(list));
            } catch (err) {}
            if (window.renderAskRecords) window.renderAskRecords();
          }, 1500 + Math.random() * 2500);
        }, { textarea: true, textareaPlaceholder: '例如：一起睡觉' });
      }
    });
  }

  // ---- 问问TA（完整版：发送提问卡片 → TA 必回答）----
  const moreAsk = document.getElementById('more-ask');
  if (moreAsk) {
    moreAsk.addEventListener('click', (e) => {
      e.stopPropagation();
      if (morePanel) morePanel.hidden = true;
      if (window.openModal) {
        window.openModal('问问TA · 你的问题', '', (q) => {
          const question = (q || '').trim();
          if (!question) return;
          // 我的提问：居中卡片
          addRec({ side: 'out', text: '问：' + question, special: 'ask' });
          if (window.logFish) window.logFish();
          const recTs = Date.now();
          setTimeout(() => {
            const defs = ['嗯嗯', '我想想…', '应该吧', '好呀', '我陪你', '可以的', '那挺好呀', '我觉得可以', '听你的', '当然可以', '我很乐意'];
            const text = defs[Math.floor(Math.random() * defs.length)];
            addIn(text);
            // 写入历史（含答案）
            try {
              const list = JSON.parse(store.get('invite-ask-history') || '[]');
              list.unshift({ type: 'ask', q: question, a: text, ts: recTs });
              if (list.length > 200) list.length = 200;
              store.set('invite-ask-history', JSON.stringify(list));
            } catch (err) {}
            if (window.renderAskRecords) window.renderAskRecords();
          }, 1500 + Math.random() * 2500);
        }, { textarea: true, textareaPlaceholder: '例如：周末要不要一起去看电影？' });
      }
    });
  }

// ---- 搜索聊天记录（完整版：搜索全部历史，结果可点击跳转定位） ----
const moreSearch = document.getElementById('more-search');
if (moreSearch) {
  moreSearch.addEventListener('click', (e) => {
    e.stopPropagation();
    if (morePanel) morePanel.hidden = true;
    if (!window.openModal) return;
    window.openModal('搜索聊天记录', '', (kw) => {
      const q = (kw || '').trim();
      if (!q) return;
      loadMsgs(); // 确保拿到最新消息数据
      const partnerName = store.get('lbl-partner') || 'TA';
      const myName = store.get('lbl-user') || '我';
      const results = [];
      msgs.forEach((m, i) => {
        if (!m || m.special) return; // 系统提示类不参与搜索
        let txt = typeof m.text === 'string' ? m.text : '';
        if (m.askQuestion) txt += ' ' + m.askQuestion;
        if (m.choiceQuestion) txt += ' ' + m.choiceQuestion;
        if (m.curiousQuestion) txt += ' ' + m.curiousQuestion;
        if (m.roastText) txt += ' ' + m.roastText;
        if (txt.indexOf(q) >= 0) results.push({ i: i, m: m, txt: txt });
      });
      if (!results.length) {
        if (window.openModal) {
          window.openModal('搜索聊天记录', '', () => {}, { noInput: true, staticText: '没有找到包含「' + q + '」的消息' });
        }
        return;
      }
      // 结果列表（复用 tc-mask 弹层）：发送者 + 时间 + 内容，点击跳转聊天定位
      let html = '<div style="font-size:11px;color:var(--muted);margin-bottom:8px">共 ' + results.length + ' 条 · 点击结果跳转到对应消息</div>';
      results.slice(0, 50).forEach(r => {
        const isImg = r.txt.indexOf('data:') === 0;
        const label = (isImg ? '[图片] ' : '') + r.txt.slice(0, 40) + (r.txt.length > 40 ? '…' : '');
        const who = r.m.side === 'out' ? myName : partnerName;
        const time = r.m.ts ? fmtTime(r.m.ts) : '';
        html += '<div class="tc-listitem" data-sidx="' + r.i + '" style="cursor:pointer">' +
          '<div class="tc-li-top"><span class="tc-li-q">' + who + '：' + String(label).replace(/</g, '&lt;') + '</span><span class="tc-li-time">' + time + '</span></div></div>';
      });
      if (results.length > 50) html += '<div class="ta-empty">还有 ' + (results.length - 50) + ' 条…</div>';
      if (window.openTCPanel) {
        window.openTCPanel('搜索聊天记录', html);
        document.querySelectorAll('#tc-body .tc-listitem').forEach(el => {
          el.addEventListener('click', () => {
            document.getElementById('tc-mask').hidden = true;
            const idx = Number(el.dataset.sidx);
            const target = body.querySelector('.msg[data-idx="' + idx + '"]');
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'center' });
              target.classList.add('highlight');
              setTimeout(() => target.classList.remove('highlight'), 2200);
            }
          });
        });
      }
    });
  });
}

  // ---- 通话（星言版：拨号 → 接通/未接，模拟通话）----
  const moreCall = document.getElementById('more-call');
  if (moreCall) {
    moreCall.addEventListener('click', (e) => {
      e.stopPropagation();
      if (morePanel) morePanel.hidden = true;
      // 完整通话系统：拨打弹窗 → 忙线/拒绝/接通 → 接通后小框
      if (window.placeCall) window.placeCall();
      else {
        // 降级：旧逻辑
        const name = store.get('lbl-partner') || 'TA';
        addRec({ side: 'out', text: '拨打 ' + name + ' 语音通话', special: 'call' });
        if (window.logFish) window.logFish();
      }
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
          // 同一条内容不重复收藏
          if (fav.some(f => f.side === rec.side && f.text === rec.text)) {
            toast('已收藏过这条消息');
          } else {
            fav.push({ side: rec.side, text: rec.text, type: rec.type || 'text', ts: rec.ts || Date.now(), by: 'me', mood: (rec.mood || []).slice() });
            saveFav(fav);
            toast('已收藏到我的收藏');
          }
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
    // 最新收藏在上
    list.sort((a, b) => (b.ts || 0) - (a.ts || 0));
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
          const input = document.getElementById('chat-input');
          const text = (input ? input.value : '').trim();
          if (text) {
            // 输入栏有文字：文字 + 表情包合并为一条气泡直接发送（表情包小图）
            lastMineText = text;
            const rec = { side: 'out', text: text, parts: [{ k: 'text', v: text }, { k: 'img', v: src, sub: 'sticker' }] };
            addRec(rec);
            if (input) input.value = '';
            renderDraft();
            if (window.logFish) window.logFish();
            scheduleReply();
          } else {
            // 无文字：直接发送表情包（气泡消息）
            lastMineText = src;
            const rec = { side: 'out', text: src, type: 'sticker', parts: [{ k: 'img', v: src }] };
            addRec(rec);
            if (window.logFish) window.logFish();
            scheduleReply();
          }
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
    // 插入的图片：大图（可点击查看）
    draftImgs.forEach(src => parts.push({ k: 'img', v: src, sub: 'image' }));
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
