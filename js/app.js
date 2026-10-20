/* ============================================================
   app.js — router, views, mission runtime, terminal UI.
   ============================================================ */
(function () {
  'use strict';

  const $ = sel => document.querySelector(sel);
  const app = document.getElementById('app');

  const App = {
    route: 'menu',
    run: null,      // active mission run
    term: null,     // { lines:[], history:[], hIdx }
    el: {}
  };
  window.__APP = App;

  /* ============================================================
     Utilities
     ============================================================ */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function toast(msg, kind) {
    const box = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 2600);
    setTimeout(() => el.remove(), 3000);
  }
  function modal(html, actions) {
    const root = document.getElementById('modal-root');
    root.innerHTML = '<div class="modal-back"><div class="modal" role="dialog" aria-modal="true">' +
      html + '<div class="modal-actions" id="m-actions"></div></div></div>';
    const bar = document.getElementById('m-actions');
    (actions || []).forEach(a => {
      const b = document.createElement('button');
      b.className = 'btn ' + (a.cls || '');
      b.textContent = a.label;
      b.onclick = () => { if (a.onClick) a.onClick(); if (a.close !== false) closeModal(); };
      bar.appendChild(b);
    });
    return root;
  }
  function closeModal() { document.getElementById('modal-root').innerHTML = ''; }

  /* ============================================================
     Router
     ============================================================ */
  function go(route, payload) {
    App.route = route;
    if (route === 'mission') return renderMission(payload);
    if (route === 'results') return renderResults(payload);
    if (route === 'menu') return renderMenu();
    if (route === 'create') return renderCreate();
    if (route === 'hub') return renderHub('dashboard');
    if (route === 'missions') return renderHub('missions');
    if (route === 'codex') return renderHub('codex');
    if (route === 'profile') return renderHub('profile');
    if (route === 'settings') return renderHub('settings');
    renderMenu();
  }
  window.__go = go;

  /* ============================================================
     MENU
     ============================================================ */
  function renderMenu() {
    const saved = Game.hasSave();
    const p = saved ? Game.load() : null;
    app.innerHTML = `
    <div class="menu-screen">
      <div class="menu-top">
        <div class="brandmark"><span class="branddot"></span> CYBEROPS SIMULATOR</div>
        <div class="muted" style="font-size:12px">v1.0 — educational simulation</div>
      </div>
      <div class="menu-hero">
        <div class="hero-box">
          <h1>Become the analyst<br><span>the network depends on.</span></h1>
          <p>A career simulation for networking and cybersecurity. Build a character, take assignments from a fictional technology company, and solve real configuration, troubleshooting and investigation problems in a simulated environment.</p>
          <div class="hero-actions">
            ${saved
              ? `<button class="btn btn-primary" id="btn-continue">Continue as ${esc(p.username)}</button>
                 <button class="btn" id="btn-new">New Game</button>`
              : `<button class="btn btn-primary" id="btn-new">Start Career</button>`}
          </div>
          <div class="hero-stats">
            <div class="hstat"><b>6</b><span>Playable missions</span></div>
            <div class="hstat"><b>2</b><span>Career paths</span></div>
            <div class="hstat"><b>14</b><span>Simulated commands</span></div>
            <div class="hstat"><b>100%</b><span>Local, no account</span></div>
          </div>
          <p class="save-note">Progress is stored in this browser only. Clearing browser storage will erase your save.</p>
        </div>
      </div>
    </div>`;

    const btnNew = document.getElementById('btn-new');
    if (btnNew) btnNew.onclick = () => {
      if (Game.hasSave()) {
        modal('<h3>Start a new career?</h3><p class="dim">This replaces your existing save in this browser. This cannot be undone.</p>',
          [{ label: 'Cancel', cls: 'btn-ghost' }, { label: 'Start New', cls: 'btn-danger', onClick: () => go('create') }]);
      } else go('create');
    };
    const btnCont = document.getElementById('btn-continue');
    if (btnCont) btnCont.onclick = () => go('hub');
  }

  /* ============================================================
     CHARACTER CREATION
     ============================================================ */
  const createState = { step: 1, username: '', avatarId: 'av-1', outfitId: 'of-1', careerPath: 'networking' };

  function renderCreate() {
    app.innerHTML = `
    <div class="creation">
      <div class="brandmark" style="margin-bottom:18px"><span class="branddot"></span> CHARACTER CREATION</div>
      <div class="steps">
        <div class="step ${createState.step === 1 ? 'active' : 'done'}">1 · Identity</div>
        <div class="step ${createState.step === 2 ? 'active' : (createState.step > 2 ? 'done' : '')}">2 · Career</div>
        <div class="step ${createState.step === 3 ? 'active' : ''}">3 · Confirm</div>
      </div>
      <div id="create-body"></div>
    </div>`;
    const body = document.getElementById('create-body');

    if (createState.step === 1) {
      body.innerHTML = `
        <div class="card card-pad" style="margin-bottom:16px">
          <div class="field">
            <label for="uname">Operator name</label>
            <input class="input" id="uname" maxlength="24" placeholder="e.g. R. Vance" value="${esc(createState.username)}" />
            <div class="hintline">2–24 characters. Displayed on your profile and mission reports.</div>
          </div>
          <div class="field">
            <label>Avatar</label>
            <div class="avatar-grid" id="avatars">
              ${AVATARS.map(a => `
                <button class="avatar-opt ${a.id === createState.avatarId ? 'sel' : ''}" data-av="${a.id}">
                  <div class="avatar-face">${a.face}</div><small>${esc(a.name)}</small>
                </button>`).join('')}
            </div>
          </div>
          <div class="field" style="margin-bottom:0">
            <label>Outfit colour</label>
            <div class="swatches" id="outfits">
              ${OUTFITS.map(o => `<button class="swatch ${o.id === createState.outfitId ? 'sel' : ''}" data-of="${o.id}" title="${esc(o.name)}" style="background:${o.color}"></button>`).join('')}
            </div>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between">
          <button class="btn btn-ghost" id="back-menu">Back</button>
          <button class="btn btn-primary" id="next1">Continue</button>
        </div>`;

      document.getElementById('uname').oninput = e => { createState.username = e.target.value.trim(); };
      document.getElementById('avatars').onclick = e => {
        const b = e.target.closest('[data-av]'); if (!b) return;
        createState.avatarId = b.dataset.av; renderCreate();
        document.getElementById('uname').value = createState.username;
      };
      document.getElementById('outfits').onclick = e => {
        const b = e.target.closest('[data-of]'); if (!b) return;
        createState.outfitId = b.dataset.of; renderCreate();
        document.getElementById('uname').value = createState.username;
      };
      document.getElementById('back-menu').onclick = () => go('menu');
      document.getElementById('next1').onclick = () => {
        const v = document.getElementById('uname').value.trim();
        if (v.length < 2) { toast('Enter a name of at least 2 characters.', 'err'); return; }
        createState.username = v.slice(0, 24);
        createState.step = 2; renderCreate();
      };
    }

    else if (createState.step === 2) {
      body.innerHTML = `
        <div class="career-grid" id="careers">
          <button class="career-card ${createState.careerPath === 'networking' ? 'sel' : ''}" data-path="networking">
            <span class="tag tag-net">Path A</span>
            <h3 style="margin-top:10px">Networking</h3>
            <p class="dim" style="font-size:13px;margin:6px 0">Build, configure and repair the company network.</p>
            <ul>
              <li>Network Engineer</li>
              <li>Network Troubleshooter</li>
              <li>NOC Engineer</li>
            </ul>
          </button>
          <button class="career-card ${createState.careerPath === 'cybersecurity' ? 'sel' : ''}" data-path="cybersecurity">
            <span class="tag tag-sec">Path B</span>
            <h3 style="margin-top:10px">Cybersecurity</h3>
            <p class="dim" style="font-size:13px;margin:6px 0">Defend, investigate and test the company's systems.</p>
            <ul>
              <li>Blue Team / SOC</li>
              <li>Red Team (authorised)</li>
              <li>Penetration Tester</li>
            </ul>
          </button>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:18px">
          <button class="btn btn-ghost" id="back1">Back</button>
          <button class="btn btn-primary" id="next2">Continue</button>
        </div>`;

      document.getElementById('careers').onclick = e => {
        const b = e.target.closest('[data-path]'); if (!b) return;
        createState.careerPath = b.dataset.path; renderCreate();
      };
      document.getElementById('back1').onclick = () => { createState.step = 1; renderCreate(); };
      document.getElementById('next2').onclick = () => { createState.step = 3; renderCreate(); };
    }

    else {
      const av = AVATARS.find(a => a.id === createState.avatarId);
      const of = OUTFITS.find(o => o.id === createState.outfitId);
      const pathName = createState.careerPath === 'networking' ? 'Networking' : 'Cybersecurity';
      body.innerHTML = `
        <div class="card card-pad" style="display:flex;gap:18px;align-items:center;margin-bottom:16px">
          <div class="pavatar" style="width:64px;height:64px;font-size:32px;background:${of.color}">${av.face}</div>
          <div>
            <h3 style="font-size:19px">${esc(createState.username)}</h3>
            <div class="dim" style="font-size:13px">Junior ${pathName} track · ${esc(of.name)} uniform</div>
            <div class="muted" style="font-size:12px;margin-top:4px">Starting rank: ${esc(Game.RANKS[0][createState.careerPath === 'networking' ? 'net' : 'sec'])}</div>
          </div>
        </div>
        <p class="dim" style="font-size:13px">You are joining Nyx Technologies as a junior technical employee. Assignments arrive from colleagues as you prove yourself. Nothing you do here touches a real network — every host, log and address is fictional.</p>
        <div style="display:flex;justify-content:space-between;margin-top:18px">
          <button class="btn btn-ghost" id="back2">Back</button>
          <button class="btn btn-green" id="begin">Begin Career</button>
        </div>`;

      document.getElementById('back2').onclick = () => { createState.step = 2; renderCreate(); };
      document.getElementById('begin').onclick = () => {
        Game.create(createState);
        toast('Welcome to Nyx Technologies, ' + createState.username + '.', 'ok');
        go('hub');
      };
    }
  }

  /* ============================================================
     HUB (dashboard / missions / codex / profile / settings)
     ============================================================ */
  function sidebar(active) {
    const p = Game.get();
    const av = AVATARS.find(a => a.id === p.avatarId) || AVATARS[0];
    const of = OUTFITS.find(o => o.id === p.outfitId) || OUTFITS[0];
    const rank = Game.rankFor(p.xp, p.careerPath);
    const items = [
      ['dashboard', '◧', 'Dashboard'],
      ['missions', '▣', 'Missions'],
      ['codex', '❖', 'Knowledge Base'],
      ['profile', '◉', 'Profile'],
      ['settings', '⚙', 'Settings']
    ];
    return `
      <aside class="sidebar">
        <div class="side-brand"><span class="branddot"></span> CYBEROPS</div>
        ${items.map(([r, i, l]) => `<button class="nav-item ${active === r ? 'active' : ''}" data-nav="${r}"><span class="nav-ico">${i}</span>${l}</button>`).join('')}
        <div class="side-foot">
          <div class="player-mini">
            <div class="pavatar" style="background:${of.color}">${av.face}</div>
            <div style="min-width:0">
              <div class="pname">${esc(p.username)}</div>
              <div class="prank">${esc(rank)}</div>
            </div>
          </div>
        </div>
      </aside>`;
  }

  function renderHub(section) {
    const p = Game.get();
    if (!p) return go('menu');
    const rank = Game.rankFor(p.xp, p.careerPath);
    const prog = Game.rankProgress(p.xp);

    let body = '';
    if (section === 'dashboard') {
      const doneCount = Object.keys(p.completed).length;
      const myMissions = MISSIONS.filter(m => m.path === p.careerPath);
      const nextMission = myMissions.find(m => !p.completed[m.id] && Game.isUnlocked(m.id));
      body = `
        <div class="page-head">
          <div>
            <h1>Welcome back, ${esc(p.username)}</h1>
            <p>${esc(rank)} · ${p.careerPath === 'networking' ? 'Networking track' : 'Cybersecurity track'}</p>
          </div>
          <div class="tag ${p.careerPath === 'networking' ? 'tag-net' : 'tag-sec'}">${p.careerPath === 'networking' ? 'PATH A · NETWORKING' : 'PATH B · CYBERSECURITY'}</div>
        </div>
        <div class="grid-3" style="margin-bottom:18px">
          <div class="stat"><div class="k">Experience</div><div class="v">${p.xp}</div>
            <div class="xpbar" style="margin-top:9px"><i style="width:${prog.pct}%"></i></div>
            <div class="s" style="margin-top:6px">${prog.next ? prog.need + ' XP to ' + esc(prog.next[p.careerPath === 'networking' ? 'net' : 'sec']) : 'Maximum rank reached'}</div>
          </div>
          <div class="stat"><div class="k">Missions complete</div><div class="v">${doneCount}<span class="muted" style="font-size:15px">/ ${MISSIONS.length}</span></div><div class="s">Across both career paths</div></div>
          <div class="stat"><div class="k">Achievements</div><div class="v">${p.achievements.length}<span class="muted" style="font-size:15px">/ ${Object.keys(Game.ACHIEVEMENTS).length}</span></div><div class="s">${p.achievements.length ? p.achievements.map(a => Game.ACHIEVEMENTS[a].icon).join(' ') : 'None yet'}</div></div>
        </div>
        ${nextMission ? `
        <div class="card card-pad" style="margin-bottom:18px;border-color:rgba(56,189,248,.35)">
          <div class="mc-top"><span class="tag tag-easy">NEXT ASSIGNMENT</span><span class="muted" style="font-size:12px">+${nextMission.xp} XP</span></div>
          <h3 style="margin:10px 0 6px;font-size:18px">${esc(nextMission.title)}</h3>
          <p class="dim" style="font-size:13px;margin-bottom:14px">${esc(nextMission.tagline)}</p>
          <button class="btn btn-primary" data-start="${nextMission.id}">Open briefing</button>
        </div>` : `<div class="card card-pad" style="margin-bottom:18px"><p class="dim" style="margin:0">All available assignments on your path are complete. Try the other career track for a different discipline.</p></div>`}
        <h3 style="font-size:15px;margin-bottom:10px">Skills</h3>
        <div class="grid-3">
          ${Object.keys(p.skills).map(k => `
            <div class="stat"><div class="k">${esc(k)}</div><div class="v" style="font-size:20px">${p.skills[k]}</div>
            <div class="xpbar" style="margin-top:8px"><i style="width:${Math.min(100, p.skills[k] * 4)}%"></i></div></div>`).join('')}
        </div>`;
    }

    if (section === 'missions') {
      const rows = MISSIONS.map(m => {
        const unlocked = Game.isUnlocked(m.id);
        const done = p.completed[m.id];
        const onPath = m.path === p.careerPath;
        return `
          <div class="mission-card ${unlocked ? '' : 'locked'}">
            <div class="mc-top">
              <span class="tag ${m.path === 'networking' ? 'tag-net' : 'tag-sec'}">${m.path === 'networking' ? 'NETWORKING' : 'SECURITY'}</span>
              <span class="tag ${m.difficulty === 'easy' ? 'tag-easy' : m.difficulty === 'medium' ? 'tag-med' : 'tag-hard'}">${m.difficulty}</span>
            </div>
            <div class="mc-title">${esc(m.title)}</div>
            <div class="mc-desc">${esc(m.tagline)}</div>
            <div class="muted" style="font-size:11.5px">${esc(m.track)} · ${m.xp} XP</div>
            <div style="margin-top:auto;padding-top:8px">
              ${done
                ? `<span class="tag tag-done">✓ Completed · ${done.score}%</span>
                   <button class="btn btn-sm" style="margin-left:8px" data-start="${m.id}">Replay</button>`
                : unlocked
                  ? `<button class="btn btn-sm btn-primary" data-start="${m.id}">Start mission</button>`
                  : `<span class="tag tag-lock">🔒 ${onPath ? 'Complete the previous mission' : 'Different career path'}</span>`}
            </div>
          </div>`;
      }).join('');
      body = `
        <div class="page-head"><div><h1>Assignments</h1><p>Six missions across two career paths. Networking missions unlock sequentially, as do security missions.</p></div></div>
        <div class="mission-grid">${rows}</div>`;
    }

    if (section === 'codex') {
      body = `
        <div class="page-head"><div><h1>Knowledge Base</h1><p>Short reference notes for the concepts used in missions.</p></div></div>
        <input class="input" id="codex-search" placeholder="Search concepts…" style="margin-bottom:14px;max-width:420px" />
        <div id="codex-list">
          ${CODEX.map((c, i) => `
            <div class="codex-item" data-cat="${esc(c.cat)}" data-i="${i}">
              <div class="tag ${c.cat === 'Networking' ? 'tag-net' : 'tag-sec'}" style="margin-bottom:8px">${esc(c.cat)}</div>
              <h4>${esc(c.title)}</h4><p>${esc(c.body)}</p>
            </div>`).join('')}
        </div>`;
      setTimeout(() => {
        const s = document.getElementById('codex-search');
        if (!s) return;
        s.oninput = () => {
          const q = s.value.toLowerCase();
          document.querySelectorAll('.codex-item').forEach(el => {
            el.style.display = el.textContent.toLowerCase().indexOf(q) !== -1 ? '' : 'none';
          });
        };
      }, 0);
    }

    if (section === 'profile') {
      const av = AVATARS.find(a => a.id === p.avatarId) || AVATARS[0];
      const of = OUTFITS.find(o => o.id === p.outfitId) || OUTFITS[0];
      body = `
        <div class="page-head"><div><h1>Profile</h1><p>Your operator record.</p></div></div>
        <div class="card card-pad" style="display:flex;gap:18px;align-items:center;margin-bottom:16px">
          <div class="pavatar" style="width:70px;height:70px;font-size:36px;background:${of.color}">${av.face}</div>
          <div>
            <h3 style="font-size:20px">${esc(p.username)}</h3>
            <div class="dim">${esc(rank)} · ${p.careerPath === 'networking' ? 'Networking' : 'Cybersecurity'}</div>
            <div class="muted" style="font-size:12px;margin-top:3px">XP ${p.xp} · ${Object.keys(p.completed).length} mission(s) complete</div>
          </div>
        </div>
           <h3 style="font-size:15px;margin:18px 0 10px">Achievements</h3>
        <div class="grid-3">
          ${Object.keys(Game.ACHIEVEMENTS).map(k => {
            const a = Game.ACHIEVEMENTS[k];
            const has = p.achievements.indexOf(k) !== -1;
            return `<div class="stat" style="opacity:${has ? 1 : .45}">
              <div style="font-size:22px">${a.icon}</div>
              <div class="k" style="margin-top:6px">${esc(a.name)}</div>
              <div class="s">${esc(a.desc)}</div></div>`;
          }).join('')}
        </div>
        <h3 style="font-size:15px;margin:22px 0 10px">Mission history</h3>
        <div class="card card-pad">
          ${p.history.length ? p.history.slice().reverse().map(h => `
            <div class="kv"><span>${esc(h.title)}</span><b>${h.score}%</b></div>`).join('') : '<p class="muted" style="margin:0">No missions completed yet.</p>'}
        </div>`;
    }

    if (section === 'settings') {
      body = `
        <div class="page-head"><div><h1>Settings</h1><p>Local options and save management.</p></div></div>
        <div class="card card-pad" style="margin-bottom:16px">
          <h3 style="font-size:15px;margin-bottom:8px">Save data</h3>
          <p class="dim" style="font-size:13px">Progress is stored in this browser's localStorage only. It is not uploaded anywhere. Clearing browser data will erase it.</p>
          <button class="btn btn-danger btn-sm" id="reset-save">Reset progress</button>
        </div>
        <div class="card card-pad">
          <h3 style="font-size:15px;margin-bottom:8px">Career path</h3>
          <p class="dim" style="font-size:13px">Switch which path the mission list defaults to. Completed missions are kept either way.</p>
          <div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap">
            <button class="btn btn-sm ${p.careerPath === 'networking' ? 'btn-primary' : ''}" data-path="networking">Networking</button>
            <button class="btn btn-sm ${p.careerPath === 'cybersecurity' ? 'btn-primary' : ''}" data-path="cybersecurity">Cybersecurity</button>
          </div>
        </div>`;
    }

    app.innerHTML = `<div class="shell">${sidebar(section)}<main class="main">${body}</main></div>`;

    app.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => go(b.dataset.nav));
    app.querySelectorAll('[data-start]').forEach(b => b.onclick = () => startMission(b.dataset.start));

    if (section === 'settings') {
      document.getElementById('reset-save').onclick = () => {
        modal('<h3>Reset all progress?</h3><p class="dim">This deletes your character, XP, missions and achievements from this browser. It cannot be undone.</p>',
          [{ label: 'Cancel', cls: 'btn-ghost' },
           { label: 'Delete everything', cls: 'btn-danger', onClick: () => { Game.reset(); toast('Progress reset.', 'warn'); go('menu'); } }]);
      };
      app.querySelectorAll('[data-path]').forEach(b => b.onclick = () => { Game.setCareer(b.dataset.path); renderHub('settings'); });
    }
  }

  /* ============================================================
     MISSION RUNTIME
     ============================================================ */
  function startMission(id) {
    const m = MISSIONS.find(x => x.id === id);
    if (!m) return;
    if (!Game.isUnlocked(id) && !Game.get().completed[id]) { toast('That mission is still locked.', 'err'); return; }

    const world = m.setup();
    App.run = {
      mission: m,
      net: world.net || null,
      alerts: world.alerts || [],
      logs: world.logs || [],
      hosts: world.hosts || [],
      activeDeviceId: world.activeDeviceId || (m.terminal && m.terminal.device) || null,
      flags: {},
      hintsUsed: 0,
      wrongClassifications: 0,
      startedAt: Date.now(),
      selectedDevice: world.activeDeviceId || null,
      done: false
    };
    App.term = { lines: [], history: [], hIdx: -1 };
    go('mission');
  }
  window.__startMission = startMission;

  function renderMission() {
    const r = App.run;
    if (!r) return go('hub');
    const m = r.mission;

    app.innerHTML = `
    <div class="mission">
      <div class="mtop">
        <button class="btn btn-sm btn-ghost" id="leave">← Hub</button>
        <div>
          <div class="mtitle">${esc(m.title)}</div>
          <div class="muted" style="font-size:11.5px">${esc(m.track)} · ${m.xp} XP</div>
        </div>
        <div class="mmeta">
          <span class="tag ${m.path === 'networking' ? 'tag-net' : 'tag-sec'}">${m.path === 'networking' ? 'NETWORKING' : 'SECURITY'}</span>
          <span class="tag ${m.difficulty === 'easy' ? 'tag-easy' : m.difficulty === 'medium' ? 'tag-med' : 'tag-hard'}">${m.difficulty}</span>
        </div>
        <div class="spacer"></div>
        <button class="btn btn-sm" id="hint-btn">💡 Hint (${r.hintsUsed} used)</button>
        <button class="btn btn-sm btn-ghost" id="reset-btn">Reset mission</button>
      </div>

      <div class="mgrid">
        <div class="col col-left">
          <div class="panel">
            <div class="panel-head">Objectives <span id="obj-count" class="muted"></span></div>
            <div class="panel-body" id="obj-list"></div>
          </div>
          <div class="panel">
            <div class="panel-head">Briefing</div>
            <div class="panel-body"><div class="brief">${esc(m.briefing)}</div></div>
          </div>
          <div class="panel">
            <div class="panel-head">Story</div>
            <div class="panel-body"><p class="dim" style="font-size:13px;margin:0">${esc(m.story)}</p></div>
          </div>
        </div>

        <div class="col col-mid">
          <div id="workspace"></div>
        </div>

        <div class="col col-right">
          <div class="term" id="term">
            <div class="term-head">
              <span class="dot" style="background:#f87171"></span>
              <span class="dot" style="background:#fbbf24"></span>
              <span class="dot" style="background:#3ddc97"></span>
              <span class="term-title">cyberops — simulated shell (fictional environment)</span>
            </div>
            <div class="term-out" id="term-out"></div>
            <div class="term-sugg" id="term-sugg"></div>
            <div class="term-in">
              <span class="term-prompt" id="term-prompt">$</span>
              <input class="term-input" id="term-in" autocomplete="off" spellcheck="false" placeholder="type help…" aria-label="Terminal command input" />
            </div>
          </div>
        </div>
      </div>
    </div>`;

    document.getElementById('leave').onclick = () => {
      modal('<h3>Leave this mission?</h3><p class="dim">Progress in this mission will be lost. Completed missions stay completed.</p>',
        [{ label: 'Stay', cls: 'btn-ghost' }, { label: 'Leave', cls: 'btn-danger', onClick: () => go('hub') }]);
    };
    document.getElementById('reset-btn').onclick = () => {
      modal('<h3>Reset this mission?</h3><p class="dim">All configuration changes and evidence in this run will be discarded.</p>',
        [{ label: 'Cancel', cls: 'btn-ghost' }, { label: 'Reset', cls: 'btn-danger', onClick: () => startMission(m.id) }]);
    };
    document.getElementById('hint-btn').onclick = useHint;

    buildTerminal();
    renderObjectives();
    renderWorkspace();
    termPrint([{ text: 'CyberOps Simulator — simulated shell. Environment is fictional.', cls: 'sys' },
               { text: 'Type "help" for available commands.', cls: 'sys' }]);
    updatePrompt();
  }
