const LOG_KEY = 'gmail_copilot_logs';
const LATEST_KEY = 'gmail_copilot_latestScan';
const TRIGGER_KEY = 'gmail_copilot_triggerScan';
const USAGE_KEY = 'gmail_copilot_ai_usage';

function fmt(ts){
  const d = new Date(ts);
  const p = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function render(){
  chrome.storage.local.get([LOG_KEY, LATEST_KEY, USAGE_KEY], items => {
    const logs = Array.isArray(items[LOG_KEY]) ? items[LOG_KEY] : [];
    const latest = items[LATEST_KEY];
    const usage = items[USAGE_KEY] || {};
    const txt = logs.map(l => `[${fmt(l.ts)}] ${l.level} ${l.tag} ${l.payload}`).join('\n');
    document.getElementById('log').textContent = txt || '暂无日志';
    if (latest){
      const info = [`最近扫描: ${fmt(latest.ts)}`, `标签数: ${(latest.labels||[]).length}`];
      if (latest.provider) info.push(`Provider: ${latest.provider}`);
      if (latest.model) info.push(`Model: ${latest.model}`);
      if (latest.subject) info.push(`Subject: ${latest.subject}`);
      if (latest.aiLabel) info.push(`AI建议: ${latest.aiLabel}`);
      const dk = dayKey();
      if (usage.daily && usage.daily[dk]) info.push(`今日AI: ${usage.daily[dk].count}次 (${usage.daily[dk].chars}字)`);
      document.getElementById('status').textContent = info.join(' | ');
    } else {
      const dk = dayKey();
      const info = [];
      if (usage.daily && usage.daily[dk]) info.push(`今日AI: ${usage.daily[dk].count}次 (${usage.daily[dk].chars}字)`);
      document.getElementById('status').textContent = info.join(' | ') || '尚未扫描';
    }
  });
}

document.getElementById('scan').addEventListener('click', () => {
  const o = {}; o[TRIGGER_KEY] = Date.now();
  chrome.storage.local.set(o);
});

document.getElementById('copy').addEventListener('click', async () => {
  const items = await new Promise(r => chrome.storage.local.get([LOG_KEY], r));
  const logs = Array.isArray(items[LOG_KEY]) ? items[LOG_KEY] : [];
  const txt = logs.map(l => `[${fmt(l.ts)}] ${l.level} ${l.tag} ${l.payload}`).join('\n');
  try {
    await navigator.clipboard.writeText(txt);
    document.getElementById('status').textContent = '已复制日志';
  } catch(e) {
    document.getElementById('status').textContent = '复制失败';
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes[LOG_KEY] || changes[LATEST_KEY])) render();
});

render();

document.getElementById('settings').addEventListener('click', () => {
  try { chrome.runtime.openOptionsPage(); } catch(e) {}
});

function dayKey(){ const d=new Date(); const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }
