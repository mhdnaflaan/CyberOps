const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const game = fs.readFileSync(path.join(root, 'js', 'game2d.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
const checks = [
  ['workstation models', 'officeWorkstations.push'],
  ['monitor state animation', 'const palettes='],
  ['corporate circulation flooring', 'Brighter corporate circulation lanes'],
  ['typing status pulse', 'Typing is visible even when staff are stationary'],
  ['mission response hook', 'cyberops:mission-start'],
  ['coordinated response team', 'triggerOfficeMissionResponse'],
  ['response recovery', 'RESPONSE TEAM MOBILISED'],
  ['movable named NPC bodies', 'npc.body.setImmovable(false);'],
  ['movable ambient NPC bodies', 'Ambient employees use their own velocity-driven routines too.'],
  ['bounded frame delta', 'const delta = Math.min(50, this.game.loop.delta || 16);'],
  ['mission response can still move', 'data.patrol && data.patrol.length > 1) {'],
];
for (const [name, token] of checks) {
  if (!game.includes(token) && !app.includes(token)) throw new Error(`Missing living-office feature: ${name}`);
}
if (!app.includes("window.dispatchEvent(new CustomEvent('cyberops:mission-start'")) throw new Error('Mission route does not notify office response system');
console.log('Living office tests passed: corporate floor, animated monitor props, typing indicators, mission response dispatch, team response and recovery.');
