import sys, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
s = open(r"C:\Users\Administrator\Desktop\004\星言简易版\app\src\08_default_cards_data.js", encoding='utf-8').read()
# GROUPS id->name/category
groups = re.findall(r"\{id:'(g_def_\d+)',name:'([^']+)',category:'([^']+)'", s)
id2cat = {g[0]: g[2] for g in groups}
print('GROUPS 总数:', len(groups))
from collections import Counter
print('按 category:', Counter(g[2] for g in groups))
# _DCCT 段落
start = s.find('_DCCT=`')
end = s.find('DEFAULT_COMMON_CARDS=[]')
body = s[start:end].split('\n', 1)[1].rsplit('`', 1)[0]
paras = re.findall(r'^【(.+?)】$', body, re.M)
print('_DCCT 段落数:', len(paras))
# 段落里属于 touch 类的
touch_names = {g[1] for g in groups if g[2] == 'touch'}
touch_paras = [p for p in paras if p in touch_names]
print('_DCCT 中 touch 类段落:', touch_paras)
print('段落前 5:', paras[:5], '后 15:', paras[-15:])
