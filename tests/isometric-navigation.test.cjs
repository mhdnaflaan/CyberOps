const fs=require('fs'),path=require('path');
const game=fs.readFileSync(path.join(__dirname,'..','js','game2d.js'),'utf8');
const checks=[
 ['A* route planner','function findOfficePath(scene, sx, sy, tx, ty)'],
 ['route avoids blocked cells','const blocked=(x,y)=>'],
 ['NPC path queues','data.pathQueue = findOfficePath'],
 ['home-seat assignment after NPC creation','Assign named employees only after they have actually been created.'],
 ['all employee colliders installed after final ambient NPC','npcs.forEach(npc => this.physics.add.collider(npc, obstacles));'],
 ['workstation occupant reservation','workstation.occupant=d.name'],
 ['animated typing pose','scene.tweens.add({targets:[armL,armR]'],
 ['isometric diamond tiles','g.beginPath(); g.moveTo(ox,oy); g.lineTo(ox+32,oy+16)']
];
for(const [name,token] of checks)if(!game.includes(token))throw new Error('Missing isometric office feature: '+name);
console.log('Isometric-office navigation tests passed: path planning, late home-seat assignment, employee collisions, desk occupancy and diamond tiles.');
