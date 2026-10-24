import { AVATAR_OPTIONS } from './avatars';

/**
 * Returns a self-contained, offline-first mobile web client HTML bundle
 * tailored specifically for iOS Safari (and mobile Chrome).
 *
 * Features:
 * - 100% self-contained: zero external network requests or CDNs needed.
 * - Adheres strictly to SPEC.md protocol v1 over WebSockets.
 * - Touch-optimized with 56px minimum tap targets and iOS safe area padding.
 * - Native Tap-to-Peek card mechanics with auto-hide timer.
 * - Interactive voting, reveal, scores, and auto-reconnection.
 */
export function getWebClientHtml(): string {
  const avatarsJson = JSON.stringify(AVATAR_OPTIONS);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>Imposter Game</title>
  <style>
    :root {
      --bg: #0b0f19;
      --surface: #151d2f;
      --surface-subtle: #1e293b;
      --card-bg: #182238;
      --text: #f8fafc;
      --text-sec: #94a3b8;
      --primary: #38bdf8;
      --primary-glow: rgba(56, 189, 248, 0.25);
      --accent: #fb923c;
      --danger: #f87171;
      --success: #34d399;
      --border: #334155;
      --radius-md: 14px;
      --radius-lg: 20px;
      --radius-card: 24px;
      --safe-top: env(safe-area-inset-top, 16px);
      --safe-bottom: env(safe-area-inset-bottom, 24px);
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      min-height: -webkit-fill-available;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--safe-top) 16px var(--safe-bottom) 16px;
      user-select: none;
      -webkit-user-select: none;
      overflow-x: hidden;
    }
    .header {
      width: 100%;
      max-width: 440px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding: 4px 8px;
    }
    .app-title {
      font-size: 1.3rem;
      font-weight: 800;
      letter-spacing: 2px;
      color: var(--primary);
    }
    .room-badge {
      background: var(--surface-subtle);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: var(--accent);
    }
    .screen-container {
      width: 100%;
      max-width: 440px;
      display: flex;
      flex-direction: column;
      flex: 1;
      justify-content: center;
    }
    .card-box {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 24px 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      gap: 16px;
      animation: fadeIn 0.25s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    h2 {
      font-size: 1.5rem;
      font-weight: 700;
      text-align: center;
    }
    p.subtitle {
      color: var(--text-sec);
      font-size: 0.95rem;
      text-align: center;
      line-height: 1.4;
    }
    input[type="text"] {
      width: 100%;
      height: 54px;
      background: var(--surface-subtle);
      border: 1.5px solid var(--border);
      border-radius: var(--radius-md);
      color: var(--text);
      font-size: 17px;
      font-weight: 600;
      padding: 0 16px;
      outline: none;
      transition: border-color 0.2s;
    }
    input[type="text"]:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-glow);
    }
    .avatar-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      max-height: 220px;
      overflow-y: auto;
      padding: 4px;
    }
    .avatar-btn {
      aspect-ratio: 1;
      font-size: 2rem;
      background: var(--surface-subtle);
      border: 2px solid transparent;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.15s, border-color 0.15s;
    }
    .avatar-btn:active {
      transform: scale(0.92);
    }
    .avatar-btn.selected {
      border-color: var(--primary);
      background: rgba(56, 189, 248, 0.15);
      box-shadow: 0 0 12px var(--primary-glow);
    }
    .btn {
      min-height: 56px;
      background: var(--primary);
      color: #0b0f19;
      font-size: 1.1rem;
      font-weight: 700;
      border: none;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.1s, opacity 0.2s;
    }
    .btn:active {
      transform: scale(0.97);
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-secondary {
      background: var(--surface-subtle);
      color: var(--text);
      border: 1px solid var(--border);
    }
    .player-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 300px;
      overflow-y: auto;
    }
    .player-row {
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--surface-subtle);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 10px 14px;
    }
    .player-row .p-avatar { font-size: 1.8rem; }
    .player-row .p-name { font-size: 1.05rem; font-weight: 600; flex: 1; }
    .player-row .p-host { font-size: 0.8rem; font-weight: 700; color: var(--accent); }

    /* SECRET CARD STYLING */
    .peek-card-wrapper {
      position: relative;
      width: 100%;
      min-height: 380px;
      perspective: 1000px;
      cursor: pointer;
    }
    .secret-card {
      width: 100%;
      min-height: 380px;
      border-radius: var(--radius-card);
      padding: 24px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      box-shadow: 0 12px 40px rgba(0,0,0,0.6);
      transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .secret-card.hidden {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      border: 3px dashed var(--primary);
      box-shadow: 0 0 24px var(--primary-glow);
    }
    .secret-card.revealed-civilian {
      background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
      border: 3px solid var(--success);
      box-shadow: 0 0 30px rgba(52, 211, 153, 0.3);
    }
    .secret-card.revealed-imposter {
      background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%);
      border: 3px solid var(--danger);
      box-shadow: 0 0 30px rgba(248, 113, 113, 0.4);
    }
    .card-word {
      font-size: 2.8rem;
      font-weight: 900;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin: 16px 0;
      color: #fff;
      word-break: break-word;
    }
    .card-category {
      font-size: 1.1rem;
      font-weight: 700;
      color: #cbd5e1;
      text-transform: uppercase;
      letter-spacing: 2px;
      background: rgba(0,0,0,0.3);
      padding: 6px 16px;
      border-radius: 999px;
    }
    .timer-bar-wrap {
      width: 100%;
      height: 6px;
      background: rgba(255,255,255,0.2);
      border-radius: 999px;
      margin-top: 20px;
      overflow: hidden;
    }
    .timer-bar {
      height: 100%;
      width: 100%;
      background: #fff;
      transform-origin: left;
      transition: width 0.05s linear;
    }

    /* VOTING STYLING */
    .vote-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 360px;
      overflow-y: auto;
    }
    .vote-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 16px;
      background: var(--surface-subtle);
      border: 2px solid var(--border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.15s;
    }
    .vote-item:active { transform: scale(0.98); }
    .vote-item.selected {
      border-color: var(--danger);
      background: rgba(248, 113, 113, 0.15);
      box-shadow: 0 0 16px rgba(248, 113, 113, 0.3);
    }

    /* REVEAL & SCORES STYLING */
    .reveal-box {
      text-align: center;
      padding: 20px;
      border-radius: var(--radius-card);
      background: var(--surface);
      border: 2px solid var(--border);
      margin-bottom: 16px;
    }
    .reveal-imposter-tag {
      display: inline-block;
      font-size: 1.3rem;
      font-weight: 800;
      color: var(--danger);
      padding: 6px 18px;
      background: rgba(248, 113, 113, 0.15);
      border-radius: 999px;
      margin: 12px 0;
    }
    .score-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      background: var(--surface-subtle);
      border-radius: var(--radius-md);
      font-size: 1.1rem;
      font-weight: 600;
    }

    /* DISCONNECTED BANNER */
    .status-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: var(--danger);
      color: #0b0f19;
      text-align: center;
      padding: 8px;
      font-size: 0.9rem;
      font-weight: 700;
      z-index: 9999;
      display: none;
    }
    .pulsate {
      animation: pulsate 1.8s infinite ease-in-out;
    }
    @keyframes pulsate {
      0% { opacity: 0.6; }
      50% { opacity: 1; }
      100% { opacity: 0.6; }
    }
  </style>
