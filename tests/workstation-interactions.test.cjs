const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../js/game2d.js'), 'utf8');
const checks = [
  ['procedural seated pose', /function setNPCWorkPose\(/],
  ['pose cleanup and visibility restoration', /function clearNPCWorkPose\(/],
  ['role-specific desk assignment', /function findWorkstationFor\(/],
  ['typing pose', /activity==='typing'/],
  ['reading-monitor pose', /activity==='reading'/],
  ['talking pose', /activity==='talking'/],
  ['staff desk routes', /d\.homeWorkstation=ws/],
  ['mission response desk target', /d\.responseDesk=targetDesk/],
  ['mission arrival seated pose', /setNPCWorkPose\(this,npc,data\.responseDesk,'reading'\)/],
  ['desk occupant cleanup', /workstation\.occupant=d\.name/]
];
for (const [label, re] of checks) {
  if (!re.test(src)) throw new Error(`Missing workstation feature: ${label}`);
}
console.log('Workstation interaction tests passed:', checks.map(x => x[0]).join(', '));
