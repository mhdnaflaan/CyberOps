(function () {
  const $ = s => document.querySelector(s);
  const app = $('#app');
  const App = { route: 'menu', run: null, timerInterval: null };
  window.__APP = App;

  // --- AUDIO ENGINE ---
  function playSound(type) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      if (type === 'type') { osc.type = 'square'; osc.frequency.value = 400; gain.gain.value = 0.02; osc.start(); osc.stop(ctx.currentTime + 0.05); }
      else if (type === 'success') { osc.type = 'sine'; osc.frequency.setValueAtTime(600, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2); gain.gain.value = 0.1; gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3); osc.start(); osc.stop(ctx.currentTime + 0.3); }
      else if (type === 'error') { osc.type = 'sawtooth'; osc.frequency.value = 150; gain.gain.value = 0.1; osc.start(); osc.stop(ctx.currentTime + 0.2); }
    } catch(e) {}
  }

  function toast(msg, kind) {
    const el = document.createElement('div'); el.className = 'toast ' + (kind || '');
    el.textContent = msg; $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  function applyCareerTheme(path) {
    const theme = ['networking','cybersecurity','hacker'].includes(path) ? path : 'networking';
    document.body.dataset.careerTheme = theme;
    if (app) app.dataset.careerTheme = theme;
  }

  function go(route, payload) {
    App.route = route;
    if (route === 'mission') {
      const mission = payload || (App.run && App.run.mission) || {};
      window.dispatchEvent(new CustomEvent('cyberops:mission-start', { detail: { title: mission.title || mission.name || 'Training mission', category: mission.category || mission.path || mission.careerPath || '' } }));
    }
    if (route !== 'mission') { const kb = window.phaserGame && window.phaserGame.input && window.phaserGame.input.keyboard; if (kb) kb.enabled = true; }
    const savedPlayer = Game.get && Game.get();
    if (savedPlayer && savedPlayer.careerPath) applyCareerTheme(savedPlayer.careerPath);
    if (App.timerInterval) clearInterval(App.timerInterval); // Clear timer on route change
    $('#game-container').style.display = 'none';
    app.style.display = 'block';
    // Pause only the office scene while the HTML hub/mission UI is active.
    // Pausing the whole Phaser game left the renderer frozen when returning to the office.
    if (['mission', 'results', 'fail', 'enterprise'].includes(route) && window.phaserGame && window.phaserGame.scene) {
      try {
        if (window.phaserGame.scene.isActive('OfficeScene')) window.phaserGame.scene.pause('OfficeScene');
      } catch (err) { console.warn('Could not pause office scene:', err); }
    }

    if (route === 'menu') return renderMenu();
    if (route === 'create') return renderCreate();
    if (route === 'hub') return renderHub();
    if (route === 'mission') return renderMission();
    if (route === 'results') return renderResults(payload);
    if (route === 'fail') return renderFail();
    if (route === 'enterprise') return renderEnterpriseLab();
    if (route === 'academy') return renderAcademy();
    if (route === 'practical') return renderPracticalSimulator();
  }
  window.__go = go;

  function renderMenu() {
    const hasSave = Game.load();
    app.innerHTML = `
      <div class="menu-screen">
        <h1>CyberOps</h1><p class="dim">Simulation</p>
        <div style="margin-top:20px; display:flex; gap:10px;">
          ${hasSave ? `<button class="btn btn-primary" id="btn-cont">Continue as ${Game.get().username}</button>` : ''}
          <button class="btn ${hasSave ? 'btn-ghost' : 'btn-primary'}" id="btn-new">New Game</button>
        </div>
      </div>`;
    if (hasSave) $('#btn-cont').onclick = () => go('hub');
    $('#btn-new').onclick = () => { Game.reset(); go('create'); };
  }

  const cs = { step: 1, username: '', avatarId: 'mira', careerPath: 'networking' };
  const careerLabel = path => ({ networking: 'Network Engineer', cybersecurity: 'SOC Analyst', hacker: 'Ethical Hacker' }[path] || 'CyberOps Operator');
  function renderCreate() {
    app.innerHTML = `<div class="creation"><h2>Create Character</h2><div id="c-body"></div></div>`;
    const body = $('#c-body');
    if (cs.step === 1) {
      body.innerHTML = `
        <div class="card character-setup">
          <span class="eyebrow">STEP 1 OF 2 · PLAYER IDENTITY</span><h3 class="character-heading">Choose your operator</h3>
          <p class="dim">Pick the character you want to play throughout the campus. Each has a distinct look and specialty; your career path is chosen next.</p>
          <label class="character-label" for="uname">Callsign / player name</label>
          <input class="input" id="uname" placeholder="Enter your callsign" maxlength="24" value="${escapeHtml(cs.username)}">
          <div class="character-grid">${AVATARS.map(a => `<button type="button" class="character-card ${cs.avatarId === a.id ? 'sel' : ''}" data-av="${a.id}" aria-pressed="${cs.avatarId === a.id}"><div class="character-art sprite-${a.sprite}" role="img" aria-label="${escapeHtml(a.name)} character portrait"></div><div class="character-card-copy"><span class="character-role">${escapeHtml(a.role)}</span><strong>${escapeHtml(a.name)}</strong><span class="character-style">${escapeHtml(a.style)}</span><p>${escapeHtml(a.description)}</p><span class="character-affinity">Recommended: ${escapeHtml(careerLabel(a.affinity))}</span></div>${cs.avatarId === a.id ? '<span class="character-selected">SELECTED ✓</span>' : ''}</button>`).join('')}</div>
          <div class="character-footer"><span class="dim small">Character choice stays with your save. You can explore other career tracks later.</span><button class="btn btn-primary" id="next">Choose career →</button></div>
        </div>`;
      $('#uname').oninput = e => cs.username = e.target.value;
      document.querySelectorAll('[data-av]').forEach(b => b.onclick = () => { cs.avatarId = b.dataset.av; renderCreate(); });
      $('#next').onclick = () => { if(cs.username.trim().length < 2) return toast('Callsign must be at least 2 characters', 'err'); cs.username = cs.username.trim(); cs.step = 2; renderCreate(); };
    } else {
      body.innerHTML = `
        <div class="career-step-head"><span class="eyebrow">STEP 2 OF 2 · CAREER PATH</span><h3>Choose your learning track</h3><p class="dim">Selected operator: <b>${escapeHtml((AVATARS.find(a => a.id === cs.avatarId) || AVATARS[0]).name)}</b>. Character and career are separate choices.</p><button class="btn btn-ghost btn-sm" id="back-character">← Change character</button></div>
        <div class="career-grid">
          <button class="career-card ${cs.careerPath === 'networking' ? 'sel' : ''}" data-path="networking"><span class="tag tag-net">PATH A · BLUE</span><h3>🌐 Network Engineer</h3><p class="dim">NOC operations, routing, switching, DNS, outages and infrastructure. Learn Windows diagnostics, Linux network commands and Cisco IOS-style commands.</p><small>Theme: Network Operations</small></button>
          <button class="career-card ${cs.careerPath === 'cybersecurity' ? 'sel' : ''}" data-path="cybersecurity"><span class="tag tag-sec">PATH B · DEFEND</span><h3>🛡️ SOC Analyst</h3><p class="dim">Alert triage, log analysis, incident response, threat hunting and evidence-led containment.</p><small>Theme: Security Operations Centre</small></button>
          <button class="career-card ${cs.careerPath === 'hacker' ? 'sel' : ''}" data-path="hacker"><span class="tag tag-hack">PATH C · RED</span><h3>⌘ Ethical Hacker</h3><p class="dim">Authorised scope → discovery → service enumeration → web checks → evidence → report and remediation.</p><small>Theme: Red Team Lab · Fictional targets only</small></button>
        </div>
        <div class="character-footer"><span class="dim small">CyberOps command results remain simulated; no real network targets are scanned.</span><div style="display:flex;gap:10px"><button class="btn btn-ghost" id="back-character-bottom">Back</button><button class="btn btn-green" id="finish">Begin Career →</button></div></div>`;
      $('#back-character').onclick = $('#back-character-bottom').onclick = () => { cs.step = 1; renderCreate(); };
      document.querySelectorAll('[data-path]').forEach(b => b.onclick = () => { cs.careerPath = b.dataset.path; applyCareerTheme(cs.careerPath); renderCreate(); });
      applyCareerTheme(cs.careerPath);
      $('#finish').onclick = () => { Game.create(cs); applyCareerTheme(cs.careerPath); go('hub'); };
    }
  }

  function renderHub() {
    const p = Game.get();
    if (!p) return go('menu');
    applyCareerTheme(p.careerPath);
    const enterprise = Game.getEnterpriseState ? Game.getEnterpriseState() : { services: {}, tickets: [], changes: [], events: [] };
    const missions = window.MISSIONS || [];
    const careerMissions = missions.filter(m => m.path === p.careerPath);
    const careerPaths = [
      { id: 'networking', title: 'Network Engineer', icon: '🌐', desc: 'NOC diagnostics, addressing, DNS and outages.' },
      { id: 'cybersecurity', title: 'SOC Analyst', icon: '🛡️', desc: 'Alert triage, log correlation and incident response.' },
      { id: 'hacker', title: 'Ethical Hacker', icon: '🎯', desc: 'Authorised lab recon, validation and reporting.' }
    ].map(c => ({ ...c, total: missions.filter(m => m.path === c.id).length, done: missions.filter(m => m.path === c.id && !!p.completed[m.id]).length }));
    const completed = careerMissions.filter(m => !!p.completed[m.id]);
    const progress = careerMissions.length ? Math.round(completed.length / careerMissions.length * 100) : 0;
    const nextRank = Game.nextRank ? Game.nextRank(p.xp, p.careerPath) : null;
    const recentHistory = (Array.isArray(p.history) ? p.history : []).slice(0, 4);
    const skills = p.skills || { networking: 0, security: 0, hacking: 0 };
    const skillRows = [
      ['Networking', skills.networking || 0, 'net'],
      ['Security', skills.security || 0, 'sec'],
      ['Research', skills.hacking || 0, 'hack']
    ].map(([label, value, kind]) => `<div class="skill-row"><div class="skill-meta"><span>${label}</span><b>${value} XP</b></div><div class="skill-track"><span class="skill-fill ${kind}" style="width:${Math.min(100, Math.max(0, value / 5))}%"></span></div></div>`).join('');
    const nextMission = careerMissions.find(m => !p.completed[m.id] && Game.isUnlocked(m.id));
    const achievements = [
      { title: 'First Response', detail: 'Complete your first mission', unlocked: completed.length >= 1, icon: '🎯' },
      { title: 'Field Operator', detail: 'Complete 3 career missions', unlocked: completed.length >= 3, icon: '🛰️' },
      { title: 'CyberOps Veteran', detail: 'Complete every career mission', unlocked: careerMissions.length > 0 && completed.length === careerMissions.length, icon: '🏆' }
    ];
    app.innerHTML = `
      <div class="shell">
        <aside class="sidebar">
          <div class="brand-mark">◈ CYBEROPS</div>
          <div class="profile-chip"><div class="profile-avatar">${(p.username || 'O').slice(0,1).toUpperCase()}</div><div><b>${escapeHtml(p.username)}</b><div class="dim tiny">${escapeHtml(Game.rankFor(p.xp, p.careerPath))}</div></div></div>
          <div class="sidebar-label">CAREER PATH</div><div class="path-pill">${escapeHtml(p.careerPath.toUpperCase())}</div>
          <div class="xp-block"><span>Total experience</span><strong>${p.xp} XP</strong><div class="skill-track"><span class="skill-fill net" style="width:${Math.min(100, p.xp / 20)}%"></span></div>${nextRank ? `<span>Next rank: ${escapeHtml(nextRank.title)} · ${nextRank.remaining} XP to go</span>` : '<span>Top in-game rank reached</span>'}</div>
          <div class="sidebar-foot">TRAIN • INVESTIGATE • IMPROVE</div>
        </aside>
        <main class="main dashboard-main">
          <div class="dashboard-top"><div><div class="eyebrow">CYBEROPS TRAINING CAMPUS / PERSONNEL FILE</div><h1>Welcome back, ${escapeHtml(p.username)}</h1><p class="dim">Build real-world skills one incident at a time.</p></div><div class="status-pill"><span></span> SYSTEM ONLINE</div></div>
          <section class="stat-grid">
            <div class="stat-card"><span class="stat-icon">⚡</span><div class="stat-label">TOTAL XP</div><strong>${p.xp}</strong><small>Career experience</small></div>
            <div class="stat-card"><span class="stat-icon">✓</span><div class="stat-label">MISSIONS DONE</div><strong>${completed.length}<i> / ${careerMissions.length}</i></strong><small>Current career path</small></div>
            <div class="stat-card"><span class="stat-icon">◉</span><div class="stat-label">COMPLETION</div><strong>${progress}%</strong><small>Career progression</small></div>
            <div class="stat-card"><span class="stat-icon">★</span><div class="stat-label">REPUTATION</div><strong>${Number(p.reputation ?? 50)}<i> / 100</i></strong><small>${(p.reputation ?? 50) >= 80 ? 'Trusted operator' : (p.reputation ?? 50) >= 55 ? 'Building trust' : 'Focus on process'}</small></div>
          </section>
          <section class="dashboard-grid">
            <div class="dash-panel career-panel"><div class="panel-title"><div><span class="eyebrow">YOUR NEXT STEP</span><h2>Career Progress</h2></div><span class="tag tag-net">${progress}%</span></div>
              <div class="progress-track"><span style="width:${progress}%"></span></div><p class="dim small">${completed.length} of ${careerMissions.length} missions completed in ${escapeHtml(p.careerPath)}.</p>
              <div class="next-mission">${nextMission ? `<div><span class="eyebrow">RECOMMENDED MISSION</span><h3>${escapeHtml(nextMission.title)}</h3><p class="dim small">${escapeHtml(nextMission.tagline || 'Continue your training.')}</p></div><button class="btn btn-primary" id="open-missions">View Missions ↗</button>` : `<div><h3>${completed.length ? 'Career milestones reached!' : 'Ready to begin?'}</h3><p class="dim small">Visit your office team to find assignments and new challenges.</p></div><button class="btn btn-primary" id="open-missions">View Missions ↗</button>`}</div>
              <div class="panel-title section-title"><div><span class="eyebrow">SKILL PROFILE</span><h2>Capability Matrix</h2></div></div>${skillRows}
            </div>
            <div class="dash-panel"><div class="panel-title"><div><span class="eyebrow">MILESTONES</span><h2>Achievements</h2></div></div><div class="achievement-list">${achievements.map(a => `<div class="achievement ${a.unlocked ? 'unlocked' : ''}"><span class="achievement-icon">${a.unlocked ? a.icon : '🔒'}</span><div><b>${a.title}</b><p class="dim small">${a.detail}</p></div><span class="achievement-state">${a.unlocked ? 'UNLOCKED' : 'LOCKED'}</span></div>`).join('')}</div><div class="campus-callout"><div class="campus-art">⌘</div><div><b>Operations Floor</b><p class="dim small">Talk to specialists, explore the campus and access mission workspaces.</p><button class="btn btn-green" id="enter-2d">Enter Office →</button></div></div></div>
          </section>
          <section class="dash-panel campaign-briefing" style="margin-top:18px">
            <div class="panel-title"><div><span class="eyebrow">LIVE CAMPUS STORYLINE</span><h2>Operation: Glass Harbor</h2></div><span class="tag tag-sec">CHAPTER ${Math.min(4, Math.floor(completed.length / 2) + 1)} / 4</span></div>
            <p class="dim">A sequence of simulated incidents is unfolding across the campus. Your decisions and completed assignments determine how much evidence the team has to work with.</p>
            <div class="hint-box campaign-consequence"><b>Current campaign consequence</b><p class="dim small">${(() => { const flag = p.campaignFlags && p.campaignFlags.lastDecision; return flag === 'evidence-first' ? 'The SOC preserved an evidence trail. Upcoming investigations will emphasise correlation and chain of custody.' : flag === 'rapid-containment' ? 'The incident was contained quickly. The next review will prioritise missing context and post-containment evidence.' : flag === 'joint-response' ? 'Teams shared a common timeline. Cross-department coordination is now the campaign focus.' : flag === 'scope-verified' ? 'The research team documented authorised scope. Future assessments will build on safe, reproducible findings.' : flag === 'service-first' ? 'Service was restored quickly. The next review will check whether root-cause evidence was retained.' : 'No major incident decision has been recorded yet. Complete a mission and choose how the team should respond.'; })()}</p></div>
            <div class="team-trust-grid">${[['Dana','Network lead','networking'],['Alex','SOC lead','cybersecurity'],['Zero','Research lead','hacker'],['Nadia','Operations manager','all']].map(([name,role]) => { const value = Game.getRelationship ? Game.getRelationship(name) : 0; const level = value >= 4 ? 'Trusted' : value >= 1 ? 'Positive' : value <= -2 ? 'Concerned' : 'Neutral'; return `<div class="team-trust-card"><div><b>${name}</b><span class="dim small">${role}</span></div><span class="trust-level">${level}</span><div class="progress-track"><span style="width:${Math.max(0,Math.min(100,50+value*10))}%"></span></div><small>${value > 0 ? '+' : ''}${value} trust</small></div>`; }).join('')}</div>
            <div class="roadmap-list">
              ${[
                {title:'01 · Unusual service disruption',detail:'A small connectivity fault may be hiding a wider configuration problem.',done:completed.length>=1},
                {title:'02 · Suspicious authentication trail',detail:'The SOC has flagged a cluster of failed logins that needs evidence-based triage.',done:completed.length>=2},
                {title:'03 · Trace the exposed service',detail:'The research team needs an authorised lab assessment and a clear risk explanation.',done:completed.length>=4},
                {title:'04 · Joint incident review',detail:'Bring diagnostics, alert context and scoped findings together into a defensible response.',done:completed.length>=6}
              ].map((beat,i)=>`<div class="roadmap-item ${beat.done?'done':(i===completed.length?'current':'')}"><span class="roadmap-step">${beat.done?'✓':String(i+1).padStart(2,'0')}</span><div><b>${beat.title}</b><p class="dim small">${beat.detail}</p></div><span>${beat.done?'CLEARED':(i===completed.length?'ACTIVE':'PENDING')}</span></div>`).join('')}
            </div>
            <p class="dim small" style="margin-top:12px">Story progress is based on your completed assignments in this career path. The storyline is fictional and all technical actions remain simulated.</p>
          </section>

          <section class="dash-panel enterprise-panel" style="margin-top:18px">
            <div class="panel-title"><div><span class="eyebrow">PERSISTENT FICTIONAL ENVIRONMENT</span><h2>Enterprise Operations Lab</h2></div><span class="tag tag-sec">LOCAL SIMULATION</span></div>
            <p class="dim small">Inspect service health, review fictional incident tickets, record change notes and verify recovery. Your actions persist in this browser profile and appear in the audit trail.</p>
            <div class="enterprise-service-grid">${Object.entries(enterprise.services || {}).map(([name,status]) => `<div class="enterprise-service"><span class="service-dot ${status === 'up' ? 'online' : 'offline'}"></span><div><b>${escapeHtml(name)}</b><small>${String(status).toUpperCase()}${enterprise.verified && enterprise.verified[name] ? ' · VERIFIED' : ''}</small></div></div>`).join('')}</div>
            <div class="enterprise-lab-footer"><div><b>${(enterprise.tickets || []).filter(t => t.status !== 'CLOSED').length} open tickets</b><p class="dim small">${(enterprise.changes || []).length} change records · ${(enterprise.events || []).length} audit events</p></div><button class="btn btn-green" id="open-enterprise-lab">Open Enterprise Console →</button></div>
          </section>

          <section class="dash-panel academy-promo" style="margin-top:18px"><div class="panel-title"><div><span class="eyebrow">CYBEROPS 8.4 / STRUCTURED TRAINING</span><h2>Learning Academy</h2></div><span class="tag tag-sec">6 PATHS · PRACTICAL LABS</span></div><p class="dim">Follow a progressive curriculum inspired by hands-on cybersecurity education: learn concepts, practise in a fictional environment, collect evidence, then prove mastery in a challenge.</p><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-green" id="open-academy">Enter Learning Academy →</button><button class="btn btn-primary" id="open-practical-lab">Launch Practical Network Lab →</button></div></section>

          <section class="dash-panel career-exchange" style="margin-top:18px">
            <div class="panel-title"><div><span class="eyebrow">CROSS-DEPARTMENT PROGRAMME</span><h2>Career Exchange</h2></div><span class="tag tag-sec">3 PATHS · ONE PERSONNEL FILE</span></div>
            <p class="dim small">Explore all three training tracks using the same character and save. Completed missions, XP, skills and field reports stay with your profile; each department has its own mission prerequisites.</p>
            <div class="career-exchange-grid">${careerPaths.map(c => `<article class="career-exchange-card ${c.id === p.careerPath ? 'active' : ''}"><div class="career-exchange-icon">${c.icon}</div><div class="career-exchange-title"><b>${c.title}</b>${c.id === p.careerPath ? '<span class="tag tag-done">CURRENT</span>' : ''}</div><p class="dim small">${c.desc}</p><div class="progress-track"><span style="width:${c.total ? Math.round(c.done/c.total*100) : 0}%"></span></div><small>${c.done} / ${c.total} assignments complete</small><button class="btn ${c.id === p.careerPath ? 'btn-ghost' : 'btn-primary'}" data-career-switch="${c.id}" ${c.id === p.careerPath ? 'disabled' : ''}>${c.id === p.careerPath ? 'Active Department' : 'Switch Department'}</button></article>`).join('')}</div>
            <div class="career-tools"><div><b>Professional field record</b><p class="dim small">Export a local copy of your mission history, scores, XP, skill profile and training disclaimer.</p></div><button class="btn btn-green" id="export-record">Export Field Record ↗</button></div>
          </section>

          <section class="dashboard-grid extra-learning-grid">
            <div class="dash-panel">
              <div class="panel-title"><div><span class="eyebrow">PERSONAL CAREER LOG</span><h2>Recent field activity</h2></div><span class="tag tag-net">${recentHistory.length} / 20</span></div>
              ${recentHistory.length ? `<div class="roadmap-list">${recentHistory.map((entry, i) => `<div class="roadmap-item done"><span class="roadmap-step">${String(i+1).padStart(2,'0')}</span><div><b>${escapeHtml(entry.title || 'Completed assignment')}</b><p class="dim small">Score ${Number(entry.score)||0}% · ${new Date(entry.at).toLocaleDateString()}</p></div><span>+${Number(entry.xp)||0} XP</span></div>`).join('')}</div>` : '<p class="dim small">Your completed assignments and results will appear here. Start your first mission to create a career record.</p>'}
            </div>
            <div class="dash-panel">
              <div class="panel-title"><div><span class="eyebrow">LEARNING ROADMAP</span><h2>Your next capabilities</h2></div><span class="tag tag-net">GUIDED PATH</span></div>
              <div class="roadmap-list">
                <div class="roadmap-item ${completed.length >= 1 ? 'done' : 'current'}"><span class="roadmap-step">01</span><div><b>Foundations</b><p class="dim small">Understand the environment, evidence, and safe working scope.</p></div><span>${completed.length >= 1 ? '✓' : 'NOW'}</span></div>
                <div class="roadmap-item ${completed.length >= 3 ? 'done' : ''}"><span class="roadmap-step">02</span><div><b>Investigate</b><p class="dim small">Use logs, diagnostics, and simulated terminal tools to test hypotheses.</p></div><span>${completed.length >= 3 ? '✓' : 'LOCKED'}</span></div>
                <div class="roadmap-item ${progress >= 75 ? 'done' : ''}"><span class="roadmap-step">03</span><div><b>Respond & report</b><p class="dim small">Make a defensible decision and document remediation clearly.</p></div><span>${progress >= 75 ? '✓' : 'LOCKED'}</span></div>
              </div>
            </div>
            <div class="dash-panel">
              <div class="panel-title"><div><span class="eyebrow">FIELD NOTES</span><h2>Professional habits</h2></div></div>
              <div class="field-note"><b>01 / Verify before acting</b><p class="dim small">Collect evidence first. Separate what you observed from what you suspect.</p></div>
              <div class="field-note"><b>02 / Respect scope</b><p class="dim small">All CyberOps targets are fictional simulations. Test only systems you are authorised to assess.</p></div>
              <div class="field-note"><b>03 / Explain the fix</b><p class="dim small">A good operator can explain the root cause, business impact, and a practical remediation.</p></div>
            </div>
          </section>
          <div class="dashboard-footer"><span>◈ CYBEROPS ULTIMATE / PERSONNEL DASHBOARD</span><span>Progress is saved on this device</span></div>
        </main>
      </div>`;
    $('#open-missions').onclick = () => window.__openMissionBoard(p.careerPath);
    const enterpriseButton = $('#open-enterprise-lab'); if (enterpriseButton) enterpriseButton.onclick = () => go('enterprise');
    const academyButton = $('#open-academy'); if (academyButton) academyButton.onclick = () => go('academy');
    const practicalButton = $('#open-practical-lab'); if (practicalButton) practicalButton.onclick = () => go('practical');
    $('#enter-2d').onclick = () => {
      app.style.display = 'none';
      $('#game-container').style.display = 'block';
      // Wait until the game container has a measurable layout before restoring Phaser.
      requestAnimationFrame(() => {
        if (window.startPhaser) window.startPhaser();
        requestAnimationFrame(() => {
          if (window.phaserGame && window.phaserGame.scale) window.phaserGame.scale.refresh();
          const scene = window.phaserGame && window.phaserGame.scene;
          if (scene) {
            try {
              if (scene.isPaused('OfficeScene')) scene.resume('OfficeScene');
              if (scene.isSleeping('OfficeScene')) scene.wake('OfficeScene');
              if (!scene.isActive('OfficeScene') && !scene.isSleeping('OfficeScene')) scene.launch('OfficeScene');
              const office = scene.getScene('OfficeScene');
              if (office && office.physics && office.physics.world) office.physics.world.resume();
              if (office && office.input && office.input.keyboard) office.input.keyboard.enabled = true;
            } catch (e) { console.warn('Office recovery retry:', e); }
          }
        });
      });
    };
    document.querySelectorAll('[data-career-switch]').forEach(button => button.addEventListener('click', () => {
      const path = button.dataset.careerSwitch;
      if (Game.switchCareer(path)) { applyCareerTheme(path); renderHub(); toast('Department changed. Your shared personnel record is preserved.', 'ok'); }
    }));
    const exportButton = $('#export-record');
    if (exportButton) exportButton.addEventListener('click', exportFieldRecord);
  }

  function exportFieldRecord() {
    const p = Game.get(); if (!p) return;
    const allMissions = window.MISSIONS || [];
    const completed = Object.entries(p.completed || {}).map(([id, record]) => {
      const mission = allMissions.find(m => m.id === id);
      return { id, title: mission ? mission.title : id, career: mission ? mission.path : (record.path || 'unknown'), score: record.score || 0, attempts: record.attempts || 1, completedAt: record.at || null };
    });
    const report = {
      product: 'CyberOps Training Simulation', generatedAt: new Date().toISOString(),
      learner: p.username, currentDepartment: p.careerPath, inGameRank: Game.rankFor(p.xp, p.careerPath),
      totalXP: p.xp, reputation: Number(p.reputation ?? 50), skills: p.skills || {}, teamRelationships: p.relationships || {}, campaignDecisions: p.campaignFlags && p.campaignFlags.decisions || {}, enterpriseState: Game.getEnterpriseState ? Game.getEnterpriseState() : null,
      careerProgress: ['networking','cybersecurity','hacker'].map(path => ({ path, completed: allMissions.filter(m => m.path === path && p.completed[m.id]).length, total: allMissions.filter(m => m.path === path).length })),
      completedMissions: completed, recentFieldHistory: (p.history || []).slice(0, 20),
      disclaimer: 'This file records activity in a fictional educational simulation. It is not a certification, employment record, or proof of real-world experience.'
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'cyberops-field-record.json'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Field record exported to your device.', 'ok');
  }

  function renderPracticalSimulator() {
    const lab = window.CyberOpsPracticalLab; let state = lab.load();
    app.innerHTML = `<div class="academy-page practical-sim-page"><header class="academy-header"><div><div class="eyebrow">CYBEROPS 8.4 / PRACTICAL CAREER SIMULATOR</div><h1>Network Operations Lab</h1><p class="dim">A persistent fictional company network. Diagnose first, change carefully, verify, then document.</p></div><button class="btn btn-ghost" id="practical-back">← Career Hub</button></header>
      <div class="academy-summary"><div class="stat-card"><div class="stat-label">LAB MASTERY XP</div><strong id="practical-xp">${state.xp}</strong></div><div class="stat-card"><div class="stat-label">INCIDENT</div><strong>INC-204</strong></div><div class="stat-card"><div class="stat-label">ENVIRONMENT</div><strong>SIMULATED</strong></div></div>
      <div class="dashboard-grid" style="grid-template-columns:minmax(0,1.1fr) minmax(300px,.9fr);margin-top:18px"><section class="dash-panel"><div class="panel-title"><div><span class="eyebrow">LIVE TOPOLOGY</span><h2>Corporate network</h2></div><span class="tag tag-sec">LOCAL LAB ONLY</span></div><div class="practical-topology"><div class="practical-node">PC-01<small>10.10.10.25</small></div><span>↔</span><div class="practical-node">SW-01<small>Access switch</small></div><span>↔</span><div class="practical-node">RTR-01<small>10.10.10.1</small></div><div class="practical-branches"><div class="practical-node" id="p-dns-node">DNS-01<small>10.10.20.53</small><b id="p-dns-status"></b></div><div class="practical-node" id="p-web-node">WEB-01<small>10.10.20.20</small><b id="p-web-status"></b></div></div></div><h3>Incident brief</h3><p>Employees report that <b>intranet.corp</b> cannot be opened. Internet access is reported as working. The web server appears online, but hostname resolution may be failing.</p><div class="hint-box"><b>Team lead Nadia</b><p>“Please collect evidence before changing anything. Confirm the workstation configuration, isolate the failing dependency, restore service, and verify access before you close the incident.”</p></div><div class="practical-objectives" id="practical-objectives"></div><div class="practical-actions"><button class="btn btn-ghost" id="practical-reset">Reset lab</button><button class="btn btn-green" id="practical-export">Export incident report</button></div></section>
      <section class="dash-panel practical-terminal-panel"><div class="panel-title"><div><span class="eyebrow">OPERATOR CONSOLE</span><h2>Simulated terminal</h2></div><span class="tag tag-net">STATEFUL</span></div><p class="dim small">Type <code>help</code> to view supported commands. Commands modify only this fictional lab.</p><div class="practical-terminal"><div class="terminal-top"><span>operator@noc:~$</span><span>INC-204</span></div><pre id="practical-output">CyberOps Network Operations Lab 8.4
Incident INC-204 opened.
DNS-01 is suspected to be unavailable. Investigate using evidence.</pre><form id="practical-form"><label for="practical-command">operator@noc:~$</label><input id="practical-command" autocomplete="off" spellcheck="false" placeholder="help, map, ipconfig…"><button class="btn btn-green">Run</button></form></div><div class="hint-box" id="practical-guidance" aria-live="polite"><b>Adaptive guidance</b><p>Start with <code>map</code> and <code>ipconfig</code>. If the gateway responds but hostname lookup fails, inspect the DNS service before changing it.</p></div><div class="panel-title" style="margin-top:18px"><div><span class="eyebrow">COMMAND HISTORY</span><h3>Recent actions</h3></div></div><div id="practical-history" class="practical-history"></div></section></div><p class="dim small academy-disclaimer">All hosts, addresses and command outputs are fictional. No real operating-system commands or external network traffic are executed.</p></div>`;
    $('#practical-back').onclick=()=>go('hub');
    const output=$('#practical-output'), input=$('#practical-command');
    function renderState(){state=lab.load();$('#practical-xp').textContent=state.xp;$('#p-dns-status').textContent=state.devices['DNS-01']==='up'?'● ONLINE':'● OFFLINE';$('#p-dns-node').classList.toggle('is-down',state.devices['DNS-01']!=='up');$('#p-web-status').textContent=state.devices['WEB-01']==='up'?'● ONLINE':'● OFFLINE';$('#practical-objectives').innerHTML=[['Map the network',state.flags.mapped],['Diagnose and restore DNS',state.flags.diagnosed&&state.flags.restored],['Verify intranet and document the fix',state.flags.verified&&state.flags.reported]].map(([label,done],i)=>`<div class="roadmap-item ${done?'done':''}"><span class="roadmap-step">${done?'✓':String(i+1).padStart(2,'0')}</span><div><b>${label}</b></div><span>${done?'COMPLETE':'PENDING'}</span></div>`).join('');$('#practical-history').innerHTML=state.history.slice(-8).reverse().map(h=>`<div class="practical-history-row"><code>${escPractical(h.command)}</code><span class="${h.ok?'ok':'bad'}">${h.ok?'OK':'CHECK'}</span></div>`).join('')||'<p class="dim small">Your commands will appear here.</p>';}
    function escPractical(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
    $('#practical-form').onsubmit=e=>{e.preventDefault();const cmd=input.value;const r=lab.execute(cmd,state);output.textContent+=`\n\noperator@noc:~$ ${cmd}\n${r.out}`;output.scrollTop=output.scrollHeight;input.value='';$('#practical-guidance').innerHTML=r.ok?`<b>Action recorded${r.xp?' · +'+r.xp+' XP':''}</b><p>Read the output and choose the next step based on evidence. Verify the final state before reporting.</p>`:`<b>Command needs attention</b><p>Check the spelling and supported syntax. Use <code>help</code> for available commands; read-only diagnostics are a good starting point.</p>`;renderState();};
    $('#practical-reset').onclick=()=>{if(confirm('Reset this fictional network lab and its incident progress?')){state=lab.reset();output.textContent='Lab reset. INC-204 reopened. DNS-01 is offline. Type help to begin.';renderState();}};
    $('#practical-export').onclick=()=>{state=lab.load();const report={product:'CyberOps 8.4',incident:'INC-204',exportedAt:new Date().toISOString(),environment:'fictional simulated network',state:state,disclaimer:'Training record only; not a certification.'};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));a.download='cyberops-inc-204-report.json';a.click();URL.revokeObjectURL(a.href);};
    renderState();
  }

  function renderAcademy() {
    const profile = Game.get(); if (!profile) return go('menu');
    const progress = Academy.getProgress();
    const selected = Academy.getSelected();
    const paths = Academy.paths;
    app.innerHTML = `<div class="academy-page"><header class="academy-header"><div><div class="eyebrow">CYBEROPS 8.3 / CAREER TRAINING ACADEMY</div><h1>Learn by doing.</h1><p class="dim">Structured paths, isolated fictional labs, evidence-based challenges and persistent mastery tracking.</p></div><button class="btn btn-ghost" id="academy-back">← Return to Career Hub</button></header>
      <div class="academy-summary"><div class="stat-card"><div class="stat-label">CHALLENGES CLEARED</div><strong>${progress.completed.length}<i> / ${Academy.challengeCount}</i></strong></div><div class="stat-card"><div class="stat-label">MASTERY XP</div><strong>${progress.xp}</strong></div><div class="stat-card"><div class="stat-label">LEARNING PATHS</div><strong>06</strong></div></div>
      <div class="academy-layout"><aside class="academy-path-list"><h2>Learning paths</h2>${paths.map(path=>{const done=path.challenges.filter(c=>progress.completed.includes(c.id)).length;return `<button class="academy-path ${selected===path.id?'active':''}" data-path="${path.id}"><span class="academy-path-icon">${path.icon}</span><span><b>${path.title}</b><small>${path.level} · ${done}/${path.challenges.length} labs</small></span></button>`}).join('')}</aside>
      <section class="academy-main" id="academy-main"></section></div><p class="dim small academy-disclaimer">All targets are fictional and simulated in this browser. This is training progress, not a certification. Only test systems you are authorised to assess.</p></div>`;
    $('#academy-back').onclick=()=>go('hub');
    document.querySelectorAll('[data-path]').forEach(b=>b.onclick=()=>{Academy.select(b.dataset.path);renderAcademy();});
    const path=paths.find(x=>x.id===selected)||paths[0]; const done=progress.completed;
    $('#academy-main').innerHTML=`<div class="academy-path-hero"><div class="eyebrow">${path.level.toUpperCase()} / ${path.category.toUpperCase()}</div><h2>${path.icon} ${path.title}</h2><p class="dim">${path.description}</p><div class="progress-track"><span style="width:${Math.round(path.challenges.filter(c=>done.includes(c.id)).length/path.challenges.length*100)}%"></span></div></div>
      <div class="academy-learning-loop"><span>01 Learn concepts</span><span>02 See examples</span><span>03 Practise</span><span>04 Check knowledge</span><span>05 Apply in labs</span></div>
      <section class="career-curriculum"><div class="panel-title"><div><span class="eyebrow">CAREER KNOWLEDGE MAP</span><h2>Learn the whole career, step by step</h2></div><span class="tag tag-sec">${(window.CareerCurriculum.paths.find(x=>x.id===path.id)||{modules:[]}).modules.filter(m=>window.CareerCurriculum.isComplete(m.id)).length} / ${(window.CareerCurriculum.paths.find(x=>x.id===path.id)||{modules:[]}).modules.length} lessons</span></div><p class="dim small">Start with the foundations, learn what each technology does, practise a safe example, then check your understanding. Lesson progress is saved on this device.</p><div class="curriculum-tools"><label class="curriculum-search-label" for="curriculum-search">Find a lesson</label><input id="curriculum-search" class="curriculum-search" type="search" placeholder="Search concepts, e.g. subnetting, logs, HTTP…" autocomplete="off"><button class="btn btn-ghost btn-sm" id="export-learning-record">Export learning record</button></div><div class="curriculum-grid" id="curriculum-grid">${(window.CareerCurriculum.paths.find(x=>x.id===path.id)||{modules:[]}).modules.map((m,i)=>{const complete=window.CareerCurriculum.isComplete(m.id);const locked=i>0&&!window.CareerCurriculum.isComplete((window.CareerCurriculum.paths.find(x=>x.id===path.id)||{modules:[]}).modules[i-1].id);return `<article class="curriculum-card ${complete?'complete':''} ${locked?'locked':''}" data-lesson-search="${escapeHtml([m.title,...m.concepts,m.lesson,m.practical].join(' ').toLowerCase())}"><div class="curriculum-card-top"><span class="challenge-number">${complete?'✓':String(i+1).padStart(2,'0')}</span><span class="tag">${complete?'COMPLETED':locked?'LOCKED':'LESSON + QUIZ'}</span></div><h3>${m.title}</h3><p class="dim small">${m.concepts.slice(0,4).join(' · ')}${m.concepts.length>4?' …':''}</p><button class="btn ${complete?'btn-ghost':'btn-primary'}" data-module="${m.id}" ${locked?'disabled':''}>${complete?'Review lesson':'Study lesson →'}</button></article>`}).join('')}</div><p id="curriculum-no-results" class="dim small" hidden>No lessons match that search. Try a broader concept or clear the search.</p></section>
      <section class="academy-labs-after-curriculum"><div class="panel-title"><div><span class="eyebrow">HANDS-ON PRACTICE</span><h2>Practical simulated labs</h2></div></div><div class="academy-challenge-list">${path.challenges.map((c,i)=>{const complete=done.includes(c.id);const locked=i>0&&!done.includes(path.challenges[i-1].id);return `<article class="academy-challenge ${complete?'complete':''} ${locked?'locked':''}"><div class="challenge-number">${complete?'✓':String(i+1).padStart(2,'0')}</div><div class="challenge-copy"><div class="eyebrow">${c.kind} · ${c.minutes} MIN</div><h3>${c.title}</h3><p class="dim small">${c.brief}</p><small>${complete?'MASTERED':locked?'COMPLETE PREVIOUS LAB FIRST':c.xp+' mastery XP'}</small></div><button class="btn ${complete?'btn-ghost':'btn-primary'}" data-challenge="${c.id}" ${locked?'disabled':''}>${complete?'Review':'Start lab →'}</button></article>`}).join('')}</div></section>`;
    document.querySelectorAll('[data-challenge]').forEach(b=>b.onclick=()=>renderAcademyLab(path,b.dataset.challenge));
    document.querySelectorAll('[data-module]').forEach(b=>b.onclick=()=>renderCareerLesson(path,b.dataset.module));
    const search=$('#curriculum-search');
    if(search) search.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();let shown=0;document.querySelectorAll('[data-lesson-search]').forEach(card=>{const visible=!q||card.dataset.lessonSearch.includes(q);card.hidden=!visible;if(visible)shown++;});$('#curriculum-no-results').hidden=shown>0;});
    const exportButton=$('#export-learning-record');
    if(exportButton) exportButton.onclick=()=>{const curriculum=window.CareerCurriculum;const record=curriculum.getProgress();const all=curriculum.paths.flatMap(p=>p.modules.map(m=>({path:p.title,pathId:p.id,moduleId:m.id,title:m.title,completed:curriculum.isComplete(m.id),score:record.scores[m.id]||null,concepts:m.concepts})));const report={product:'CyberOps Career Academy',version:'8.3.1',generatedAt:new Date().toISOString(),learner:profile.username||'Learner',summary:{completed:all.filter(x=>x.completed).length,total:all.length,percentage:Math.round(all.filter(x=>x.completed).length/Math.max(1,all.length)*100)},lessons:all,disclaimer:'This report records local activity in a fictional educational simulation. It is not a certification or proof of professional experience.'};const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='cyberops-learning-record.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Learning record exported','ok');};
  }

  function renderCareerLesson(path,moduleId){
    const career=(window.CareerCurriculum.paths||[]).find(x=>x.id===path.id); const m=career&&career.modules.find(x=>x.id===moduleId); if(!m)return renderAcademy();
    const progress=window.CareerCurriculum.getProgress(); const prior=progress.scores[m.id];
    const concepts=m.concepts.map(c=>`<span class="concept-chip">${escapeHtml(c)}</span>`).join('');
    app.querySelector('#academy-main').innerHTML=`<button class="btn btn-ghost" id="lesson-back">← Back to ${escapeHtml(path.title)}</button><article class="career-lesson"><div class="eyebrow">${escapeHtml(path.title)} · MODULE ${m.level} OF ${career.modules.length}</div><h2>${escapeHtml(m.title)}</h2><div class="concept-list">${concepts}</div><section class="lesson-section"><h3>Understand the concept</h3><p>${escapeHtml(m.lesson)}</p></section><section class="lesson-section"><h3>Try it in the real world</h3><p>${escapeHtml(m.practical)}</p></section><section class="lesson-quiz"><div class="eyebrow">KNOWLEDGE CHECK</div><h3>${escapeHtml(m.question)}</h3><div class="lesson-options">${m.options.map((o,i)=>`<button class="lesson-option" data-answer="${i}">${String.fromCharCode(65+i)}. ${escapeHtml(o)}</button>`).join('')}</div><div id="lesson-feedback" class="hint-box" aria-live="polite">Choose the best answer. You can retry if needed.</div></section><div class="lesson-footer"><span class="dim small">${prior?(prior.correct?'Previously answered correctly':'Previous attempt incorrect'): 'Lesson complete when you answer correctly'}</span><button class="btn btn-primary" id="lesson-complete" disabled>Complete lesson ✓</button></div></article>`;
    document.querySelector('#lesson-back').onclick=()=>renderAcademy();
    document.querySelectorAll('[data-answer]').forEach(btn=>btn.onclick=()=>{const result=window.CareerCurriculum.answer(m.id,m.correct,Number(btn.dataset.answer));const feedback=document.querySelector('#lesson-feedback');if(result.correct){feedback.innerHTML=`<b>Correct — nice work.</b><p>${escapeHtml(m.explanation)}</p>`;document.querySelector('#lesson-complete').disabled=false;document.querySelectorAll('[data-answer]').forEach(x=>x.disabled=true);}else{feedback.innerHTML=`<b>Not quite. Try again.</b><p>Re-read the concept section and consider what each technology is responsible for. ${escapeHtml(m.explanation)}</p>`;}});
    document.querySelector('#lesson-complete').onclick=()=>{window.CareerCurriculum.complete(m.id);toast('Lesson completed','ok');renderAcademy();};
  }
  function renderAcademyLab(path, challengeId) {
    const challenge=path.challenges.find(c=>c.id===challengeId); if(!challenge)return renderAcademy();
    let history=[]; let hints=0; let state={...challenge.initial}; let failedCommands=0; let adaptiveLevel=0;
    const progress=Academy.getProgress(); const main=$('#academy-main');
    main.innerHTML=`<button class="btn btn-ghost" id="lab-back">← Path overview</button><div class="academy-path-hero"><div class="eyebrow">PRACTICAL LAB / ${challenge.kind.toUpperCase()}</div><h2>${challenge.title}</h2><p>${challenge.brief}</p></div><div class="lab-instructions"><b>Mission objectives</b><ol>${challenge.objectives.map(o=>`<li>${o.label}</li>`).join('')}</ol><p class="dim small">${challenge.lesson}</p></div><div class="lab-terminal"><div class="terminal-top"><span>operator@cyberops-lab</span><span>SIMULATED ENVIRONMENT · NO EXTERNAL NETWORK</span></div><pre id="academy-output" aria-live="polite">${challenge.welcome}
Type help to view available commands.
</pre><form id="academy-form"><label for="academy-command">operator@lab:~$</label><input id="academy-command" autocomplete="off" spellcheck="false" placeholder="Enter a lab command…"><button class="btn btn-green">Run</button></form></div><div class="academy-lab-controls"><button class="btn btn-ghost" id="lab-hint">Show hint (${challenge.hints.length})</button><button class="btn btn-ghost" id="lab-reset">Reset lab</button><button class="btn btn-primary" id="lab-check">Verify objectives</button></div><div id="academy-feedback" class="hint-box" aria-live="polite">Work through the objectives. Use help, inspect the environment and record evidence.</div>`;
    $('#lab-back').onclick=()=>renderAcademy();
    const out=$('#academy-output'); const form=$('#academy-form'); const input=$('#academy-command');
    const print=t=>{out.textContent+=`
${t}
`;out.scrollTop=out.scrollHeight;};
    form.onsubmit=e=>{e.preventDefault();const cmd=input.value.trim();if(!cmd)return;history.push(cmd);print(`operator@lab:~$ ${cmd}`);input.value='';const result=Academy.execute(challenge,cmd,state);state=result.state||state;print(result.output);if(result.ok){toast('Lab state updated','ok');adaptiveLevel=0;}else{failedCommands++;adaptiveLevel=Math.min(3,adaptiveLevel+1);} updateAdaptiveGuidance(result,cmd);};
    function escapeHint(value){return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\n/g,'<br>');}
    function missingState(){const keys=challenge.steps.flatMap(step=>Object.keys(step.set||{})).filter((key,i,all)=>all.indexOf(key)===i&&typeof challenge.initial[key]==='boolean');return keys.filter(key=>!state[key]);}
    function updateAdaptiveGuidance(result,cmd){const missing=missingState();let title='Next best step';let detail='';if(result&&result.ok){title='Good progress';detail='That command changed the lab state. Read its output carefully, then continue with the next unmet objective.';}else if(/help/i.test(cmd)){title='Using the command guide';detail='Compare the listed syntax with your command. Check spaces, paths, host names and argument order; this lab accepts only the documented simulated commands.';}else if(failedCommands>=2){title='Let’s troubleshoot the command';detail='Your last command was not accepted. Copy the command format from a hint exactly, check punctuation and spelling, and avoid adding options that the simulator does not list.';}else{detail='Inspect before changing anything. Use a read-only command first, then choose the smallest action that addresses the evidence.';}if(missing.length){const key=missing[0];const objIndex=Math.min(challenge.objectives.length-1,Math.max(0,challenge.steps.findIndex(step=>Object.keys(step.set||{}).includes(key))));detail+=` The next unmet state check is “${key.replace(/([A-Z])/g,' $1').replace(/[_-]/g,' ')}”; focus on objective ${objIndex+1}: ${challenge.objectives[objIndex]?.label||'continue the investigation'}.`; }$('#academy-feedback').innerHTML=`<b>🧭 ${title}</b><p>${escapeHint(detail)}</p><p class="dim small">Adaptive guidance uses your current simulated lab state. It points to the next missing check without automatically completing it.</p>`;}
    $('#lab-hint').onclick=()=>{const missing=missingState();if(hints>=challenge.hints.length){updateAdaptiveGuidance({ok:false,output:'review'},'review');return;}let index=hints; if(missing.length){const matching=challenge.steps.findIndex(step=>Object.keys(step.set||{}).some(key=>missing.includes(key)));if(matching>=0&&hints>0)index=Math.min(challenge.hints.length-1,Math.max(hints,Math.floor(matching/Math.max(1,challenge.steps.length)*challenge.hints.length)));}const h=challenge.hints[index];hints=Math.min(challenge.hints.length,hints+1);$('#academy-feedback').innerHTML=`<b>💡 Adaptive hint ${hints} of ${challenge.hints.length}</b><p class="academy-hint-detail">${escapeHint(h)}</p><p class="dim small">Based on your current progress, check the output and verify the next objective. Hints guide you; they do not complete the lab for you.</p>`;if(hints>=challenge.hints.length)$('#lab-hint').textContent='Adaptive guidance';};
    $('#lab-reset').onclick=()=>renderAcademyLab(path,challengeId);
    $('#lab-check').onclick=()=>{const result=Academy.verify(challenge,state);if(result.ok){const award=Academy.complete(challenge.id,challenge.xp);$('#academy-feedback').innerHTML=`<b>Lab verified — ${award.newlyCompleted?'mastery awarded':'already mastered'}.</b><p>${challenge.explanation}</p><p>+${award.newlyCompleted?challenge.xp:0} mastery XP</p>`;toast('Challenge verified','ok');}else{$('#academy-feedback').innerHTML=`<b>Not complete yet.</b><p>${result.message}</p>`;}};
    input.focus();
  }

  function renderEnterpriseLab() {
    const p = Game.get(); if (!p) return go('menu');
    const e = Game.getEnterpriseState();
    app.innerHTML = `<div class="enterprise-screen">
      <header class="enterprise-header"><div><div class="eyebrow">CYBEROPS / SIMULATED ENTERPRISE</div><h1>Operations Console</h1><p class="dim small">A persistent fictional company environment. No commands are sent to your operating system or real network.</p></div><button class="btn btn-ghost" id="enterprise-back">← Personnel Dashboard</button></header>
      <div class="enterprise-layout">
        <section class="dash-panel"><div class="panel-title"><div><span class="eyebrow">SERVICE HEALTH</span><h2>Business Services</h2></div><button class="btn btn-ghost btn-sm" data-enterprise-command="services">Refresh</button></div><div id="enterprise-services" class="enterprise-service-grid">${enterpriseServiceCards(e)}</div>
          <div class="panel-title" style="margin-top:22px"><div><span class="eyebrow">SERVICE DESK</span><h2>Open Tickets</h2></div><button class="btn btn-ghost btn-sm" data-enterprise-command="tickets">Refresh</button></div><div class="enterprise-ticket-list" id="enterprise-tickets">${enterpriseTicketCards(e)}</div>
          <div class="panel-title" style="margin-top:22px"><div><span class="eyebrow">CONNECTED ENVIRONMENT</span><h2>Device Inventory</h2></div><button class="btn btn-ghost btn-sm" data-enterprise-command="network">Inspect in terminal</button></div><div class="enterprise-device-list" id="enterprise-devices">${enterpriseDeviceCards(e)}</div>
        </section>
        <section class="dash-panel enterprise-console-panel"><div class="panel-title"><div><span class="eyebrow">COMMAND WORKSPACE</span><h2>Simulated Terminal</h2></div><span class="tag tag-net">SAFE MODE</span></div>
          <div class="enterprise-shortcuts"><button class="btn btn-ghost btn-sm" data-enterprise-command="company">company</button><button class="btn btn-ghost btn-sm" data-enterprise-command="network">network</button><button class="btn btn-ghost btn-sm" data-enterprise-command="services">services</button><button class="btn btn-ghost btn-sm" data-enterprise-command="tickets">tickets</button><button class="btn btn-ghost btn-sm" data-enterprise-command="logs">logs</button><button class="btn btn-ghost btn-sm" data-enterprise-command="changes">changes</button><button class="btn btn-ghost btn-sm" data-enterprise-command="history">history</button><button class="btn btn-ghost btn-sm" data-enterprise-command="commands">real commands</button></div>
          <div class="enterprise-terminal" id="enterprise-output" role="log" aria-live="polite"><div class="ln sys">CYBEROPS CONNECTED ENTERPRISE + REAL COMMAND LAB v6.0</div><div class="ln sys">Type help for enterprise commands or commands for real-world command syntax. Try connect ws-01, ipconfig /all, then connect sw-01 and show ip interface brief.</div><div class="ln warn">Training environment only · fictional data</div></div>
          <form id="enterprise-form" class="enterprise-input-row"><span class="mono">operator@cyberops:~$</span><input id="enterprise-input" class="input mono" autocomplete="off" spellcheck="false" aria-label="Simulated terminal command" placeholder="type a command…"><button class="btn btn-green" type="submit">Run</button></form>
          <div class="enterprise-help"><b>Useful workflow</b><p class="dim small">Try &quot;commands&quot; for the real-syntax lab. Example: &quot;connect ws-01&quot; then &quot;ipconfig /all&quot;; connect to sw-01 and run &quot;show ip interface brief&quot;. Then investigate tickets, change simulated state, verify and review logs. No host shell or real network is accessed.</p></div>
        </section>
      </div>
      <div class="dashboard-footer"><span>◈ CYBEROPS ULTIMATE / ENTERPRISE LAB</span><span>All targets and outputs are fictional</span></div>
    </div>`;
    $('#enterprise-back').onclick = () => go('hub');
    const output = $('#enterprise-output'), input = $('#enterprise-input');
    const ctx = { enterpriseConsole: true, mission: { terminal: { commands: ['help','company','whoami','services','service','verify','network','devices','device','diagnose','scenario','tickets','ticket','resolve','logs','changes','change','history','route','netstat','tracert','arp'] } }, net: null, activeDeviceId: null, run: { flags: {}, hosts: [], logs: [], alerts: [] } };
    const history = []; let historyIndex = 0;
    function runCommand(raw) {
      if (!raw.trim()) return;
      history.push(raw); historyIndex = history.length;
      appendEnterpriseLine('$ ' + raw, 'in');
      const result = Sim.exec(raw, ctx);
      if (result.clear) output.innerHTML = '';
      (result.lines || []).forEach(line => appendEnterpriseLine(line.text, line.cls));
      if (!result.lines || !result.lines.length) appendEnterpriseLine('Command completed.', 'sys');
      if (result.flags) Object.assign(ctx.run.flags, result.flags);
      const latest = Game.getEnterpriseState();
      const svc = $('#enterprise-services'), tickets = $('#enterprise-tickets'), devices = $('#enterprise-devices');
      if (svc) svc.innerHTML = enterpriseServiceCards(latest);
      if (tickets) tickets.innerHTML = enterpriseTicketCards(latest);
      if (devices) devices.innerHTML = enterpriseDeviceCards(latest);
      output.scrollTop = output.scrollHeight;
    }
    function appendEnterpriseLine(text, cls) { const el = document.createElement('div'); el.className = 'ln ' + (cls || 'sys'); el.textContent = String(text == null ? '' : text); output.appendChild(el); }
    $('#enterprise-form').onsubmit = ev => { ev.preventDefault(); runCommand(input.value); input.value = ''; input.focus(); };
    input.addEventListener('keydown', ev => {
      ev.stopPropagation();
      if (ev.key === 'ArrowUp') { ev.preventDefault(); if (history.length) { historyIndex = Math.max(0, historyIndex - 1); input.value = history[historyIndex] || ''; } }
      else if (ev.key === 'ArrowDown') { ev.preventDefault(); historyIndex = Math.min(history.length, historyIndex + 1); input.value = history[historyIndex] || ''; }
    });
    document.querySelectorAll('[data-enterprise-command]').forEach(button => button.onclick = () => { runCommand(button.dataset.enterpriseCommand); input.focus(); });
    input.focus();
  }

  function enterpriseServiceCards(e) {
    return Object.entries((e && e.services) || {}).map(([name,status]) => `<div class="enterprise-service"><span class="service-dot ${status === 'up' ? 'online' : 'offline'}"></span><div><b>${escapeHtml(name)}</b><small>${String(status).toUpperCase()}${e.verified && e.verified[name] ? ' · VERIFIED' : ''}</small></div></div>`).join('') || '<p class="dim small">No service records available.</p>';
  }
  function enterpriseTicketCards(e) {
    const list = ((e && e.tickets) || []).filter(t => t.status !== 'CLOSED');
    return list.map(t => `<div class="enterprise-ticket"><div><b>${escapeHtml(t.id)} · ${escapeHtml(t.title)}</b><small>${escapeHtml(t.team)} · ${escapeHtml(t.status)}</small></div><span class="tag ${t.priority === 'HIGH' ? 'tag-sec' : 'tag-net'}">${escapeHtml(t.priority)}</span></div>`).join('') || '<p class="dim small">No open tickets.</p>';
  }
  function enterpriseDeviceCards(e) {
    return ((e && e.devices) || []).map(d => `<div class="enterprise-device-row"><span class="service-dot ${d.status === 'up' ? 'online' : 'offline'}"></span><div><b>${escapeHtml(d.id)} · ${escapeHtml(d.name)}</b><small>${escapeHtml(d.ip)} · ${escapeHtml(d.segment)}</small></div><span class="device-state">${escapeHtml(d.status.toUpperCase())}</span></div>`).join('') || '<p class="dim small">No device inventory available.</p>';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  window.__openMissionBoard = function(path) {
    const p = Game.get();
    if (p.careerPath !== path) return alert("ACCESS DENIED. You are on the " + p.careerPath + " path.");
    go('hub'); // Reset route to clear timers
    app.innerHTML = `
      <div class="main" style="height:100vh; overflow-y:auto;">
        <button class="btn btn-ghost" id="back-hub" style="position:sticky; top:20px; z-index:10;">← Back to Hub</button>
        <h2 style="margin-top:20px">${path.toUpperCase()} Assignments</h2>
        <div class="mission-grid" style="margin-top:20px; padding-bottom:50px;">
          ${window.MISSIONS.filter(m => m.path === path).map(m => {
            const unlocked = Game.isUnlocked(m.id);
            const done = Game.get().completed[m.id];
            return `<div class="mission-card" style="opacity:${unlocked ? 1 : 0.5}">
              <h3>${m.title}</h3><p class="dim" style="font-size:12px">${m.tagline}</p>
              ${done ? `<span class="tag tag-done">✓ Completed</span>` : unlocked ? `<button class="btn btn-primary" data-start="${m.id}">Start</button>` : `<span class="tag" style="background:#333;">🔒 Locked</span>`}
            </div>`;
          }).join('')}
        </div>
      </div>`;
    $('#back-hub').onclick = () => go('hub');
    document.querySelectorAll('[data-start]').forEach(b => b.onclick = () => startMission(b.dataset.start));
  };

  function campaignChallengeFor(m) {
    const state = Game.getCampaignState ? Game.getCampaignState() : { lastDecision: null };
    const flag = state.lastDecision;
    const available = (m.terminal && m.terminal.commands) || [];
    const plans = {
      'evidence-first': { label: 'Evidence before conclusions', description: 'Carry the evidence-first decision into this assignment by reviewing the available records.', preferences: ['logs', 'alerts', 'ipconfig', 'osint', 'scan'], key: 'cmd:' },
      'rapid-containment': { label: 'Validate the current state', description: 'After a rapid-containment decision, verify the current state before declaring the work complete.', preferences: ['status', 'ipconfig', 'alerts', 'scan', 'osint'], key: 'cmd:' },
      'joint-response': { label: 'Build a shared operational picture', description: 'Use one relevant diagnostic view so the next hand-off is based on observed facts.', preferences: ['logs', 'alerts', 'ipconfig', 'osint', 'scan'], key: 'cmd:' },
      'scope-verified': { label: 'Keep the work reproducible and in scope', description: 'Repeat a documented, in-scope observation before writing the next hand-off.', preferences: ['scan', 'osint', 'ipconfig', 'logs', 'alerts'], key: 'cmd:' },
      'service-first': { label: 'Verify after restoring service', description: 'A service-first response needs a follow-up check to make sure the situation is understood.', preferences: ['ipconfig', 'status', 'logs', 'alerts', 'osint', 'scan'], key: 'cmd:' }
    };
    const plan = plans[flag];
    if (!plan) return null;
    const command = plan.preferences.find(c => available.includes(c));
    if (!command) return null;
    return { flag, command, key: plan.key + command, label: plan.label, description: plan.description };
  }

  function startMission(id) {
    const m = window.MISSIONS.find(x => x.id === id);
    if (!m) return toast('Mission could not be found. Return to the mission board and try again.', 'err');
    const challenge = campaignChallengeFor(m);
    App.run = { mission: m, ...m.setup(), flags: {}, hintsUsed: 0, selectedDevice: m.terminal.device, timeLeft: m.timeLimit, campaignChallenge: challenge, challengeAwarded: false };
    go('mission');
  }

  function renderMission() {
    const r = App.run; const m = r.mission;
    const currentPlayer = Game.get(); if (currentPlayer) applyCareerTheme(currentPlayer.careerPath);
    app.innerHTML = `
      <div class="mission">
        <div class="mtop">
          <button class="btn btn-ghost btn-sm" onclick="window.__go('hub')">Quit</button>
          <b>${m.title}</b>
          <div style="flex:1"></div>
          <div class="timer" id="timer">${r.timeLeft}s</div>
          <button class="btn btn-ghost btn-sm" id="hint-btn">💡 Hint (${r.hintsUsed})</button>
        </div>
        <div class="mgrid">
          <div class="col">
            <div class="panel"><div class="panel-head">Objectives</div><div class="panel-body" id="objs"></div></div>
            <div class="panel"><div class="panel-head">Incident Scenario</div><div class="panel-body scenario-body"><div class="scenario-role">ROLE: ${escapeHtml(m.track || currentPlayer?.careerPath || 'Operator')}</div><p>${escapeHtml(m.story || m.tagline || 'A new assignment is waiting.')}</p><p class="dim">${escapeHtml(m.briefing || 'Investigate the available evidence and complete the objectives.')}</p>${r.campaignChallenge ? `<div class="campaign-challenge"><span class="eyebrow">ADAPTIVE CAMPAIGN CHALLENGE · BONUS +5</span><b>${escapeHtml(r.campaignChallenge.label)}</b><p>${escapeHtml(r.campaignChallenge.description)}</p><small>Optional check: run <code>${escapeHtml(r.campaignChallenge.command)}</code>. It will not block mission completion.</small></div>` : ''}<div class="scenario-tip"><b>How to approach it</b><br>Observe first, test one hypothesis at a time, and use the objectives as your checklist. Hints guide your thinking without replacing the investigation.</div><div class="scenario-scope">AUTHORIZED SIMULATION · Work only within the fictional lab scope.</div></div></div>
          </div>
          <div class="col" id="workspace"></div>
          <div class="col">
            <div class="term">
              <div class="term-out" id="t-out"></div>
              <div class="term-in"><span class="mono" style="color:var(--green); margin-right:10px">$</span><input class="term-input" id="t-in" autocomplete="off"></div>
            </div>
          </div>
        </div>
      </div>`;
   
    renderWorkspace();
   
    // Start Timer
    App.timerInterval = setInterval(() => {
      r.timeLeft--;
      const t = $('#timer'); if(!t) return;
      t.textContent = `${r.timeLeft}s`;
      if (r.timeLeft <= 10) t.classList.add('danger');
      if (r.timeLeft <= 0 && App.route === 'mission' && App.run === r) { clearInterval(App.timerInterval); go('fail'); }
    }, 1000);

    $('#hint-btn').onclick = () => {
      if (r.hintsUsed < m.hints.length) {
        r.hintsUsed++;
        $('#hint-btn').textContent = `💡 Hint (${r.hintsUsed})`;
        $('#workspace').insertAdjacentHTML('afterbegin', `<div class="hint-box mission-hint-card"><b>💡 Investigation hint ${r.hintsUsed} of ${m.hints.length}</b><p>${escapeHtml(m.hints[r.hintsUsed - 1])}</p><p class="dim small">Work through one check at a time: collect evidence, compare it with the scenario, then choose the action supported by the evidence. If you're stuck, use the terminal's <code>help</code> command and inspect the available devices, alerts, or logs before changing state.</p></div>`);
        playSound('error'); // Small beep for using a hint
      } else toast('No more hints.', 'err');
    };

    const terminalInput = $('#t-in');
    const setGameKeyboardEnabled = enabled => {
      const keyboard = window.phaserGame && window.phaserGame.input && window.phaserGame.input.keyboard;
      if (keyboard) keyboard.enabled = enabled;
    };
    terminalInput.addEventListener('focus', () => setGameKeyboardEnabled(false));
    terminalInput.addEventListener('blur', () => { if (App.route !== 'mission') return; setGameKeyboardEnabled(true); });
    terminalInput.addEventListener('keydown', e => {
      // Keep Phaser's movement controls from swallowing text while the terminal is focused.
      e.stopPropagation();
      if (e.key === 'Enter') {
        const v = e.target.value; e.target.value = '';
        const entered = document.createElement('div'); entered.className = 'ln in'; entered.textContent = '$ ' + v; $('#t-out').appendChild(entered);
       
        // Simulate typing delay
        const res = Sim.exec(v, { net: r.net, activeDeviceId: r.selectedDevice, mission: m, run: r });
        if (res.clear) $('#t-out').innerHTML = '';
       
        let delay = 0;
        if (res.lines) res.lines.forEach(l => {
          setTimeout(() => {
            const output = $('#t-out');
            if (!output || App.run !== r || App.route !== 'mission') return;
            const line = document.createElement('div');
            line.className = 'ln ' + (l.cls || '');
            line.textContent = String(l.text == null ? '' : l.text);
            output.appendChild(line);
            output.scrollTop = output.scrollHeight;
            playSound('type');
          }, delay);
          delay += 150; // 150ms per line
        });
       
        if (res.flags) { Object.assign(r.flags, res.flags); setTimeout(() => { if (App.run === r && App.route === 'mission') { renderWorkspace(); checkObjs(); } }, delay); }
      }
    });
    terminalInput.focus();
    setGameKeyboardEnabled(false);
    checkObjs();
  }

  function renderWorkspace() {
    const r = App.run; const m = r.mission;
    const ws = $('#workspace'); if (!ws) return;
    let html = '';

    if (r.net) {
      html += `<div class="panel" style="margin-bottom:12px"><div class="panel-head">Topology (Click Devices)</div><div class="panel-body" id="topo">${topoSvg(r.net)}</div></div>`;
      html += `<div class="panel"><div class="panel-head">Device Config</div><div class="panel-body" id="devcfg">${deviceConfigHtml(r)}</div></div>`;
    }
    if (m.analysis) {
      const evidenceAlert = (r.alerts || [])[0];
      const evidenceSteps = evidenceAlert ? [
        { flag: 'cmd:alerts', label: 'Review the alert queue with `alerts`' },
        { flag: 'cmd:logs', label: 'Correlate event records with `logs`' },
        { flag: 'inspect:' + evidenceAlert.id, label: `Inspect ${evidenceAlert.id} with \`inspect ${evidenceAlert.id}\`` }
      ] : [];
      html += `<div class="panel" style="margin-bottom:12px"><div class="panel-head">${m.analysis.title}</div><div class="panel-body">
        ${evidenceSteps.length ? `<div class="field-note" style="margin-bottom:12px"><b>Evidence checklist</b><p class="dim small">A professional finding needs evidence before a verdict. Collect all three items in the simulated terminal first.</p>${evidenceSteps.map(x => `<div class="small" style="margin-top:6px">${r.flags[x.flag] ? '✓' : '○'} ${x.label}</div>`).join('')}</div>` : ''}
        <form id="af">${m.analysis.fields.map(f => `<div class="field"><label>${f.label}</label><select class="input" id="af-${f.key}">${f.options.map(o => `<option>${o}</option>`).join('')}</select></div>`).join('')}
        <button class="btn btn-primary" type="submit">Submit Finding</button></form><div id="af-msg" style="margin-top:10px"></div></div></div>`;
    }
    ws.innerHTML = html;

    ws.querySelectorAll('[data-dev]').forEach(el => el.onclick = () => { App.run.selectedDevice = el.dataset.dev; renderWorkspace(); });
    const form = $('#af');
    if (form) form.onsubmit = e => { e.preventDefault(); submitAnalysis(); };
    bindConfig();
  }

  function topoSvg(net) {
    return `<div style="display:flex; gap:10px; flex-wrap:wrap;">${Object.values(net.devices).map(d => `
      <div class="node ${App.run.selectedDevice === d.id ? 'sel' : ''} ${Object.values(d.ifaces)[0].up ? 'up' : 'down'}" data-dev="${d.id}">
        <b>${d.name}</b><br><small>${Object.values(d.ifaces)[0].ip || 'Layer 2'}</small>
      </div>`).join('')}</div>`;
  }

  function deviceConfigHtml(r) {
    const dev = r.net.devices[r.selectedDevice]; if (!dev) return '<p class="dim">Select a device from the topology.</p>';
    const i = Object.values(dev.ifaces)[0];
    return `<div class="devcfg">
      <h4 style="margin-bottom:10px">${dev.name}</h4>
      <form id="cfg-form">
        <label class="muted" style="font-size:12px">IP Address</label><input class="input mono" name="ip" value="${i.ip || ''}">
        <label class="muted" style="font-size:12px">Subnet Mask</label><input class="input mono" name="mask" value="${i.mask || ''}">
        <label class="muted" style="font-size:12px">Gateway</label><input class="input mono" name="gw" value="${i.gateway || ''}">
        <label class="muted" style="font-size:12px">DNS</label><input class="input mono" name="dns" value="${i.dns || ''}">
        <button class="btn btn-green btn-sm" type="submit">Apply Config</button>
      </form></div>`;
  }

  function bindConfig() {
    const form = $('#cfg-form'); if (!form) return;
    form.onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(form); const dev = App.run.net.devices[App.run.selectedDevice]; const i = Object.values(dev.ifaces)[0];
      if (!Sim.isValidIp(fd.get('ip'))) { playSound('error'); return toast('Invalid IP Format', 'err'); }
      i.ip = fd.get('ip'); i.mask = fd.get('mask'); i.gateway = fd.get('gw'); i.dns = fd.get('dns');
      playSound('success'); toast('Configuration applied', 'ok'); renderWorkspace(); checkObjs();
    };
  }

  function submitAnalysis() {
    const r = App.run, m = r.mission;
    const alert = (r.alerts || [])[0];
    const required = alert ? ['cmd:alerts', 'cmd:logs', 'inspect:' + alert.id] : [];
    const missing = required.filter(flag => !r.flags[flag]);
    if (missing.length) {
      const message = 'Finding not accepted yet. Review alerts, correlate logs, and inspect the alert details before submitting a verdict.';
      $('#af-msg').innerHTML = `<div class="hint-box" style="color:#fbbf24">${message}</div>`;
      playSound('error');
      return;
    }
    const val = {}; m.analysis.fields.forEach(f => val[f.key] = $(`#af-${f.key}`).value);
    const res = m.evaluateAnalysis(val);
    $('#af-msg').innerHTML = `<div class="hint-box" style="color:${res.ok ? '#3ddc97' : '#f87171'}">${res.message}</div>`;
    if (res.ok) { r.flags['classified'] = true; playSound('success'); checkObjs(); }
    else playSound('error');
  }

  function checkObjs() {
    const r = App.run; const m = r.mission;
    let allDone = true;
    $('#objs').innerHTML = m.objectives.map(o => {
      const done = o.check(r); if (!done) allDone = false;
      return `<div class="obj ${done ? 'done' : ''}"><div class="box">${done ? '✓' : ''}</div><span class="txt">${o.text}</span></div>`;
    }).join('');
    if (r.campaignChallenge) {
      const done = !!r.flags[r.campaignChallenge.key];
      r.challengeAwarded = done;
      $('#objs').insertAdjacentHTML('beforeend', `<div class="obj campaign-objective ${done ? 'done' : ''}"><div class="box">${done ? '✓' : '＋'}</div><span class="txt"><b>Bonus · ${escapeHtml(r.campaignChallenge.label)}</b><small>${done ? 'Campaign challenge complete · +5 assessment points' : `Optional: run ${escapeHtml(r.campaignChallenge.command)} to complete this check`}</small></span></div>`);
    }
    if (allDone && !r.finished) {
      r.finished = true;
      if (App.timerInterval) clearInterval(App.timerInterval);
      const baseScore = Math.max(50, 100 - (r.hintsUsed * 10));
      const bonus = r.challengeAwarded ? 5 : 0;
      const score = Math.min(100, baseScore + bonus);
      const award = Game.completeMission(m, { score, xp: m.xp, challengeAwarded: !!r.challengeAwarded, challengeLabel: r.campaignChallenge && r.campaignChallenge.label, bonus });
      playSound('success');
      setTimeout(() => go('results', { m, xp: award.xp, score, baseScore, bonus, challengeLabel: r.campaignChallenge && r.campaignChallenge.label, challengeAwarded: !!r.challengeAwarded, firstCompletion: award.first, rank: award.rank, reputation: award.reputation, reputationChange: award.reputationChange }), 800);
    }
  }

  function renderResults(data) {
    const p = Game.get();
    const alreadyDecided = !!(p && p.campaignFlags && p.campaignFlags.decisions && p.campaignFlags.decisions[data.m.id]);
    const options = data.m.path === 'networking' ? [
      ['communicate','Coordinate a joint response','Share the timeline with the SOC and research teams before changing more systems.'],
      ['restore_fast','Restore service quickly','Prioritise availability, then document the remaining investigation work.']
    ] : data.m.path === 'cybersecurity' ? [
      ['evidence_first','Preserve evidence first','Capture relevant logs and timestamps before taking containment action.'],
      ['contain_fast','Contain immediately','Reduce potential harm now, then record any evidence gaps for the review.'],
      ['communicate','Coordinate a joint response','Align the NOC, SOC, and research teams around one incident timeline.']
    ] : [
      ['validate_scope','Validate scope and document','Confirm authorisation, record minimal evidence, and provide a reproducible report.'],
      ['communicate','Coordinate a joint response','Share the finding with defenders and infrastructure owners for safe remediation.']
    ];
    const campaign = Game.getCampaignState ? Game.getCampaignState() : { lastDecision: null, relationships: {} };
    const missionDecision = p && p.campaignFlags && p.campaignFlags.decisions && p.campaignFlags.decisions[data.m.id];
    const decisionFlag = missionDecision ? missionDecision.flag : campaign.lastDecision;
    const decisionFeedback = decisionFlag === 'evidence-first' ? 'The team has a stronger evidence trail for the next incident.' : decisionFlag === 'rapid-containment' ? 'The next review will pay extra attention to missing context.' : decisionFlag === 'joint-response' ? 'Cross-team coordination is improving.' : decisionFlag === 'scope-verified' ? 'Your lab notes reinforce a scope-first culture.' : decisionFlag === 'service-first' ? 'The next review will ask for more supporting evidence.' : 'Your first incident decision will influence how the team responds.';
    app.innerHTML = `<div class="menu-screen"><div class="eyebrow">FIELD REPORT / ASSIGNMENT CLOSED</div><h1>Mission Complete</h1><p class="dim">Rating: ${data.score}% | ${data.xp ? '+' + data.xp + ' XP earned' : 'Replay recorded · no duplicate XP'} | Reputation ${data.reputationChange > 0 ? '+' : ''}${data.reputationChange || 0} (${data.reputation ?? 50}/100)</p>${data.baseScore != null ? `<div class="hint-box assessment-breakdown"><b>Assessment breakdown</b><p class="dim small">Core performance: ${data.baseScore}% · Adaptive challenge: ${data.challengeAwarded ? '+5 bonus points' : 'not completed'}${data.challengeLabel ? ` — ${escapeHtml(data.challengeLabel)}` : ''}.</p></div>` : ''}<div class="card" style="max-width:680px;text-align:left;line-height:1.6"><b>Debrief</b><p>${escapeHtml(data.m.debrief)}</p><hr><b>Current in-game rank</b><p>${escapeHtml(data.rank || (p && Game.rankFor(p.xp, p.careerPath)))}</p><p class="dim small">Training simulation result — not a real-world certification or proof of professional experience.</p></div>
      <div class="card decision-card" style="max-width:680px;margin-top:14px;text-align:left"><div class="eyebrow">INCIDENT REVIEW / CONSEQUENCES</div><h2>What should the team do next?</h2><p class="dim">This is a professional judgement choice. It will affect your team relationships and future campaign briefings. Each mission's decision can be recorded once.</p>${alreadyDecided ? `<div class="hint-box">Decision recorded: <b>${escapeHtml(p.campaignFlags.decisions[data.m.id].label)}</b><p class="dim small">${escapeHtml(decisionFeedback)}</p></div>` : `<div class="decision-options">${options.map(([id,title,desc]) => `<button class="decision-option" data-decision="${id}"><b>${title}</b><span>${desc}</span></button>`).join('')}</div><div id="decision-feedback" class="dim small" aria-live="polite"></div>`}<div class="relationship-mini"><b>Team trust</b><span>Dana ${Number(campaign.relationships.Dana)||0} · Alex ${Number(campaign.relationships.Alex)||0} · Zero ${Number(campaign.relationships.Zero)||0} · Nadia ${Number(campaign.relationships.Nadia)||0}</span></div></div>
      <button class="btn btn-primary" style="margin-top:20px" id="results-return">Return to Hub →</button></div>`;
    document.querySelectorAll('[data-decision]').forEach(button => button.addEventListener('click', () => {
      const result = Game.recordDecision(data.m.id, button.dataset.decision);
      const feedback = $('#decision-feedback');
      if (!result.ok) { if (feedback) feedback.textContent = result.message; return; }
      document.querySelectorAll('[data-decision]').forEach(b => { b.disabled = true; b.style.opacity = '.55'; });
      if (feedback) { feedback.textContent = result.message + ' Your choice is saved to this profile.'; feedback.className = 'hint-box'; }
      toast('Incident decision recorded.', 'ok');
    }));
    $('#results-return').onclick = () => go('hub');
  }

  function renderFail() {
    playSound('error');
    app.innerHTML = `<div class="menu-screen"><h1 style="color:var(--red)">MISSION FAILED</h1><p class="dim">You ran out of time.</p><button class="btn btn-primary" style="margin-top:20px" onclick="window.__go('hub')">Return to Hub</button></div>`;
  }

  document.addEventListener('DOMContentLoaded', () => go('menu'));
})();