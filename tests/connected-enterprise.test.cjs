const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const store = new Map();
const context = {
  window: { MISSIONS: [] },
  localStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k,v) => store.set(k,v), removeItem: k => store.delete(k) },
  Date, Number, JSON, Object, Math, Array, String
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/state.js','utf8'), context);
vm.runInContext(fs.readFileSync('js/sim.js','utf8'), context);
const Game = context.window.Game;
const Sim = context.window.Sim;
Game.create({ username: 'LabOperator', avatarId: 'test', careerPath: 'networking' });
const ctx = { enterpriseConsole: true, mission: { terminal: { commands: [] } }, net: null, activeDeviceId: null, run: { flags: {}, hosts: [], logs: [], alerts: [] } };
const run = command => Sim.exec(command, ctx);
let result = run('network');
assert.ok(result.lines.some(l => l.text.includes('dns-01')));
result = run('scenario start INC-105');
assert.ok(result.lines.some(l => l.text.includes('Scenario started')));
assert.equal(Game.getEnterpriseState().services.dns, 'down');
assert.equal(Game.getEnterpriseState().tickets.find(t => t.id === 'INC-105').status, 'INVESTIGATING');
result = run('diagnose intranet');
assert.ok(result.lines.some(l => l.text.includes('DNS dependency is down')));
result = run('verify intranet');
assert.equal(result.flags['verify:intranet'], false);
result = run('resolve INC-105');
assert.ok(result.lines.some(l => l.text.includes('Resolution blocked')));
run('service start dns');
result = run('verify intranet');
assert.equal(result.flags['verify:intranet'], true);
result = run('resolve INC-105');
assert.equal(Game.getEnterpriseState().tickets.find(t => t.id === 'INC-105').status, 'CLOSED');
assert.equal(result.flags['resolved:INC-105'], true);
run('device set web-01 down');
result = run('verify intranet');
assert.equal(result.flags['verify:intranet'], false, 'web server dependency should affect verification');
result = run('logs');
assert.ok(result.lines.some(l => l.text.includes('DNS health check failed')));
Game.save();
const saved = store.get('cyberops.premium');
Game.reset(); store.set('cyberops.premium', saved); assert.equal(Game.load(), true);
assert.equal(Game.getEnterpriseState().devices.find(d => d.id === 'web-01').status, 'down');
assert.equal(Game.getEnterpriseState().tickets.find(t => t.id === 'INC-105').status, 'CLOSED');
console.log('Connected enterprise tests passed: topology, scenario injection, dependency diagnosis, gated resolution, device state, logs, and persistence.');
