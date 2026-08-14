const fs = require('fs');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name]);
const files = walk('C:/Users/Administrator/Desktop/mochi/src').filter(f => /\.(js|html|css)$/.test(f));
const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu;
const found = {};
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((l, i) => {
    const ms = l.match(emojiRe);
    if (ms && ms.length) {
      const uniq = [...new Set(ms)];
      (found[f.replace('C:/Users/Administrator/Desktop/mochi/', '')] = found[f.replace('C:/Users/Administrator/Desktop/mochi/', '')] || []).push((i + 1) + ': ' + uniq.join('') + ' | ' + l.trim().slice(0, 60));
    }
  });
}
for (const f in found) {
  console.log('=== ' + f + ' (' + found[f].length + ' 行) ===');
  found[f].forEach(x => console.log('  ' + x));
}
