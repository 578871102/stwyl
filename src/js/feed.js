// ===== 功能：朋友圈（仿星言简约版【星言朋友圈】，矢量图简约风格） =====
// 朋友圈形态：封面 + 我的头像；TA 自动发动态；我可发布；
// 每条动态：发布者头像/昵称/时间/内容 + 点赞列表 + 评论区（可回复）
// TA 会点赞/评论我的动态；我点赞/评论后 TA 有概率回应
(function () {
  const uid = 'xy-home-v2';
  const store = {
    get(k){ try { return localStorage.getItem(uid + ':' + k); } catch(e){ return null; } },
    set(k, v){ try { localStorage.setItem(uid + ':' + k, v); } catch(e){} }
  };
  const KEY = 'feed-posts';
  function partnerName() { return store.get('lbl-partner') || 'TA'; }
  function partnerAv() { return store.get('avatar-partner') || ''; }
  function myName() { return store.get('lbl-user') || '我'; }
  function myAv() { return store.get('avatar-user') || ''; }
  function toast(msg) {
    let t = document.getElementById('cc-toast');
    if (!t) { t = document.createElement('div'); t.id = 'cc-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.className = 'cc-toast show';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = 'cc-toast'; }, 2000);
  }
  function fmtDT(ts) {
    const d = new Date(ts);
    const p = (n) => (n < 10 ? '0' + n : '' + n);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function load() { try { return JSON.parse(store.get(KEY) || '[]'); } catch (e) { return []; } }
  function save(list) { store.set(KEY, JSON.stringify(list)); }
  function avHtml(data, cls) {
    const c = cls || 'feed-av';
    return data
      ? '<div class="' + c + '"><img src="' + data + '" alt=""></div>'
      : '<div class="' + c + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.5-6 8-6s8 2 8 6"/></svg></div>';
  }
  const TA_CONTENT = [
    '今天的风很温柔，想你了。',
    '刚整理了一下东西，发现好多回忆。',
    '今天也好好吃饭了吗？',
    '散步的时候，路过一家很香的店。',
    '最近在听一首歌，循环了一下午。',
    '晚安前，忽然很想和你说说话。'
  ];
  const TA_COMMENT_POOL = ['收到啦~', '我看到了！', '这条动态好可爱', '记住啦', '我也是这么想的', '嗯嗯，说得对'];

  // 渲染封面
  function renderCover() {
    const myAvEl = document.getElementById('feed-my-av');
    const myNameEl = document.getElementById('feed-my-name');
    if (myAvEl) myAvEl.innerHTML = myAv() ? '<img src="' + myAv() + '" alt="">' : '';
    if (myNameEl) myNameEl.textContent = myName();
  }
  // 渲染动态列表
  function render() {
    renderCover();
    const listEl = document.getElementById('feed-list');
    if (!listEl) return;
    const posts = load().slice().sort((a, b) => b.ts - a.ts);
    const name = partnerName();
    listEl.innerHTML = posts.length
      ? posts.map(p => {
          const isMine = p.by === 'me';
          const author = isMine ? myName() : name;
          const av = isMine ? myAv() : partnerAv();
          // 点赞列表：显示"XX、XX 觉得很赞"
          const likes = p.likes && p.likes.length
            ? '<div class="feed-likes"><svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;vertical-align:-2px;margin-right:5px"><path d="M12 21s-7.5-4.7-9.3-9A5.3 5.3 0 0112 6.4a5.3 5.3 0 019.3 5.6c-1.8 4.3-9.3 9-9.3 9z"/></svg>' + p.likes.join('、') + ' 觉得很赞</div>'
            : '';
          // 评论区
          let commentsHtml = '';
          if (p.comments && p.comments.length) {
            commentsHtml = '<div class="feed-comments">' + p.comments.map((c, ci) => {
              const cName = c.by === 'me' ? myName() : name;
              // 回复区
              let repliesHtml = '';
              if (c.replies && c.replies.length) {
                repliesHtml = c.replies.map(r => {
                  const rName = r.by === 'me' ? myName() : name;
                  return '<div class="feed-reply"><b>' + rName + '</b> 回复 <b>' + cName + '</b>：' + String(r.content || '').replace(/</g, '&lt;') + '</div>';
                }).join('');
              }
              return '<div class="feed-comment" data-c="' + p.id + '" data-ci="' + ci + '"><div class="feed-c-line"><b>' + cName + '</b>：' + String(c.content || '').replace(/</g, '&lt;') + '</div>' + repliesHtml + '</div>';
            }).join('') + '</div>';
          }
          const liked = p.likes && p.likes.some(l => l === name);
          return '<div class="feed-post"><div class="feed-head">' + avHtml(av) +
            '<div class="feed-who"><div class="feed-name">' + author + '</div><div class="feed-time">' + fmtDT(p.ts) + '</div></div>' +
            (isMine ? '<button class="feed-del" data-id="' + p.id + '" title="删除"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2"/><path d="M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14"/></svg></button>' : '') + '</div>' +
            '<div class="feed-content">' + String(p.content || '').replace(/</g, '&lt;') +
            (p.img ? '<div class="feed-img"><img src="' + p.img + '" alt="图片"></div>' : '') +
            '</div>' +
            '<div class="feed-actions">' +
            '<button class="feed-act' + (liked ? ' liked' : '') + '" data-like="' + p.id + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;vertical-align:-3px;margin-right:4px"><path d="M12 21s-7.5-4.7-9.3-9A5.3 5.3 0 0112 6.4a5.3 5.3 0 019.3 5.6c-1.8 4.3-9.3 9-9.3 9z"/></svg>赞</button>' +
            '<button class="feed-act" data-comment="' + p.id + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;vertical-align:-3px;margin-right:4px"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>评论</button>' +
            '</div>' + likes + commentsHtml + '</div>';
        }).join('')
      : '<div class="ta-empty">还没有动态，TA 会不定期分享生活</div>';
    bindEvents(listEl);
  }
  function bindEvents(listEl) {
    listEl.querySelectorAll('.feed-del').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.openModal) {
        window.openModal('删除这条动态？', '', () => {
          save(load().filter(x => x.id !== b.dataset.id));
          render();
        }, { noInput: true });
      }
    }));
    // 点赞：我点赞后 TA 有概率回赞
    listEl.querySelectorAll('.feed-act[data-like]').forEach(b => b.addEventListener('click', () => {
      const list = load();
      const p = list.find(x => x.id === b.dataset.like);
      if (!p) return;
      p.likes = p.likes || [];
      const nm = partnerName();
      const i = p.likes.indexOf(nm);
      const wasTa = i >= 0;
      if (wasTa) p.likes.splice(i, 1); else p.likes.push(nm);
      save(list);
      render();
      if (!wasTa && p.by === 'me' && Math.random() * 100 < feedCfg().likeback) {
        const cfg = feedCfg();
        setTimeout(() => {
          const list2 = load();
          const p2 = list2.find(x => x.id === p.id);
          if (!p2) return;
          p2.likes = p2.likes || [];
          if (p2.likes.indexOf(nm) < 0) p2.likes.push(nm);
          save(list2);
          render();
        }, (cfg.likeSpeedMin + Math.random() * Math.max(1, cfg.likeSpeedMax - cfg.likeSpeedMin)) * 1000);
      }
    }));
    // 评论：点击评论 → 弹输入；评论后 TA 有概率回复评论；评论可回复
    listEl.querySelectorAll('.feed-act[data-comment]').forEach(b => b.addEventListener('click', () => {
      const pid = b.dataset.comment;
      if (window.openModal) {
        window.openModal('评论', '', (v) => {
          const val = (v || '').trim();
          if (!val) return;
          const list = load();
          const p = list.find(x => x.id === pid);
          if (!p) return;
          p.comments = p.comments || [];
          p.comments.push({ by: 'me', content: val, ts: Date.now(), replies: [] });
          save(list);
          render();
          // TA 有概率评论回应
          if (Math.random() * 100 < feedCfg().commentProb) {
            const cfg = feedCfg();
            setTimeout(() => {
              const list2 = load();
              const p2 = list2.find(x => x.id === pid);
              if (!p2) return;
              p2.comments = p2.comments || [];
              p2.comments.push({ by: 'ta', content: TA_COMMENT_POOL[Math.floor(Math.random() * TA_COMMENT_POOL.length)], ts: Date.now(), replies: [] });
              save(list2);
              render();
            }, (cfg.commentSpeedMin + Math.random() * Math.max(1, cfg.commentSpeedMax - cfg.commentSpeedMin)) * 1000);
          }
        }, { textareaPlaceholder: '说点什么…' });
      }
    }));
    // 点击评论 → 回复（TA 的评论可回复，我的不可）
    listEl.querySelectorAll('.feed-comment').forEach(c => c.addEventListener('click', () => {
      const pid = c.dataset.c;
      const ci = Number(c.dataset.ci);
      const list = load();
      const p = list.find(x => x.id === pid);
      if (!p || !p.comments || !p.comments[ci] || p.comments[ci].by === 'me') return;
      if (window.openModal) {
        window.openModal('回复 ' + partnerName(), '', (v) => {
          const val = (v || '').trim();
          if (!val) return;
          p.comments[ci].replies = p.comments[ci].replies || [];
          p.comments[ci].replies.push({ by: 'me', content: val, ts: Date.now() });
          save(list);
          render();
        });
      }
    }));
  }
  // 发布
  function publish() {
    const input = document.getElementById('feed-input');
    const content = input ? input.value.trim() : '';
    if (!content) { toast('写点什么再发布吧'); return; }
    const list = load();
    list.unshift({ id: 'f_' + Date.now(), by: 'me', content: content, ts: Date.now(), likes: [], comments: [] });
    save(list);
    if (input) input.value = '';
    render();
    toast('已发布');
    // TA 有概率立即点赞
    if (Math.random() * 100 < feedCfg().likeProb) {
      const cfg = feedCfg();
      setTimeout(() => {
        const list2 = load();
        const p2 = list2.find(x => x.id === list[0].id);
        if (!p2) return;
        p2.likes = p2.likes || [];
        p2.likes.push(partnerName());
        save(list2);
        render();
      }, (cfg.likeSpeedMin + Math.random() * Math.max(1, cfg.likeSpeedMax - cfg.likeSpeedMin)) * 1000);
    }
  }
  // ================= TA 自动发布（定时机制，概率在回复设置-朋友圈调整，星言朋友圈机制） =================
  function feedCfg() {
    const c = (window.replyCfg && window.replyCfg()) || {};
    const num = (k, d) => c[k] !== undefined ? c[k] : d;
    return {
      likeProb: num('fd-like-prob', 60), likeSpeedMin: num('fd-like-speed-min', 1), likeSpeedMax: num('fd-like-speed-max', 60),
      commentProb: num('fd-comment-prob', 70), commentSpeedMin: num('fd-comment-speed-min', 1), commentSpeedMax: num('fd-comment-speed-max', 60),
      replyProb: num('fd-reply-prob', 60), replySpeedMin: num('fd-reply-speed-min', 1), replySpeedMax: num('fd-reply-speed-max', 60),
      likeback: num('fd-likeback-prob', 50),
      cardProb: num('fd-card-prob', 80), maxCards: num('fd-max-cards', 5),
      postProb: num('fd-post-prob', 40), dailyMax: num('fd-post-daily-max', 5),
      postCool: num('fd-post-cool', 30),
      minInterval: num('fd-min-interval', 1), maxInterval: num('fd-max-interval', 720),
      minCardsPost: num('fd-min-cards-post', 4), maxCardsPost: num('fd-max-cards-post', 15),
      postKaomoji: num('fd-post-kaomoji', 10), postEmoji: num('fd-post-emoji', 10),
      postSticker: num('fd-post-sticker', 30), postImage: num('fd-post-image', 30)
    };
  }
  function feedLast() { const v = parseInt(store.get('feed-last'), 10); return isNaN(v) ? 0 : v; }
  function feedNext() { const v = parseFloat(store.get('feed-next')); return isNaN(v) ? 0 : v; }
  function feedDayCount() { try { return JSON.parse(store.get('feed-day-count') || '0'); } catch (e) { return 0; } }
  function feedToday() {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function maybeAutoPost() {
    try {
      const now = Date.now();
      const cfg = feedCfg();
      let last = feedLast(), next = feedNext();
      if (last > now || last < 0 || isNaN(last)) { last = 0; next = 0; }
      if ((now - last) / 60000 < next) return;
      // 每日发布次数上限
      let dayCount = feedDayCount();
      const today = feedToday();
      if (dayCount.t !== today) dayCount = { t: today, n: 0 };
      if (dayCount.n >= cfg.dailyMax) { store.set('feed-next', String(cfg.postCool)); return; }
      if (Math.random() * 100 >= cfg.postProb) {
        store.set('feed-next', String(cfg.minInterval + Math.random() * Math.max(1, cfg.maxInterval - cfg.minInterval)));
        return;
      }
      let content = TA_CONTENT[Math.floor(Math.random() * TA_CONTENT.length)];
      if (Math.random() * 100 < cfg.postKaomoji) content += ' ' + ['(⁄ ⁄•⁄ω⁄•⁄ ⁄)', '(｡•̀ᴗ-)✧', '(๑´ㅂ`๑)', '(*^▽^*)'][Math.floor(Math.random() * 4)];
      if (Math.random() * 100 < cfg.postEmoji) content += ' ♡';
      const list = load();
      const post = { id: 'f_' + Date.now(), by: 'ta', content: content, ts: Date.now(), likes: [], comments: [] };
      // 内容类型：表情包/图片（来自自定义字卡媒体池）
      if (Math.random() * 100 < cfg.postSticker) {
        const st = (window.getMediaCards && window.getMediaCards('sticker')) || [];
        if (st.length) post.img = st[Math.floor(Math.random() * st.length)];
      } else if (Math.random() * 100 < cfg.postImage) {
        const im = (window.getMediaCards && window.getMediaCards('image')) || [];
        if (im.length) post.img = im[Math.floor(Math.random() * im.length)];
      }
      list.unshift(post);
      save(list);
      store.set('feed-last', String(now));
      store.set('feed-next', String(cfg.minInterval + Math.random() * Math.max(1, cfg.maxInterval - cfg.minInterval)));
      store.set('feed-day-count', JSON.stringify({ t: today, n: dayCount.n + 1 }));
      if (window.chatAddSystem) window.chatAddSystem(partnerName() + ' 发布了一条朋友圈动态');
      render();
    } catch (e) {}
  }
  setTimeout(() => {
    setInterval(maybeAutoPost, 60000);
    maybeAutoPost();
  }, (120 + Math.random() * 180) * 1000);

  // ================= 入口 =================
  const feedApp = document.querySelector('.app[data-app="feed"]');
  const feedPage = document.getElementById('page-feed');
  if (feedApp && feedPage) {
    feedApp.addEventListener('click', () => {
      const editing = Array.from(document.querySelectorAll('.app-grid')).some(g => g.classList.contains('editing'));
      if (editing) return;
      render();
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      feedPage.hidden = false;
    });
  }
  const feedBack = document.getElementById('feed-back');
  if (feedBack) feedBack.addEventListener('click', () => {
    document.querySelectorAll('.page').forEach(p => p.hidden = true);
    const phone = document.getElementById('page-phone');
    if (phone) phone.hidden = false;
  });
  const pubBtn = document.getElementById('feed-publish');
  if (pubBtn) pubBtn.addEventListener('click', publish);
  render();
})();
