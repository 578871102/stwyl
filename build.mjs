// ===== 组装脚本 =====
// 把 src/ 下的模板 + 按页面拆分的 CSS + 按功能拆分的 JS
// 拼装成单个可直接双击打开的 index.html（完整功能）。
// 用法：在 mochi 目录下运行  node build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(root, 'src', p), 'utf8');

// 按顺序拼接样式 / 脚本（顺序即生效顺序）
const cssFiles = ['base.css', 'home.css', 'chat.css', 'setting.css', 'tabbar.css'];
const jsFiles = ['idb.js', 'clock.js', 'tabs.js', 'desktop-slider.js', 'personalize.js', 'chat.js', 'chatcard.js', 'chat-settings.js', 'reply-settings.js', 'default-cards-data.js', 'default-cards.js', 'mood-followup-data.js', 'mood-reply-cards.js', 'music-player.js', 'calendar.js', 'divination.js', 'avatar-lib.js', 'ta-ask.js', 'bg-keep.js', 'p2-features.js'];

let html = read('template.html');
const styles = cssFiles.map(f => read(join('css', f))).join('\n');
const scripts = jsFiles.map(f => read(join('js', f))).join('\n');

html = html.replace('/*__STYLES__*/', styles);
html = html.replace('/*__SCRIPTS__*/', scripts);

const out = join(root, 'index.html');
writeFileSync(out, html);
console.log('已生成 index.html（' + html.length + ' 字节，' + (html.split('\n').length) + ' 行）');