/* ---------- objectives ---------- */
  function renderObjectives() {
    const r = App.run, m = r.mission;
    const list = document.getElementById('obj-list');
    if (!list) return;
    let done = 0;
    list.innerHTML = m.objectives.map(o => {
      const ok = !!o.check(r);
      if (ok) done++;
      return `<div class="obj ${ok ? 'done' : ''}"><div class="box">${ok ? '✓' : ''}</div><div class="txt">${esc(o.text)}</div></div>`;
    }).join('');
    const cnt = document.getElementById('obj-count');
    if (cnt) cnt.textContent = done + '/' + m.objectives.length;
  }

  function checkObjectives() {
    const r = App.run, m = r.mission;
    if (r.done) return;
    const all = m.objectives.every(o => o.check(r));
    renderObjectives();
    if (all) completeRun();
  }

  function completeRun() {
    const r = App.run, m = r.mission;
    r.done = true;

    let score = 100;
    score -= r.hintsUsed * ((m.penaltyNotes && m.penaltyNotes.hints) || 10);
    score -= r.wrongClassifications * ((m.penaltyNotes && m.penaltyNotes.wrongClassification) || 15);
    score = Math.max(30, Math.min(100, score));

    const rating = score >= 100 ? 'S' : score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D';
    const xp = Math.round(m.xp * (score / 100));

    Game.completeMission(m, { score, rating, xp, hintsUsed: r.hintsUsed, flags: r.flags });
    go('results', { mission: m, score, rating, xp, hintsUsed: r.hintsUsed });
  }

  /* ---------- hints ---------- */
  function useHint() {
    const r = App.run, m = r.mission;
    const idx = Math.min(r.hintsUsed, m.hints.length - 1);
    const hint = m.hints[idx];
    if (r.hintsUsed >= m.hints.length) { toast('No further hints for this mission.', 'warn'); return; }
    r.hintsUsed++;
    const btn = document.getElementById('hint-btn');
    if (btn) btn.textContent = '💡 Hint (' + r.hintsUsed + ' used)';
    const ws = document.getElementById('workspace');
    const box = document.createElement('div');
    box.className = 'panel';
    box.style.marginBottom = '12px';
    box.innerHTML = '<div class="panel-head">Hint ' + r.hintsUsed + '</div><div class="panel-body"><div class="hint-box" style="margin:0">' + esc(hint) + '</div></div>';
    if (ws) ws.prepend(box);
    checkObjectives();
  }

  /* ---------- workspace ---------- */
  function renderWorkspace() {
    const r = App.run, m = r.mission;
    const ws = document.getElementById('workspace');
    if (!ws) return;

    let html = '';

    // Topology (networking missions)
    if (r.net) {
      html += `<div class="panel" style="margin-bottom:12px">
        <div class="panel-head">Network Topology <span class="muted" style="font-weight:600;letter-spacing:0">click a device to inspect</span></div>
        <div class="panel-body" style="padding:10px">${topoSvg(r.net)}</div>
      </div>`;
      html += `<div class="panel" style="margin-bottom:12px">
        <div class="panel-head">Device Configuration</div>
        <div class="panel-body" id="devcfg">${deviceConfigHtml(r)}</div>
      </div>`;
    }

    // Security evidence
    if (r.alerts.length) {
      html += `<div class="panel" style="margin-bottom:12px">
        <div class="panel-head">Alert Queue <span class="muted" style="font-weight:600;letter-spacing:0">${r.alerts.length} open</span></div>
        <div class="panel-body" style="padding:0">${alertTable(r)}</div>
      </div>`;
    }
    if (r.logs.length) {
      html += `<div class="panel" style="margin-bottom:12px">
        <div class="panel-head">Event Log</div>
        <div class="panel-body" style="padding:0">${logTable(r)}</div>
      </div>`;
    }
    if (r.hosts.length) {
      html += `<div class="panel" style="margin-bottom:12px">
        <div class="panel-head">Engagement Scope <span class="muted" style="font-weight:600;letter-spacing:0">10.20.30.0/24 — authorised</span></div>
        <div class="panel-body" style="padding:0">${hostTable(r)}</div>
      </div>`;
    }

    // Analysis form
    if (m.analysis) {
      html += `<div class="panel">
        <div class="panel-head">${esc(m.analysis.title)}</div>
        <div class="panel-body">
          <p class="muted" style="font-size:12.5px;margin-bottom:12px">${esc(m.analysis.note || '')}</p>
          <form id="analysis-form">
            ${m.analysis.fields.map(f => {
              if (f.type === 'textarea') {
                return `<div class="field"><label for="af-${f.key}">${esc(f.label)}</label>
                  <textarea class="input" id="af-${f.key}" rows="${f.rows || 4}" placeholder="${esc(f.placeholder || '')}"></textarea></div>`;
              }
              return `<div class="field"><label for="af-${f.key}">${esc(f.label)}</label>
                <select class="input" id="af-${f.key}">
                  ${f.options.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}
                </select></div>`;
            }).join('')}
            <button class="btn btn-primary" type="submit">Submit</button>
            ${r.flags['contained'] ? '<button class="btn btn-green" type="button" id="contain-btn" disabled>Threat contained ✓</button>' : '<button class="btn btn-danger" type="button" id="contain-btn">Contain threat</button>'}
          </form>
          <div id="analysis-msg" style="margin-top:12px"></div>
        </div>
      </div>`;
    }

    ws.innerHTML = html;

    // bind topology clicks
    ws.querySelectorAll('[data-dev]').forEach(el => {
      el.onclick = () => {
        App.run.selectedDevice = el.dataset.dev;
        if (r.net.devices[el.dataset.dev]) App.run.activeDeviceId = el.dataset.dev;
        renderWorkspace(); updatePrompt();
      };
    });

    // bind config form
    const cfg = document.getElementById('devcfg');
    if (cfg) bindConfig(cfg);

    // bind analysis form
    const af = document.getElementById('analysis-form');
    if (af) {
      af.onsubmit = e => { e.preventDefault(); submitAnalysis(); };
      const cb = document.getElementById('contain-btn');
      if (cb && !cb.disabled) cb.onclick = containThreat;
    }

    // bind evidence row clicks (inspect shortcut)
    ws.querySelectorAll('[data-inspect]').forEach(el => {
      el.style.cursor = 'pointer';
      el.onclick = () => { runCommand('inspect ' + el.dataset.inspect); };
    });
  }

  /* ---------- topology svg ---------- */
  function topoSvg(net) {
    const devs = Object.values(net.devices);
    const W = 620, H = 300;
    const pos = {};
    devs.forEach(d => { pos[d.id] = { x: d.x, y: d.y }; });

    const lines = net.links.map(l => {
      const a = pos[l.a], b = pos[l.b];
      if (!a || !b) return '';
      const up = (net.devices[l.a].ifaces[l.aIf] || {}).up && (net.devices[l.b].ifaces[l.bIf] || {}).up;
      const col = up ? '#3ddc97' : '#f87171';
      const x1 = a.x + 60, y1 = a.y + 22, x2 = b.x + 60, y2 = b.y + 22;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="2" opacity="${up ? .85 : .6}" class="${up ? 'flow' : ''}"/>`;
    }).join('');

    const nodes = devs.map(d => {
      const sel = App.run.selectedDevice === d.id;
      const down = Object.keys(d.ifaces).some(n => !d.ifaces[n].up);
      const fill = d.type === 'router' ? '#12344a' : d.type === 'switch' ? '#152a3f' : d.type === 'server' ? '#1b2540' : '#141f33';
      const stroke = down ? '#f87171' : sel ? '#38bdf8' : '#26384f';
      const icon = d.type === 'router' ? '⇄' : d.type === 'switch' ? '▤' : d.type === 'server' ? '▢' : '▭';
      return `<g class="node ${sel ? 'sel' : ''}" data-dev="${d.id}" tabindex="0" role="button" aria-label="${esc(d.name)}">
        <rect x="${d.x}" y="${d.y}" width="120" height="44" rx="9" fill="${fill}" stroke="${stroke}" stroke-width="1.6"/>
        <text x="${d.x + 12}" y="${d.y + 27}" fill="${down ? '#f87171' : '#3ddc97'}" font-size="14" font-family="ui-monospace,monospace">${icon}</text>
        <text x="${d.x + 32}" y="${d.y + 27}" class="node-label" fill="#dce8f7" font-size="11.5">${esc(d.name)}</text>
        ${down ? `<circle cx="${d.x + 108}" cy="${d.y + 12}" r="4" fill="#f87171"/>` : `<circle cx="${d.x + 108}" cy="${d.y + 12}" r="4" fill="#3ddc97"/>`}
      </g>`;
    }).join('');

    return `<div class="topo-wrap"><svg class="topo-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Network topology">${lines}${nodes}</svg></div>`;
  }

  /* ---------- device config ---------- */
  function deviceConfigHtml(r) {
    const id = r.selectedDevice;
    const dev = id ? r.net.devices[id] : null;
    if (!dev) return '<p class="muted" style="margin:0">Select a device in the topology.</p>';
    const names = Object.keys(dev.ifaces);
    const editable = dev.type === 'pc' || dev.type === 'server';

    return `<div class="devcfg">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <b style="font-size:13.5px">${esc(dev.name)}</b>
        <span class="tag ${dev.type === 'router' ? 'tag-net' : dev.type === 'switch' ? 'tag-sec' : 'tag-easy'}" style="font-size:10px">${dev.type}</span>
      </div>
      ${names.map(n => {
        const i = dev.ifaces[n];
        return `<div class="ifrow">
          <span style="color:#8fa8c4">${esc(n)}</span>
          <span style="color:${i.up ? '#3ddc97' : '#f87171'}">${i.up ? 'UP' : 'DOWN'}${i.ip ? '  ' + esc(i.ip) : ''}</span>
          <button class="btn btn-sm" data-toggle="${n}">${i.up ? 'Disable' : 'Enable'}</button>
        </div>`;
      }).join('')}
      ${editable && dev.ifaces[names[0]].ip !== undefined ? `
        <form id="cfg-form" style="margin-top:12px">
          <div class="field"><label>IPv4 address</label><input class="input mono" name="ip" value="${esc(dev.ifaces[names[0]].ip || '')}" placeholder="10.0.10.50" /></div>
          <div class="field"><label>Subnet mask</label><input class="input mono" name="mask" value="${esc(dev.ifaces[names[0]].mask || '')}" placeholder="255.255.255.0" /></div>
          <div class="field"><label>Default gateway</label><input class="input mono" name="gateway" value="${esc(dev.ifaces[names[0]].gateway || '')}" placeholder="10.0.10.1" /></div>
          <div class="field"><label>DNS server</label><input class="input mono" name="dns" value="${esc(dev.ifaces[names[0]].dns || '')}" placeholder="10.0.10.53" /></div>
          <button class="btn btn-green btn-sm" type="submit">Apply configuration</button>
          <button class="btn btn-ghost btn-sm" type="button" id="cfg-revert">Revert</button>
        </form>` : ''}
    </div>`;
  }

  function bindConfig(root) {
    const r = App.run;
    const dev = r.net.devices[r.selectedDevice];
    if (!dev) return;

    root.querySelectorAll('[data-toggle]').forEach(b => {
      b.onclick = () => {
        const n = b.dataset.toggle;
        dev.ifaces[n].up = !dev.ifaces[n].up;
        toast(dev.name + ' ' + n + ' is now ' + (dev.ifaces[n].up ? 'UP' : 'DOWN'), dev.ifaces[n].up ? 'ok' : 'warn');
        renderWorkspace(); checkObjectives();
      };
    });

    const form = document.getElementById('cfg-form');
    if (form) {
      form.onsubmit = e => {
        e.preventDefault();
        const fd = new FormData(form);
        const names = Object.keys(dev.ifaces);
        const target = dev.ifaces[names[0]];
        const ip = String(fd.get('ip') || '').trim();
        const mask = String(fd.get('mask') || '').trim();
        const gw = String(fd.get('gateway') || '').trim();
        const dns = String(fd.get('dns') || '').trim();

        const errs = [];
        if (!Sim.isValidIp(ip)) errs.push('IP address');
        if (!Sim.isValidIp(mask)) errs.push('subnet mask');
        if (gw && !Sim.isValidIp(gw)) errs.push('default gateway');
        if (dns && !Sim.isValidIp(dns)) errs.push('DNS server');
        if (errs.length) { toast('Invalid value for: ' + errs.join(', '), 'err'); return; }

        // duplicate IP check
        const clash = Sim.findDeviceByIp(r.net, ip);
        if (clash && clash.dev.id !== dev.id) {
          toast('Address ' + ip + ' is already in use by ' + clash.dev.name + '.', 'err');
          return;
        }

        target.ip = ip; target.mask = mask;
        target.gateway = gw; target.dns = dns;
        toast('Configuration applied to ' + dev.name + '.', 'ok');
        termPrint([{ text: '[' + dev.name + '] configuration updated — eth0 ' + ip + '/' + mask + ' gw ' + (gw || 'none'), cls: 'sys' }]);
        renderWorkspace(); checkObjectives();
      };
      const rev = document.getElementById('cfg-revert');
      if (rev) rev.onclick = () => renderWorkspace();
    }
  }

  /* ---------- evidence tables ---------- */
  function alertTable(r) {
    return `<table class="logtable"><thead><tr><th>ID</th><th>Severity</th><th>Time</th><th>Title</th><th>Source</th></tr></thead><tbody>
      ${r.alerts.map(a => `<tr data-inspect="${a.id}" class="${a.id === 'ALT-1041' && r.flags['cmd:alerts'] ? '' : ''}">
        <td>${esc(a.id)}</td>
        <td class="${a.severity === 'high' ? 'sev-high' : a.severity === 'medium' ? 'sev-med' : 'sev-low'}">${esc(a.severity.toUpperCase())}</td>
        <td>${esc(a.ts)}</td>
        <td>${esc(a.title)}</td>
        <td>${esc(a.src)}</td>
      </tr>`).join('')}
    </tbody></table>`;
  }

  function logTable(r) {
    return `<div class="logscroll"><table class="logtable"><thead><tr><th>Time</th><th>Host</th><th>Event</th><th>User</th><th>Source</th><th>Note</th></tr></thead><tbody>
      ${r.logs.map(l => `<tr class="${l.suspicious ? 'bad' : ''}">
        <td>${esc(l.ts)}</td><td>${esc(l.host)}</td><td>${esc(l.event)}</td>
        <td>${esc(l.user || '—')}</td><td>${esc(l.src)}</td><td>${esc(l.note || '')}</td>
      </tr>`).join('')}
    </tbody></table></div>`;
  }

  function hostTable(r) {
    return `<table class="logtable"><thead><tr><th>Host</th><th>IP</th><th>OS</th><th>Open ports</th></tr></thead><tbody>
      ${r.hosts.map(h => `<tr data-inspect="${h.ip}">
        <td>${esc(h.host)}</td><td>${esc(h.ip)}</td><td>${esc(h.os)}</td>
        <td>${h.ports.map(p => p.port + '/' + p.svc).join(', ')}</td>
      </tr>`).join('')}
    </tbody></table>`;
  }

  /* ---------- analysis submission ---------- */
  function submitAnalysis() {
    const r = App.run, m = r.mission;
    const values = {};
    m.analysis.fields.forEach(f => {
      const el = document.getElementById('af-' + f.key);
      values[f.key] = el ? el.value : '';
    });
    const res = m.evaluateAnalysis(values);
    const msgBox = document.getElementById('analysis-msg');
    msgBox.innerHTML = `<div class="hint-box" style="margin:0;border-color:${res.ok ? 'rgba(61,220,151,.35)' : 'rgba(248,113,113,.35)'};background:${res.ok ? 'rgba(61,220,151,.07)' : 'rgba(248,113,113,.07)'};color:${res.ok ? '#a9f0cf' : '#ffc2c2'}">${esc(res.message)}</div>`;

    if (res.ok) {
      if (m.id === 'sec-01') r.flags['classified:ALT-1041'] = true;
      if (m.id === 'sec-02') r.flags['finding:exposed'] = true;
      if (m.id === 'sec-03') {
        // granular flags based on the sub-results
        r.flags['finding:sql'] = values.vuln === 'SQL injection in the login form' && values.asset === 'lab-web01 (10.20.30.15)';
        r.flags['finding:severity'] = values.sev === 'High';
        r.flags['finding:remediation'] = true;
      }
      toast('Submission accepted.', 'ok');
    } else {
      r.wrongClassifications++;
      toast('Submission rejected — review the evidence.', 'err');
    }
    renderWorkspace();
    checkObjectives();
  }

  function containThreat() {
    const r = App.run;
    if (!r.flags['classified:ALT-1041']) {
      toast('Classify the incident before containing it.', 'err');
      return;
    }
    r.flags['contained'] = true;
    toast('Source 203.0.113.45 blocked at the perimeter.', 'ok');
    termPrint([{ text: '[FIREWALL] deny any 203.0.113.45 -> 10.0.10.0/24', cls: 'ok' },
               { text: '[SOC] containment applied. Account j.hall flagged for password reset.', cls: 'ok' }]);
    renderWorkspace();
    checkObjectives();
  }
  /* ============================================================
     TERMINAL
     ============================================================ */
  function buildTerminal() {
    const input = document.getElementById('term-in');
    const out = document.getElementById('term-out');
    const sugg = document.getElementById('term-sugg');
    const r = App.run;
    const cmds = (r.mission.terminal && r.mission.terminal.commands) || [];
    sugg.innerHTML = cmds.map(c => `<button class="chip" data-cmd="${c}">${c}</button>`).join('');
    sugg.onclick = e => {
      const b = e.target.closest('[data-cmd]');
      if (!b) return;
      input.value = b.dataset.cmd + (b.dataset.cmd === 'ping' || b.dataset.cmd === 'inspect' || b.dataset.cmd === 'scan' || b.dataset.cmd === 'logs' ? ' ' : '');
      input.focus();
    };

    input.onkeydown = e => {
      if (e.key === 'Enter') {
        const v = input.value;
        input.value = '';
        if (v.trim()) { App.term.history.push(v); App.term.hIdx = App.term.history.length; }
        runCommand(v);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!App.term.history.length) return;
        App.term.hIdx = Math.max(0, App.term.hIdx - 1);
        input.value = App.term.history[App.term.hIdx] || '';
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        App.term.hIdx = Math.min(App.term.history.length, App.term.hIdx + 1);
        input.value = App.term.history[App.term.hIdx] || '';
      }
    };
    out.onclick = () => input.focus();
  }

  function updatePrompt() {
    const r = App.run;
    const el = document.getElementById('term-prompt');
    if (!el || !r) return;
    const dev = r.activeDeviceId && r.net ? r.net.devices[r.activeDeviceId] : null;
    el.textContent = dev ? dev.name.toLowerCase() + '>' : 'soc>';
  }

  function termPrint(lines) {
    const out = document.getElementById('term-out');
    if (!out) return;
    lines.forEach(l => {
      const d = document.createElement('div');
      d.className = 'ln ' + (l.cls || '');
      d.textContent = l.text === '' ? '\u00a0' : l.text;
      out.appendChild(d);
      App.term.lines.push(l);
    });
    out.scrollTop = out.scrollHeight;
    while (out.children.length > 800) out.removeChild(out.firstChild);
  }

  function runCommand(raw) {
    const r = App.run;
    if (!r || r.done) return;
    if (!raw.trim()) return;
    termPrint([{ text: (document.getElementById('term-prompt').textContent) + ' ' + raw, cls: 'in' }]);

    // Special-case device argument for non-networking context
    const ctx = { net: r.net || { devices: {} }, activeDeviceId: r.activeDeviceId, mission: r.mission, run: r };
    const res = Sim.exec(raw, ctx);

    if (res.clear) {
      const out = document.getElementById('term-out');
      if (out) out.innerHTML = '';
      App.term.lines = [];
      return;
    }
    if (res.lines && res.lines.length) termPrint(res.lines);
    if (res.flags) Object.keys(res.flags).forEach(k => { r.flags[k] = res.flags[k]; });
    if (res.event && res.event.type === 'open-report') {
      r.flags['cmd:report'] = true;
      // scroll to the analysis panel
      const af = document.getElementById('analysis-form');
      if (af) af.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    checkObjectives();
  }

  /* ============================================================
     RESULTS
     ============================================================ */
  function renderResults(payload) {
    const { mission, score, rating, xp, hintsUsed } = payload;
    const p = Game.get();
    const rank = Game.rankFor(p.xp, p.careerPath);
    const prog = Game.rankProgress(p.xp);

    app.innerHTML = `
    <div class="results">
      <div class="res-hero">
        <div class="tag ${score >= 90 ? 'tag-done' : score >= 70 ? 'tag-med' : 'tag-hard'}">MISSION COMPLETE</div>
        <h1 style="font-size:26px;margin:14px 0 4px">${esc(mission.title)}</h1>
        <div class="muted">${esc(mission.track)}</div>
        <div class="res-grade">${rating}</div>
        <div class="dim" style="font-size:13px">Rating · ${score}% · +${xp} XP</div>
      </div>

      <div class="card card-pad" style="margin-bottom:16px">
        <div class="kv"><span>Experience earned</span><b>+${xp} XP</b></div>
        <div class="kv"><span>Hints used</span><b>${hintsUsed}</b></div>
        <div class="kv"><span>New total</span><b>${p.xp} XP</b></div>
        <div class="kv"><span>Rank</span><b>${esc(rank)}</b></div>
        <div style="margin-top:12px">
          <div class="xpbar"><i style="width:${prog.pct}%"></i></div>
          <div class="muted" style="font-size:12px;margin-top:6px">${prog.next ? prog.need + ' XP to ' + esc(prog.next[p.careerPath === 'networking' ? 'net' : 'sec']) : 'Maximum rank reached'}</div>
        </div>
      </div>

      <div class="card card-pad" style="margin-bottom:16px">
        <h3 style="font-size:15px;margin-bottom:10px">Debrief</h3>
        <div class="debrief">${esc(mission.debrief)}</div>
      </div>

      <div class="card card-pad" style="margin-bottom:16px">
        <h3 style="font-size:15px;margin-bottom:8px">Concepts covered</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${(mission.learning || []).map(l => `<span class="tag tag-net" style="text-transform:none;letter-spacing:0">${esc(l)}</span>`).join('')}
        </div>
      </div>

      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary" id="to-missions">Back to assignments</button>
        <button class="btn btn-ghost" id="replay">Replay mission</button>
      </div>
    </div>`;

    document.getElementById('to-missions').onclick = () => go('missions');
    document.getElementById('replay').onclick = () => startMission(mission.id);
  }
  /* ============================================================
     BOOT
     ============================================================ */
  function boot() {
    const saved = Game.load();
    if (saved) {
      // hydrate the module-level player
      Game.get() || null;
      // Game.load returns data; create() is only for new games. We assign via a small hook:
      if (!Game.get()) {
        // re-create internal state by re-running load through create path is not ideal;
        // instead we expose a hydrate helper.
      }
    }
    go('menu');
  }

  // hydrate helper: Game.load() also sets internal player
  const _origLoad = Game.load;
  Game.load = function () {
    const data = _origLoad();
    if (data && !Game.get()) {
      // rebuild internal player from validated data
      Game.create({ username: data.username, avatarId: data.avatarId, outfitId: data.outfitId, careerPath: data.careerPath });
      const p = Game.get();
      p.xp = data.xp;
      p.skills = data.skills;
      p.completed = data.completed;
      p.unlocked = data.unlocked;
      p.achievements = data.achievements;
      p.history = data.history;
      p.settings = data.settings;
      p.createdAt = data.createdAt;
      Game.save();
    }
    return data;
  };

  document.addEventListener('DOMContentLoaded', boot);
  if (document.readyState !== 'loading') boot();
})();