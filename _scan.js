const fs = require('fs');
const files = fs.readdirSync('src/js').filter(f => f.endsWith('.js'));
const keys = {}; // key -> 使用的模块
files.forEach(f => {
  const s = fs.readFileSync('src/js/' + f, 'utf8');
  // store.get('xxx') / store.set('xxx') / store.get(KEY)
  const re = /store\.(get|set)\((['"])([^'"]+)\2|const (KEY\d*|FONT_KEY|HISTORY_KEY|SETTINGS_KEY|CALL_BG_KEY|MYE_KEY|CSS_KEY|MY_KEY) = (['"])([^'"]+)\5|store\.get\((\w+)\)/g;
  let m;
  const fileKeys = new Set();
  while ((m = re.exec(s))) {
    let k = m[3] || m[7] || null;
    if (k) fileKeys.add(k);
    else if (m[4]) fileKeys.add(m[4] + '=' + (m[6]||''));
  }
  // 也找 window.idbGet 读取的键
  const idbRe = /idbGet\((['"])([^'"]+)\1|idbGet\((\w+)\)/g;
  while ((m = idbRe.exec(s))) {
    fileKeys.add('IDB:' + (m[2] || m[3]));
  }
  fileKeys.forEach(k => {
    if (!keys[k]) keys[k] = [];
    keys[k].push(f.replace('.js',''));
  });
});
// 只列出有多个模块使用的键 + 大键候选
const out = Object.keys(keys).sort();
console.log('=== 全部存储键 + 使用模块 ===');
out.forEach(k => console.log(k + ' <- ' + keys[k].join(',')));
