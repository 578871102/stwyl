import sys, re, json
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
s = open(r"C:\Users\Administrator\Desktop\004\星言简易版\app\src\08_default_cards_data.js", encoding='utf-8').read()

# 组 id -> (name, category)
groups = re.findall(r"\{id:'(g_def_\d+)',name:'([^']+)',category:'([^']+)'", s)
name2cat = {}
for gid, name, cat in groups:
    name2cat[name] = cat

# _DCCT 文本段落
start = s.find('_DCCT=`')
end = s.find('DEFAULT_COMMON_CARDS=[]')
body = s[start:end].split('\n', 1)[1].rsplit('`', 1)[0]
lines = [l.strip() for l in body.split('\n') if l.strip()]
main_groups = []
touch_groups = []
cur = None
cur_cat = None
for l in lines:
    m = re.match(r'^【(.+?)】$', l)
    if m:
        cur = m.group(1)
        cur_cat = name2cat.get(cur, 'custom')
        if cur_cat == 'touch':
            touch_groups.append([cur, []])
        else:
            main_groups.append([cur, []])
    elif cur is not None:
        target = touch_groups if cur_cat == 'touch' else main_groups
        if target:
            target[-1][1].append(l)

# emoji / kaomoji
def extract_groups(anchor_start, anchor_end):
    block = s[anchor_start:anchor_end]
    items = re.findall(r"\{g:'(g_def_\d+)',items:\[(.*?)\]\}", block, re.S)
    out = []
    idmap = {g[0]: g[1] for g in groups}
    for gid, arr in items:
        cards = re.findall(r"'((?:[^'\\]|\\.)*)'", arr)
        out.append([idmap.get(gid, gid), cards])
    return out

emoji_start = s.find('emojiData')
km_start = s.find('kaomojiData')
km_end = s.find('\n})();', km_start)
emoji_end = s.find('// 追加默认通用字卡的 颜文字', emoji_start)
emoji_groups = extract_groups(emoji_start, emoji_end)
kaomoji_groups = extract_groups(km_start, km_end)

# TOUCH_ACTIONS 兜底
ta = re.search(r"TOUCH_ACTIONS=\[(.*?)\];", s)
touch_fallback = re.findall(r"'([^']*)'", ta.group(1)) if ta else []
print('TOUCH_ACTIONS:', touch_fallback)

# 把兜底并入 touch 第一个分组（或单独一组）
if touch_fallback:
    touch_groups.append(['默认拍一拍', touch_fallback])

print('main 组:', len(main_groups), '字卡:', sum(len(g[1]) for g in main_groups))
print('touch 组:', len(touch_groups), [(g[0], len(g[1])) for g in touch_groups])
print('emoji 组:', len(emoji_groups), 'kaomoji 组:', len(kaomoji_groups))

data = {'main': main_groups, 'kaomoji': kaomoji_groups, 'emoji': emoji_groups, 'touch': touch_groups}
out = '// ===== 默认通用字卡数据（提取自星言简易版 08_default_cards_data.js） =====\n'
out += 'window.DEFAULT_CARD_DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n'
with open(r"C:\Users\Administrator\Desktop\mochi\src\js\default-cards-data.js", 'w', encoding='utf-8') as f:
    f.write(out)
import os
print('写出:', os.path.getsize(r"C:\Users\Administrator\Desktop\mochi\src\js\default-cards-data.js"), 'bytes')
