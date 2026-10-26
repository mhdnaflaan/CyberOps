window.Game = (function () {
  const KEY = 'cyberops.premium';
  // Five-stage career ladder for each track. These are in-game ranks, not real credentials.
  const RANKS = [
    { xp: 0,    networking: 'IT Trainee',       cybersecurity: 'Security Trainee',       hacker: 'Security Lab Trainee' },
    { xp: 300,  networking: 'Junior Network Technician', cybersecurity: 'Junior SOC Analyst', hacker: 'Junior Security Tester' },
    { xp: 700,  networking: 'Network Engineer', cybersecurity: 'SOC Analyst',           hacker: 'Penetration Tester' },
    { xp: 1200, networking: 'Senior Network Engineer', cybersecurity: 'Senior SOC Analyst', hacker: 'Senior Penetration Tester' },
    { xp: 2000, networking: 'Network Architect', cybersecurity: 'Incident Response Specialist', hacker: 'Security Consultant' }
  ];
  let player = null;

  function load() {
    try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.username) { player = d; player.reputation = Number.isFinite(player.reputation) ? player.reputation : 50; player.skills = player.skills || { networking: 0, security: 0, hacking: 0 }; player.completed = player.completed || {}; player.history = Array.isArray(player.history) ? player.history : []; player.campaignFlags = player.campaignFlags || {}; player.campaignFlags.decisions = player.campaignFlags.decisions || {}; player.relationships = player.relationships || { Dana: 0, Alex: 0, Zero: 0, Nadia: 0 };
      player.enterprise = normalizeEnterprise(player.enterprise); return true; } } catch(e) {}
    return false;
  }
  function defaultEnterprise() {
    return {
      services: { intranet: 'up', dns: 'up', vpn: 'up', 'file-share': 'up', monitoring: 'up' },
      devices: [
        { id: 'ws-01', name: 'Analyst Workstation', type: 'workstation', ip: '10.10.10.25', segment: 'USER-LAN', status: 'up' },
        { id: 'sw-01', name: 'Access Switch', type: 'switch', ip: '10.10.10.2', segment: 'USER-LAN', status: 'up' },
        { id: 'fw-01', name: 'Edge Firewall', type: 'firewall', ip: '10.10.10.1', segment: 'EDGE', status: 'up' },
        { id: 'dns-01', name: 'Internal DNS Server', type: 'server', ip: '10.10.20.53', segment: 'SERVER-LAN', status: 'up' },
        { id: 'web-01', name: 'Intranet Web Server', type: 'server', ip: '10.10.20.20', segment: 'SERVER-LAN', status: 'up' },
        { id: 'siem-01', name: 'Monitoring Collector', type: 'server', ip: '10.10.30.15', segment: 'SECURITY-LAN', status: 'up' }
      ],
      tickets: [
        { id: 'INC-104', priority: 'HIGH', title: 'Unusual VPN authentication', status: 'OPEN', team: 'SOC', scenario: 'vpn-auth' },
        { id: 'INC-105', priority: 'MEDIUM', title: 'Intermittent intranet access', status: 'OPEN', team: 'NOC', scenario: 'intranet-dns' },
        { id: 'REQ-021', priority: 'LOW', title: 'Research lab access review', status: 'PENDING', team: 'SECURITY' }
      ],
      changes: [], events: [], verified: {}, nextChangeNumber: 101,
      logs: [{ at: Date.now(), host: 'web-01', event: 'service health check passed', severity: 'INFO', detail: 'Intranet application responding normally.' }],
      activeScenario: null, scenarioResults: {}
    };
  }
  function normalizeEnterprise(value) {
    const base = defaultEnterprise();
    if (!value || typeof value !== 'object') return base;
    return {
      services: { ...base.services, ...(value.services || {}) },
      devices: Array.isArray(value.devices) ? value.devices : base.devices,
      tickets: Array.isArray(value.tickets) ? value.tickets : base.tickets,
      changes: Array.isArray(value.changes) ? value.changes : [],
      events: Array.isArray(value.events) ? value.events : [],
      logs: Array.isArray(value.logs) ? value.logs : base.logs,
      activeScenario: value.activeScenario || null,
      scenarioResults: value.scenarioResults && typeof value.scenarioResults === 'object' ? value.scenarioResults : {},
      verified: value.verified && typeof value.verified === 'object' ? value.verified : {},
      nextChangeNumber: Number.isInteger(value.nextChangeNumber) && value.nextChangeNumber >= 101 ? value.nextChangeNumber : Math.max(101, ...((Array.isArray(value.changes) ? value.changes : []).map(c => Number(String(c.id || '').replace(/^CHG-/, '')) + 1).filter(Number.isFinite)))
    };
  }
  function save() { if (player) localStorage.setItem(KEY, JSON.stringify(player)); }
  function getEnterpriseState() { if (!player) return null; player.enterprise = normalizeEnterprise(player.enterprise); return player.enterprise; }
  function recordEnterpriseEvent(action, detail, category) {
    if (!player) return false;
    const e = getEnterpriseState();
    e.events.unshift({ at: Date.now(), action: String(action).slice(0, 80), detail: String(detail).slice(0, 220), category: category || 'operations' });
    e.events = e.events.slice(0, 100); save(); return true;
  }
  function setEnterpriseService(name, status) {
    if (!player) return { ok: false, message: 'No active profile.' };
    const e = getEnterpriseState();
    if (!Object.prototype.hasOwnProperty.call(e.services, name)) return { ok: false, message: 'Unknown service. Run `services` to list available services.' };
    if (!['up', 'down'].includes(status)) return { ok: false, message: 'Status must be up or down.' };
    const previous = e.services[name]; e.services[name] = status; e.verified[name] = false;
    e.logs.unshift({ at: Date.now(), host: name, event: 'service state changed', severity: status === 'down' ? 'WARN' : 'INFO', detail: `${name} changed from ${previous} to ${status}.` });
    e.logs = e.logs.slice(0, 100);
    recordEnterpriseEvent('service ' + status, name + ' changed from ' + previous + ' to ' + status, 'change');
    save(); return { ok: true, previous, status };
  }
  function addChangeRecord(summary) {
    if (!player) return null;
    const e = getEnterpriseState();
    const record = { id: 'CHG-' + String(e.nextChangeNumber || 101).padStart(3, '0'), summary: String(summary).slice(0, 180), at: Date.now(), by: player.username };
    e.nextChangeNumber = (e.nextChangeNumber || 101) + 1;
    e.changes.unshift(record); e.changes = e.changes.slice(0, 50);
    recordEnterpriseEvent('change recorded', record.id + ': ' + record.summary, 'change'); save(); return record;
  }
  function serviceHealthFor(e, name) {
    if (!e || !Object.prototype.hasOwnProperty.call(e.services, name)) return { ok: false, message: 'Unknown service.' };
    const issues = [];
    if (e.services[name] !== 'up') issues.push(`${name} service is down`);
    if (name === 'intranet') {
      if (e.services.dns !== 'up') issues.push('DNS dependency is down');
      const web = e.devices.find(d => d.id === 'web-01'); if (web && web.status !== 'up') issues.push('web-01 is down');
    }
    if (name === 'vpn') { const fw = e.devices.find(d => d.id === 'fw-01'); if (fw && fw.status !== 'up') issues.push('edge firewall is down'); }
    if (name === 'monitoring') { const siem = e.devices.find(d => d.id === 'siem-01'); if (siem && siem.status !== 'up') issues.push('monitoring collector is down'); }
    return { ok: issues.length === 0, status: e.services[name], issues };
  }
  function serviceHealth(name) { return serviceHealthFor(getEnterpriseState(), name); }
  function verifyEnterpriseService(name) {
    if (!player) return { ok: false, message: 'No active profile.' };
    const e = getEnterpriseState();
    if (!Object.prototype.hasOwnProperty.call(e.services, name)) return { ok: false, message: 'Unknown service. Run `services` to list available services.' };
    const health = serviceHealthFor(e, name); e.verified[name] = health.ok;
    e.logs.unshift({ at: Date.now(), host: name, event: 'verification', severity: health.ok ? 'INFO' : 'WARN', detail: health.ok ? 'Service and required dependencies verified.' : health.issues.join('; ') }); e.logs = e.logs.slice(0, 100);
    recordEnterpriseEvent('verification', name + (health.ok ? ' — verification passed' : ' — verification failed: ' + health.issues.join(', ')), 'verification');
    save(); return { ...health, message: health.ok ? undefined : health.issues.join('; ') };
  }
  function getEnterpriseDiagnosis(name) {
    const e = getEnterpriseState(); if (!e) return { ok: false, message: 'No active profile.' };
    if (!Object.prototype.hasOwnProperty.call(e.services, name)) return { ok: false, message: 'Unknown service. Run `services` to list available services.' };
    const health = serviceHealth(name);
    const dependencies = name === 'intranet' ? [{ name: 'intranet service', status: e.services.intranet }, { name: 'DNS service', status: e.services.dns }, { name: 'web-01', status: (e.devices.find(d => d.id === 'web-01') || {}).status || 'unknown' }] : name === 'vpn' ? [{ name: 'VPN service', status: e.services.vpn }, { name: 'fw-01', status: (e.devices.find(d => d.id === 'fw-01') || {}).status || 'unknown' }] : [{ name: name + ' service', status: e.services[name] }];
    recordEnterpriseEvent('diagnosis', `${name}: ${health.ok ? 'no current dependency fault detected' : health.issues.join('; ')}`, 'investigation');
    return { ok: true, service: name, healthy: health.ok, issues: health.issues, dependencies };
  }
  function setEnterpriseDevice(id, status) {
    const e = getEnterpriseState(); if (!e) return { ok: false, message: 'No active profile.' };
    const device = e.devices.find(d => d.id === id);
    if (!device) return { ok: false, message: 'Device not found. Run devices to list simulated devices.' };
    if (!['up','down'].includes(status)) return { ok: false, message: 'Status must be up or down.' };
    const previous = device.status; device.status = status;
    if (id === 'web-01' && status === 'down') e.verified.intranet = false;
    if (id === 'fw-01' && status === 'down') e.verified.vpn = false;
    if (id === 'siem-01' && status === 'down') e.verified.monitoring = false;
    e.logs.unshift({ at: Date.now(), host: id, event: 'device state changed', severity: status === 'down' ? 'WARN' : 'INFO', detail: `${device.name} changed from ${previous} to ${status}.` }); e.logs = e.logs.slice(0,100);
    recordEnterpriseEvent('device ' + status, `${id} changed from ${previous} to ${status}`, 'change');
    save(); return { ok: true, device, previous, status };
  }
  function startEnterpriseScenario(ticketId) {
    const e = getEnterpriseState(); if (!e) return { ok: false, message: 'No active profile.' };
    const ticket = e.tickets.find(t => t.id.toUpperCase() === String(ticketId || '').toUpperCase());
    if (!ticket) return { ok: false, message: 'Ticket not found.' };
    if (ticket.scenario === 'intranet-dns') {
      e.services.dns = 'down'; e.verified.dns = false; e.verified.intranet = false;
      e.activeScenario = ticket.id; ticket.status = 'INVESTIGATING';
      e.logs.unshift({ at: Date.now(), host: 'dns-01', event: 'DNS health check failed', severity: 'WARN', detail: 'Clients report intermittent intranet resolution failures.' });
      e.logs.unshift({ at: Date.now(), host: 'ws-01', event: 'application lookup failure', severity: 'WARN', detail: 'intranet.corp.test did not resolve for a user workstation.' });
      recordEnterpriseEvent('scenario started', `${ticket.id}: injected simulated DNS fault for training`, 'scenario');
      e.logs = e.logs.slice(0,100); save(); return { ok: true, message: 'Scenario started: intranet lookup failures are now active. Investigate DNS, dependencies and logs before restoring service.' };
    }
    if (ticket.scenario === 'vpn-auth') {
      e.activeScenario = ticket.id; ticket.status = 'INVESTIGATING';
      e.logs.unshift({ at: Date.now(), host: 'vpn-gw', event: 'repeated authentication failures', severity: 'WARN', detail: 'Several failed logins followed by one successful login from a new simulated source.' });
      recordEnterpriseEvent('scenario started', `${ticket.id}: injected simulated VPN authentication investigation`, 'scenario');
      e.logs = e.logs.slice(0,100); save(); return { ok: true, message: 'Scenario started: review authentication events and correlate the timeline. No real accounts or systems are involved.' };
    }
    return { ok: false, message: 'This request ticket has no playable incident scenario yet.' };
  }
  function updateEnterpriseTicket(id, status) {
    const e = getEnterpriseState(); if (!e) return { ok: false, message: 'No active profile.' };
    const ticket = e.tickets.find(t => t.id.toUpperCase() === String(id || '').toUpperCase());
    if (!ticket) return { ok: false, message: 'Ticket not found.' };
    if (!['INVESTIGATING','OPEN','PENDING'].includes(status)) return { ok: false, message: 'Use ticket update <ID> investigating|open|pending, or resolve <ID>.' };
    ticket.status = status; recordEnterpriseEvent('ticket updated', `${ticket.id} status set to ${status}`, 'ticket'); save();
    return { ok: true, ticket };
  }
  function resolveEnterpriseTicket(id) {
    const e = getEnterpriseState(); if (!e) return { ok: false, message: 'No active profile.' };
    const ticket = e.tickets.find(t => t.id.toUpperCase() === String(id || '').toUpperCase());
    if (!ticket) return { ok: false, message: 'Ticket not found.' };
    if (ticket.id === 'INC-105' && !(e.services.dns === 'up' && serviceHealthFor(e, 'intranet').ok && e.verified.intranet)) return { ok: false, message: 'Resolution blocked: restore DNS, run verify intranet successfully, then resolve INC-105.' };
    if (ticket.id === 'INC-104' && e.activeScenario === 'INC-104' && !(e.services.vpn === 'up' && e.logs.some(l => /authentication/i.test(l.event)))) return { ok: false, message: 'Review the VPN authentication evidence before resolving this incident.' };
    ticket.status = 'CLOSED'; ticket.resolution = ticket.id === 'INC-105' ? 'DNS dependency restored and intranet verification passed.' : 'Investigation documented by trainee.';
    e.scenarioResults[ticket.id] = { status: 'resolved', at: Date.now(), resolution: ticket.resolution };
    recordEnterpriseEvent('ticket resolved', `${ticket.id}: ${ticket.resolution}`, 'ticket'); save(); return { ok: true, ticket };
  }
  function reset() { localStorage.removeItem(KEY); player = null; }

  function create(cfg) {
    player = { username: cfg.username, avatarId: cfg.avatarId, careerPath: cfg.careerPath, xp: 0, reputation: 50, skills: { networking: 0, security: 0, hacking: 0 }, completed: {}, unlocked: [], achievements: [], history: [], campaignFlags: { decisions: {} }, relationships: { Dana: 0, Alex: 0, Zero: 0, Nadia: 0 }, enterprise: defaultEnterprise() };
    save();
  }
  function rankFor(xp, path) { let r = RANKS[0]; for (const k of RANKS) if (xp >= k.xp) r = k; return r[path] || r.networking; }
  function nextRank(xp, path) {
    const next = RANKS.find(r => xp < r.xp);
    return next ? { title: next[path] || next.networking, remaining: Math.max(0, next.xp - xp), threshold: next.xp } : null;
  }

  function switchCareer(path) {
    if (!player || !['networking','cybersecurity','hacker'].includes(path)) return false;
    player.careerPath = path;
    player.campaignFlags.lastCareerSwitchAt = Date.now();
    save();
    return true;
  }

  function isUnlocked(id) {
    const m = window.MISSIONS.find(x => x.id === id);
    if (!m) return false;
    if (m.path !== player.careerPath) return false;
    if (player.completed[id]) return true;
    return !m.requires || m.requires.every(r => !!player.completed[r]);
  }

  function completeMission(m, result) {
    const previous = player.completed[m.id];
    const first = !previous;
    const awardedXp = first ? result.xp : 0;
    player.completed[m.id] = { score: Math.max(previous ? previous.score || 0 : 0, result.score), lastScore: result.score, at: Date.now(), attempts: (previous && previous.attempts || 0) + 1, challengeAwarded: !!result.challengeAwarded, challengeLabel: result.challengeLabel || null };
    if (first) {
      player.xp += awardedXp;
      if (m.skillGains) for (const k in m.skillGains) if (player.skills[k] !== undefined) player.skills[k] += m.skillGains[k];
    }
    player.history = Array.isArray(player.history) ? player.history : [];
    const score = Math.max(0, Math.min(100, Number(result.score) || 0));
    const repChange = first ? (score >= 90 ? 5 : score >= 75 ? 3 : score >= 60 ? 1 : -2) : 0;
    player.reputation = Math.max(0, Math.min(100, player.reputation + repChange));
    player.history.unshift({ missionId: m.id, title: m.title, path: m.path, score, xp: awardedXp, reputationChange: repChange, challengeAwarded: !!result.challengeAwarded, challengeLabel: result.challengeLabel || null, bonus: Number(result.bonus) || 0, at: Date.now() });
    player.history = player.history.slice(0, 20);
    save();
    return { first, xp: awardedXp, rank: rankFor(player.xp, player.careerPath), reputation: player.reputation, reputationChange: repChange };
  }


  function recordDecision(missionId, choice) {
    if (!player) return { ok: false, message: 'No active profile.' };
    player.campaignFlags = player.campaignFlags || {};
    player.campaignFlags.decisions = player.campaignFlags.decisions || {};
    if (player.campaignFlags.decisions[missionId]) return { ok: false, message: 'This incident decision is already recorded.' };
    const options = {
      evidence_first: { label: 'Preserve evidence first', relation: { Alex: 2, Nadia: 1 }, flag: 'evidence-first', message: 'Evidence is preserved before containment. The SOC trusts your process.' },
      contain_fast: { label: 'Contain immediately', relation: { Alex: -1, Dana: 1 }, flag: 'rapid-containment', message: 'The immediate risk is reduced, but the review team will ask for a clearer evidence trail.' },
      communicate: { label: 'Coordinate a joint response', relation: { Dana: 1, Alex: 1, Zero: 1, Nadia: 2 }, flag: 'joint-response', message: 'The teams coordinate their next steps and share a common timeline.' },
      validate_scope: { label: 'Validate scope and document', relation: { Zero: 2, Nadia: 1 }, flag: 'scope-verified', message: 'The assessment remains tightly scoped and the evidence is reproducible.' },
      restore_fast: { label: 'Restore service quickly', relation: { Dana: 1, Alex: -1 }, flag: 'service-first', message: 'Service returns sooner, but the incident review may find gaps in evidence.' }
    };
    const selected = options[choice];
    if (!selected) return { ok: false, message: 'Unknown decision.' };
    player.campaignFlags.decisions[missionId] = { choice, label: selected.label, flag: selected.flag, at: Date.now() };
    player.campaignFlags.lastDecision = selected.flag;
    player.relationships = player.relationships || { Dana: 0, Alex: 0, Zero: 0, Nadia: 0 };
    Object.entries(selected.relation).forEach(([name, amount]) => { player.relationships[name] = Math.max(-5, Math.min(10, (Number(player.relationships[name]) || 0) + amount)); });
    save();
    return { ok: true, message: selected.message, label: selected.label, relationships: player.relationships };
  }
  function getRelationship(name) { return player && player.relationships ? Number(player.relationships[name]) || 0 : 0; }
  function getCampaignState() {
    if (!player) return { lastDecision: null, decisions: {}, relationships: {} };
    return { lastDecision: player.campaignFlags && player.campaignFlags.lastDecision || null, decisions: player.campaignFlags && player.campaignFlags.decisions || {}, relationships: player.relationships || {} };
  }

  return { load, save, reset, create, get: () => player, rankFor, nextRank, isUnlocked, switchCareer, completeMission, recordDecision, getRelationship, getCampaignState, getEnterpriseState, recordEnterpriseEvent, setEnterpriseService, addChangeRecord, verifyEnterpriseService, serviceHealth, getEnterpriseDiagnosis, setEnterpriseDevice, startEnterpriseScenario, updateEnterpriseTicket, resolveEnterpriseTicket };
})();