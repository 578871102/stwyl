// ===== 功能：占卜（复刻星言完整版） =====
// 两种模式：塔罗（22 张大阿卡纳）/ 雷诺曼（40 张）
// 张数：1 / 3（过去·现在·未来）/ 7（完整牌阵）；牌面为矢量线条图标
(function () {
  const page = document.getElementById('page-divine');
  if (!page) return;

  let mode = 'tarot';
  let count = 3;

  // ---- 塔罗 22 张大阿卡纳（矢量图标 + 牌名 + 正逆位寓意）----
  const TAROT = [
    { name: '愚人', icon: 'sun', pos: '新的开始，勇敢出发。', neg: '鲁莽行事，需三思。' },
    { name: '魔术师', icon: 'wand', pos: '掌握资源，心想事成。', neg: '空想多于行动。' },
    { name: '女祭司', icon: 'moon', pos: '直觉敏锐，静观其变。', neg: '忽视内心的声音。' },
    { name: '皇后', icon: 'flower', pos: '丰盛滋养，温柔以待。', neg: '过度付出忽略自己。' },
    { name: '皇帝', icon: 'crown', pos: '稳固掌控，责任担当。', neg: '固执己见，控制过强。' },
    { name: '教皇', icon: 'book', pos: '遵循传统，获得指引。', neg: '墨守成规，缺乏变通。' },
    { name: '恋人', icon: 'heart', pos: '选择与联结，心意相通。', neg: '摇摆不定，沟通受阻。' },
    { name: '战车', icon: 'chariot', pos: '坚定前进，掌控方向。', neg: '失去方向，内耗拉扯。' },
    { name: '力量', icon: 'lion', pos: '温柔的力量，勇气在心。', neg: '缺乏自信，逞强硬撑。' },
    { name: '隐士', icon: 'lamp', pos: '独处思考，寻找答案。', neg: '孤僻封闭，拒绝帮助。' },
    { name: '命运之轮', icon: 'wheel', pos: '时来运转，顺势而行。', neg: '运势波动，随遇而安。' },
    { name: '正义', icon: 'scales', pos: '公平公正，理性裁决。', neg: '偏见失衡，犹豫不决。' },
    { name: '倒吊人', icon: 'hanged', pos: '换个角度，暂停思考。', neg: '无谓牺牲，停滞不前。' },
    { name: '死神', icon: 'skull', pos: '结束与新生，翻篇向前。', neg: '抗拒改变，迟迟不放。' },
    { name: '节制', icon: 'cup', pos: '平衡调和，恰到好处。', neg: '失衡过度，缺乏节制。' },
    { name: '恶魔', icon: 'devil', pos: '看清执念，挣脱束缚。', neg: '深陷欲望，难以自拔。' },
    { name: '高塔', icon: 'tower', pos: '突变的觉醒，打破僵局。', neg: '恐慌不安，逃避现实。' },
    { name: '星星', icon: 'star', pos: '希望之光，心愿可期。', neg: '信心受挫，暂时暗淡。' },
    { name: '月亮', icon: 'crescent', pos: '直觉与幻象，看清真相。', neg: '不安迷惘，被情绪困住。' },
    { name: '太阳', icon: 'sunny', pos: '光明坦途，喜悦丰收。', neg: '短暂的阴霾，乐观仍在。' },
    { name: '审判', icon: 'trumpet', pos: '觉醒重生，重要抉择。', neg: '悔恨自省，难以原谅。' },
    { name: '世界', icon: 'globe', pos: '圆满达成，新的循环。', neg: '功亏一篑，尚需收尾。' }
  ];
  const TAROT_ICONS = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    wand: '<path d="M12 2l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    flower: '<circle cx="12" cy="10" r="3"/><path d="M12 7V4M12 16v4M12 7a3 3 0 00-3-3M12 7a3 3 0 013-3M12 13a3 3 0 01-3 3M12 13a3 3 0 013 3"/>',
    crown: '<path d="M4 18h16M4 18l2-9 5 4 3-6 4 6 4-4 2 9"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
    heart: '<path d="M12 21s-7.5-4.7-9.3-9A5.3 5.3 0 0112 6.4a5.3 5.3 0 019.3 5.6c-1.8 4.3-9.3 9-9.3 9z"/>',
    chariot: '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><path d="M5 7v6h14V7M7 13l-2 7M17 13l2 7M3 13h18"/>',
    lion: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
    lamp: '<path d="M12 2l3 7-3 3-3-3z"/><path d="M12 12v8M8 20h8"/>',
    wheel: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/>',
    scales: '<path d="M12 3v18M5 21h14M8 7h8M4 11l4-2 2 6M20 11l-4-2-2 6"/>',
    hanged: '<circle cx="12" cy="5" r="2"/><path d="M12 7v10M12 17c-2 0-3-3-3-6M12 17c2 0 3-3 3-6"/>',
    skull: '<circle cx="12" cy="12" r="8"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><path d="M10 17h4"/>',
    cup: '<path d="M4 10h16v2a8 8 0 01-16 0z"/><path d="M4 10a8 8 0 0116 0"/>',
    devil: '<path d="M12 3l7 10.5a4.5 4.5 0 11-7.5 5L12 3z"/><path d="M8.5 15.5a2.5 2.5 0 002 4.5M12 9v6"/>',
    tower: '<path d="M12 2l3 10h-6zM9 12l-2 8h10l-2-8"/><path d="M12 15v3"/>',
    star: '<path d="M12 2l2.4 5 5.6.8-4 4 .9 5.6-4.9-2.6-4.9 2.6.9-5.6-4-4 5.6-.8z"/>',
    crescent: '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/><path d="M12 8l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/>',
    sunny: '<circle cx="12" cy="12" r="5"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3M3.5 3.5l2.1 2.1M18.4 18.4l2.1 2.1M3.5 20.5l2.1-2.1M18.4 5.6l2.1-2.1"/>',
    trumpet: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/><path d="M8 4c-1.5 2.5-1.5 13.5 0 16"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18"/>'
  };

  // ---- 雷诺曼 40 张（矢量图标 + 寓意）----
  const LENO = [
    { name: '骑士', icon: 'horse', meaning: '迅速的行动与消息。' },
    { name: '四叶草', icon: 'clover', meaning: '小小的幸运与惊喜。' },
    { name: '船', icon: 'ship', meaning: '远行与旅程。' },
    { name: '房子', icon: 'house', meaning: '安稳的归属。' },
    { name: '树', icon: 'tree', meaning: '成长与健康。' },
    { name: '云', icon: 'cloud', meaning: '暂时的迷雾与不确定。' },
    { name: '蛇', icon: 'snake', meaning: '潜在的考验与转折。' },
    { name: '棺材', icon: 'coffin', meaning: '结束与新的开始。' },
    { name: '花束', icon: 'bouquet', meaning: '美好与馈赠。' },
    { name: '镰刀', icon: 'scythe', meaning: '果断的切割。' },
    { name: '鞭子', icon: 'whip', meaning: '反复与提醒。' },
    { name: '鸟', icon: 'bird', meaning: '交谈与消息。' },
    { name: '孩子', icon: 'child', meaning: '新生的开始。' },
    { name: '狐狸', icon: 'fox', meaning: '机智与谨慎。' },
    { name: '熊', icon: 'bear', meaning: '力量与保护。' },
    { name: '星星', icon: 'star', meaning: '愿望与指引。' },
    { name: '鹤', icon: 'stork', meaning: '变化与喜讯。' },
    { name: '狗', icon: 'dog', meaning: '忠诚的陪伴。' },
    { name: '塔', icon: 'tower', meaning: '独立与高度。' },
    { name: '花园', icon: 'garden', meaning: '聚会与社交。' },
    { name: '山', icon: 'mountain', meaning: '挑战与坚持。' },
    { name: '路口', icon: 'crossroad', meaning: '面临选择。' },
    { name: '老鼠', icon: 'mouse', meaning: '细小的损耗。' },
    { name: '心', icon: 'heart', meaning: '真挚的情感。' },
    { name: '戒指', icon: 'ring', meaning: '承诺与契约。' },
    { name: '信', icon: 'letter', meaning: '书面的消息。' },
    { name: '书', icon: 'book', meaning: '知识或秘密。' },
    { name: '男人', icon: 'man', meaning: '一位重要的男性。' },
    { name: '女人', icon: 'woman', meaning: '一位重要的女性。' },
    { name: '百合', icon: 'lily', meaning: '平静与纯净。' },
    { name: '太阳', icon: 'sunny', meaning: '成功与光明。' },
    { name: '月亮', icon: 'crescent', meaning: '直觉与情感。' },
    { name: '钥匙', icon: 'key', meaning: '答案与机会。' },
    { name: '鱼', icon: 'fish', meaning: '富足与资源。' },
    { name: '锚', icon: 'anchor', meaning: '稳定与安全。' },
    { name: '十字架', icon: 'cross', meaning: '信念与考验。' },
    { name: '灵体', icon: 'spirit', meaning: '直觉与灵感。' },
    { name: '香炉', icon: 'incense', meaning: '沉淀与净化。' },
    { name: '床', icon: 'bed', meaning: '休息与私密。' },
    { name: '市场', icon: 'market', meaning: '交易与机会。' }
  ];
  const LENO_ICONS = {
    horse: '<path d="M4 16l3-4 5 0 4-6 3 2-1 4 3 4M7 12l-3 2M4 18h3"/>',
    clover: '<line x1="12" y1="4" x2="12" y2="20"/><circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><circle cx="12" cy="14" r="3"/>',
    ship: '<path d="M3 16h18l-3 5H6zM12 16V6M8 6h8"/>',
    house: '<path d="M4 20V9l8-6 8 6v11M9 20v-6h6v6"/>',
    tree: '<path d="M12 3l4 7h-2.5l3 6H12M12 3L8 10h2.5l-3 6H12"/><path d="M12 16v4"/>',
    cloud: '<path d="M17 19a4 4 0 000-8 5.5 5.5 0 00-11 1A3.5 3.5 0 006.5 19z"/>',
    snake: '<path d="M4 15s3-2 6 0 6 2 8 0M4 15l-1-3M20 15l1-3"/><circle cx="4" cy="19" r="1"/>',
    coffin: '<path d="M8 3h8l-1 18H9zM9 9h6"/>',
    bouquet: '<circle cx="12" cy="9" r="3"/><path d="M12 6V3M10 8l-3 1M14 8l3 1M12 12v8M8 17l2-1M16 17l-2-1"/>',
    scythe: '<path d="M4 20L14 10M14 10c4-1 6-3 6-6-3 0-5 2-6 6z"/>',
    whip: '<path d="M4 5h10M8 5l-1 14M4 9l4-4M18 5h2"/>',
    bird: '<path d="M3 14c3-5 15-5 18 0-3-1-15-1-18 0zM7 14l-2 4M17 14l2 4"/>',
    child: '<circle cx="12" cy="8" r="3"/><path d="M6 18c0-3 3-5 6-5s6 2 6 5"/>',
    fox: '<path d="M8 6l-2-2 2 3a4 4 0 016 0l2-3-2 2 1 2-1 6h-6z"/><path d="M10 15v2M14 15v2"/>',
    bear: '<circle cx="12" cy="10" r="6"/><circle cx="9" cy="8" r="1.5"/><circle cx="15" cy="8" r="1.5"/><path d="M12 14l-1 4M12 14l1 4"/>',
    star: '<path d="M12 2l2.4 5 5.6.8-4 4 .9 5.6-4.9-2.6-4.9 2.6.9-5.6-4-4 5.6-.8z"/>',
    stork: '<path d="M12 3v18M12 6c-3 0-5 3-5 6 0 3 2 6 5 6M12 6c3 0 5 3 5 6 0 3-2 6-5 6"/><path d="M12 8v8"/>',
    dog: '<circle cx="9" cy="9" r="4"/><circle cx="15" cy="9" r="4"/><path d="M7 13l-2 8 4-3M17 13l2 8-4-3M9 13v5M15 13v5"/>',
    tower: '<path d="M9 3h6l-1 17h-4zM7 8h10"/>',
    garden: '<circle cx="8" cy="15" r="4"/><circle cx="16" cy="13" r="5"/><path d="M12 2l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/>',
    mountain: '<path d="M3 20L10 6l4 8 3-5 4 11z"/>',
    crossroad: '<path d="M12 3v18M3 12h18"/><path d="M12 3l-3 3 3 3 3-3z"/>',
    mouse: '<path d="M6 12a6 6 0 0112 0v4H6zM9 12v-3M15 12v-3M6 16v3M18 16v3"/><circle cx="8" cy="10" r=".8"/><circle cx="16" cy="10" r=".8"/>',
    heart: '<path d="M12 21s-7.5-4.7-9.3-9A5.3 5.3 0 0112 6.4a5.3 5.3 0 019.3 5.6c-1.8 4.3-9.3 9-9.3 9z"/>',
    ring: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
    letter: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 8l9 6 9-6"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
    man: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.5-6 8-6s8 2 8 6"/>',
    woman: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.5-6 8-6s8 2 8 6"/><path d="M12 2v2"/>',
    lily: '<path d="M12 3l-2 5 4 0zM12 8v10M10 18h4M12 12c-3 0-4 3-4 6h0c2 0 3-2 4-3 1 1 2 3 4 3h0c0-3-1-6-4-6z"/>',
    sunny: '<circle cx="12" cy="12" r="5"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3M3.5 3.5l2.1 2.1M18.4 18.4l2.1 2.1M3.5 20.5l2.1-2.1M18.4 5.6l2.1-2.1"/>',
    crescent: '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>',
    key: '<circle cx="7" cy="17" r="4"/><path d="M10 14L20 4M16 8l3 3"/>',
    fish: '<path d="M3 12c4-5 14-5 18 0-4 5-14 5-18 0z"/><path d="M14 12h6"/><circle cx="6" cy="12" r=".8"/>',
    anchor: '<circle cx="12" cy="4" r="2"/><path d="M12 6v14M5 12h14M8 20h8M12 6a8 8 0 01-4 6"/>',
    cross: '<path d="M12 3v18M5 12h14"/><circle cx="12" cy="12" r="8"/>',
    spirit: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    incense: '<path d="M12 3l1 3h-2zM12 6v6M9 18h6M10 21h4"/><path d="M12 12c-3 0-4 2-4 4h8c0-2-1-4-4-4z"/>',
    bed: '<path d="M3 18v-8h18v8M3 14h18M7 18v-4M17 18v-4"/><circle cx="7" cy="9" r="2"/>',
    market: '<path d="M4 5h16l-2 12H6zM9 5v3M15 5v3M6 17h12l1 3H5z"/>'
  };

  // 牌阵标签（星言 modeLabels）
  const MODE_LABELS = {
    tarot: { 1: ['运势'], 3: ['过去', '现在', '未来'], 7: ['启示', '过去', '现在', '未来', '核心', '阻碍', '根源'] },
    lenormand: { 1: ['回复'], 3: ['回复 1', '回复 2', '回复 3'], 7: ['回复 1', '回复 2', '回复 3', '回复 4', '回复 5', '回复 6', '回复 7'] }
  };

  // 模式/张数切换
  const modesWrap = document.getElementById('div-modes');
  const countsWrap = document.getElementById('div-counts');
  if (modesWrap) {
    modesWrap.addEventListener('click', (e) => {
      const b = e.target.closest('.div-mode');
      if (!b) return;
      modesWrap.querySelectorAll('.div-mode').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
      mode = b.dataset.mode;
      clearResult();
    });
  }
  if (countsWrap) {
    countsWrap.addEventListener('click', (e) => {
      const b = e.target.closest('.div-mode');
      if (!b) return;
      countsWrap.querySelectorAll('.div-mode').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
      count = Number(b.dataset.count);
      clearResult();
    });
  }
  function clearResult() {
    const r = document.getElementById('div-result');
    if (r) r.innerHTML = '<div class="div-result-empty">点击下方按钮开始抽牌</div>';
  }

  function shuf(a) {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = b[i]; b[i] = b[j]; b[j] = t;
    }
    return b;
  }
  function cardHtml(ico, name, meaning, label, rev) {
    return '<div class="div-card-face div-mini">' +
      (label ? '<div class="div-mini-tag">' + label + '</div>' : '') +
      '<div class="div-card-ico">' + ico + '</div>' +
      '<div class="div-card-name">' + (rev ? name + '（逆）' : name) + '</div>' +
      '<div class="div-card-meaning">' + meaning + '</div>' +
      '</div>';
  }

  // 抽牌
  const drawBtn = document.getElementById('div-draw');
  if (drawBtn) {
    drawBtn.addEventListener('click', () => {
      const r = document.getElementById('div-result');
      if (!r) return;
      const question = (document.getElementById('div-question') || {}).value || '';
      let html = '';
      const deck = mode === 'tarot' ? TAROT : LENO;
      const icons = mode === 'tarot' ? TAROT_ICONS : LENO_ICONS;
      const labels = (MODE_LABELS[mode] && MODE_LABELS[mode][count]) || [];
      const cards = shuf(deck).slice(0, count);
      html += '<div class="div-spread' + (count > 3 ? ' spread7' : '') + '">';
      cards.forEach((c, i) => {
        let rev = false, meaning = c.meaning;
        if (mode === 'tarot') {
          rev = Math.random() > 0.5;
          meaning = rev ? c.neg : c.pos;
        }
        html += cardHtml(icons[c.icon], c.name, meaning, labels[i] || '', rev);
      });
      html += '</div>';
      // 综合
      const names = shuf(deck).slice(0, 2).map(c => c.name).join(' · ');
      html += '<div class="div-summary">综合解读：' + names + '</div>';
      if (question) html += '<div class="div-card-meaning" style="opacity:.6;text-align:center;margin-top:8px">问：' + question + '</div>';
      r.innerHTML = html;
    });
  }

  // 桌面【占卜】图标进入
  const divApp = document.querySelector('.app[data-app="divination"]');
  if (divApp && page) {
    divApp.addEventListener('click', () => {
      const editing = Array.from(document.querySelectorAll('.app-grid')).some(g => g.classList.contains('editing'));
      if (editing) return;
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      page.hidden = false;
    });
  }
  const divBack = document.getElementById('div-back');
  if (divBack) {
    divBack.addEventListener('click', () => {
      document.querySelectorAll('.page').forEach(p => p.hidden = true);
      const phonePage = document.getElementById('page-phone');
      if (phonePage) phonePage.hidden = false;
    });
  }
})();
