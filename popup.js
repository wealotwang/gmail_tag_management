const LOG_KEY = 'gmail_copilot_logs';
const LATEST_KEY = 'gmail_copilot_latestScan';
const TRIGGER_KEY = 'gmail_copilot_triggerScan';

function fmt(ts){
  const d = new Date(ts);
  const p = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function render(){
  chrome.storage.local.get([LOG_KEY, LATEST_KEY], items => {
    const logs = Array.isArray(items[LOG_KEY]) ? items[LOG_KEY] : [];
    const latest = items[LATEST_KEY];
    const txt = logs.map(l => `[${fmt(l.ts)}] ${l.level} ${l.tag} ${l.payload}`).join('\n');
    document.getElementById('log').textContent = txt || '暂无日志';
    document.getElementById('status').textContent = latest ? `最近扫描: ${fmt(latest.ts)} | 标签数: ${(latest.labels||[]).length}` : '尚未扫描';
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
