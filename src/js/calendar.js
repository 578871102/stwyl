// ===== 功能：日历（按星言日历逻辑复刻） =====
// 每日生成：今日心情（分类/描述）+ TA 正在做什么 + TA 留言（从字卡池随机拼）
// 每次首次打开日历触发 TA 留言弹窗；美化毛玻璃、无 emoji、矢量图标
(function () {
  const uid = 'xy-home-v2';
  const store = {
    get(k){ try { return localStorage.getItem(uid + ':' + k); } catch(e){ return null; } },
    set(k, v){ try { localStorage.setItem(uid + ':' + k, v); } catch(e){} }
  };
  const page = document.getElementById('page-calendar');
  if (!page) return;

  // ---- 数据（无 emoji，纯文字）----
  const MOODS = [
    { mood: '温柔', cat: '温暖', desc: '今天很温柔。' },
    { mood: '开心', cat: '温暖', desc: '今天心情很好。' },
    { mood: '愉快', cat: '温暖', desc: '今天过得很轻松。' },
    { mood: '满足', cat: '温暖', desc: '今天觉得很满足。' },
    { mood: '放松', cat: '温暖', desc: '今天慢慢放松着。' },
    { mood: '安心', cat: '温暖', desc: '今天很安心。' },
    { mood: '平静', cat: '平静', desc: '今天很平静。' },
    { mood: '安静', cat: '平静', desc: '今天想安静一点。' },
    { mood: '专注', cat: '平静', desc: '今天专注于眼前的事。' },
    { mood: '思考中', cat: '平静', desc: '今天一直在思考。' },
    { mood: '想念', cat: '想念', desc: '今天有些想你。' },
    { mood: '等待', cat: '想念', desc: '今天静静等着与你相遇。' },
    { mood: '期待', cat: '想念', desc: '今天期待着一点惊喜。' },
    { mood: '牵挂', cat: '想念', desc: '今天一直惦记着你。' },
    { mood: '疲惫', cat: '低落', desc: '今天有一点累。' },
    { mood: '孤单', cat: '低落', desc: '今天有些安静。' },
    { mood: '烦恼', cat: '低落', desc: '今天有些事情放不下。' },
    { mood: '精神很好', cat: '活跃', desc: '今天状态很好。' },
    { mood: '兴致高涨', cat: '活跃', desc: '今天充满热情。' },
    { mood: '充满动力', cat: '活跃', desc: '今天想做很多事情。' }
  ];
  const ACTIVITIES = [
    '看书', '整理书籍', '写东西', '记录想法', '工作中', '整理资料',
    '回复消息', '听音乐', '戴着耳机发呆', '哼着歌', '喝茶', '泡茶中',
    '喝点饮料', '吃点心', '吃饭中', '休息中', '小睡一会', '发呆',
    '想事情', '思考中', '放空自己', '散步', '看风景', '晒太阳',
    '吹吹风', '听雨声', '看夜空', '看照片', '放松中', '创作中',
    '整理照片', '看视频', '看电影', '找点事情做', '整理东西', '安静待着',
    '看着窗外', '等待中', '想着你', '回忆过去', '想靠近你', '陪着你',
    '等你来聊天', '在线中', '忙碌中', '想给你一点惊喜', '静静待着', '在这里等你'
  ];
  // 心情图标（矢量 SVG，替代 emoji）
  const MOOD_ICONS = {
    '温暖': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7.5-4.7-9.3-9A5.3 5.3 0 0112 6.4a5.3 5.3 0 019.3 5.6c-1.8 4.3-9.3 9-9.3 9z"/></svg>',
    '平静': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    '想念': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
    '低落': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>',
    '活跃': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.5S4.5 15.2 4.5 9.9A4.9 4.9 0 0112 7.1a4.9 4.9 0 017.5 2.8c0 5.3-7.5 10.6-7.5 10.6z"/></svg>'
  };

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // 留言：从自定义聊天字卡 + 默认字卡池随机拼 3~8 条（无 emoji）
  function genMessage() {
    const cards = [];
    const custom = (window.getCustomCards && window.getCustomCards()) || [];
    custom.forEach(c => { if (typeof c === 'string' && c.indexOf('data:') !== 0) cards.push(c); });
    const defs = (window.getDefaultCardGroups && window.getDefaultCardGroups('main')) || [];
    defs.forEach(([g, arr]) => arr.forEach(c => cards.push(c)));
    if (!cards.length) return '今天也想对你说点什么...';
    const maxCount = Math.min(8, cards.length);
    const minCount = Math.min(3, maxCount);
    const count = minCount + Math.floor(Math.random() * (maxCount - minCount + 1));
    const pool = cards.slice();
    const sel = [];
    for (let i = 0; i < count && pool.length; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      sel.push(pool.splice(idx, 1)[0]);
    }
    return sel.join('  ');
  }

  // 生成或获取今日数据
  function getToday() {
    const key = 'cal-' + todayStr();
    let entry = null;
    try { entry = JSON.parse(store.get(key) || 'null'); } catch (e) {}
    if (!entry) {
      const m = pick(MOODS);
      entry = {
        mood: m.mood, cat: m.cat, desc: m.desc,
        activity: pick(ACTIVITIES),
        message: genMessage(),
        date: todayStr()
      };
      store.set(key, JSON.stringify(entry));
    }
    return entry;
  }

  // 渲染月历（可切换月份）
  let viewY = 0, viewM = -1; // 0=当前月
  function renderGrid() {
    const grid = document.getElementById('cal-grid');
    if (!grid) return;
    const now = new Date();
    if (viewM < 0) { viewY = now.getFullYear(); viewM = now.getMonth(); }
    const y = viewY, m = viewM;
    const monthEl = document.getElementById('cal-month-txt');
    if (monthEl) monthEl.textContent = y + ' 年 ' + (m + 1) + ' 月';
    const first = new Date(y, m, 1);
    const days = new Date(y, m + 1, 0).getDate();
    const startWd = first.getDay();
    const wds = ['日', '一', '二', '三', '四', '五', '六'];
    let html = wds.map(w => '<span class="cal-wd">' + w + '</span>').join('');
    for (let i = 0; i < startWd; i++) html += '<span class="cal-cell blank"></span>';
    for (let d = 1; d <= days; d++) {
      const isToday = d === now.getDate() && y === now.getFullYear() && m === now.getMonth();
      html += '<span class="cal-cell' + (isToday ? ' today' : '') + '">' + d + '</span>';
    }
    grid.innerHTML = html;
  }
  // 月份前进/后退
  const calPrev = document.getElementById('cal-prev');
  if (calPrev) calPrev.addEventListener('click', () => { viewM--; if (viewM < 0) { viewM = 11; viewY--; } renderGrid(); });
  const calNext = document.getElementById('cal-next');
  if (calNext) calNext.addEventListener('click', () => { viewM++; if (viewM > 11) { viewM = 0; viewY++; } renderGrid(); });

  // ---- 我的留言（可编辑）----
  function getMyMessage() {
    const v = store.get('cal-my-' + todayStr());
    return v || '';
  }
  function renderMyMessage() {
    const el = document.getElementById('cal-my-message');
    if (!el) return;
    const msg = getMyMessage();
    el.textContent = msg || '今天想说点什么...';
  }

  function render() {
    const e = getToday();
    const dateEl = document.getElementById('cal-today-date');
    if (dateEl) dateEl.textContent = e.date;
    const catEl = document.getElementById('cal-mood-cat');
    if (catEl) catEl.textContent = e.cat;
    const icoEl = document.getElementById('cal-mood-ico');
    if (icoEl) icoEl.innerHTML = MOOD_ICONS[e.cat] || MOOD_ICONS['平静'];
    const nameEl = document.getElementById('cal-mood-name');
    if (nameEl) nameEl.textContent = e.mood;
    const descEl = document.getElementById('cal-mood-desc');
    if (descEl) descEl.textContent = e.desc;
    const actEl = document.getElementById('cal-activity');
    if (actEl) actEl.textContent = e.activity;
    const msgEl = document.getElementById('cal-message');
    if (msgEl) msgEl.textContent = e.message;
    renderMyMessage();
    renderGrid();
  }

  // 桌面【日历】图标进入
  const calApp = document.querySelector('.app[data-app="calendar"]');
  if (calApp && page) {
    calApp.addEventListener('click', () => {
      const editing = Array.from(document.querySelectorAll('.app-grid')).some(g => g.classList.contains('editing'));
      if (editing) return;
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      page.hidden = false;
      // 每次进入回到本月
      viewM = -1;
      render();
    });
  }
  // 编辑我的留言
  const editBtn = document.getElementById('cal-edit-btn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      if (window.openModal) {
        window.openModal('编辑我的留言', getMyMessage(), (v) => {
          const val = (v || '').trim();
          if (val) {
            store.set('cal-my-' + todayStr(), val);
            renderMyMessage();
          }
        });
      }
    });
  }
  const calBack = document.getElementById('cal-back');
  if (calBack) {
    calBack.addEventListener('click', () => {
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      const phonePage = document.getElementById('page-phone');
      if (phonePage) phonePage.hidden = false;
    });
  }

  // 打开 mochi 即触发 TA 今日留言（每次会话首次，不依赖打开日历）
  (function () {
    const key = 'greeted-' + todayStr();
    if (store.get(key)) return;
    store.set(key, '1');
    setTimeout(() => {
      const e2 = getToday();
      const name = store.get('lbl-partner') || 'TA';
      if (window.openModal) {
        window.openModal(name + ' 的今日留言', '', () => {}, {
          noInput: true,
          staticText: '今日心情：' + e2.mood + '（' + e2.cat + '）\nTA 正在：' + e2.activity + '\n\nTA 留言：\n' + e2.message
        });
      }
    }, 800);
  })();
})();
