// ===== 功能：桌面今日情话（自定义字卡库） =====
// 字卡库入口 → 管理页：批量添加 / 删除 情话字卡
// 桌面「今日情话」每天从库中随机一句（自定义优先，未添加用默认库）
(function () {
  const uid = 'xy-home-v2';
  const store = {
    get(k){ try { return localStorage.getItem(uid + ':' + k); } catch(e){ return null; } },
    set(k, v){ try { localStorage.setItem(uid + ':' + k, v); } catch(e){} }
  };
  const KEY = 'quote-cards';

  // 默认情话库（与桌面今日情话一致）
  const DEFAULT_QUOTES = [
    '我偏爱你。', '我只对你这样。', '过来，让我抱一下。', '别走，再陪我一会儿。',
    '你是我的例外。', '今天也很喜欢你。', '你在，我就安心。', '我舍不得你。',
    '我想和你待久一点。', '你是我想留下的人。', '我想把你留在身边。', '你可以一直依赖我。',
    '不用猜，我就是喜欢你。', '你对我很重要。', '来我身边。', '我想一直站在你这边。',
    '你可以多依赖我一点。', '我喜欢你看着我的时候。', '我喜欢你待在我身边。', '你来了，我就不想走了。',
    '再靠近一点。', '让我抱抱你。', '今天也想见你。', '我想陪着你。',
    '我希望你一直在。', '你可以把我当成你的归处。', '我想成为你最先想到的人。', '我想把我的偏爱都给你。',
    '你不用和任何人比较。', '在我这里，你一直是特别的。', '我怎么可能舍得丢下你。', '你回来，我就高兴。',
    '我等你，不是因为没事做。', '我只是想陪你。', '我喜欢你需要我的样子。', '你不用一个人撑着。',
    '累了就来找我。', '不管什么时候，你都可以来找我。', '我想听你多说一会儿。', '我还想和你聊很久。',
    '今天也想把时间留给你。', '我有很多话想告诉你。', '其实我一直都在想你。', '你不在的时候，我会想你。',
    '我喜欢你在我身边的感觉。', '只要是你，久一点也没关系。'
  ];
  function toast(msg) {
    let t = document.getElementById('cc-toast');
    if (!t) { t = document.createElement('div'); t.id = 'cc-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.className = 'cc-toast show';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = 'cc-toast'; }, 2000);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/</g, '&lt;'); }

  // 自定义情话库（空则用默认）
  function getQuotes() {
    try {
      const v = JSON.parse(store.get(KEY) || 'null');
      if (Array.isArray(v) && v.length) return v;
    } catch (e) {}
    return DEFAULT_QUOTES.slice();
  }
  // 供桌面「今日情话」使用：当天固定一条（自定义库优先）
  window.getQuoteOfDay = function () {
    const quotes = getQuotes();
    const d = new Date();
    const today = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    let hash = 0;
    for (let i = 0; i < today.length; i++) hash = (hash * 31 + today.charCodeAt(i)) >>> 0;
    return quotes[hash % quotes.length];
  };
  window.quoteCardCount = function () { return getQuotes().length; };

  // 渲染管理列表
  function renderList() {
    const el = document.getElementById('cq-list');
    const cnt = document.getElementById('cc-quote-count');
    if (cnt) cnt.textContent = getQuotes().length;
    if (!el) return;
    const quotes = getQuotes();
    el.innerHTML = quotes.length
      ? quotes.map((q, i) =>
          '<div class="tc-qrow"><div class="tc-qmain"><div class="tc-qtext">' + esc(q) + '</div></div>' +
          '<button class="ta-del" data-i="' + i + '">✕</button></div>'
        ).join('')
      : '<div class="ta-empty">暂无，可添加</div>';
    el.querySelectorAll('.ta-del').forEach(b => {
      b.onclick = () => {
        const list = getQuotes();
        list.splice(Number(b.dataset.i), 1);
        store.set(KEY, JSON.stringify(list));
        renderList();
      };
    });
  }
  // 批量添加
  const batchAdd = document.getElementById('cq-batch-add');
  if (batchAdd) {
    batchAdd.addEventListener('click', () => {
      const ta = document.getElementById('cq-batch');
      const raw = ta ? ta.value : '';
      const items = raw.split('\n').map(s => s.trim()).filter(Boolean);
      if (!items.length) { toast('请输入内容，每行一句'); return; }
      const list = getQuotes();
      items.forEach(it => list.push(it));
      store.set(KEY, JSON.stringify(list));
      if (ta) ta.value = '';
      renderList();
      toast('已添加 ' + items.length + ' 句今日情话');
    });
  }
  // 入口：字卡库页点「桌面今日情话」→ 管理页
  const liQuote = document.getElementById('li-quote-cards');
  const quotePage = document.getElementById('page-quote-cards');
  if (liQuote && quotePage) {
    liQuote.addEventListener('click', () => {
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      quotePage.hidden = false;
      renderList();
    });
  }
  const quoteBack = document.getElementById('quote-cards-back');
  if (quoteBack) {
    quoteBack.addEventListener('click', () => {
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      const home = document.getElementById('page-chatcard');
      if (home) home.hidden = false;
    });
  }
  renderList();
})();
