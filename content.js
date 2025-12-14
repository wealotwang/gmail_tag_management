(function() {
  var lastUrl = location.href;
  var checkScheduled = false;
  var injectTimer = null;
  function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}

  /**
   * 获取左侧导航根节点
   * @returns {Element|null}
   */
  function getNavRoot(){
    return document.querySelector('div[role="navigation"]') || document.querySelector('div[aria-label*="标签"], div[aria-label*="Labels"]') || null;
  }

  var DEBUG = true;
  var LOG_KEY = 'gmail_copilot_logs';
  var LATEST_KEY = 'gmail_copilot_latestScan';
  var TRIGGER_KEY = 'gmail_copilot_triggerScan';
  function stringifyPayload(v){
    try {
      if (v === undefined || v === null) return '';
      if (typeof v === 'string') return v;
      return JSON.stringify(v);
    } catch(e) {
      try { return String(v); } catch(e2) { return ''; }
    }
  }
  function pushLog(level, tag, payload){
    var entry = { ts: Date.now(), level: String(level||'log'), tag: String(tag||''), payload: stringifyPayload(payload) };
    try {
      if (chrome && chrome.storage && chrome.storage.local){
        chrome.storage.local.get([LOG_KEY], function(items){
          var logs = Array.isArray(items[LOG_KEY]) ? items[LOG_KEY] : [];
          logs.push(entry);
          if (logs.length > 200) logs = logs.slice(-200);
          chrome.storage.local.set((function(){ var o={}; o[LOG_KEY]=logs; return o; })());
        });
      }
    } catch(e){}
  }
  function log(tag, payload){ try { console.log('[Gmail Copilot] ' + tag, payload); } catch(e){} pushLog('log', tag, payload); }
  function warn(tag, payload){ try { console.warn('[Gmail Copilot] ' + tag, payload); } catch(e){} pushLog('warn', tag, payload); }
  function err(tag, payload){ try { console.error('[Gmail Copilot] ' + tag, payload); } catch(e){} pushLog('error', tag, payload); }

  /**
   * 获取左侧导航栏中的真实标签列表（更稳健选择器 + href 解析）
   * @returns {string[]} 去重后的标签名称数组
   */
  function extractLabelTextFromAnchor(a){
    var txt = (a.textContent || '').trim();
    var href = a.getAttribute('href') || '';
    var name = txt || a.getAttribute('aria-label') || a.getAttribute('data-tooltip') || '';
    if (!name){
      var m = href && href.match(/(?:#|%23)label(?:\/|%2F)([^?&]+)/);
      if (m && m[1]) name = decodeURIComponent(m[1]);
      if (!name && href.includes('label%3A')){
        var m2 = href.match(/label%3A([^&]+)/);
        if (m2 && m2[1]) name = decodeURIComponent(m2[1]);
      }
    }
    if (!name) return '';
    name = name.replace(/\s*\(\d+\)\s*$/, '').trim();
    name = name.replace(/\s*(已收起|包含菜单|Collapsed|Contains menu).*$/, '').trim();
    return name;
  }

  function getLabelsFromLabelSection(){
    var labels = [];
    var nav = getNavRoot() || document.body;
    var scope = nav;
    var nodes = scope.querySelectorAll('div[role="treeitem"] a[href], a[href*="#label/"], a[href*="%23label%2F"], a[href*="label%3A"]');
    if (DEBUG){
      log('LabelSection: navRootFound', !!getNavRoot());
      var sample = [];
      for (var s=0; s<Math.min(3, nodes.length); s++){
        var a = nodes[s];
        sample.push({text:(a.textContent||'').trim(), href:a.getAttribute('href')||'', aria:a.getAttribute('aria-label')||''});
      }
      log('LabelSection: anchorCount', nodes.length);
      log('LabelSection: anchorSamples', sample);
    }
    var blacklist = /^(收件箱|Inbox|已加星|Starred|已延后|Snoozed|重要|Important|已发送|Sent|草稿|Drafts|垃圾邮件|Spam|已删除邮件|Trash|全部|All Mail)$/i;
    for (var j=0;j<nodes.length;j++){
      var name = extractLabelTextFromAnchor(nodes[j]);
      if (!name || blacklist.test(name)) continue;
      labels.push(name);
    }
    if (DEBUG) log('LabelSection: parsedLabels', labels);
    return Array.from(new Set(labels));
  }

  /**
   * 展开左侧“更多/隐藏部分标签”区域
   * @param {Element} nav
   * @returns {Promise<void>}
   */
  async function expandHiddenLabels(nav){
    var triggers = Array.prototype.slice.call(nav.querySelectorAll('span, div, button, a'));
    for (var i=0;i<triggers.length;i++){
      var el = triggers[i];
      var txt = (el.textContent || '').trim();
      if (!txt) continue;
      if (/更多|隐藏部分标签|Show more|More/i.test(txt)){
        try { el.click(); } catch(e){}
        await sleep(300);
        break;
      }
    }
  }

  /**
   * 轻微滚动以触发虚拟化渲染
   * @param {Element} nav
   */
  function scrollNavLightly(nav){
    try {
      nav.scrollBy(0, 200);
      nav.scrollBy(0, -200);
    } catch(e){}
  }

  /**
   * 导航就绪：连续采样节点数量稳定
   * @param {Element} nav
   * @returns {Promise<void>}
   */
  async function waitForNavReady(nav){
    var selectors = 'a[href*="#label/"], a[href*="%23label%2F"], a[href*="label%3A"], div[role="treeitem"] a[href]';
    var prev = -1;
    for (var i=0;i<3;i++){
      var count = nav.querySelectorAll(selectors).length;
      if (count === prev && count > 0) return;
      prev = count;
      await sleep(200);
    }
  }

  

  

  /**
   * 提取当前打开邮件的正文纯文本（预览）
   * @returns {string} 正文前1000字符，失败时返回空字符串
   */
  function getEmailContent() {
    var main = document.querySelector('div[role="main"]') || document.body;
    var bodies = main.querySelectorAll('div.a3s');
    var text = '';
    for (var i = bodies.length - 1; i >= 0; i--) {
      var el = bodies[i];
      if (el && el.offsetParent !== null) {
        var t = (el.innerText || '').trim();
        if (t) { text = t; break; }
      }
    }
    if (!text) {
      var msgs = main.querySelectorAll('div[data-message-id]');
      for (var j = msgs.length - 1; j >= 0; j--) {
        var m = msgs[j];
        if (m && m.offsetParent !== null) {
          var mt = (m.innerText || '').trim();
          if (mt) { text = mt; break; }
        }
      }
    }
    return text ? text.slice(0, 1000) : '';
  }

  function findSubjectElement() {
    var main = document.querySelector('div[role="main"]') || document.body;
    var h2 = main.querySelector('h2');
    if (h2) return h2;
    var legacy = main.querySelector('h2.hP');
    return legacy || null;
  }

  function isDetailView() {
    var main = document.querySelector('div[role="main"]') || document.body;
    var hasSubject = !!(main.querySelector('h2') || main.querySelector('h2.hP'));
    return hasSubject;
  }

  async function injectBanner(subjectEl) {
    var nav = getNavRoot();
    if (nav){
      await expandHiddenLabels(nav);
      scrollNavLightly(nav);
      await waitForNavReady(nav);
    }
    var labels = getLabelsFromLabelSection();
    var emailPreview = getEmailContent();
    log('Labels(section)', labels);
    log('Email Context', emailPreview);
    if (!labels.length){
      warn('Labels empty - diagnostics', {
        navRoot: !!nav,
        url: location.href
      });
    }
    try { if (chrome && chrome.storage && chrome.storage.local){ var obj={}; obj[LATEST_KEY] = { labels: labels, url: location.href, ts: Date.now() }; chrome.storage.local.set(obj); } } catch(e){}

    /**
     * TODO: Phase 2 - AI API Integration
     * 使用 getEmailContent() 与 labels 作为上下文，调用 DeepSeek/Qwen API
     * 获取结构化建议标签。当前为随机从 labels 中选择或提示未检测到标签。
     */
    var labelToShow = labels.length ? labels[Math.floor(Math.random() * labels.length)] : '未检测到左侧标签';

    var banner = document.createElement('div');
    banner.id = 'ai-suggestion-banner';
    banner.className = 'ai-suggestion-banner';

    var textSpan = document.createElement('span');
    textSpan.textContent = '建议归类为 [' + labelToShow + ']';

    var confirmBtn = document.createElement('button');
    confirmBtn.className = 'ai-suggestion-banner__btn ai-suggestion-banner__btn--confirm';
    confirmBtn.textContent = '确认';

    var dismissBtn = document.createElement('button');
    dismissBtn.className = 'ai-suggestion-banner__btn ai-suggestion-banner__btn--dismiss';
    dismissBtn.textContent = '忽略';

    banner.appendChild(textSpan);
    banner.appendChild(confirmBtn);
    banner.appendChild(dismissBtn);

    var target = subjectEl.parentElement || subjectEl;
    target.insertAdjacentElement('afterend', banner);
    confirmBtn.addEventListener('click', function() { banner.remove(); });
    dismissBtn.addEventListener('click', function() { banner.remove(); });
  }

  function checkAndInject() {
    if (!isDetailView()) return;
    if (document.getElementById('ai-suggestion-banner')) return;
    var subject = findSubjectElement();
    if (!subject) return;
    if (injectTimer) clearTimeout(injectTimer);
    injectTimer = setTimeout(function() {
      if (!document.getElementById('ai-suggestion-banner') && isDetailView()) {
        injectBanner(subject);
      }
    }, 1000);
  }

  function clearBanner() {
    var b = document.getElementById('ai-suggestion-banner');
    if (b) b.remove();
  }

  function onRouteChange() {
    var current = location.href;
    if (current === lastUrl) return;
    lastUrl = current;
    clearBanner();
    maybeScheduleCheck();
  }

  function maybeScheduleCheck() {
    if (checkScheduled) return;
    checkScheduled = true;
    setTimeout(function() {
      checkScheduled = false;
      checkAndInject();
    }, 200);
  }

  function startObserver() {
    var root = document.body;
    var observer = new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes && mutations[i].addedNodes.length) {
          maybeScheduleCheck();
          break;
        }
      }
    });
    observer.observe(root, { childList: true, subtree: true });
  }

  function listenRouteChanges() {
    var _push = history.pushState;
    var _replace = history.replaceState;
    history.pushState = function(state, title, url) {
      _push.apply(this, arguments);
      onRouteChange();
    };
    history.replaceState = function(state, title, url) {
      _replace.apply(this, arguments);
      onRouteChange();
    };
    window.addEventListener('popstate', onRouteChange);
    setInterval(function() {
      if (location.href !== lastUrl) onRouteChange();
    }, 300);
  }

  function init() {
    startObserver();
    listenRouteChanges();
    maybeScheduleCheck();
    try {
      if (chrome && chrome.storage && chrome.storage.onChanged){
        chrome.storage.onChanged.addListener(function(changes, area){
          if (area !== 'local') return;
          if (changes && changes[TRIGGER_KEY] && changes[TRIGGER_KEY].newValue){
            runInteractiveScan();
          }
        });
      }
    } catch(e){}
    try {
      window.GmailCopilot = window.GmailCopilot || {};
      window.GmailCopilot.scanLabels = function(){
        var out = getLabelsFromLabelSection();
        log('Manual scan Labels(section)', out);
        return out;
      };
    } catch(e){}
  }

  async function runInteractiveScan(){
    var nav = getNavRoot();
    log('Interactive Scan: start', { navRoot: !!nav, url: location.href });
    if (nav){
      await expandHiddenLabels(nav);
      scrollNavLightly(nav);
      await waitForNavReady(nav);
    }
    var labels = getLabelsFromLabelSection();
    log('Interactive Scan: labels', { count: labels.length, items: labels });
    try { if (chrome && chrome.storage && chrome.storage.local){ var obj={}; obj[LATEST_KEY] = { labels: labels, url: location.href, ts: Date.now() }; chrome.storage.local.set(obj); } } catch(e){}
  }

  init();
})();
