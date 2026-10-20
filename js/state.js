/* ============================================================
   state.js — player data, save/load, XP, ranks, achievements.
   localStorage data is treated as untrusted.
   ============================================================ */
window.Game = (function () {
  'use strict';
  const KEY = 'cyberops.save.v1';
  const VERSION = 1;

  const RANKS = [
    { xp: 0,    net: 'IT Trainee',              sec: 'SOC Trainee' },
    { xp: 250,  net: 'Junior Network Tech',     sec: 'Junior Security Analyst' },
    { xp: 650,  net: 'Network Specialist',      sec: 'Security Specialist' },
    { xp: 1300, net: 'Senior Network Engineer', sec: 'Senior Security Analyst' },
    { xp: 2400, net: 'Network Team Lead',       sec: 'SOC Team Lead' }
  ];

  const ACHIEVEMENTS = {
    first_mission:   { name: 'First Day',        desc: 'Complete your first mission.',              icon: '★' },
    net_certified:   { name: 'Connected',        desc: 'Complete every networking mission.',        icon: '⇄' },
    sec_certified:   { name: 'Blue & Red',       desc: 'Complete every cybersecurity mission.',     icon: '◈' },
    no_hints:        { name: 'Unassisted',       desc: 'Complete a mission without using a hint.',  icon: '✦' },
    perfect:         { name: 'Flawless',         desc: 'Finish a mission with a perfect score.',    icon: '⬢' },
    recon_master:    { name: 'Recon Master',     desc: 'Discover every host in the recon lab.',     icon: '◎' }
  };

  let player = null;

  /* ---------- defaults ---------- */
  function blank() {
    return {
      version: VERSION,
      username: '',
      avatarId: 'av-1',
      outfitId: 'of-1',
      careerPath: 'networking',
      xp: 0,
      skills: { networking: 0, troubleshooting: 0, security: 0, offense: 0, analysis: 0 },
      completed: {},          // missionId -> {score, rating, at}
      unlocked: [],           // missionIds explicitly unlocked
      achievements: [],
      history: [],
      settings: { reducedMotion: false },
      createdAt: Date.now()
    };
  }

  /* ---------- validation ---------- */
  function sanitize(raw) {
    const d = blank();
    if (!raw || typeof raw !== 'object') return d;

    const str = (v, fb, max) => (typeof v === 'string' && v.length && v.length <= max ? v : fb);
    d.version = VERSION;
    d.username = str(raw.username, '', 24);
    d.avatarId = str(raw.avatarId, 'av-1', 16);
    d.outfitId = str(raw.outfitId, 'of-1', 16);
    d.careerPath = raw.careerPath === 'cybersecurity' ? 'cybersecurity' : 'networking';
    d.xp = Number.isFinite(raw.xp) ? Math.max(0, Math.min(raw.xp, 999999)) : 0;

    if (raw.skills && typeof raw.skills === 'object') {
      Object.keys(d.skills).forEach(k => {
        const v = raw.skills[k];
        d.skills[k] = Number.isFinite(v) ? Math.max(0, Math.min(v, 9999)) : 0;
      });
    }

    if (raw.completed && typeof raw.completed === 'object') {
      Object.keys(raw.completed).forEach(mid => {
        const c = raw.completed[mid];
        if (c && typeof c === 'object' && Number.isFinite(c.score)) {
          d.completed[mid] = { score: Math.max(0, Math.min(100, c.score)), rating: str(c.rating, '—', 4), at: Number(c.at) || Date.now() };
        }
      });
    }
    if (Array.isArray(raw.unlocked)) d.unlocked = raw.unlocked.filter(x => typeof x === 'string').slice(0, 200);
    if (Array.isArray(raw.achievements)) d.achievements = raw.achievements.filter(x => typeof x === 'string' && ACHIEVEMENTS[x]).slice(0, 50);
    if (Array.isArray(raw.history)) {
      d.history = raw.history.slice(-50).map(h => ({
        id: String(h && h.id || ''), title: String(h && h.title || ''), score: Number(h && h.score) || 0, at: Number(h && h.at) || 0
      }));
    }
    if (raw.settings && typeof raw.settings === 'object') {
      d.settings.reducedMotion = !!raw.settings.reducedMotion;
    }
    d.createdAt = Number(raw.createdAt) || Date.now();
    return d;
  }

  /* ---------- persistence ---------- */
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== VERSION) return null;
      const p = sanitize(parsed);
      return p.username ? p : null;
    } catch (e) {
      console.warn('[CyberOps] Save data could not be read:', e);
      return null;
    }
  }
  function save() {
    if (!player) return false;
    try {
      localStorage.setItem(KEY, JSON.stringify(player));
      return true;
    } catch (e) {
      console.warn('[CyberOps] Save failed (storage full or blocked):', e);
      return false;
    }
  }
  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    player = null;
  }
  function hasSave() { return !!load(); }

  /* ---------- accessors ---------- */
  function get() { return player; }
  function create(cfg) {
    player = blank();
    player.username = String(cfg.username || 'Operator').slice(0, 24);
    player.avatarId = cfg.avatarId;
    player.outfitId = cfg.outfitId;
    player.careerPath = cfg.careerPath;
    save();
    return player;
  }

  /* ---------- progression ---------- */
  function rankFor(xp, path) {
    let r = RANKS[0];
    for (const k of RANKS) if (xp >= k.xp) r = k;
    return path === 'cybersecurity' ? r.sec : r.net;
  }
  function rankProgress(xp) {
    let idx = 0;
    RANKS.forEach((r, i) => { if (xp >= r.xp) idx = i; });
    const cur = RANKS[idx], next = RANKS[idx + 1];
    if (!next) return { pct: 100, next: null, need: 0 };
    const span = next.xp - cur.xp;
    return { pct: Math.min(100, Math.round(((xp - cur.xp) / span) * 100)), next, need: next.xp - xp };
  }

  function isUnlocked(missionId) {
    const m = window.MISSIONS.find(x => x.id === missionId);
    if (!m) return false;
    if (player.completed[missionId]) return true;
    if (player.unlocked.indexOf(missionId) !== -1) return true;
    if (m.path !== player.careerPath) return false;
    if (!m.requires || !m.requires.length) return true;
    return m.requires.every(r => !!player.completed[r]);
  }

  function completeMission(mission, result) {
    const first = !player.completed[mission.id];
    player.completed[mission.id] = { score: result.score, rating: result.rating, at: Date.now() };
    if (first) player.xp += result.xp;
    else player.xp += Math.round(result.xp * 0.25); // replay: reduced XP, no double-dipping

    // skills
    const gains = mission.skillGains || {};
    Object.keys(gains).forEach(k => {
      if (k in player.skills) player.skills[k] += first ? gains[k] : Math.ceil(gains[k] / 4);
    });

    player.history.push({ id: mission.id, title: mission.title, score: result.score, at: Date.now() });
    if (player.history.length > 50) player.history = player.history.slice(-50);

    // unlock next
    window.MISSIONS.forEach(m => {
      if (m.path === player.careerPath && m.requires && m.requires.indexOf(mission.id) !== -1) {
        if (player.unlocked.indexOf(m.id) === -1) player.unlocked.push(m.id);
      }
    });

    // achievements
    const grant = id => { if (player.achievements.indexOf(id) === -1) player.achievements.push(id); };
    grant('first_mission');
    if (result.score >= 100) grant('perfect');
    if (result.hintsUsed === 0) grant('no_hints');
    const netIds = window.MISSIONS.filter(m => m.path === 'networking').map(m => m.id);
    const secIds = window.MISSIONS.filter(m => m.path === 'cybersecurity').map(m => m.id);
    if (netIds.every(id => player.completed[id])) grant('net_certified');
    if (secIds.every(id => player.completed[id])) grant('sec_certified');
    if (result.flags && result.flags['discovered:10.20.30.22']) grant('recon_master');

    save();
    return player;
  }

  function setSetting(k, v) { player.settings[k] = v; save(); }
  function setCareer(path) { player.careerPath = path; save(); }

  return {
    RANKS, ACHIEVEMENTS,
    load, save, reset, hasSave, get, create,
    rankFor, rankProgress, isUnlocked, completeMission,
    setSetting, setCareer
  };
})();