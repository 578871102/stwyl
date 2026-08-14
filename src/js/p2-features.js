// ===== 功能：音乐页 / 聊天统计页 / 小互动页 =====
// 音乐：星音相伴风格，播放列表 + 播放历史
// 聊天统计：相处天数、消息数、表情包/拍一拍/情绪统计
// 小互动：拍一拍 TA / 送一句情话
(function () {
  const uid = 'xy-home-v2';
  const store = {
    get(k){ try { return localStorage.getItem(uid + ':' + k); } catch(e){ return null; } },
    set(k, v){ try { localStorage.setItem(uid + ':' + k, v); } catch(e){} }
  };
  function fmtTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const p = (n) => (n < 10 ? '0' + n : '' + n);
    return p(d.getHours()) + ':' + p(d.getMinutes());
  }
  // 轻提示（全局唯一，与其它模块一致）
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

  // ================= 音乐页 =================
  const musicApp = document.querySelector('.app[data-app="music"]');
  const musicPage = document.getElementById('page-music');
  if (musicApp && musicPage) {
    musicApp.addEventListener('click', () => {
      const editing = Array.from(document.querySelectorAll('.app-grid')).some(g => g.classList.contains('editing'));
      if (editing) return;
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      musicPage.hidden = false;
      // 播放历史
      const histEl = document.getElementById('music-history');
      if (histEl) {
        try {
          const h = JSON.parse(store.get('music-history') || '[]');
          histEl.textContent = h.length ? h.slice(-5).reverse().map(x => x + ' · ' + fmtTime(Date.now())).join('\n') : '暂无播放历史';
        } catch (e) {}
      }
    });
  }
  const musicBack = document.getElementById('music-back');
  if (musicBack) {
    musicBack.addEventListener('click', () => {
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      const home = document.getElementById('page-phone');
      if (home) home.hidden = false;
    });
  }
  // 记录播放历史（music-player 播放时调用）
  window.recordMusicHistory = function (name) {
    try {
      const h = JSON.parse(store.get('music-history') || '[]');
      h.push(name + ' ' + fmtTime(Date.now()));
      if (h.length > 20) h.splice(0, h.length - 20);
      store.set('music-history', JSON.stringify(h));
    } catch (e) {}
  };

  // ================= 聊天统计页 =================
  const statsApp = document.querySelector('.app[data-app="stats"]');
  const statsPage = document.getElementById('page-stats');
  if (statsApp && statsPage) {
    statsApp.addEventListener('click', () => {
      const editing = Array.from(document.querySelectorAll('.app-grid')).some(g => g.classList.contains('editing'));
      if (editing) return;
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      statsPage.hidden = false;
      renderStats();
    });
  }
  const statsBack = document.getElementById('stats-back');
  if (statsBack) {
    statsBack.addEventListener('click', () => {
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      const home = document.getElementById('page-phone');
      if (home) home.hidden = false;
    });
  }
  // ================= 聊天统计（完整版：相处记录 / 聊天记录 / 情绪表达） =================
  function statsInfoCard(icon, label, value) {
    return '<div class="stats-row"><span class="stats-label">' + icon + ' ' + label + '</span><span class="stats-num" style="font-size:15px">' + value + '</span></div>';
  }
  function fmtDTFull(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const p = (n) => (n < 10 ? '0' + n : '' + n);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function calcStreak(dateSet) {
    const dates = Array.from(dateSet).sort();
    if (!dates.length) return 0;
    let max = 1, cur = 1;
    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i]) - new Date(dates[i - 1])) / 864e5;
      if (diff === 1) { cur++; max = Math.max(max, cur); } else cur = 1;
    }
    return max;
  }
  function statsBarSection(icon, title, countMap, topLabel, emptyText) {
    const entries = [];
    for (const k in countMap) if (countMap.hasOwnProperty(k)) entries.push({ name: k, count: countMap[k] });
    entries.sort((a, b) => b.count - a.count);
    let html = '<div style="margin-bottom:16px"><div style="font-size:13px;font-weight:700;color:#555;margin-bottom:8px">' + icon + ' ' + title + '</div>';
    if (!entries.length) {
      html += '<div class="ta-empty">' + emptyText + '</div>';
    } else {
      const top = entries[0].name;
      html += '<div style="background:rgba(0,0,0,.04);border-radius:12px;padding:12px 14px">';
      html += '<div style="font-size:11px;color:var(--muted);margin-bottom:4px">' + topLabel + '</div>';
      html += '<div style="font-size:18px;font-weight:800;color:var(--ink);margin-bottom:10px">「' + String(top).replace(/</g, '&lt;') + '」</div>';
      entries.slice(0, 5).forEach(e => {
        const w = Math.max(3, Math.round(e.count / entries[0].count * 100));
        html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">' +
          '<div style="flex:1;height:6px;background:rgba(0,0,0,.06);border-radius:3px;overflow:hidden"><div style="height:100%;background:var(--ink);width:' + w + '%;border-radius:3px"></div></div>' +
          '<div style="font-size:11px;color:var(--muted);width:52px;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + String(e.name).replace(/</g, '&lt;') + '</div>' +
          '<div style="font-size:11px;color:var(--ink);width:26px;text-align:right">' + e.count + '</div></div>';
      });
      html += '</div>';
    }
    return html + '</div>';
  }
  function renderStats() {
    let msgs = [];
    try { msgs = JSON.parse(store.get('chat-msgs') || '[]'); } catch (e) {}
    const real = msgs.filter(m => m && m.side && m.text);
    const firstTs = real.length ? (real[0].ts || Date.now()) : 0;
    const lastTs = real.length ? (real[real.length - 1].ts || firstTs) : 0;
    const days = firstTs ? Math.max(0, Math.floor((Date.now() - firstTs) / 864e5)) : 0;
    // ---- 相处记录 ----
    const recordEl = document.getElementById('st-record-cards');
    if (recordEl) {
      let mine = 0, ta = 0, textChars = 0;
      real.forEach(m => {
        if (m.side === 'out') mine++; else ta++;
        if (typeof m.text === 'string' && m.text.indexOf('data:') !== 0) textChars += m.text.length;
      });
      let favsCount = 0;
      try { favsCount = (JSON.parse(store.get('fav-msgs') || '[]') || []).length; } catch (e) {}
      recordEl.innerHTML =
        statsInfoCard('📅', '第一次聊天', fmtDTFull(firstTs) || '暂无记录') +
        statsInfoCard('🕰️', '最近聊天', fmtDTFull(lastTs) || '暂无记录') +
        statsInfoCard('💬', '聊天消息', (mine + ta) + ' 条') +
        statsInfoCard('📝', '文字数量', textChars + ' 字') +
        statsInfoCard('⭐', '收藏记录', favsCount + ' 条');
    }
    // ---- 聊天记录 ----
    const chatEl = document.getElementById('st-chat-content');
    if (chatEl) {
      if (!real.length) { chatEl.innerHTML = '<div class="ta-empty">暂无聊天记录</div>'; }
      else {
        let userCount = 0, taCount = 0;
        const hourCount = {}, dayCount = {}, dateCount = {};
        const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
        real.forEach(m => {
          if (m.side === 'out') userCount++; else taCount++;
          const t = new Date(m.ts || Date.now());
          hourCount[t.getHours()] = (hourCount[t.getHours()] || 0) + 1;
          dayCount[t.getDay()] = (dayCount[t.getDay()] || 0) + 1;
          const ds = t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate();
          dateCount[ds] = (dateCount[ds] || 0) + 1;
        });
        const total = userCount + taCount;
        const userPct = total ? Math.round(userCount / total * 100) : 0;
        const taPct = total ? Math.round(taCount / total * 100) : 0;
        let peakHour = 0, peakHourVal = 0;
        for (const h in hourCount) if (hourCount[h] > peakHourVal) { peakHourVal = hourCount[h]; peakHour = Number(h); }
        let peakDay = 0, peakDayVal = 0;
        for (const d in dayCount) if (dayCount[d] > peakDayVal) { peakDayVal = dayCount[d]; peakDay = Number(d); }
        const totalDays = Math.max(1, Math.floor((Date.now() - firstTs) / 864e5));
        let maxSingle = 0;
        for (const d in dateCount) maxSingle = Math.max(maxSingle, dateCount[d]);
        const name = store.get('lbl-partner') || 'TA';
        chatEl.innerHTML =
          '<div style="margin-bottom:16px"><div style="font-size:13px;font-weight:700;color:#555;margin-bottom:8px">消息比例</div>' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><div style="font-size:12px;color:var(--muted);width:28px">我</div>' +
          '<div style="flex:1;height:8px;background:rgba(0,0,0,.06);border-radius:4px;overflow:hidden"><div style="height:100%;background:var(--ink);width:' + userPct + '%;border-radius:4px"></div></div>' +
          '<div style="font-size:12px;color:var(--ink);width:76px;text-align:right">' + userCount + ' 条 ' + userPct + '%</div></div>' +
          '<div style="display:flex;align-items:center;gap:8px"><div style="font-size:12px;color:var(--muted);width:28px">' + name + '</div>' +
          '<div style="flex:1;height:8px;background:rgba(0,0,0,.06);border-radius:4px;overflow:hidden"><div style="height:100%;background:#999;width:' + taPct + '%;border-radius:4px"></div></div>' +
          '<div style="font-size:12px;color:var(--ink);width:76px;text-align:right">' + taCount + ' 条 ' + taPct + '%</div></div></div>' +
          statsInfoCard('🕐', '最常聊天时间', peakHour + ':00 - ' + (peakHour + 1) + ':00') +
          statsInfoCard('📅', '最常聊天日期', '星期' + dayNames[peakDay]) +
          statsInfoCard('📊', '平均每日消息', Math.round(total / totalDays) + ' 条') +
          statsInfoCard('🔥', '最长连续聊天', calcStreak(Object.keys(dateCount)) + ' 天') +
          statsInfoCard('📈', '单日最高消息', maxSingle + ' 条');
      }
    }
    // ---- 情绪表达 ----
    const exprEl = document.getElementById('st-expr-content');
    if (exprEl) {
      if (!real.length) { exprEl.innerHTML = '<div class="ta-empty">暂无聊天记录</div>'; }
      else {
        const textCount = {}, emotion = {}, heart = {}, intent = {};
        real.forEach(m => {
          if (typeof m.text === 'string' && m.text.indexOf('data:') !== 0 && !m.special && !m.retracted) {
            textCount[m.text] = (textCount[m.text] || 0) + 1;
          }
          (m.mood || []).forEach(md => {
            if (md.tag === '交流意图') intent[md.label] = (intent[md.label] || 0) + 1;
            else if (md.tag === '心意') heart[md.label] = (heart[md.label] || 0) + 1;
            else emotion[md.label] = (emotion[md.label] || 0) + 1;
          });
        });
        exprEl.innerHTML =
          statsBarSection('📝', '文字字卡', textCount, '常用文字', '暂无使用记录') +
          statsBarSection('💭', '情绪字卡', emotion, '常见情绪', '暂无使用记录') +
          statsBarSection('❤️', '心意字卡', heart, '常传递心意', '暂无使用记录') +
          statsBarSection('💬', '交流意图', intent, '常用交流', '暂无使用记录');
      }
    }
    const daysEl = document.getElementById('st-days');
    if (daysEl) daysEl.textContent = days;
  }
  // 统计 tab 切换
  document.querySelectorAll('#page-stats .fav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#page-stats .fav-tab').forEach(x => x.classList.toggle('sel', x === tab));
      const k = tab.dataset.stab;
      document.querySelectorAll('#page-stats .cal-card').forEach(c => {
        c.hidden = c.dataset.stpanel !== k;
      });
    });
  });

  // ================= 提问记录页（原小互动页） =================
  const interactApp = document.querySelector('.app[data-app="interact"]');
  const interactPage = document.getElementById('page-interact');
  if (interactApp && interactPage) {
    interactApp.addEventListener('click', () => {
      const editing = Array.from(document.querySelectorAll('.app-grid')).some(g => g.classList.contains('editing'));
      if (editing) return;
      if (window.renderAskRecords) window.renderAskRecords();
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      interactPage.hidden = false;
    });
  }
  const interactBack = document.getElementById('interact-back');
  if (interactBack) {
    interactBack.addEventListener('click', () => {
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      const home = document.getElementById('page-phone');
      if (home) home.hidden = false;
    });
  }

