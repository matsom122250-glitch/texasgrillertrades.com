(function () {
  var CHAT_URL = 'https://texasgriller.app.n8n.cloud/webhook/ff7c76c4-cd58-4172-9d6a-cd60575c88dc/chat';
  var LIMIT = 5;
  var store = { get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
                set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} } };
  var mem = {};
  function getN() { var v = store.get('tgt_q'); if (v == null) v = mem.q; return parseInt(v || '0', 10) || 0; }
  function setN(n) { mem.q = String(n); store.set('tgt_q', String(n)); }
  var sid = store.get('tgt_sid') || mem.sid;
  if (!sid) { sid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random(); mem.sid = sid; store.set('tgt_sid', sid); }

  var css = '.tgt-btn{position:fixed;right:18px;bottom:18px;z-index:50;background:var(--acc,#9a3412);color:#fff;border:0;border-radius:999px;padding:12px 18px;font:600 15px system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.2);cursor:pointer}'
    + '.tgt-panel{position:fixed;right:18px;bottom:76px;z-index:50;width:min(380px,calc(100vw - 32px));height:min(540px,calc(100vh - 110px));background:var(--card,#fff);color:var(--fg,#1c1917);border:1px solid var(--line,#e7e5e4);border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.22);display:none;flex-direction:column;overflow:hidden;font:15px/1.45 system-ui,sans-serif}'
    + '.tgt-panel.open{display:flex}.tgt-head{padding:12px 14px;border-bottom:1px solid var(--line,#e7e5e4);display:flex;justify-content:space-between;align-items:center;font-weight:700}'
    + '.tgt-head button{background:none;border:0;font-size:20px;cursor:pointer;color:inherit}.tgt-log{flex:1;overflow-y:auto;padding:12px}'
    + '.tgt-m{margin:6px 0;padding:8px 11px;border-radius:10px;max-width:88%;white-space:pre-wrap;word-wrap:break-word}.tgt-u{background:var(--acc2,#fff7ed);margin-left:auto}.tgt-b{background:var(--bg,#fafaf9);border:1px solid var(--line,#e7e5e4)}'
    + '.tgt-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 8px}.tgt-chip{border:1px solid var(--line,#e7e5e4);background:var(--bg,#fafaf9);color:inherit;border-radius:999px;padding:4px 10px;font-size:13px;cursor:pointer}'
    + '.tgt-row{display:flex;gap:6px;padding:10px;border-top:1px solid var(--line,#e7e5e4)}.tgt-row input{flex:1;min-width:0;padding:9px 10px;border:1px solid var(--line,#ccc);border-radius:8px;font:inherit;background:var(--bg,#fff);color:inherit}'
    + '.tgt-row button{background:var(--acc,#9a3412);color:#fff;border:0;border-radius:8px;padding:0 14px;font:600 14px system-ui,sans-serif;cursor:pointer}.tgt-row button:disabled{opacity:.5;cursor:default}'
    + '.tgt-note{font-size:12px;color:var(--mut,#78716c);padding:0 12px 8px}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var btn = document.createElement('button'); btn.className = 'tgt-btn'; btn.type = 'button'; btn.textContent = 'Ask the Agent';
  var panel = document.createElement('div'); panel.className = 'tgt-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Ask the research agent');
  panel.innerHTML = '<div class="tgt-head"><span>Ask the Agent</span><button type="button" aria-label="Close">×</button></div>'
    + '<div class="tgt-log"></div><div class="tgt-chips"></div><div class="tgt-note"></div>'
    + '<div class="tgt-row"><input type="text" maxlength="400" placeholder="Ask about a ticker, member, or trade..."><button type="button">Ask</button></div>';
  document.body.appendChild(panel); document.body.appendChild(btn);
  var log = panel.querySelector('.tgt-log'), input = panel.querySelector('input'), send = panel.querySelector('.tgt-row button'),
      note = panel.querySelector('.tgt-note'), chips = panel.querySelector('.tgt-chips');

  function add(text, cls) { var d = document.createElement('div'); d.className = 'tgt-m ' + cls; d.textContent = text; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
  function refresh() {
    var left = LIMIT - getN();
    note.textContent = left > 0 ? left + ' of ' + LIMIT + ' questions left this visit. Not investment advice.' : 'You have reached the ' + LIMIT + '-question limit for this visit. Please come back later.';
    input.disabled = send.disabled = left <= 0;
  }
  ['Which members of Congress bought stock this week?', 'What are Congress’s most traded tickers lately?', 'Any recent corporate insider buying?'].forEach(function (q) {
    var c = document.createElement('button'); c.type = 'button'; c.className = 'tgt-chip'; c.textContent = q;
    c.addEventListener('click', function () { input.value = q; input.focus(); }); chips.appendChild(c);
  });
  add('Hi! Ask me about a stock Congress is trading, a member of Congress, or a corporate insider.', 'tgt-b');
  refresh();

  function parseChunks(text, onPiece) {
    var out = '', any = false, lines = text.replace(/}\s*{"type"/g, '}\n{"type"').split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].trim(); if (!l) continue;
      try { var o = JSON.parse(l); if (o.type === 'item' && typeof o.content === 'string') { out += o.content; any = true; } else if (o.type === 'error') { out = out || (o.content || 'The agent hit an error.'); any = true; } } catch (e) {}
    }
    if (any) return out;
    try { var j = JSON.parse(text); return j.output || j.text || text; } catch (e) { return text; }
  }

  function ask() {
    var q = input.value.trim(); if (!q || getN() >= LIMIT) return;
    setN(getN() + 1); refresh(); input.value = ''; add(q, 'tgt-u');
    var bot = add('…', 'tgt-b'); send.disabled = true;
    fetch(CHAT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'sendMessage', sessionId: sid, chatInput: q }) })
      .then(function (r) {
        if (!r.ok) throw new Error('status ' + r.status);
        if (r.body && r.body.getReader) {
          var reader = r.body.getReader(), dec = new TextDecoder(), buf = '';
          return (function pump() { return reader.read().then(function (res) {
            if (res.done) { bot.textContent = parseChunks(buf) || '(no response)'; return; }
            buf += dec.decode(res.value, { stream: true }); var t = parseChunks(buf); if (t) bot.textContent = t; log.scrollTop = log.scrollHeight; return pump();
          }); })();
        }
        return r.text().then(function (t) { bot.textContent = parseChunks(t) || '(no response)'; });
      })
      .catch(function () { bot.textContent = 'Sorry, the agent could not be reached. Please try again later.'; })
      .then(function () { refresh(); log.scrollTop = log.scrollHeight; });
  }
  send.addEventListener('click', ask);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') ask(); });
  btn.addEventListener('click', function () { panel.classList.toggle('open'); if (panel.classList.contains('open')) input.focus(); });
  panel.querySelector('.tgt-head button').addEventListener('click', function () { panel.classList.remove('open'); });
})();
