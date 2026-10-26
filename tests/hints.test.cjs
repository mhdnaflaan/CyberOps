const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(require('path').join(__dirname, '../js/academy.js'), 'utf8');
const store = {};
const context = { window: {}, localStorage: { getItem: k => store[k] || null, setItem: (k,v) => store[k] = v }, console };
vm.runInNewContext(source, context);
const api = context.window.Academy;
if (api.paths.length !== 6) throw new Error('Expected six learning paths');
let count = 0;
for (const path of api.paths) for (const challenge of path.challenges) {
  count++;
  if (!Array.isArray(challenge.hints) || challenge.hints.length < 2) throw new Error(`${challenge.id}: expected at least two hints`);
  if (challenge.hints.some(h => typeof h !== 'string' || h.length < 80)) throw new Error(`${challenge.id}: hint is too short to guide a learner`);
}
const hacker = api.paths.find(p => p.id === 'pentest').challenges.find(c => c.id === 'hack-01');
const blocked = api.execute(hacker, 'nmap -sV 192.0.2.10', { verified: false });
if (!/BLOCKED/.test(blocked.output)) throw new Error('Scope-first guard regressed');
console.log(`Hint tests passed: ${count} challenges have detailed multi-step hints; scope-first guard preserved.`);
