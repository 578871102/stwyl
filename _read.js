import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
s = open(r"C:\Users\Administrator\Desktop\004\星言简易版\app\src\28_misc.js.bak_191322", encoding='utf-8').read()
i = s.find('查岗')
print('查岗 @', i)
if i > 0:
    print(s[max(0,i-200):i+1500].replace('\n',' ')[:1700])
