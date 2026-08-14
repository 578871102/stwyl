const fs = require('fs');
const f = 'src/js/chat.js';
let s = fs.readFileSync(f, 'utf8');

// 在【帮我决定】逻辑后插入邀请TA和问问TA
const anchor = `              }
            }, { textarea: true, textareaPlaceholder: '例如：我今晚该吃火锅吗？' });
          }
        }, { textarea: true, textareaPlaceholder: '例如：我今晚该吃火锅吗？' });
      }
    });
  }`;
// 先确认实际结尾，用简单锚点
const simple = `              });
            }, { textarea: true, textareaPlaceholder: '例如：我今晚该吃火锅吗？' });
          }
        }, { textarea: true, textareaPlaceholder: '例如：我今晚该吃火锅吗？' });
      }
    });
  }`;
if (!s.includes(simple)) {
  console.log('帮我决定结尾未匹配，打印实际');
  const i = s.indexOf('帮我决定 · 选项');
  console.log(s.slice(i - 50, i + 700));
  process.exit(1);
}
const block = `              });
            }, { textarea: true, textareaPlaceholder: '例如：我今晚该吃火锅吗？' });
          }
        }, { textarea: true, textareaPlaceholder: '例如：我今晚该吃火锅吗？' });
      }
    });
  }

  // ---- 邀请TA（星言版：发送邀请 → TA 接受/拒绝/未回应）----
  const moreInvite = document.getElementById('more-invite');
  if (moreInvite) {
    moreInvite.addEventListener('click', (e) => {
      e.stopPropagation();
      if (morePanel) morePanel.hidden = true;
      if (window.openModal) {
        window.openModal('邀请TA · 想邀请TA做什么？', '', (v) => {
          const content = (v || '').trim();
          if (!content) return;
          // 发送邀请卡片消息
          addRec({ side: 'out', text: '邀请：' + content, special: 'invite' });
          if (window.logFish) window.logFish();
          // TA 回应（1.5-4 秒）
          setTimeout(() => {
            const roll = Math.random();
            const name = store.get('lbl-partner') || 'TA';
            if (roll < 0.55) {
              // 接受
              addRec({ side: 'in', text: name + ' 接受了你的邀请', special: 'invite-reply' });
              setTimeout(() => {
                const acc = ['好，我答应你。', '可以呀。', '我陪你。', '走吧。', '嗯，陪你。'][Math.floor(Math.random() * 5)];
                addIn(acc);
              }, 800);
            } else if (roll < 0.85) {
              // 拒绝
              addRec({ side: 'in', text: name + ' 拒绝了你的邀请', special: 'invite-reply' });
              setTimeout(() => {
                const rej = ['这次不行。', '下次吧。', '抱歉。', '今天不方便。'][Math.floor(Math.random() * 4)];
                addIn(rej);
              }, 800);
            } else {
              // 未回应
              addRec({ side: 'in', text: name + ' 暂时没有回应', special: 'invite-reply' });
            }
          }, 1500 + Math.random() * 2500);
        }, { textarea: true, textareaPlaceholder: '例如：一起睡觉' });
      }
    });
  }

  // ---- 问问TA（星言版：提问 → TA 回答）----
  const moreAsk = document.getElementById('more-ask');
  if (moreAsk) {
    moreAsk.addEventListener('click', (e) => {
      e.stopPropagation();
      if (morePanel) morePanel.hidden = true;
      if (window.openModal) {
        window.openModal('问问TA · 你的问题', '', (q) => {
          const question = (q || '').trim();
          if (!question) return;
          // 发送提问卡片消息
          addRec({ side: 'out', text: '问：' + question, special: 'ask' });
          if (window.logFish) window.logFish();
          // TA 回答（1.5-4 秒）
          setTimeout(() => {
            const defs = ['嗯嗯', '我想想…', '应该吧', '好呀', '我陪你', '可以的', '那挺好呀', '我觉得可以', '听你的'];
            const text = defs[Math.floor(Math.random() * defs.length)];
            addIn(text);
          }, 1500 + Math.random() * 2500);
        }, { textarea: true, textareaPlaceholder: '例如：周末要不要一起去看电影？' });
      }
    });
  }`;
if (!s.includes(simple)) { console.error('帮我决定结尾未找到'); process.exit(1); }
s = s.replace(simple, block);

// renderMsg 支持 invite/ask 特殊消息样式
const oldR = `    if (rec.special === 'read') {`;
const newR = `    if (rec.special === 'invite' || rec.special === 'invite-reply' || rec.special === 'ask') {
      // 邀请/提问居中卡片
      m.className = 'msg-center';
      const t2 = rec.special === 'ask' ? '❓ ' + rec.text : rec.text;
      m.innerHTML = '<div class="msg-center-card">' + t2 + '</div>';
      body.appendChild(m);
      body.scrollTop = body.scrollHeight;
      return m;
    }
    if (rec.special === 'read') {`;
if (!s.includes(oldR)) { console.error('renderMsg read 分支未找到'); process.exit(1); }
s = s.replace(oldR, newR);

fs.writeFileSync(f, s);
console.log('invite + ask logic added');
