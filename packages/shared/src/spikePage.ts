/**
 * Spike HTML page for Safari / iPhone web testing.
 * Embedded single HTML string - zero build step, zero external runtime dependencies.
 */
export function getSpikePageHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
  <title>Imposter LAN Web Spike</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: rgba(22, 30, 49, 0.85);
      --card-border: rgba(255, 255, 255, 0.08);
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: var(--font);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 12px;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      width: 100%;
      max-width: 480px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 4px;
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .title {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .spike-badge {
      font-size: 0.65rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: rgba(99, 102, 241, 0.2);
      color: #818cf8;
      padding: 3px 7px;
      border-radius: 9999px;
      border: 1px solid rgba(99, 102, 241, 0.4);
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 16px;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    }
    .status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 9999px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .status-connecting {
      background: rgba(245, 158, 11, 0.15);
      color: var(--warning);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .status-connecting .status-dot {
      background: var(--warning);
      box-shadow: 0 0 8px var(--warning);
    }
    .status-connected {
      background: rgba(16, 185, 129, 0.15);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .status-connected .status-dot {
      background: var(--success);
      box-shadow: 0 0 8px var(--success);
    }
    .status-disconnected {
      background: rgba(239, 68, 68, 0.15);
      color: var(--danger);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .status-disconnected .status-dot {
      background: var(--danger);
      box-shadow: 0 0 8px var(--danger);
    }
    .rtt-box {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.9rem;
      font-weight: 700;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid rgba(56, 189, 248, 0.2);
    }
    .room-info-row {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .room-code-tag {
      font-family: monospace;
      font-weight: 700;
      color: var(--text);
      letter-spacing: 0.1em;
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .section-title {
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
    }
    .players-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .player-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.04);
    }
    .player-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .player-avatar {
      font-size: 1.3rem;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 50%;
    }
    .player-name {
      font-size: 0.95rem;
      font-weight: 600;
    }
    .badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 9999px;
    }
    .badge-present {
      background: rgba(16, 185, 129, 0.15);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge-away {
      background: rgba(245, 158, 11, 0.15);
      color: var(--warning);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .btn-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
    }
    button {
      font-family: inherit;
      font-size: 0.85rem;
      font-weight: 600;
      padding: 10px 8px;
      border-radius: 8px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease;
      touch-action: manipulation;
    }
    .btn-primary {
      background: var(--primary);
      color: white;
    }
    .btn-primary:active {
      background: var(--primary-hover);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text);
      border-color: rgba(255, 255, 255, 0.12);
    }
    .btn-secondary:active {
      background: rgba(255, 255, 255, 0.15);
    }
    .btn-danger {
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
      border-color: rgba(239, 68, 68, 0.3);
    }
    .btn-danger:active {
      background: rgba(239, 68, 68, 0.25);
    }
    .logs-container {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.72rem;
      background: #040711;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px;
      padding: 10px;
      height: 190px;
      overflow-y: auto;
      display: flex;
      flex-direction: column-reverse;
      gap: 4px;
    }
    .log-entry {
      line-height: 1.4;
      word-break: break-all;
    }
    .log-ts {
      color: #64748b;
      margin-right: 6px;
    }
    .log-msg-in { color: #a5b4fc; }
    .log-msg-out { color: #86efac; }
    .log-err { color: #f87171; }
    .log-sys { color: #cbd5e1; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title-row">
        <span class="title">Imposter</span>
        <span class="spike-badge">Safari Spike</span>
      </div>
      <div id="statusPill" class="status-pill status-connecting">
        <span class="status-dot"></span>
        <span id="statusText">Connecting</span>
      </div>
    </div>

    <!-- Status & Live RTT Card -->
    <div class="card">
      <div class="status-row">
        <div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">LATENCY (RTT)</div>
          <div id="rttText" class="rtt-box" style="margin-top: 4px;">-- ms</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.8rem; color: var(--text-muted);">HOST SOCKET</div>
          <div id="hostText" style="font-size: 0.85rem; font-weight: 600; margin-top: 4px; color: var(--text);">ws://${'${window.location.host}'}</div>
        </div>
      </div>
      <div class="room-info-row">
        <span>Room: <span id="roomCodeDisplay" class="room-code-tag">----</span></span>
        <span>My ID: <span id="playerIdDisplay" style="font-family: monospace;">--</span></span>
      </div>
    </div>

    <!-- Controls -->
    <div class="btn-row">
      <button id="btnPing" class="btn-primary">⚡ Send Ping</button>
      <button id="btnDisconnect" class="btn-danger">Disconnect</button>
      <button id="btnReconnect" class="btn-secondary">Reconnect</button>
    </div>

    <!-- Players Roster -->
    <div class="card">
      <div class="section-title">
        <span>Players in Lobby</span>
        <span id="playerCount">0</span>
      </div>
      <div id="playersList" class="players-list">
        <div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 12px 0;">
          Waiting for players list...
        </div>
      </div>
    </div>

    <!-- Event Logs -->
    <div class="card">
      <div class="section-title">
        <span>Event Logs</span>
        <button id="btnClearLogs" style="background: none; border: none; color: var(--text-muted); font-size: 0.75rem; padding: 0;">Clear</button>
      </div>
      <div id="logs" class="logs-container"></div>
    </div>
  </div>

  <script>
    (function() {
      // 1. Read ?room=CODE from URL
      var params = new URLSearchParams(window.location.search);
      var roomParam = (params.get('room') || params.get('c') || '').trim().toUpperCase();
      var roomCode = roomParam || localStorage.getItem('imposter_spike_room') || 'ABCD';
      document.getElementById('roomCodeDisplay').textContent = roomCode;

      var ws = null;
      var pingInterval = null;
      var pingSeq = 1;
      var pendingPings = new Map();

      // UI Elements
      var statusPill = document.getElementById('statusPill');
      var statusText = document.getElementById('statusText');
      var rttText = document.getElementById('rttText');
      var playerIdDisplay = document.getElementById('playerIdDisplay');
      var playersList = document.getElementById('playersList');
      var playerCount = document.getElementById('playerCount');
      var logsEl = document.getElementById('logs');

      function log(msg, type) {
        var now = new Date();
        var ts = now.toTimeString().split(' ')[0] + '.' + ('00' + now.getMilliseconds()).slice(-3);
        var div = document.createElement('div');
        div.className = 'log-entry';

        var typeClass = 'log-sys';
        if (type === 'in') typeClass = 'log-msg-in';
        else if (type === 'out') typeClass = 'log-msg-out';
        else if (type === 'err') typeClass = 'log-err';

        div.innerHTML = '<span class="log-ts">' + ts + '</span><span class="' + typeClass + '">' + escapeHtml(msg) + '</span>';
        logsEl.insertBefore(div, logsEl.firstChild);
      }

      function escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      }

      function setStatus(state, label) {
        statusPill.className = 'status-pill status-' + state;
        statusText.textContent = label;
      }

      function renderPlayers(players) {
        if (!players || players.length === 0) {
          playersList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 12px 0;">No players joined</div>';
          playerCount.textContent = '0';
          return;
        }
        playerCount.textContent = String(players.length);
        var html = '';
        players.forEach(function(p) {
          var isPresent = p.present !== false;
          var badgeClass = isPresent ? 'badge-present' : 'badge-away';
          var badgeText = isPresent ? 'Present' : 'Away';
          html += '<div class="player-item">' +
            '<div class="player-left">' +
              '<div class="player-avatar">' + (p.avatar || '👤') + '</div>' +
              '<div>' +
                '<div class="player-name">' + escapeHtml(p.name) + (p.ghost ? ' 👻' : '') + '</div>' +
                '<div style="font-size: 0.72rem; color: var(--text-muted); font-family: monospace;">' + escapeHtml(p.id) + '</div>' +
              '</div>' +
            '</div>' +
            '<span class="badge ' + badgeClass + '">' + badgeText + '</span>' +
          '</div>';
        });
        playersList.innerHTML = html;
      }

      function connect() {
        if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
          return;
        }

        // Open ws://<location.host>/ (never a hardcoded IP)
        var wsUrl = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/';
        log('Connecting to ' + wsUrl, 'sys');
        setStatus('connecting', 'Connecting...');

        try {
          ws = new WebSocket(wsUrl);
        } catch (e) {
          log('WebSocket create error: ' + e.message, 'err');
          setStatus('disconnected', 'Failed');
          return;
        }

        ws.onopen = function() {
          log('WebSocket connection opened!', 'sys');
          setStatus('connected', 'Connected');

          // Send real hello message
          var savedPlayerId = localStorage.getItem('imposter_spike_playerId');
          var savedResume = localStorage.getItem('imposter_spike_resume');

          var hello = {
            v: 1,
            t: 'hello',
            room: roomCode,
            name: 'iPhone',
            avatar: '📱'
          };

          if (savedPlayerId && savedResume) {
            hello.playerId = savedPlayerId;
            hello.resume = savedResume;
            log('Sending hello with resume token: ' + savedPlayerId, 'out');
          } else {
            log('Sending initial hello: room=' + roomCode, 'out');
          }

          sendMsg(hello);

          // Start 5 s heartbeat ping
          if (pingInterval) clearInterval(pingInterval);
          pingInterval = setInterval(sendPing, 5000);
          sendPing();
        };

        ws.onmessage = function(event) {
          try {
            var msg = JSON.parse(event.data);
            handleServerMessage(msg);
          } catch (err) {
            log('Non-JSON message received: ' + event.data, 'err');
          }
        };

        ws.onclose = function(event) {
          log('Socket closed (code ' + event.code + ', clean: ' + event.wasClean + ')', 'err');
          setStatus('disconnected', 'Disconnected');
          if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = null;
          }
        };

        ws.onerror = function(err) {
          log('Socket error encountered', 'err');
        };
      }

      function sendMsg(obj) {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          log('Cannot send: socket not open', 'err');
          return;
        }
        var raw = JSON.stringify(obj);
        ws.send(raw);
        log('SENT ' + obj.t + (obj.id ? ' (id=' + obj.id + ')' : ''), 'out');
      }

      function sendPing() {
        var id = 'p-' + (pingSeq++);
        var now = Date.now();
        pendingPings.set(id, now);
        sendMsg({
          v: 1,
          t: 'ping',
          id: id,
          ts: now
        });
      }

      function handleServerMessage(msg) {
        log('RECV ' + msg.t + (msg.code ? ' [' + msg.code + ']' : ''), 'in');

        switch (msg.t) {
          case 'welcome':
            log('Welcome received: playerId=' + msg.playerId + ', hostId=' + msg.hostId, 'sys');
            localStorage.setItem('imposter_spike_playerId', msg.playerId);
            localStorage.setItem('imposter_spike_resume', msg.resume);
            localStorage.setItem('imposter_spike_room', msg.room);
            playerIdDisplay.textContent = msg.playerId;
            document.getElementById('roomCodeDisplay').textContent = msg.room;
            break;

          case 'pong':
            var startTs = pendingPings.get(msg.id) || msg.ts;
            pendingPings.delete(msg.id);
            var rtt = Date.now() - startTs;
            rttText.textContent = rtt + ' ms';
            log('PONG received! Live RTT = ' + rtt + ' ms', 'sys');
            break;

          case 'lobby':
          case 'state_sync':
            if (msg.players) {
              renderPlayers(msg.players);
            }
            if (msg.room) {
              document.getElementById('roomCodeDisplay').textContent = msg.room;
            }
            break;

          case 'error':
            log('Server error [' + msg.code + ']: ' + msg.message, 'err');
            break;
        }
      }

      // Buttons
      document.getElementById('btnPing').addEventListener('click', function() {
        sendPing();
      });

      document.getElementById('btnDisconnect').addEventListener('click', function() {
        if (ws) {
          log('User clicked Disconnect', 'sys');
          ws.close(1000, 'User disconnect');
        }
      });

      document.getElementById('btnReconnect').addEventListener('click', function() {
        if (ws) {
          try { ws.close(); } catch(e) {}
        }
        connect();
      });

      document.getElementById('btnClearLogs').addEventListener('click', function() {
        logsEl.innerHTML = '';
      });

      // On visibilitychange to visible, reconnect immediately if the socket is closed
      document.addEventListener('visibilitychange', function() {
        log('Visibility changed to: ' + document.visibilityState, 'sys');
        if (document.visibilityState === 'visible') {
          if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
            log('App became visible & socket closed -> Reconnecting immediately...', 'sys');
            connect();
          }
        }
      });

      // Start initial connection
      connect();
    })();
  </script>
</body>
</html>`;
}