// ================= 查岗（TA 的日常）=================
const DEF_PLACES = ['在家', '在公司', '在咖啡店', '在公园', '在图书馆', '在路上', '在朋友家', '在健身房', '在超市', '在电影院'];
const DEF_ACTIONS = ['刷手机', '看书', '发呆', '听歌', '写东西', '吃零食', '喝奶茶', '散步', '玩游戏', '想你'];
const DEF_CHECK_MSGS = ['想你了', '记得按时吃饭', '今天也很喜欢你', '早点休息', '有空给我回消息', '别太累'];
// 查岗日常字卡（可自定义，localStorage 持久化；空则用默认）
function ckList(k, def) {
  try {
    const v = JSON.parse(store.get('checkin-cards-' + k) || 'null');
    if (Array.isArray(v) && v.length) return v;
  } catch (e) {}
  return def.slice();
}
function ckSaveList(k, list) { store.set('checkin-cards-' + k, JSON.stringify(list)); }
function genCheckin() {
  const places = ckList('place', DEF_PLACES);
  const actions = ckList('action', DEF_ACTIONS);
  const msgs = ckList('msg', DEF_CHECK_MSGS);
  return {
    place: places[Math.floor(Math.random() * places.length)],
    action: actions[Math.floor(Math.random() * actions.length)],
    msg: msgs[Math.floor(Math.random() * msgs.length)]
  };
}
function renderCheckinHistory() {
  const histEl = document.getElementById('ck-history');
    if (!histEl) return;
    try {
      const h = JSON.parse(store.get('checkin-history') || '[]');
      histEl.innerHTML = h.length
        ? h.slice().reverse().map(x =>
            '<div class="ck-location"><div class="ck-value" style="font-size:13px">' + (x.t || '--') + ' · ' + (x.place || '--') + ' · ' + (x.action || '--') + '</div><div class="ck-label">' + (x.msg || '') + '</div></div>'
          ).join('')
        : '<div class="div-result-empty">暂无查岗记录</div>';
    } catch (e) {}
  }
  // 初始化：从 IndexedDB 恢复全部查岗记录
  (function () {
    if (window.idbGet) {
      window.idbGet(uid + ':checkin-history').then(v => {
        if (!v) return;
        try {
          const data = typeof v === 'string' ? JSON.parse(v) : v;
          if (Array.isArray(data) && data.length && !store.get('checkin-history')) {
            store.set('checkin-history', JSON.stringify(data));
          }
        } catch (e) {}
      });
    }
  })();
  const checkinApp = document.querySelector('.app[data-app="checkin"]');
  const checkinPage = document.getElementById('page-checkin');
  // ---- 星言顶部栏字卡/随机换头像同款刷新机制 ----
  // 上次/下次更新时间戳持久化：首次启动立即生成一条，之后每 1-8 小时更新一次；
  // 每 60 秒轮询检查，刷新页面周期不重置
  function ckLast() { const v = parseInt(store.get('checkin-last'), 10); return isNaN(v) ? 0 : v; }
  function ckNext() { const v = parseFloat(store.get('checkin-next')); return isNaN(v) ? 0 : v; }
  function renderCheckinUI(ck) {
    const place = document.getElementById('ck-place');
    const action = document.getElementById('ck-action');
    const msg = document.getElementById('ck-msg');
    const status = document.getElementById('ck-status');
    const name = store.get('lbl-partner') || 'TA';
    if (place) place.textContent = ck.place;
    if (action) action.textContent = ck.action;
    if (msg) msg.textContent = ck.msg;
    if (status) status.textContent = name + ' 的日常';
  }
  function recordCheckin(ck) {
    const entry = { t: fmtTime(Date.now()), place: ck.place, action: ck.action, msg: ck.msg, ts: Date.now() };
    try {
      const h = JSON.parse(store.get('checkin-history') || '[]');
      h.push(entry);
      store.set('checkin-history', JSON.stringify(h));
      if (window.idbSet) window.idbSet(uid + ':checkin-history', JSON.stringify(h));
    } catch (e) {}
    renderCheckinHistory();
  }
  // 生成新日常：渲染 + 推聊天消息（更新提示 + 概率提醒）+ 记录 + 重置计时
  function doCheckin() {
    const ck = genCheckin();
    store.set('checkin-current', JSON.stringify(ck));
    renderCheckinUI(ck);
    const name = store.get('lbl-partner') || 'TA';
    // 日常更新显示在聊天消息里（普通气泡消息，持久化）
    if (window.chatAddIn) {
      window.chatAddIn(ck.place + ' · ' + ck.action + (ck.msg ? ' · ' + ck.msg : ''));
    }
    // 更新提示系统消息 + 概率触发「提醒你来查岗」
    if (window.chatAddSystem) {
      window.chatAddSystem(name + ' 更新了一条日常');
      if (Math.random() * 100 < 30) {
        window.chatAddIn(name + ' 提醒你快来查岗');
      }
    }
    recordCheckin(ck);
    store.set('checkin-last', String(Date.now()));
    store.set('checkin-next', String(1 + Math.random() * 7));
    // 同步聊天里打开的查岗半框
    const p = document.getElementById('ck-p-place');
    const a = document.getElementById('ck-p-action');
    const m = document.getElementById('ck-p-msg');
    if (p) p.textContent = ck.place;
    if (a) a.textContent = ck.action;
    if (m) m.textContent = ck.msg;
  }
  // 供聊天页「点联系人头像打开查岗半框」使用
  window.openCkPanel = function () {
    // 关闭其他底部半框（拍一拍/表情包/头像互动）
    const pc = document.getElementById('poke-card');
    if (pc) pc.hidden = true;
    const ep = document.getElementById('emoji-panel');
    if (ep) ep.hidden = true;
    if (window.closeAvlib) window.closeAvlib();
    const panel = document.getElementById('ck-panel');
    const nameEl = document.getElementById('ck-panel-name');
    const name = store.get('lbl-partner') || 'TA';
    if (nameEl) nameEl.textContent = name;
    // 显示当前日常；从未生成过则立即生成一条
    let cur = null;
    try { cur = JSON.parse(store.get('checkin-current') || 'null'); } catch (e) {}
    if (cur && cur.place) {
      const p = document.getElementById('ck-p-place');
      const a = document.getElementById('ck-p-action');
      const m = document.getElementById('ck-p-msg');
      if (p) p.textContent = cur.place;
      if (a) a.textContent = cur.action;
      if (m) m.textContent = cur.msg;
    } else {
      doCheckin();
    }
    if (panel) panel.hidden = false;
  };
  const ckPanelClose = document.getElementById('ck-panel-close');
  if (ckPanelClose) ckPanelClose.addEventListener('click', () => { document.getElementById('ck-panel').hidden = true; });
  const ckPanelRefresh = document.getElementById('ck-p-refresh');
  if (ckPanelRefresh) {
    ckPanelRefresh.addEventListener('click', () => doCheckin());
  }
  // 自动轮询：启动立即 + 每 60 秒检查（首次 last=0 立即生成）
  function checkAutoCheckin() {
    try {
      const now = Date.now();
      let last = ckLast(), next = ckNext();
      if (last > now || last < 0 || isNaN(last)) { last = 0; next = 0; }
      if ((now - last) / 36e5 < next) return;
      doCheckin();
    } catch (e) {}
  }
  setInterval(checkAutoCheckin, 60000);
  checkAutoCheckin();
  if (checkinApp && checkinPage) {
    checkinApp.addEventListener('click', () => {
      const editing = Array.from(document.querySelectorAll('.app-grid')).some(g => g.classList.contains('editing'));
      if (editing) return;
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      checkinPage.hidden = false;
      // 显示当前日常；从未生成过则立即生成一条
      let cur = null;
      try { cur = JSON.parse(store.get('checkin-current') || 'null'); } catch (e) {}
      if (cur && cur.place) renderCheckinUI(cur);
      else doCheckin();
      renderCheckinHistory();
    });
  }
  const checkinBack = document.getElementById('checkin-back');
  if (checkinBack) {
    checkinBack.addEventListener('click', () => {
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      const home = document.getElementById('page-phone');
      if (home) home.hidden = false;
    });
  }
  const ckRefresh = document.getElementById('ck-refresh');
  if (ckRefresh) {
    ckRefresh.addEventListener('click', () => doCheckin());
  }

  // ================= 查岗日常字卡（管理页 + 字卡库入口） =================
  const CK_DEFS = [
    ['place', DEF_PLACES],
    ['action', DEF_ACTIONS],
    ['msg', DEF_CHECK_MSGS]
  ];
  const CK_LABEL = { place: '📍 地点', action: '✨ 在做什么', msg: '💬 说的话' };
  let ckTab = 'place';
  function renderCheckinCards() {
    // 顶部分类 tab
    document.querySelectorAll('#page-checkin-cards .fav-tab').forEach(tab => {
      tab.classList.toggle('sel', tab.dataset.cktab === ckTab);
    });
    const listEl = document.getElementById('cck-list');
    const titleEl = document.getElementById('cck-list-title');
    if (titleEl) titleEl.textContent = CK_LABEL[ckTab] || '';
    if (listEl) {
      const def = { place: DEF_PLACES, action: DEF_ACTIONS, msg: DEF_CHECK_MSGS }[ckTab];
      const list = ckList(ckTab, def);
      listEl.innerHTML = list.length
        ? list.map((x, i) =>
            '<div class="tc-qrow"><div class="tc-qmain"><div class="tc-qtext">' + String(x).replace(/</g, '&lt;') + '</div></div>' +
            '<button class="ta-del" data-i="' + i + '">✕</button></div>'
          ).join('')
        : '<div class="ta-empty">暂无，可添加</div>';
      // 删除
      listEl.querySelectorAll('.ta-del').forEach(b => {
        b.onclick = () => {
          const l = ckList(ckTab, def);
          l.splice(Number(b.dataset.i), 1);
          ckSaveList(ckTab, l);
          renderCheckinCards();
        };
      });
    }
    // 数字
    const total = CK_DEFS.reduce((s, [k, def]) => s + ckList(k, def).length, 0);
    const cnt = document.getElementById('cc-checkin-count');
    if (cnt) cnt.textContent = total;
  }
  // 分类 tab 切换
  document.querySelectorAll('#page-checkin-cards .fav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      ckTab = tab.dataset.cktab;
      renderCheckinCards();
    });
  });
  // 批量输入：每行一个，添加到当前分类
  const batchAdd = document.getElementById('cck-batch-add');
  if (batchAdd) {
    batchAdd.addEventListener('click', () => {
      const ta = document.getElementById('cck-batch');
      const raw = ta ? ta.value : '';
      const items = raw.split('\n').map(s => s.trim()).filter(Boolean);
      if (!items.length) { toast('请输入内容，每行一个'); return; }
      const def = { place: DEF_PLACES, action: DEF_ACTIONS, msg: DEF_CHECK_MSGS }[ckTab];
      const list = ckList(ckTab, def);
      items.forEach(it => list.push(it));
      ckSaveList(ckTab, list);
      if (ta) ta.value = '';
      renderCheckinCards();
      toast('已添加 ' + items.length + ' 条到「' + (CK_LABEL[ckTab] || ckTab) + '」');
    });
  }
  // 入口：字卡库「查岗日常字卡」→ 管理页
  const liCK = document.getElementById('li-checkin-cards');
  const ckCardsPage = document.getElementById('page-checkin-cards');
  if (liCK && ckCardsPage) {
    liCK.addEventListener('click', () => {
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      ckCardsPage.hidden = false;
      renderCheckinCards();
    });
  }
  const ckCardsBack = document.getElementById('checkin-cards-back');
  if (ckCardsBack) {
    ckCardsBack.addEventListener('click', () => {
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      const home = document.getElementById('page-chatcard');
      if (home) home.hidden = false;
    });
  }
  renderCheckinCards();

  // ================= 音乐收藏同步 =================
  function renderMusicFavs() {
    const el = document.getElementById('music-favs');
    if (!el) return;
    try {
      const f = JSON.parse(store.get('music-favs') || '[]');
      el.textContent = f.length ? f.join('\n') : '暂无收藏歌曲';
    } catch (e) {}
  }
  window.toggleMusicFav = function (name) {
    try {
      let f = JSON.parse(store.get('music-favs') || '[]');
      const idx = f.indexOf(name);
      if (idx >= 0) f.splice(idx, 1);
      else f.push(name);
      store.set('music-favs', JSON.stringify(f));
      renderMusicFavs();
      return idx < 0;
    } catch (e) { return false; }
  };
  window.musicFavState = function (name) {
    try {
      const f = JSON.parse(store.get('music-favs') || '[]');
      return f.indexOf(name) >= 0;
    } catch (e) { return false; }
  };
})();
