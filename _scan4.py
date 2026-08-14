import os, sys, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
root = r"C:\Users\Administrator\Desktop\004\星言简易版\app\src"
# 搜索拍一拍/TOUCH 数据定义
for fn in sorted(os.listdir(root)):
    if not fn.endswith('.js'):
        continue
    p = os.path.join(root, fn)
    try:
        s = open(p, encoding='utf-8').read()
    except Exception:
        continue
    for kw in ['TOUCH_ACTIONS', '_defaultTouchCards', 'getDefaultTouchCards', "type:'touch'", "category:'touch'"]:
        i = s.find(kw)
        if i >= 0:
            print('===', fn, kw, '@', i)
            print(s[i:i+1200])
            print()
