const K_PROVIDER = 'config_provider';
const K_API_KEY  = 'config_api_key';
const K_MODEL    = 'config_model';
const K_RULES    = 'config_rules';

const DEMO_RULES = JSON.stringify({
  rules: [
    {
      id: 'github_alert',
      conditions: [ { field: 'sender', op: 'contains', value: 'github.com' } ],
      action: 'GitHub'
    }
  ]
}, null, 2);

function $(id){return document.getElementById(id);} 
function showToast(msg){ const t = $('toast'); t.textContent = msg || '已保存'; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 1500); }

async function load(){
  const items = await new Promise(r => chrome.storage.local.get([K_PROVIDER, K_API_KEY, K_MODEL, K_RULES], r));
  $('provider').value = items[K_PROVIDER] || 'DeepSeek';
  $('model').value = items[K_MODEL] || 'deepseek-chat';
  $('apiKey').value = items[K_API_KEY] || '';
  $('rules').value = items[K_RULES] || DEMO_RULES;
}

function validateJSON(text){
  try { JSON.parse(text); return true; } catch(e) { return false; }
}

async function save(){
  const provider = $('provider').value || 'DeepSeek';
  const model = $('model').value || 'deepseek-chat';
  const apiKey = $('apiKey').value || '';
  const rulesText = $('rules').value || DEMO_RULES;
  if (!validateJSON(rulesText)) { showToast('JSON 不合法'); return; }
  const o={}; o[K_PROVIDER]=provider; o[K_MODEL]=model; o[K_API_KEY]=apiKey; o[K_RULES]=rulesText;
  await new Promise(r => chrome.storage.local.set(o, r));
  showToast('已保存');
}

function bind(){
  $('toggleKey').addEventListener('click', ()=>{
    const el = $('apiKey');
    const isPwd = el.type === 'password';
    el.type = isPwd ? 'text' : 'password';
    $('toggleKey').textContent = isPwd ? '隐藏' : '显示';
  });
  $('save').addEventListener('click', save);
}

document.addEventListener('DOMContentLoaded', async ()=>{ await load(); bind(); });