</head>
<body>
  <div id="statusBanner" class="status-banner">Connecting...</div>

  <div class="header">
    <div class="app-title">IMPOSTER</div>
    <div id="roomBadge" class="room-badge" style="display:none">ROOM ----</div>
  </div>

  <div id="appRoot" class="screen-container">
    <!-- Populated dynamically via JS -->
  </div>

  <script>
    (function() {
      const AVATARS = ${avatarsJson};
      let ws = null;
      let currentState = null;
      let myPlayerId = sessionStorage.getItem('imposter_pid') || null;
      let resumeToken = sessionStorage.getItem('imposter_resume') || null;
      let selectedAvatar = localStorage.getItem('imposter_avatar') || '🦊';
      let selectedName = localStorage.getItem('imposter_name') || 'Player';
      let selectedVoteId = null;
      let peekTimer = null;
      let isCardRevealed = false;
      let roomCode = new URLSearchParams(window.location.search).get('c') || '';

      const statusBanner = document.getElementById('statusBanner');
      const roomBadge = document.getElementById('roomBadge');
      const appRoot = document.getElementById('appRoot');

      function updateRoomBadge(code) {
        if (code) {
          roomBadge.style.display = 'block';
          roomBadge.innerText = 'ROOM ' + code.toUpperCase();
        } else {
          roomBadge.style.display = 'none';
        }
      }

      function connectWs() {
        statusBanner.style.display = 'block';
        statusBanner.innerText = 'Connecting to host...';

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = protocol + '//' + window.location.host + '/ws';
        ws = new WebSocket(wsUrl);

        ws.onopen = function() {
          statusBanner.style.display = 'none';
          if (roomCode && myPlayerId && resumeToken) {
            sendMsg({
              v: 1,
              t: 'hello',
              room: roomCode.toUpperCase(),
              playerId: myPlayerId,
              resume: resumeToken,
              name: selectedName,
              avatar: selectedAvatar,
            });
          } else if (roomCode) {
            renderJoinScreen();
          } else {
            renderJoinScreen();
          }
        };

        ws.onmessage = function(evt) {
          try {
            const msg = JSON.parse(evt.data);
            handleServerMsg(msg);
          } catch(err) {
            console.error('Failed to parse msg', err);
          }
        };

        ws.onclose = function() {
          statusBanner.style.display = 'block';
          statusBanner.innerText = 'Disconnected from host. Reconnecting...';
          setTimeout(connectWs, 2000);
        };

        ws.onerror = function() {
          statusBanner.style.display = 'block';
          statusBanner.innerText = 'Connection error. Retrying...';
        };
      }

      function sendMsg(msg) {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(msg));
        }
      }

      function handleServerMsg(msg) {
        if (msg.t === 'welcome') {
          myPlayerId = msg.playerId;
          resumeToken = msg.resume;
          sessionStorage.setItem('imposter_pid', myPlayerId);
          sessionStorage.setItem('imposter_resume', resumeToken);
        } else if (msg.t === 'state_sync') {
          currentState = msg;
          updateRoomBadge(msg.room || roomCode);
          renderCurrentPhase();
        } else if (msg.t === 'error') {
          alert('Notice: ' + msg.message);
        }
      }

      // SCREEN 1: Join / Profile Setup
      function renderJoinScreen() {
        appRoot.innerHTML = \`
          <div class="card-box">
            <h2>Join Room</h2>
            <p class="subtitle">Enter the 4-letter room code and choose your secret agent avatar</p>
            <input type="text" id="inputRoom" maxlength="4" placeholder="ROOM CODE (e.g. ABCD)" value="\${roomCode}" style="text-transform:uppercase; text-align:center; font-size:1.4rem; letter-spacing:4px;" />
            <input type="text" id="inputName" maxlength="15" placeholder="YOUR NAME" value="\${selectedName}" />
            <div>
              <p class="subtitle" style="text-align:left; margin-bottom:8px; font-weight:600;">PICK AVATAR</p>
              <div class="avatar-grid" id="avatarGrid"></div>
            </div>
            <button class="btn" id="btnJoin">JOIN GAME</button>
          </div>
        \`;

        const grid = document.getElementById('avatarGrid');
        AVATARS.forEach(function(av) {
          const btn = document.createElement('div');
          btn.className = 'avatar-btn' + (av === selectedAvatar ? ' selected' : '');
          btn.innerText = av;
          btn.onclick = function() {
            selectedAvatar = av;
            localStorage.setItem('imposter_avatar', av);
            document.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
          };
          grid.appendChild(btn);
        });

        document.getElementById('btnJoin').onclick = function() {
          const code = document.getElementById('inputRoom').value.trim().toUpperCase();
          const name = document.getElementById('inputName').value.trim() || 'Player';
          if (code.length !== 4) {
            alert('Please enter a valid 4-letter room code.');
            return;
          }
          roomCode = code;
          selectedName = name;
          localStorage.setItem('imposter_name', name);
          localStorage.setItem('imposter_avatar', selectedAvatar);

          sendMsg({
            v: 1,
            t: 'hello',
            room: roomCode,
            playerId: myPlayerId || undefined,
            resume: resumeToken || undefined,
            name: selectedName,
            avatar: selectedAvatar,
          });
        };
      }

      // RENDER CURRENT GAME PHASE
      function renderCurrentPhase() {
        if (!currentState) return;
        const phase = currentState.phase;

        if (phase === 'LOBBY') {
          renderLobby();
        } else if (phase === 'CARD_PEEK') {
          renderCardPeek();
        } else if (phase === 'DISCUSSION') {
          renderDiscussion();
        } else if (phase === 'VOTE') {
          renderVote();
        } else if (phase === 'REVEAL') {
          renderReveal();
        } else if (phase === 'SCORES') {
          renderScores();
        }
      }

      // SCREEN: LOBBY
      function renderLobby() {
        const players = currentState.players || [];
        const isHost = currentState.hostId === myPlayerId;

        let playerRows = players.map(p => \`
          <div class="player-row">
            <span class="p-avatar">\${p.avatar}</span>
            <span class="p-name">\${p.name}</span>
            \${p.id === currentState.hostId ? '<span class="p-host">👑 HOST</span>' : ''}
          </div>
        \`).join('');

        appRoot.innerHTML = \`
          <div class="card-box">
            <h2>Game Lobby</h2>
            <p class="subtitle">\${players.length} player\${players.length === 1 ? '' : 's'} joined</p>
            <div class="player-list">\${playerRows}</div>
            <div class="pulsate" style="text-align:center; color:var(--text-sec); font-size:1rem; margin-top:8px;">
              Waiting for host to start game...
            </div>
          </div>
        \`;
      }

      // SCREEN: TAP TO PEEK SECRET CARD
      function renderCardPeek() {
        const myCard = currentState.myCard;
        const isImposter = myCard && myCard.role === 'IMPOSTER';
        const word = myCard ? (myCard.word || 'IMPOSTER') : '...';
        const category = (myCard && myCard.category) || 'GENERAL';

        appRoot.innerHTML = \`
          <div class="peek-card-wrapper" id="cardWrapper">
            <div id="cardInner" class="secret-card hidden">
              <div id="cardHiddenContent">
                <div style="font-size:3.5rem; margin-bottom:12px;">🔒</div>
                <h2 style="color:var(--primary); font-size:1.6rem; letter-spacing:1px;">SECRET ROLE CARD</h2>
                <p class="subtitle" style="margin-top:8px; font-weight:600;">TAP ANYWHERE TO REVEAL</p>
                <p class="subtitle" style="font-size:0.85rem; margin-top:4px;">Auto-hides after 3 seconds</p>
              </div>
              <div id="cardRevealedContent" style="display:none; width:100%;">
                <div class="card-category">\${category}</div>
                <div class="card-word">\${isImposter ? '🚨 IMPOSTER' : word}</div>
                <p class="subtitle" style="color:#fff; font-weight:600;">
                  \${isImposter ? 'Blend in and guess the word!' : 'Remember your secret word!'}
                </p>
                <div class="timer-bar-wrap">
                  <div id="timerBar" class="timer-bar"></div>
                </div>
              </div>
            </div>
          </div>
        \`;

        const wrapper = document.getElementById('cardWrapper');
        wrapper.onclick = function() {
          toggleCardPeek(isImposter);
        };
      }

      function toggleCardPeek(isImposter) {
        const card = document.getElementById('cardInner');
        const hiddenContent = document.getElementById('cardHiddenContent');
        const revealedContent = document.getElementById('cardRevealedContent');
        const timerBar = document.getElementById('timerBar');

        if (!isCardRevealed) {
          isCardRevealed = true;
          hiddenContent.style.display = 'none';
          revealedContent.style.display = 'block';
          card.className = 'secret-card ' + (isImposter ? 'revealed-imposter' : 'revealed-civilian');

          let progress = 100;
          const interval = setInterval(() => {
            progress -= (100 / 60);
            if (timerBar) timerBar.style.width = Math.max(progress, 0) + '%';
          }, 50);

          peekTimer = setTimeout(() => {
            clearInterval(interval);
            closeCardPeek();
          }, 3000);
        } else {
          closeCardPeek();
        }
      }

      function closeCardPeek() {
        if (peekTimer) clearTimeout(peekTimer);
        isCardRevealed = false;
        const card = document.getElementById('cardInner');
        const hiddenContent = document.getElementById('cardHiddenContent');
        const revealedContent = document.getElementById('cardRevealedContent');
        if (card && hiddenContent && revealedContent) {
          card.className = 'secret-card hidden';
          hiddenContent.style.display = 'block';
          revealedContent.style.display = 'none';
        }
      }

      // SCREEN: DISCUSSION
      function renderDiscussion() {
        appRoot.innerHTML = \`
          <div class="card-box" style="text-align:center;">
            <div style="font-size:3.5rem;">🗣️</div>
            <h2>Discussion Phase</h2>
            <p class="subtitle" style="font-size:1.1rem; line-height:1.6; margin:12px 0;">
              Ask subtle questions around the circle to find who doesn't know the word!
            </p>
            <div class="pulsate" style="color:var(--accent); font-weight:700; margin-top:16px;">
              Prepare your suspicions for the vote...
            </div>
          </div>
        \`;
      }

      // SCREEN: VOTING
      function renderVote() {
        const players = (currentState.players || []).filter(p => p.id !== myPlayerId);
        const hasVoted = currentState.hasVoted || false;

        let items = players.map(p => \`
          <div class="vote-item \${selectedVoteId === p.id ? 'selected' : ''}" onclick="window.selectVote('\${p.id}')">
            <span style="font-size:1.8rem;">\${p.avatar}</span>
            <span style="font-size:1.1rem; font-weight:700; flex:1;">\${p.name}</span>
          </div>
        \`).join('');

        appRoot.innerHTML = \`
          <div class="card-box">
            <h2>Who is the Imposter?</h2>
            <p class="subtitle">\${hasVoted ? '✅ Your vote is locked in!' : 'Select the player you suspect and cast your vote'}</p>
            <div class="vote-grid">\${items}</div>
            <button class="btn" id="btnSubmitVote" \${hasVoted || !selectedVoteId ? 'disabled' : ''} style="background:var(--danger); color:#fff;">
              \${hasVoted ? 'VOTE RECORDED' : 'CAST VOTE'}
            </button>
          </div>
        \`;

        window.selectVote = function(id) {
          if (hasVoted) return;
          selectedVoteId = id;
          renderVote();
        };

        const btn = document.getElementById('btnSubmitVote');
        if (btn && !hasVoted) {
          btn.onclick = function() {
            if (!selectedVoteId) return;
            sendMsg({
              v: 1,
              t: 'submit_vote',
              cmdId: 'v_' + Date.now(),
              voteIndex: 0,
              targetId: selectedVoteId,
            });
            btn.disabled = true;
            btn.innerText = 'VOTE RECORDED';
          };
        }
      }

      // SCREEN: REVEAL
      function renderReveal() {
        const outcome = currentState.roundOutcome;
        const imposterNames = (currentState.imposters || []).map(i => i.name).join(', ') || 'Unknown';
        const isCivilianWin = outcome === 'CIVILIAN_WIN';

        appRoot.innerHTML = \`
          <div class="card-box" style="text-align:center;">
            <div style="font-size:3.5rem;">\${isCivilianWin ? '🎉' : '🕵️'}</div>
            <h2>\${isCivilianWin ? 'CIVILIANS WIN!' : 'IMPOSTERS WIN!'}</h2>
            <div class="reveal-box">
              <p class="subtitle">The Imposter was:</p>
              <div class="reveal-imposter-tag">\${imposterNames}</div>
              <p class="subtitle" style="margin-top:8px;">Secret word: <strong>\${currentState.secretWord || '???'}</strong></p>
            </div>
            <p class="pulsate" style="color:var(--text-sec); font-size:0.95rem;">Host will advance to scores shortly...</p>
          </div>
        \`;
      }

      // SCREEN: SCORES
      function renderScores() {
        const scores = currentState.scores || {};
        const players = [...(currentState.players || [])].sort((a,b) => (scores[b.id] || 0) - (scores[a.id] || 0));

        let rows = players.map((p, idx) => \`
          <div class="score-row">
            <span>\${idx + 1}. \${p.avatar} \${p.name}</span>
            <span style="color:var(--primary); font-weight:800;">\${scores[p.id] || 0} pts</span>
          </div>
        \`).join('');

        appRoot.innerHTML = \`
          <div class="card-box">
            <h2>Current Scores</h2>
            <div style="display:flex; flex-direction:column; gap:8px; margin:12px 0;">\${rows}</div>
            <p class="pulsate" style="text-align:center; color:var(--text-sec); margin-top:8px;">
              Waiting for host to begin next round...
            </p>
          </div>
        \`;
      }

      // Start connection
      connectWs();
    })();
  </script>
</body>
</html>`;
}
