/* CyberOps explorable office — Phaser 3 */
let phaserGame = null;
let player = null, cursors = null, keys = null, promptText = null;
let activeNPC = null, npcs = [], dialogueBox = null, dialogueName = null, dialogueText = null;
let officeConversationBubbles = []; // transient in-world NPC-to-NPC dialogue
let officeNextConversationAt = 0;
let isDialogueOpen = false, worldScene = null, playerParts = null, lastFacing = 'down';
let journalBox = null, isJournalOpen = false;
let officeWorkstations = [], officeMonitors = [], officeEffects = [];
let missionResponseActive = false;

const WORLD = { width: 3200, height: 2200 };
const PALETTE = {
  floor: 0x182638, tile: 0x1d2d40, line: 0x2b4056, wall: 0x0b1422,
  cyan: 0x38bdf8, green: 0x3ddc97, purple: 0xa78bfa, red: 0xf87171,
  skin: 0xf0bd91, hair: 0x33251f, shirt: 0x2877a8
};

window.startPhaser = function () {
  if (phaserGame) {
    // Safely recover the office after a mission UI route. Phaser may be paused,
    // sleeping, or inactive depending on browser timing; handle each state.
    try {
      const manager = phaserGame.scene;
      const office = manager.getScene('OfficeScene');
      if (office && manager.isSleeping('OfficeScene')) manager.wake('OfficeScene');
      else if (office && manager.isPaused('OfficeScene')) manager.resume('OfficeScene');
      else if (office && !manager.isActive('OfficeScene')) manager.launch('OfficeScene');
      if (office && manager.bringToTop) manager.bringToTop('OfficeScene');
      if (phaserGame.scale && phaserGame.scale.refresh) phaserGame.scale.refresh();
      if (player && player.body) player.body.setVelocity(0, 0);
      if (office && office.physics && office.physics.world) office.physics.world.resume();
      if (office && office.input && office.input.keyboard) office.input.keyboard.enabled = true;
      // A second refresh after layout visibility changes avoids a stale canvas size.
      requestAnimationFrame(() => { if (phaserGame && phaserGame.scale) phaserGame.scale.refresh(); });
    } catch (err) { console.warn('Office resume recovery:', err); }
    return;
  }
  phaserGame = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#101b2b',
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: { key: 'OfficeScene', preload, create, update }
  });
  window.phaserGame = phaserGame;
};

// Browsers may suspend animation/input while the tab is backgrounded. Refresh the
// office renderer and physics when returning, without recreating the player's save.
function recoverOfficeAfterFocus() {
  const game = window.phaserGame;
  if (!game || !game.scene) return;
  try {
    const manager = game.scene;
    const office = manager.getScene('OfficeScene');
    if (manager.isPaused('OfficeScene')) manager.resume('OfficeScene');
    if (manager.isSleeping('OfficeScene')) manager.wake('OfficeScene');
    if (office && office.physics && office.physics.world) office.physics.world.resume();
    if (office && office.input && office.input.keyboard && window.__APP && window.__APP.route !== 'mission') office.input.keyboard.enabled = true;
    if (game.scale && game.scale.refresh) game.scale.refresh();
  } catch (err) { console.warn('Office focus recovery:', err); }
}
window.addEventListener('focus', recoverOfficeAfterFocus);
document.addEventListener('visibilitychange', () => { if (!document.hidden) requestAnimationFrame(recoverOfficeAfterFocus); });


function preload() {
  const keys = ['player','dana','alex','zero','mira','sam','rin','nadia','kai','staff1','staff2','staff3','staff4'];
  keys.forEach(key => this.load.spritesheet('human-' + key, 'assets/characters/' + key + '.png', { frameWidth: 32, frameHeight: 48 }));
}

function create() {
  worldScene = this;
  activeNPC = null; isDialogueOpen = false; npcs = [];
  const W = WORLD.width, H = WORLD.height;
  this.physics.world.setBounds(0, 0, W, H);
  this.cameras.main.setBounds(0, 0, W, H);
  officeWorkstations = []; officeMonitors = []; officeEffects = []; officeConversationBubbles = []; officeNextConversationAt = 0; missionResponseActive = false;
  drawWorld(this);
  const obstacles = this.add.group();

  // Outer walls and room dividers; door gaps make the whole building explorable.
  addWall(this, obstacles, W/2, 12, W, 24);
  addWall(this, obstacles, W/2, H-12, W, 24);
  addWall(this, obstacles, 12, H/2, 24, H);
  addWall(this, obstacles, W-12, H/2, 24, H);
  // Interior dividers, with door-sized openings.
  addWall(this, obstacles, 1050, 510, 18, 420);
  addWall(this, obstacles, 1050, 920, 18, 180);
  addWall(this, obstacles, 1050, 1190, 18, 450);
  addWall(this, obstacles, 2100, 510, 18, 420);
  addWall(this, obstacles, 2100, 930, 18, 170);
  addWall(this, obstacles, 2100, 1210, 18, 410);
  addWall(this, obstacles, 1600, 1480, 1000, 18);
  addWall(this, obstacles, 500, 1480, 650, 18);

  // Workstations and server racks are real obstacles, not decorative UI cards.
  addDesk(this, obstacles, 420, 560, 'NETWORK LAB');
  addDesk(this, obstacles, 690, 560, 'ROUTER CONFIG');
  addDesk(this, obstacles, 420, 820, 'PACKET ANALYSIS');
  addDesk(this, obstacles, 690, 820, 'SWITCHING');
  addDesk(this, obstacles, 1330, 520, 'SOC CONSOLE');
  addDesk(this, obstacles, 1640, 520, 'THREAT HUNT');
  addDesk(this, obstacles, 1330, 810, 'INCIDENT DESK');
  addDesk(this, obstacles, 1640, 810, 'LOG ANALYSIS');
  addDesk(this, obstacles, 2400, 540, 'RESEARCH');
  addDesk(this, obstacles, 2700, 540, 'OSINT DESK');
  addDesk(this, obstacles, 2400, 820, 'LAB STATION');
  addDesk(this, obstacles, 2700, 820, 'TEST BENCH');
  addServerRack(this, obstacles, 2440, 1250);
  addServerRack(this, obstacles, 2570, 1250);
  addServerRack(this, obstacles, 2700, 1250);
  addDesk(this, obstacles, 650, 1770, 'BREAK ROOM');
  addDesk(this, obstacles, 920, 1770, 'TEAM TABLE');


  // Main character with separate limbs that animate while walking.
  const saved = window.Game && window.Game.get ? window.Game.get() : null;
  const careerShirt = saved && saved.careerPath === 'hacker' ? 0x39d353 : (saved && saved.careerPath === 'cybersecurity' ? 0x805ad5 : 0x2877a8);
  const legacyAvatarMap = { 'av-1': 'mira', 'av-2': 'alex', 'av-3': 'zero' };
  const validPlayerSprites = ['player','mira','sam','zero','alex','nadia','rin','kai'];
  const requestedAvatar = saved && saved.avatarId ? saved.avatarId : 'mira';
  const avatarVariant = legacyAvatarMap[requestedAvatar] || (validPlayerSprites.includes(requestedAvatar) ? requestedAvatar : 'mira');
  player = makeHuman(this, 1580, 1900, saved && saved.username ? saved.username : 'You',
    PALETTE.skin, careerShirt, 0x17202d, true, avatarVariant);
  player.spriteVariant = avatarVariant;
  this.physics.add.existing(player);
  player.body.setSize(16, 12).setOffset(8, 34);
  player.body.setCollideWorldBounds(true);
  this.physics.add.collider(player, obstacles);
  playerParts = player.parts;

  // Mission-giving staff and ambient office workers.
  npcs = [];
  addNPC(this, 430, 440, 'Dana', 'networking', 'Network Engineer', 0xf0bd91, 0x168a68, 0x203040, [[430,440],[770,440],[770,680],[430,680]], 'dana');
  addNPC(this, 1460, 410, 'Alex', 'cybersecurity', 'SOC Analyst', 0xd9a17e, 0x9f3545, 0x182438, [[1460,410],[1790,410],[1790,700],[1460,700]], 'alex');
  addNPC(this, 2540, 420, 'Zero', 'hacker', 'Security Researcher', 0xb97d55, 0x7250a5, 0x1a2230, [[2540,420],[2840,420],[2840,700],[2540,700]], 'zero');
  addNPC(this, 400, 1080, 'Mira', 'networking', 'Network Technician', 0xe8b18b, 0x2877a8, 0x33251f, [[400,1080],[820,1080],[820,1300],[400,1300]], 'mira');
  addNPC(this, 1450, 1080, 'Sam', 'cybersecurity', 'Incident Responder', 0x9f6848, 0x2f8f83, 0x201a18, [[1450,1080],[1840,1080],[1840,1320],[1450,1320]], 'sam');
  addNPC(this, 2600, 1080, 'Rin', 'hacker', 'Threat Researcher', 0xf0bd91, 0xc07830, 0x4a2e1b, [[2380,1080],[2800,1080],[2800,1390],[2380,1390]], 'rin');
  addNPC(this, 680, 1640, 'Nadia', 'networking', 'Team Lead', 0xd9a17e, 0x5b7798, 0x222222, [[600,1640],[970,1640],[970,1900],[600,1900]], 'nadia');
  addNPC(this, 1780, 1760, 'Kai', 'cybersecurity', 'Security Intern', 0xb97d55, 0x2877a8, 0x1f1f1f, [[1780,1760],[1960,1760],[1960,1980],[1780,1980]], 'kai');
  addAmbientNPC(this, 1180, 350, 'Office Staff', 0xe8b18b, 0x64748b, 'staff1');
  addAmbientNPC(this, 1900, 950, 'Analyst', 0x9f6848, 0x3f7f6f, 'staff2');
  addAmbientNPC(this, 1150, 1730, 'IT Support', 0xf0bd91, 0x8b5e34, 'staff3');
  addAmbientNPC(this, 2200, 1780, 'Visitor', 0xd9a17e, 0x4b6580, 'staff4');

  // Additional campus staff make the office feel active. These are ambient characters
  // so they offer friendly flavour dialogue without opening a mission board.
  addAmbientNPC(this, 1320, 300, 'Receptionist', 0xd9a17e, 0x6d597a, 'staff2');
  addAmbientNPC(this, 1780, 300, 'Project Manager', 0xf0bd91, 0x365d75, 'staff3');
  addAmbientNPC(this, 870, 1120, 'Field Technician', 0xb97d55, 0x3b806e, 'staff4');
  addAmbientNPC(this, 1700, 1180, 'Threat Monitor', 0xe8b18b, 0x934d58, 'staff1');
  addAmbientNPC(this, 2310, 1120, 'Infrastructure Engineer', 0x9f6848, 0x526b9b, 'staff2');
  addAmbientNPC(this, 2880, 1160, 'Lab Assistant', 0xf0bd91, 0x7a5d35, 'staff3');
  addAmbientNPC(this, 1280, 1740, 'Trainer', 0xd9a17e, 0x2877a8, 'staff4');
  addAmbientNPC(this, 1920, 1850, 'Junior Analyst', 0xb97d55, 0x6b7280, 'staff2');
  addAmbientNPC(this, 2420, 1760, 'Red Team Intern', 0xe8b18b, 0x7250a5, 'staff3');
  addAmbientNPC(this, 2810, 1880, 'Blue Team Intern', 0x9f6848, 0x2877a8, 'staff4');
  // Install colliders after every named and ambient employee has been created.
  npcs.forEach(npc => this.physics.add.collider(npc, obstacles));
  // Workstation routines: staff move between their own desks and short break points.
  const workRoutes = [
    [[390,610],[510,610],[510,700],[390,700]], [[650,610],[760,610],[760,700],[650,700]],
    [[1290,570],[1410,570],[1410,690],[1290,690]], [[1600,570],[1720,570],[1720,690],[1600,690]],
    [[2360,590],[2480,590],[2480,700],[2360,700]], [[2680,590],[2790,590],[2790,700],[2680,700]],
    [[620,1690],[760,1690],[760,1810],[620,1810]], [[1870,1800],[2000,1800],[2000,1910],[1870,1910]]
  ];
  npcs.filter(n => n.data && n.data.ambient).forEach((n,i) => {
    n.data.patrol = workRoutes[i % workRoutes.length];
    n.data.workStyle = ['typing','reviewing logs','checking a dashboard','reading a ticket','walking to a colleague'][i % 5];
    n.data.routeIndex = 0; n.data.wait = 0; n.data.phase = i * 0.73;
  });
  // Assign named employees only after they have actually been created.
  // Earlier releases attempted this before npcs=[] and the NPCs were added, so
  // no named employee ever received a home workstation.
  npcs.forEach((n, i) => {
    const d=n.data||{}; if(!d.name || d.ambient) return;
    const ws=findWorkstationFor(d.name); if(!ws) return;
    d.homeWorkstation=ws;
    d.homeSeat=[ws.x, ws.y+78];
    d.patrol=[d.homeSeat];
    d.routeIndex=0;
    d.wait=450 + i*170;
    d.pathQueue=[]; d.pathTarget=null;
  });

  // Shared office wallboard: rotating, fictional incidents trigger visible team reactions.
  const wallboard = this.add.text(1580, 1015, '● OPERATIONS: ALL SYSTEMS NOMINAL', {
    fontFamily:'Arial', fontSize:'12px', fontStyle:'bold', color:'#9ee7c1',
    backgroundColor:'#08111ddd', padding:{x:10,y:7}
  }).setOrigin(0.5).setDepth(900);
  this.__officeWallboard = wallboard;
  this.__incidentActive = false;
  this.__incidentCycle = 0;
  this.__nextIncidentAt = this.time.now + 38000;
  this.__meetingAt = this.time.now + 24000;
  this.__conversationAt = this.time.now + 12000;
  this.__meetingActiveUntil = 0;
  // Small chair markers make meeting and seated-work zones readable in the pixel office.
  [[1240,1715],[1300,1715],[1360,1715],[1420,1715],[1240,1780],[1300,1780],[1360,1780],[1420,1780]].forEach(([x,y],i)=>{
    this.add.rectangle(x,y,20,18,0x34485a).setStrokeStyle(1,0x71869a).setDepth(y-2);
    this.add.circle(x,y+3,4,[0x168a68,0x9f3545,0x7250a5,0x2877a8][i%4]).setDepth(y-1);
  });

  setupOfficeEventHooks(this);

  // Controls, interaction prompt, and screen-space dialogue UI.
  cursors = this.input.keyboard.createCursorKeys();
  keys = this.input.keyboard.addKeys('W,A,S,D,E,ESC');
  promptText = this.add.text(0, 0, 'E  TALK', {
    fontFamily: 'Arial', fontSize: '14px', color: '#07121f',
    backgroundColor: '#3ddc97', padding: { x: 10, y: 6 }, fontStyle: 'bold'
  }).setOrigin(0.5).setDepth(50).setVisible(false);
  setupDialogueBox(this);
  setupFieldJournal(this);
  this.input.keyboard.on('keydown-N', () => { if (!isDialogueOpen) toggleFieldJournal(); });
  this.input.keyboard.on('keydown-E', () => {
    if (activeNPC && !isDialogueOpen) openDialogue(activeNPC);
  });
  this.input.keyboard.on('keydown-ESC', () => {
    if (isJournalOpen) toggleFieldJournal();
    else if (isDialogueOpen) closeDialogue();
    else window.__go('hub');
  });
  this.cameras.main.startFollow(player, true, 0.09, 0.09);
  this.cameras.main.setZoom(1);
  this.add.text(32, 28, 'CYBEROPS HQ  •  EXPLORE / TALK / LEARN', {
    fontSize: '14px', fontStyle: 'bold', color: '#b8d8f2',
    backgroundColor: '#0b1422cc', padding: { x: 12, y: 8 }
  }).setScrollFactor(0).setDepth(60);
  this.add.text(32, 62, 'WASD / ARROWS: MOVE     E: INTERACT     N: FIELD JOURNAL     ESC: BACK', {
    fontSize: '12px', color: '#8ca8c4', backgroundColor: '#0b1422cc', padding: { x: 12, y: 6 }
  }).setScrollFactor(0).setDepth(60);
}

function drawWorld(scene) {
  const g = scene.add.graphics().setDepth(-10);
  g.fillStyle(0x111d2a, 1).fillRect(0, 0, WORLD.width, WORLD.height);
  // Full-size repeating isometric diamond floor tiles (64 x 32). The office
  // layout is authored in screen-space coordinates; the navigation layer uses
  // the same space so collision, desks, chairs and routes stay aligned.
  for (let row=-1; row<WORLD.height/32+2; row++) for (let col=-1; col<WORLD.width/64+2; col++) {
    const ox=col*64+((row&1)?32:0), oy=row*32;
    const checker=((col+row)&1)===0;
    g.fillStyle(checker?0x1b2d40:0x18283a,0.99);
    g.lineStyle(1,0x38536a,0.55);
    g.beginPath(); g.moveTo(ox,oy); g.lineTo(ox+32,oy+16); g.lineTo(ox,oy+32); g.lineTo(ox-32,oy+16); g.closePath(); g.fillPath(); g.strokePath();
  }
  // Brighter corporate circulation lanes and department entry strips.
  g.fillStyle(0x263d50,0.72).fillRoundedRect(1010,80,82,2020,12);
  g.fillStyle(0x263d50,0.72).fillRoundedRect(2060,80,82,2020,12);
  g.fillStyle(0x314356,0.55).fillRoundedRect(80,900,3020,48,8);
  g.lineStyle(2,0x52718b,0.5).strokeRoundedRect(78,78,3044,2044,18);
  zone(scene, 70, 100, 900, 300, 'RECEPTION & NETWORK LAB', 0x1b3542);
  zone(scene, 1110, 100, 930, 300, 'OPEN OFFICE', 0x263348);
  zone(scene, 2160, 100, 930, 300, 'SECURITY RESEARCH', 0x302b47);
  zone(scene, 80, 980, 900, 400, 'NETWORK OPERATIONS', 0x183b3a);
  zone(scene, 1120, 980, 900, 400, 'SOC / INCIDENT RESPONSE', 0x402a35);
  zone(scene, 2160, 980, 930, 400, 'SERVER ROOM', 0x1c2e45);
  zone(scene, 80, 1550, 950, 500, 'BREAK ROOM & TEAM SPACE', 0x303747);
  zone(scene, 1120, 1550, 900, 500, 'TRAINING & MEETING ROOM', 0x273b4a);
  zone(scene, 2160, 1550, 930, 500, 'SECURITY RANGE', 0x2c3045);
  // Corporate finish: glass-partition accents, indoor plants, and department wayfinding.
  [[1018,460,12,310],[2110,460,12,310],[1018,1450,12,260],[2110,1450,12,260]].forEach(([x,y,w,h])=>{
    scene.add.rectangle(x,y,w,h,0x7dd3fc,0.12).setStrokeStyle(1,0x7dd3fc,0.48).setDepth(-3);
  });
  [[130,450],[930,450],[2210,450],[3000,450],[130,1430],[3000,1430],[1100,2040],[2070,2040]].forEach(([x,y])=>{
    scene.add.rectangle(x,y,28,24,0x254b3c).setStrokeStyle(2,0x648b70).setDepth(y-1);
    scene.add.triangle(x,y-17,0,20,14,0,28,20,0x3d9365).setDepth(y);
    scene.add.triangle(x-6,y-13,0,17,13,0,23,17,0x2f7d57).setDepth(y+1);
  });
  scene.add.text(1580,78,'NORTHSTAR CYBER SYSTEMS  •  OPERATIONS HQ',{fontSize:'13px',fontStyle:'bold',color:'#c7d9e9',backgroundColor:'#0b1422cc',padding:{x:10,y:6}}).setOrigin(0.5).setDepth(-2);
  // Doors, windows and signage.
  for (const [x,y,w,h] of [[1050,700,18,130],[2100,700,18,130],[1050,1080,18,100],[2100,1080,18,100]]) {
    scene.add.rectangle(x,y,w,h,0x38bdf8,0.14).setStrokeStyle(2,0x38bdf8,0.55);
  }
  for (let x=180; x<920; x+=180) scene.add.rectangle(x,132,110,8,0x38bdf8,0.65);
  for (let x=1220; x<1980; x+=180) scene.add.rectangle(x,132,110,8,0x38bdf8,0.65);
  scene.add.text(1600, 2150, 'CYBEROPS TRAINING CAMPUS', {fontSize:'18px',color:'#607b98',fontStyle:'bold'}).setOrigin(0.5);
}
function zone(scene,x,y,w,h,label,color) {
  scene.add.rectangle(x+w/2,y+h/2,w,h,color,0.48).setStrokeStyle(3,0x43556b,0.9).setDepth(-5);
  scene.add.text(x+22,y+18,label,{fontSize:'15px',fontStyle:'bold',color:'#b9d2e8'}).setDepth(-4);
}
// A* navigation in world-space cells. Arcade colliders remain the final safety
// barrier, while this route planner steers NPCs through doorways and around desks.
function findOfficePath(scene, sx, sy, tx, ty) {
  const cell=32, cols=Math.ceil(WORLD.width/cell), rows=Math.ceil(WORLD.height/cell);
  const start={x:Math.max(1,Math.min(cols-2,Math.round(sx/cell))),y:Math.max(1,Math.min(rows-2,Math.round(sy/cell)))};
  const goal={x:Math.max(1,Math.min(cols-2,Math.round(tx/cell))),y:Math.max(1,Math.min(rows-2,Math.round(ty/cell)))};
  const solids=[];
  scene.children.list.forEach(o=>{ if(o && o.body && o.body.enable && o.body.immovable && o.width && o.height && (o.name||String(o.type).includes('Rectangle'))) solids.push({l:o.x-o.width/2-8,r:o.x+o.width/2+8,t:o.y-o.height/2-8,b:o.y+o.height/2+8}); });
  const blocked=(x,y)=>{ if(x<1||y<1||x>=cols-1||y>=rows-1)return true; const px=x*cell,py=y*cell; return solids.some(r=>px>r.l&&px<r.r&&py>r.t&&py<r.b); };
  // The destination chair cell may touch its own workstation's exclusion radius.
  const goalKey=goal.x+','+goal.y;
  const key=(x,y)=>x+','+y, open=[{...start,g:0,f:Math.abs(goal.x-start.x)+Math.abs(goal.y-start.y),parent:null}], best=new Map([[key(start.x,start.y),0]]), closed=new Set();
  const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]; let found=null, iterations=0;
  while(open.length && iterations++<4500){
    open.sort((a,b)=>a.f-b.f); const cur=open.shift(), ck=key(cur.x,cur.y); if(closed.has(ck))continue; closed.add(ck);
    if(ck===goalKey){found=cur;break;}
    for(const [dx,dy] of dirs){const x=cur.x+dx,y=cur.y+dy,k=key(x,y); if(closed.has(k))continue; if(k!==goalKey&&blocked(x,y))continue; if(dx&&dy&&(blocked(cur.x+dx,cur.y)||blocked(cur.x,cur.y+dy)))continue; const g=cur.g+(dx&&dy?1.414:1); if(g>=(best.get(k)??Infinity))continue; best.set(k,g);open.push({x,y,g,f:g+Math.hypot(goal.x-x,goal.y-y),parent:cur});}
  }
  if(!found)return [[tx,ty]];
  const route=[]; for(let n=found;n&&!(n.x===start.x&&n.y===start.y);n=n.parent)route.push([n.x*cell,n.y*cell]); route.reverse();
  // Smooth path by keeping corners only; reduces jitter and gives natural walking.
  const smooth=[]; for(let i=0;i<route.length;i++){const prev=i?route[i-1]:[sx,sy],next=route[i+1]; if(!next || Math.sign(route[i][0]-prev[0])!==Math.sign(next[0]-route[i][0]) || Math.sign(route[i][1]-prev[1])!==Math.sign(next[1]-route[i][1]))smooth.push(route[i]);}
  if(!smooth.length || Math.hypot(smooth[smooth.length-1][0]-tx,smooth[smooth.length-1][1]-ty)>18)smooth.push([tx,ty]); return smooth;
}

function addWall(scene, group, x,y,w,h) {
  const r=scene.add.rectangle(x,y,w,h,PALETTE.wall).setStrokeStyle(1,0x33465d);
  scene.physics.add.existing(r, true);
  group.add(r);
  return r;
}
function addDesk(scene, group, x,y,label) {
  // Desk with chair, keyboard, monitor frame, animated screen and readable station label.
  const desk=scene.add.rectangle(x,y,118,58,0x65452f).setStrokeStyle(2,0xb1845c).setDepth(y+4);
  desk.setName('desk-'+label.toLowerCase().replace(/[^a-z0-9]+/g,'-'));
  scene.physics.add.existing(desk, true); group.add(desk);
  scene.add.rectangle(x,y+4,106,45,0x76553a).setStrokeStyle(1,0x9b744f).setDepth(y+3);
  scene.add.rectangle(x,y-15,49,29,0x0a121d).setStrokeStyle(3,0x647b91).setDepth(y+5);
  const screen = scene.add.rectangle(x,y-15,41,21,0x123b4a).setDepth(y+6);
  const glow = scene.add.rectangle(x,y-15,37,17,0x164e63,0.85).setDepth(y+7);
  const screenText = scene.add.text(x,y-15,'> _',{fontFamily:'monospace',fontSize:'7px',color:'#8df3d0'}).setOrigin(0.5).setDepth(y+8);
  scene.add.rectangle(x-22,y+3,25,5,0x1a2734).setDepth(y+7); // keyboard
  scene.add.rectangle(x+39,y+3,12,5,0x263443).setDepth(y+7); // mouse
  // Chair is placed on the user side of the desk; NPC work poses use this anchor.
  const chair=scene.add.rectangle(x,y+52,28,22,0x273b4f).setStrokeStyle(2,0x5d7489).setDepth(y+1);
  scene.add.rectangle(x,y+52,12,14,0x3b5268).setDepth(y+2);
  const labelText=scene.add.text(x,y+43,label,{fontSize:'9px',color:'#dce8f4',fontStyle:'bold',backgroundColor:'#101b29cc',padding:{x:3,y:2}}).setOrigin(0.5).setDepth(y+10);
  const leftHand=scene.add.ellipse(x-13,y+19,8,4,0xd5b28d).setDepth(y+12).setAlpha(0.15);
  const rightHand=scene.add.ellipse(x+1,y+19,8,4,0xd5b28d).setDepth(y+12).setAlpha(0.15);
  const cursor=scene.add.rectangle(x-13,y-15,2,10,0x8df3d0).setDepth(y+9).setAlpha(0.8);
  officeWorkstations.push({x,y,label,chair,desk,screen,glow,screenText,labelText,leftHand,rightHand,cursor,phase:Math.random()*6.28,mode:0,typingPhase:Math.random()*6.28, occupant:null, activity:'typing'});
  return desk;
}

// Procedural seated pose: distinct skin/clothing palette, head, torso, arms and legs.
// The walking sprite is hidden while seated, so the workstation interaction is visible in-world.
function setNPCWorkPose(scene, npc, workstation, activity='typing') {
  const d=npc && npc.data; if(!d || !npc.active) return;
  if(d.workPose){ d.workPose.destroy(); d.workPose=null; }
  if(activity==='walking') { npc.setVisible(true); return; }
  npc.body.setVelocity(0,0); npc.setVisible(false);
  const palette={Dana:[0xf0bd91,0x168a68,0x203040],Alex:[0xd9a17e,0x9f3545,0x182438],Zero:[0xb97d55,0x7250a5,0x1a2230],Mira:[0xe8b18b,0x2877a8,0x33251f],Sam:[0x9f6848,0x2f8f83,0x201a18],Rin:[0xf0bd91,0xc07830,0x4a2e1b],Nadia:[0xd9a17e,0x5b7798,0x222222],Kai:[0xb97d55,0x2877a8,0x1f1f1f]};
  const [skin,shirt,pants]=palette[d.name]||[0xe8b18b,0x64748b,0x263445];
  const x=workstation.x, y=workstation.y+50;
  const g=scene.add.container(x,y).setDepth(y+15).setAlpha(0).setScale(0.94); const add=(shape)=>{g.add(shape);return shape;};
  add(scene.add.ellipse(0,18,30,10,0x050a10,0.35));
  add(scene.add.rectangle(-7,15,10,18,pants).setAngle(-8)); add(scene.add.rectangle(7,15,10,18,pants).setAngle(8));
  add(scene.add.rectangle(0,0,25,25,shirt).setStrokeStyle(1,0x111827));
  add(scene.add.rectangle(0,-19,18,18,skin).setStrokeStyle(1,0x33251f));
  add(scene.add.rectangle(0,-29,18,5,0x33251f));
  const armL=add(scene.add.rectangle(-15,2,7,20,shirt).setAngle(-24));
  const armR=add(scene.add.rectangle(15,2,7,20,shirt).setAngle(24));
  add(scene.add.ellipse(-13,11,8,5,skin)); add(scene.add.ellipse(13,11,8,5,skin));
  if(activity==='reading') { armL.setAngle(-8);armR.setAngle(8); add(scene.add.rectangle(0,8,14,9,0xdbeafe).setStrokeStyle(1,0x64748b)); }
  if(activity==='talking') { armL.setAngle(-48);armR.setAngle(42); }
  d.workPose=g; d.seatedAt=workstation; d.workActivity=activity; workstation.occupant=d.name; workstation.activity=activity;
  scene.tweens.add({targets:g,alpha:1,scale:1,duration:260,ease:'Sine.Out'});
  // Subtle activity-specific body/arm loops make work poses read as animation, not static status labels.
  if(activity==='typing') scene.tweens.add({targets:[armL,armR],angle:{from:-24,to:-8},duration:220,yoyo:true,repeat:-1,ease:'Sine.InOut'});
  else if(activity==='reading') scene.tweens.add({targets:g, y:y-1, duration:850, yoyo:true, repeat:-1, ease:'Sine.InOut'});
  else if(activity==='talking') scene.tweens.add({targets:[armL,armR],angle:{from:-48,to:32},duration:420,yoyo:true,repeat:-1,ease:'Sine.InOut'});
  workstation.leftHand.setAlpha(activity==='typing'?0.9:0.25); workstation.rightHand.setAlpha(activity==='typing'?0.9:0.25);
  if(d.statusLabel) d.statusLabel.setText(activity==='typing'?'⌨ TYPING':activity==='reading'?'▤ READING MONITOR':'↗ DISCUSSING').setColor(activity==='talking'?'#93c5fd':'#9ee7c1');
}
function clearNPCWorkPose(npc) {
  const d=npc && npc.data; if(!d) return;
  if(d.workPose){const oldPose=d.workPose;d.workPose=null; if(oldPose.scene && oldPose.scene.tweens) oldPose.scene.tweens.add({targets:oldPose,alpha:0,scale:0.94,duration:140,onComplete:()=>{if(oldPose.active)oldPose.destroy();}}); else oldPose.destroy();}
  if(d.seatedAt){if(d.seatedAt.occupant===d.name)d.seatedAt.occupant=null;d.seatedAt.leftHand.setAlpha(0.15);d.seatedAt.rightHand.setAlpha(0.15);}
  d.seatedAt=null; npc.setVisible(true);
}
function findWorkstationFor(name) {
  const label = /^(Dana|Mira)$/.test(name)?['NETWORK LAB','ROUTER CONFIG','SWITCHING']:
    /^(Alex|Sam)$/.test(name)?['SOC CONSOLE','INCIDENT DESK','LOG ANALYSIS']:
    /^(Zero|Rin)$/.test(name)?['RESEARCH','OSINT DESK','LAB STATION','TEST BENCH']:
    /^(Nadia|Kai)$/.test(name)?['TEAM TABLE','INCIDENT DESK','THREAT HUNT']:[];
  return officeWorkstations.find(w=>label.includes(w.label)&&!w.occupant) || officeWorkstations.find(w=>label.includes(w.label)) || officeWorkstations[0];
}

function addServerRack(scene, group, x,y) {
  const rack=scene.add.rectangle(x,y,78,150,0x101925).setStrokeStyle(3,0x536a80);
  scene.physics.add.existing(rack, true);
  group.add(rack);
  for(let i=0;i<5;i++){
    scene.add.rectangle(x,y-56+i*26,58,19,0x263a4d).setStrokeStyle(1,0x425d72);
    scene.add.circle(x+23,y-56+i*26,3, i%2 ? 0x38bdf8 : 0x3ddc97);
  }
  scene.add.text(x,y+88,'RACK',{fontSize:'10px',color:'#9fb6ca'}).setOrigin(0.5);
}



function setupOfficeEventHooks(scene) {
  // Mission UI and office share a small event bridge. A mission start pulls relevant
  // staff into coordinated response without coupling the RPG renderer to app internals.
  if (window.__cyberopsMissionHook) window.removeEventListener('cyberops:mission-start', window.__cyberopsMissionHook);
  window.__cyberopsMissionHook = (event) => triggerOfficeMissionResponse(scene, (event && event.detail) || {});
  window.addEventListener('cyberops:mission-start', window.__cyberopsMissionHook);
  scene.events.once('shutdown', () => window.removeEventListener('cyberops:mission-start', window.__cyberopsMissionHook));
}
function triggerOfficeMissionResponse(scene, detail={}) {
  if (!scene || !scene.sys || !scene.sys.isActive() || missionResponseActive) return;
  missionResponseActive = true;
  const category = String(detail.category || detail.path || detail.title || '').toLowerCase();
  const team = category.includes('network') ? ['Dana','Mira','Nadia'] :
    (category.includes('hack') || category.includes('web') || category.includes('research') ? ['Zero','Rin','Kai'] : ['Alex','Sam','Rin','Nadia']);
  if (scene.__officeWallboard) scene.__officeWallboard.setText('⚡ MISSION STARTED • TEAM MOBILISING').setColor('#fde68a').setBackgroundColor('#342b13dd');
  npcs.forEach(n => {
    const d=n.data||{};
    if (team.includes(d.name)) {
      const targetDesk=findWorkstationFor(d.name); clearNPCWorkPose(n); d.responding=true; d.missionResponding=true; d.savedRoutine=d.routine; d.routine='mission response'; d.wait=0; d.responseDesk=targetDesk; d.responseTarget=targetDesk?[targetDesk.x,targetDesk.y+76]:[n.x+40,n.y+30]; d.patrol = [d.responseTarget, ...(d.savedPatrol || d.patrol || [])]; d.routeIndex=0;
      if(d.statusLabel)d.statusLabel.setText('⚡ MISSION').setColor('#fde68a');
      if(n.body)n.body.setVelocity(0,0);
      animateSprite(n,false,'up');
      // Subtle ring pulse identifies the selected responders without blocking movement.
      if (!d.responseRing) d.responseRing=scene.add.circle(n.x,n.y+8,25,0xfbbf24,0.12).setStrokeStyle(2,0xfbbf24,0.85).setDepth(n.y-1);
    }
  });
  scene.time.delayedCall(7500,()=>{
    npcs.forEach(n=>{const d=n.data||{}; if(d.missionResponding){d.responding=false;d.missionResponding=false;d.routine=d.savedRoutine||'working';if(d.savedPatrol)d.patrol=d.savedPatrol;d.routeIndex=0;d.wait=350;if(d.responseDesk){clearNPCWorkPose(n);setNPCWorkPose(scene,n,d.responseDesk,'typing');d.responseDesk=null;}d.responseSeated=false;if(d.statusLabel)d.statusLabel.setText('⌨ RETURNING TO TASK').setColor('#9ee7c1');if(d.responseRing){d.responseRing.destroy();d.responseRing=null;}}});
    if(scene.__officeWallboard)scene.__officeWallboard.setText('● RESPONSE TEAM MOBILISED • CONTINUE YOUR MISSION').setColor('#9ee7c1').setBackgroundColor('#08111ddd');
    missionResponseActive=false;
  });
}

// Every named employee has a distinct role, working style, outfit description and voice.
const CHARACTER_PROFILES = {
  Dana:{specialty:'Routing & switching', outfit:'teal polo, ID lanyard, practical trousers', style:'methodical; verifies each change', work:'configuring a switch', voice:'Check the interface state first, then confirm the route.'},
  Alex:{specialty:'SOC monitoring', outfit:'burgundy button-up, headset, access badge', style:'calm; evidence-led', work:'correlating authentication alerts', voice:'Let’s correlate the timestamps before we call it malicious.'},
  Zero:{specialty:'Authorised security research', outfit:'charcoal overshirt, utility trousers, lab badge', style:'curious; scope-conscious', work:'reviewing a sandbox assessment', voice:'Only test the targets listed in the approved scope.'},
  Mira:{specialty:'Endpoint & network support', outfit:'blue work shirt, tool pouch, ID badge', style:'practical; patient with users', work:'checking a workstation connection', voice:'I’ll reproduce the issue first, then test one change at a time.'},
  Sam:{specialty:'Incident response', outfit:'forest-green shirt, radio earpiece, incident badge', style:'composed; prioritises containment', work:'updating an incident timeline', voice:'Preserve evidence and record the exact time of each action.'},
  Rin:{specialty:'Threat research', outfit:'ochre jacket, glasses, research notebook', style:'analytical; questions assumptions', work:'reviewing threat intelligence', voice:'Treat indicators as clues; validate them with context.'},
  Nadia:{specialty:'Engineering leadership', outfit:'navy blazer, light shirt, manager badge', style:'supportive; focuses on risk and communication', work:'reviewing a change request', voice:'Tell me the impact, rollback plan, and verification steps.'},
  Kai:{specialty:'Junior security analyst', outfit:'blue-grey cardigan, trainee badge, notebook', style:'eager; asks clear questions', work:'learning from a supervised case', voice:'I’ve written down the steps so I can explain why they work.'}
};
function getCharacterProfile(name, role, path) {
  return CHARACTER_PROFILES[name] || {specialty:role || 'Office operations', outfit:'individual smart-casual office clothing and staff ID', style:'collaborative and focused', work:'working through a team task', voice:'I’m working through my current task; let me know if you need a hand.'};
}

// NPC creation helpers. These were missing from the earlier build, which caused
// the scene to stop during create() before the player and office finished loading.
function addNPC(scene, x, y, name, path, role, skin, shirt, pants, patrol, variant) {
  const npc = makeHuman(scene, x, y, name, skin, shirt, pants, false, variant || 'staff1');
  scene.physics.add.existing(npc);
  npc.body.setSize(16, 12).setOffset(8, 34);
  npc.body.setAllowGravity(false);
  // NPCs must be movable: immovable Arcade bodies can make autonomous staff appear frozen.
  npc.body.setImmovable(false);
  npc.data = { name, path, role, variant: variant || 'staff1', patrol: patrol || [], ambient: false, profile: getCharacterProfile(name, role, path),
    routeIndex: 1, wait: 300 + Math.random()*500, phase: Math.random()*6.28, workIndex: 0, routine: 'working' };
  npc.charName = name;
  npc.data.statusLabel = scene.add.text(x, y-58, '⌨ WORKING', {fontFamily:'Arial',fontSize:'9px',fontStyle:'bold',color:'#9ee7c1',backgroundColor:'#0b1422dd',padding:{x:4,y:3}}).setOrigin(0.5).setDepth(y+2).setAlpha(0.88);
  npcs.push(npc);
  return npc;
}

function addAmbientNPC(scene, x, y, name, skin, shirt, variant) {
  const npc = makeHuman(scene, x, y, name, skin, shirt, 0x263445, false, variant || 'staff1');
  scene.physics.add.existing(npc);
  npc.body.setSize(16, 12).setOffset(8, 34);
  npc.body.setAllowGravity(false);
  // Ambient employees use their own velocity-driven routines too.
  npc.body.setImmovable(false);
  npc.data = { name, path: null, role: 'Office Staff', variant: variant || 'staff1', patrol: [], ambient: true, profile: getCharacterProfile(name, 'Office Staff', 'office'),
    routeIndex: 1, wait: 100 + Math.random()*350, phase: Math.random()*6.28, workIndex: 0, routine: 'working' };
  npc.charName = name;
  npc.data.statusLabel = scene.add.text(x, y-58, '⌨ WORKING', {fontFamily:'Arial',fontSize:'9px',fontStyle:'bold',color:'#9ee7c1',backgroundColor:'#0b1422dd',padding:{x:4,y:3}}).setOrigin(0.5).setDepth(y+2);
  npc.data.statusLabel.setAlpha(0.82);
  npcs.push(npc);
  return npc;
}

// Detailed custom pixel-art humans with four directional walking sprite animations.
function makeHuman(scene,x,y,name,skin,shirt,pants,isPlayer=false,variant='staff1') {
  const key='human-'+variant;
  const c=scene.physics ? scene.add.sprite(x,y,key,0) : scene.add.sprite(x,y,key,0);
  c.setOrigin(0.5,0.88).setScale(1.35).setDepth(y);
  c.charName=name; c.isPlayer=isPlayer; c.walking=false; c.facing='down'; c.parts=null;
  const anims=[['down',0],['left',1],['right',2],['up',3]];
  anims.forEach(([dir,row])=>{
    const animKey=key+'-walk-'+dir;
    if(!scene.anims.exists(animKey)) scene.anims.create({key:animKey,frames:scene.anims.generateFrameNumbers(key,{start:row*4,end:row*4+3}),frameRate:8,repeat:-1});
    const idleKey=key+'-idle-'+dir;
    if(!scene.anims.exists(idleKey)) scene.anims.create({key:idleKey,frames:[{key,frame:row*4}],frameRate:1,repeat:0});
  });
  c.play(key+'-idle-down');
  return c;
}
function updateNPCVisual(npc) {
  if (!npc._lastX || !npc._lastY) { npc._lastX=npc.x; npc._lastY=npc.y; return; }
  const dx=npc.x-npc._lastX, dy=npc.y-npc._lastY;
  if (Math.abs(dx)+Math.abs(dy)>0.15) {
    npc.facing=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
    animateSprite(npc,true,npc.facing);
  }
  npc._lastX=npc.x; npc._lastY=npc.y;
}

function setupDialogueBox(scene) {
  // Use native HTML controls for the dialogue. Phaser canvas text/buttons can
  // become misaligned on resize and can lose pointer events inside containers.
  const parent = document.getElementById('game-container');
  const old = document.getElementById('cyberops-dialogue');
  if (old) old.remove();
  if (!document.getElementById('cyberops-dialogue-style')) {
    const style = document.createElement('style');
    style.id = 'cyberops-dialogue-style';
    style.textContent = `
      #cyberops-dialogue{position:absolute;inset:0;z-index:1000;display:none;align-items:flex-end;justify-content:center;padding:clamp(12px,3vw,30px);pointer-events:none;font-family:Arial, sans-serif;}
      #cyberops-dialogue .dialogue-panel{width:min(760px,100%);max-height:calc(100% - 24px);overflow:auto;box-sizing:border-box;background:linear-gradient(145deg,rgba(13,26,42,.99),rgba(5,12,22,.99));border:1px solid #3b82a0;border-left:4px solid #38bdf8;border-radius:16px;padding:clamp(18px,3vw,26px);box-shadow:0 18px 55px rgba(0,0,0,.58);color:#edf6ff;pointer-events:auto;transform:translateY(12px);opacity:0;animation:cyberops-dialogue-enter .22s ease-out forwards;}
      @keyframes cyberops-dialogue-enter{to{transform:translateY(0);opacity:1}}
      #cyberops-dialogue .dialogue-name{font-size:clamp(16px,2.4vw,20px);font-weight:700;color:#38bdf8;margin:0 0 12px;overflow-wrap:anywhere;}
      #cyberops-dialogue .dialogue-message{font-size:clamp(14px,1.8vw,16px);line-height:1.75;margin:0;white-space:normal;overflow-wrap:anywhere;color:#d7e5f3;max-width:68ch;}
      #cyberops-dialogue .dialogue-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-top:20px;}
      #cyberops-dialogue button{min-height:42px;padding:10px 16px;border:0;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;touch-action:manipulation;}
      #cyberops-dialogue button:focus-visible{outline:3px solid #fff;outline-offset:3px;}
      #cyberops-dialogue .dialogue-open{background:#38bdf8;color:#07121f;}
      #cyberops-dialogue .dialogue-close{background:#26384f;color:#fff;}
      @media(max-width:480px){#cyberops-dialogue .dialogue-actions{justify-content:stretch}#cyberops-dialogue button{flex:1 1 130px}}
    `;
    document.head.appendChild(style);
  }
  const overlay = document.createElement('div');
  overlay.id = 'cyberops-dialogue';
  overlay.innerHTML = `
    <section class="dialogue-panel" role="dialog" aria-modal="true" aria-labelledby="cyberops-dialogue-name" aria-describedby="cyberops-dialogue-message">
      <h2 class="dialogue-name" id="cyberops-dialogue-name"></h2>
      <p class="dialogue-message" id="cyberops-dialogue-message"></p>
      <div class="dialogue-actions">
        <button type="button" class="dialogue-open" id="cyberops-dialogue-open">OPEN WORKSPACE</button>
        <button type="button" class="dialogue-close" id="cyberops-dialogue-close">CLOSE</button>
      </div>
    </section>`;
  parent.appendChild(overlay);
  dialogueBox = overlay;
  dialogueName = overlay.querySelector('#cyberops-dialogue-name');
  dialogueText = overlay.querySelector('#cyberops-dialogue-message');
  const openButton = overlay.querySelector('#cyberops-dialogue-open');
  const closeButton = overlay.querySelector('#cyberops-dialogue-close');
  openButton.addEventListener('click', () => {
    const path = activeNPC && activeNPC.path;
    if (!path) { closeDialogue(); return; }
    closeDialogue();
    if (typeof window.__openMissionBoard === 'function') window.__openMissionBoard(path);
    else console.error('CyberOps mission board is unavailable: __openMissionBoard is not defined.');
  });
  closeButton.addEventListener('click', closeDialogue);
  overlay.addEventListener('click', event => { if (event.target === overlay) closeDialogue(); });
  scene.input.keyboard.on('keydown-ESC', () => { if (isDialogueOpen) closeDialogue(); });
}
function setupFieldJournal(scene) {
  const parent = document.getElementById('game-container');
  const old = document.getElementById('cyberops-field-journal');
  if (old) old.remove();
  const styleId = 'cyberops-field-journal-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style'); style.id = styleId;
    style.textContent = `
      #cyberops-field-journal{position:absolute;inset:0;z-index:900;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(2,8,15,.72);font-family:Arial,sans-serif;color:#eaf4ff}
      #cyberops-field-journal .journal-panel{width:min(820px,100%);max-height:90%;overflow:auto;background:linear-gradient(145deg,#101e30,#07111d);border:1px solid #3ddc97;border-radius:16px;padding:22px;box-shadow:0 20px 70px #0009}
      #cyberops-field-journal .journal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px}
      #cyberops-field-journal h2{margin:0 0 5px;font-size:22px} #cyberops-field-journal .journal-muted{color:#9db3ca;font-size:13px;line-height:1.5}
      #cyberops-field-journal .journal-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      #cyberops-field-journal .journal-card{border:1px solid #263c51;border-radius:11px;padding:14px;background:#0a1624}
      #cyberops-field-journal .journal-card h3{font-size:13px;margin:0 0 10px;color:#3ddc97;text-transform:uppercase;letter-spacing:.08em}
      #cyberops-field-journal .journal-item{padding:8px 0;border-top:1px solid #1c2c40;font-size:13px;line-height:1.45;overflow-wrap:anywhere}
      #cyberops-field-journal button{background:#173247;color:#effaff;border:1px solid #31526b;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer;min-height:40px}
      @media(max-width:600px){#cyberops-field-journal .journal-grid{grid-template-columns:1fr}#cyberops-field-journal .journal-panel{padding:15px}#cyberops-field-journal h2{font-size:19px}}
    `; document.head.appendChild(style);
  }
  const overlay = document.createElement('div'); overlay.id = 'cyberops-field-journal';
  overlay.innerHTML = `<section class="journal-panel" role="dialog" aria-modal="true" aria-labelledby="cyberops-journal-title"><div class="journal-head"><div><div style="color:#3ddc97;font-size:10px;font-weight:800;letter-spacing:.15em;margin-bottom:7px">PERSONNEL / FIELD RECORD</div><h2 id="cyberops-journal-title">Operator Field Journal</h2><div class="journal-muted">Your progress, evidence trail and next learning goals. This journal is saved with your local game profile.</div></div><button type="button" id="cyberops-journal-close">CLOSE · N</button></div><div id="cyberops-journal-content"></div></section>`;
  parent.appendChild(overlay); journalBox = overlay;
  overlay.querySelector('#cyberops-journal-close').addEventListener('click', toggleFieldJournal);
  overlay.addEventListener('click', e => { if (e.target === overlay) toggleFieldJournal(); });
  scene.input.keyboard.on('keydown-ESC', () => { if (isJournalOpen) toggleFieldJournal(); });
}
function toggleFieldJournal() {
  if (!journalBox) return;
  isJournalOpen = !isJournalOpen;
  journalBox.style.display = isJournalOpen ? 'flex' : 'none';
  if (isJournalOpen) {
    const p = window.Game && window.Game.get ? window.Game.get() : null;
    const content = journalBox.querySelector('#cyberops-journal-content');
    if (!p) { content.textContent = 'No operator profile loaded.'; return; }
    const avatar = (window.AVATARS || []).find(a => a.id === p.avatarId) || (window.AVATARS || [])[0] || {name:'Operator',role:'Trainee',style:'Field operator'};
    const pathNames = {networking:'Network Engineer',cybersecurity:'SOC Analyst',hacker:'Ethical Hacker'};
    const missions = window.MISSIONS || [];
    const completed = missions.filter(m => p.completed && p.completed[m.id]);
    const recent = (Array.isArray(p.history) ? p.history : []).slice(0,5);
    const next = missions.find(m => m.path === p.careerPath && !(p.completed && p.completed[m.id]) && (!m.requires || m.requires.every(id => p.completed && p.completed[id])));
    const safe = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    content.innerHTML = `<div class="journal-grid"><section class="journal-card"><h3>Operator identity</h3><div style="font-size:18px;font-weight:800;margin-bottom:5px">${safe(p.username)} · ${safe(avatar.name)}</div><div class="journal-muted">${safe(avatar.role)} · ${safe(avatar.style)}<br>Career track: ${safe(pathNames[p.careerPath] || p.careerPath)}<br>XP: ${Number(p.xp)||0} · Reputation: ${Number(p.reputation)||0}/100</div></section><section class="journal-card"><h3>Current objective</h3>${next ? `<div style="font-weight:800;margin-bottom:6px">${safe(next.title)}</div><div class="journal-muted">${safe(next.tagline || 'Continue your career learning path.')}<br><br>Go to the mission board and review prerequisites before starting.</div>` : `<div class="journal-muted">All available missions on this track are complete. Switch career tracks or replay a mission to improve your score.</div>`}</section><section class="journal-card"><h3>Recent field record</h3>${recent.length ? recent.map(x=>`<div class="journal-item"><b>${safe(x.title || 'Assignment')}</b><br><span class="journal-muted">Score ${Number(x.score)||0}% · +${Number(x.xp)||0} XP</span></div>`).join('') : '<div class="journal-muted">No field reports yet. Talk to a specialist to begin your first assignment.</div>'}</section><section class="journal-card"><h3>Learning checklist</h3><div class="journal-item">${completed.length ? '✓' : '○'} Complete a mission and review its debrief</div><div class="journal-item">${Number((p.skills||{}).networking)||0} networking · ${Number((p.skills||{}).security)||0} security · ${Number((p.skills||{}).hacking)||0} hacking skill points</div><div class="journal-item">Use the loop: Observe → Hypothesis → Test → Interpret → Verify → Explain</div><div class="journal-item">For security assessments: confirm scope, capture evidence, describe impact, recommend a fix, and retest.</div></section></div>`;
    const close = journalBox.querySelector('#cyberops-journal-close'); if (close) close.focus({preventScroll:true});
  }
}

function openDialogue(npc) {
  if (!dialogueBox || !npc) return;
  isDialogueOpen = true;
  dialogueBox.style.display = 'flex';
  dialogueName.textContent = npc.name + (npc.role ? '  /  ' + npc.role : '');
  const npcProfile = npc.profile || getCharacterProfile(npc.name, npc.role, npc.path);
  dialogueText.removeAttribute('data-profile');
  const profile = window.Game && window.Game.get ? window.Game.get() : null;
  const completed = profile && profile.completed ? Object.keys(profile.completed).length : 0;
  const history = profile && Array.isArray(profile.history) ? profile.history : [];
  const lastMission = history.length ? history[0].title : null;
  const trust = window.Game && window.Game.getRelationship ? window.Game.getRelationship(npc.name) : 0;
  const trustNote = trust >= 4 ? ' The team has strong confidence in your judgement after your recent decisions.' : trust >= 1 ? ' The team appreciates your recent collaboration.' : trust <= -2 ? ' The team wants clearer evidence and communication before the next change.' : '';
  const beats = {
    Dana: [
      'Morning briefing: PC-01 lost access after a desk move. Start with evidence, not assumptions. Check the address, mask, and gateway before changing anything.',
      'Good progress. The team noticed you compare the host configuration with the gateway instead of guessing. Next, make sure the fix survives a verification test.',
      'The NOC is tracking a wider outage. Think in layers: physical link, interface state, addressing, gateway, then name resolution. Record the evidence for the handover.'
    ],
    Alex: [
      'The SOC queue is building. Triage the highest-risk alert first, correlate the authentication records, and separate suspicious evidence from conclusions.',
      'The team has your first case on record. Correlate timestamps and source context before you label an event malicious; a single alert is rarely the whole story.',
      'Incident response is now the priority. Preserve evidence, define scope, recommend containment, and write a concise handover another analyst can act on.'
    ],
    Zero: [
      'Welcome to the isolated research lab. Every target here is fictional and explicitly in scope. Reconnaissance is useful only when you can explain what each result means.',
      'Your lab notes are getting sharper. Validate a finding, assess its impact, and distinguish a confirmed weakness from a theory before writing a report.',
      'Advanced assignment: demonstrate a repeatable issue only inside the sandbox, capture minimal evidence, and recommend a proportionate remediation. Professional testing is more than finding a bug.'
    ]
  };
  let msg;
  if (npc.path === 'networking') msg = (beats.Dana[Math.min(completed, 2)]) + (lastMission ? ` Your latest field report: “${lastMission}”.` : ' I have added your first assignment to the team board.');
  else if (npc.path === 'cybersecurity') msg = (beats.Alex[Math.min(completed, 2)]) + (lastMission ? ` Latest logged assignment: “${lastMission}”.` : ' Start with the case board when you are ready.');
  else if (npc.path === 'hacker') msg = (beats.Zero[Math.min(completed, 2)]) + (lastMission ? ` Last recorded lab: “${lastMission}”.` : ' Read the scope carefully before starting.');
  else {
    const ambient = {
      Receptionist: 'Welcome to CyberOps HQ. The NOC is on the west side, the SOC is in the middle, and the security research lab is to the east. Walk up to a specialist and press E to talk.',
      'Project Manager': 'Our post-incident reviews ask three things: what happened, what evidence supports it, and how will we prevent it from happening again? A clean handover matters.',
      Trainer: 'A useful learning loop is Learn → Observe → Investigate → Decide → Execute → Verify → Explain. If you cannot explain your fix, revisit the evidence.',
      'Field Technician': 'Before changing a live configuration, record the current state and make one change at a time. In this campus, you can practise safely without touching a real network.',
      'Threat Monitor': 'Context beats panic. Check severity, time, source, and related logs before escalating. Document why you believe an event is or is not suspicious.',
      'Infrastructure Engineer': 'Networks are systems of dependencies. A local configuration issue, a failed interface, and a DNS problem can look similar to an end user.',
      'Lab Assistant': 'The research lab is sandboxed. Keep tests in scope, collect minimal proof, and include a fix that helps the system owner.',
      'Junior Analyst': 'I keep a case timeline as I work. It helps the next shift see what was observed, what was changed, and what still needs attention.',
      'Red Team Intern': 'A finding is useful when it is reproducible, scoped, and explained in terms of impact. Avoid making claims the evidence cannot support.',
      'Blue Team Intern': 'Detection is a loop: collect telemetry, form a hypothesis, investigate, respond proportionately, then improve the rule or process.',
      'Office Staff': 'There is a lot to learn here. Explore the campus, chat with the specialists, and take your time with each scenario.'
    };
    msg = ambient[npc.name] || 'Explore the campus, talk to the specialists, and keep your investigation notes clear. Every room is part of the training story.';
  }
  const avatar = (window.AVATARS || []).find(a => a.id === (profile && profile.avatarId));
  const voice = avatar ? ({mira:'Your methodical approach fits the work here. ',sam:'Stay calm and let the evidence lead. ',zero:'Keep the test inside the authorised lab and prove every claim. ',alex:'Think containment, evidence preservation and recovery. ',nadia:'Check dependencies before you change the network. ',rin:'Record observations separately from assumptions. '}[avatar.id] || '') : '';
  // Keep dialogue in-world and conversational. Character appearance and internal profile metadata belong in the character sheet, not spoken dialogue.
  const conversationalOpeners = {Dana:'Hey,',Alex:'Hi,',Zero:'All right,',Mira:'Hey there,',Sam:'Quick update,',Rin:'I was just reviewing this,',Nadia:'Good timing,',Kai:'Hi!'};
  const opener = conversationalOpeners[npc.name] || 'Welcome,';
  const cleanMessage = String(msg || '').replace(/^\s*(SPECIALTY|WORK STYLE|OUTFIT):[^\n]*\n?/gim, '').trim();
  dialogueText.textContent = `${opener} ${voice}${cleanMessage}${npc.path ? trustNote : ''}`.replace(/\s+/g, ' ').trim();
  const openButton = dialogueBox.querySelector('#cyberops-dialogue-open');
  openButton.style.display = npc.path ? '' : 'none';
  // Recompute layout naturally when the browser or game viewport changes.
  const panel = dialogueBox.querySelector('.dialogue-panel');
  if (panel) panel.scrollTop = 0;
  openButton.focus({ preventScroll: true });
}
function closeDialogue() {
  if (dialogueBox) dialogueBox.style.display = 'none';
  isDialogueOpen = false;
}
function startOfficeConversation(scene, now) {
  const candidates = npcs.filter(n => n.active && n.data && !n.data.responding && !n.data.missionResponding);
  if (candidates.length < 2) return;
  // Pick nearby colleagues so the conversation reads as a local interaction, not a global popup.
  let pair = null, best = Infinity;
  for (let i=0;i<candidates.length;i++) for(let j=i+1;j<candidates.length;j++) {
    const a=candidates[i], b=candidates[j];
    const dist=Phaser.Math.Distance.Between(a.x,a.y,b.x,b.y);
    if(dist < 280 && dist < best && now-(a.data.lastConversation||0)>18000 && now-(b.data.lastConversation||0)>18000) {best=dist;pair=[a,b];}
  }
  if (!pair) return;
  const [a,b]=pair, lines = {
    'Dana|Mira':['Dana: Check link state before changing the route.','Mira: Agreed. I will verify the endpoint after the change.'],
    'Alex|Sam':['Alex: I found a burst of failed sign-ins in the timeline.','Sam: Preserve the logs first; then we can contain the account.'],
    'Zero|Rin':['Zero: The test scope is limited to the lab host.','Rin: I will record evidence and avoid assumptions about impact.'],
    'Nadia|Kai':['Nadia: Tell me what the evidence shows, not just the alert.','Kai: I will correlate the timestamps and document the gap.']
  };
  const key=[a.data.name,b.data.name].sort().join('|');
  const dialogue=lines[key] || [`${a.data.name}: How is your workstation looking?`,`${b.data.name}: Stable so far; I am checking the latest results.`];
  [a,b].forEach((n,i)=>{n.data.lastConversation=now; n.data.routine='collaborating'; if(n.data.statusLabel)n.data.statusLabel.setText('↗ COLLABORATING').setColor('#93c5fd'); n.body.setVelocity(0,0); animateSprite(n,false,i===0?'right':'left');});
  const bubble=scene.add.text(a.x,(a.y+b.y)/2-62,dialogue[0],{fontFamily:'Arial',fontSize:'11px',color:'#f1f7ff',backgroundColor:'#102033ee',padding:{x:7,y:5},wordWrap:{width:230}}).setOrigin(0.5).setDepth(4000);
  officeConversationBubbles.push({bubble,a,b,dialogue,started:now,phase:0});
  scene.time.delayedCall(2300,()=>{if(!bubble.active)return;bubble.setText(dialogue[1]).setPosition(b.x,b.y-62);});
  scene.time.delayedCall(4800,()=>{if(bubble.active)bubble.destroy();officeConversationBubbles=officeConversationBubbles.filter(x=>x.bubble!==bubble);[a,b].forEach(n=>{if(n.active&&n.data&&!n.data.missionResponding){n.data.wait=Math.max(n.data.wait||0,500);n.data.routine='working';if(n.data.statusLabel)n.data.statusLabel.setText('⌨ RETURNING TO TASK').setColor('#9ee7c1');}});});
}

function update() {
  if(!player || !player.body) return;
  const speed=190, body=player.body;
  body.setVelocity(0);
  if(!isDialogueOpen && !isJournalOpen && (!window.__APP || window.__APP.route === 'hub')){
    if(cursors.left.isDown||keys.A.isDown){body.setVelocityX(-speed);lastFacing='left';}
    else if(cursors.right.isDown||keys.D.isDown){body.setVelocityX(speed);lastFacing='right';}
    if(cursors.up.isDown||keys.W.isDown){body.setVelocityY(-speed);lastFacing='up';}
    else if(cursors.down.isDown||keys.S.isDown){body.setVelocityY(speed);lastFacing='down';}
    body.velocity.normalize().scale(speed);
  }
  const moving=Math.abs(body.velocity.x)+Math.abs(body.velocity.y)>1;
  animateSprite(player,moving,lastFacing);
  player.setDepth(player.y);
  activeNPC=null; let nearest=92;
  const now = this.time ? this.time.now : performance.now();
  npcs.forEach(npc=>{
    if(!npc.active)return;
    // Every employee has an autonomous routine: travel between task points,
    // pause to work, then move again. Mission-giving staff also keep their role.
    const data = npc.data || {};
    if (!isDialogueOpen && !isJournalOpen && data.patrol && data.patrol.length > 1) {
      // Clamp delta to avoid huge jumps after a background tab or slow frame.
      const delta = Math.min(50, this.game.loop.delta || 16);
      data.wait = Math.max(0, (data.wait || 0) - delta);
      if (data.wait <= 0) {
        if (data.seatedAt && !data.missionResponding) { clearNPCWorkPose(npc); data.routeIndex=((data.routeIndex||0)+1)%data.patrol.length; }
        // Choose the next waypoint before moving. On first update, skip a waypoint
        // already occupied so staff do not idle at their spawn forever.
        let target = data.patrol[data.routeIndex || 0];
        // Pathfind around solid walls and furniture instead of steering directly
        // through them. Recompute whenever the destination changes or the route ends.
        if (!data.pathQueue || data.pathTarget !== target) {
          data.pathQueue = findOfficePath(this, npc.x, npc.y, target[0], target[1]);
          data.pathTarget = target;
        }
        while (data.pathQueue && data.pathQueue.length && Math.hypot(data.pathQueue[0][0]-npc.x,data.pathQueue[0][1]-npc.y)<15) data.pathQueue.shift();
        const nextPoint = data.pathQueue && data.pathQueue.length ? data.pathQueue[0] : target;
        let dx = nextPoint[0] - npc.x, dy = nextPoint[1] - npc.y;
        let dist = Math.hypot(dx,dy);
        if (dist < 18 && data.missionResponding && data.responseDesk && !data.responseSeated) {
          setNPCWorkPose(this,npc,data.responseDesk,'reading'); data.responseSeated=true; data.wait=5000;
        } else if (dist < 18) {
          const targetIsDesk = data.homeWorkstation && Math.abs(target[0]-data.homeWorkstation.x)<2 && Math.abs(target[1]-(data.homeWorkstation.y+76))<2;
          if (targetIsDesk && !data.seatedAt) {
            setNPCWorkPose(this,npc,data.homeWorkstation, data.workIndex%3===1?'reading':'typing');
            data.wait = 9000 + Math.abs(Math.sin((data.phase||0)+now/1800))*5000;
            data.routine = data.workActivity;
          } else {
            if (data.seatedAt) clearNPCWorkPose(npc);
            data.routeIndex = ((data.routeIndex || 0) + 1) % data.patrol.length;
            target = data.patrol[data.routeIndex];
            dx = target[0] - npc.x; dy = target[1] - npc.y; dist = Math.hypot(dx,dy);
            data.wait = 650 + Math.abs(Math.sin((data.phase || 0) + now/1800))*1100;
            data.workIndex = ((data.workIndex || 0) + 1) % 5;
            data.routine = ['typing','reviewing','monitoring','collaborating','taking notes'][data.workIndex];
            if (data.statusLabel) data.statusLabel.setText(['⌨ TYPING','▤ REVIEWING','◉ MONITORING','↗ TEAMWORK','✎ NOTES'][data.workIndex]).setColor('#9ee7c1');
          }
        }
        if (dist >= 18) {
          const v = data.responding ? 62 : (data.ambient ? 58 : 52);
          npc.body.setVelocity(dx / dist * v, dy / dist * v);
          npc.facing = Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
          animateSprite(npc,true,npc.facing);
        } else {
          npc.body.setVelocity(0,0); animateSprite(npc,false,npc.facing || 'down');
        }
      } else {
        npc.body.setVelocity(0,0);
        if (npc.anims && npc.anims.isPlaying && String(npc.anims.currentAnim.key).includes('-walk-')) animateSprite(npc,false,npc.facing || 'down');
      }
    } else if (npc.body) npc.body.setVelocity(0,0);
    const d=Phaser.Math.Distance.Between(player.x,player.y,npc.x,npc.y);
    if(d<nearest){nearest=d;activeNPC=npc.data;activeNPC.path=npc.data.path;activeNPC.x=npc.x;activeNPC.y=npc.y;}
    if (npc.data && npc.data.statusLabel) npc.data.statusLabel.setPosition(npc.data.seatedAt ? npc.data.seatedAt.x : npc.x, (npc.data.seatedAt ? npc.data.seatedAt.y+12 : npc.y)-58).setDepth(npc.y+30);
    if (npc.data && npc.data.ambient && npc.data.patrol && npc.data.patrol.length > 1) updateNPCVisual(npc);
    else if(npc.anims && !npc.anims.isPlaying) npc.play('human-'+(npc.data && npc.data.variant ? npc.data.variant : 'staff1')+'-idle-down');
  });
  // Periodic simulated incident: the wallboard changes and relevant staff briefly
  // gather in their department area, then return to their own work routes.
  if (this.__nextIncidentAt && now >= this.__nextIncidentAt && !this.__incidentActive) {
    this.__incidentActive = true; this.__incidentCycle++;
    const incidents = [
      {text:'⚠ ALERT: Suspicious authentication burst — SOC investigating', color:'#fca5a5', names:['Alex','Sam','Rin']},
      {text:'⚠ NETWORK: DNS latency reported — Network team diagnosing', color:'#fde68a', names:['Dana','Mira','Nadia']},
      {text:'⚠ CHANGE REVIEW: Security rule update awaiting validation', color:'#c4b5fd', names:['Zero','Nadia','Kai']}
    ];
    const incident = incidents[(this.__incidentCycle-1)%incidents.length];
    if (this.__officeWallboard) this.__officeWallboard.setText(incident.text).setColor(incident.color).setBackgroundColor('#34131ddd');
    npcs.forEach(n => {
      const d=n.data || {};
      if (incident.names.includes(d.name)) {
        d.savedPatrol = d.patrol; d.responding = true; d.routine='incident response';
        if (d.statusLabel) d.statusLabel.setText('⚠ RESPONDING').setColor('#fca5a5');
        if(!d.responseRing)d.responseRing=this.add.circle(n.x,n.y+8,25,0xf87171,0.12).setStrokeStyle(2,0xf87171,0.85).setDepth(n.y-1);
        // Turn toward the operations wallboard and use a short response animation.
        n.facing='left'; animateSprite(n,false,'left');
      }
    });
    this.time.delayedCall(9000, () => {
      npcs.forEach(n => { const d=n.data||{}; if(d.responding){d.responding=false;d.wait=400;d.workIndex=(d.workIndex+1)%5;if(d.statusLabel)d.statusLabel.setColor('#9ee7c1').setText(['⌨ TYPING','▤ REVIEWING','◉ MONITORING','↗ TEAMWORK','✎ NOTES'][d.workIndex]); if(d.responseRing){d.responseRing.destroy();d.responseRing=null;}} });
      if (this.__officeWallboard) this.__officeWallboard.setText('● OPERATIONS: INCIDENT ACKNOWLEDGED • VERIFYING').setColor('#9ee7c1').setBackgroundColor('#08111ddd');
      this.__incidentActive = false; this.__nextIncidentAt = (this.time ? this.time.now : performance.now()) + 48000;
    });
  }
  // Periodic meeting cue: nearby team members pause and face the meeting table.
  if (this.__meetingAt && now >= this.__meetingAt) {
    const meetingMembers = npcs.filter(n => ['Nadia','Dana','Alex','Kai'].includes((n.data||{}).name));
    meetingMembers.forEach(n => { const d=n.data||{}; d.wait=1200; d.workIndex=3; d.routine='team briefing'; if(d.statusLabel)d.statusLabel.setText('↗ TEAM BRIEFING'); animateSprite(n,false,'down'); });
    if (this.__officeWallboard && !this.__incidentActive) this.__officeWallboard.setText('↗ DAILY BRIEFING: NETWORK • SOC • TRAINEES').setColor('#93c5fd');
    this.__meetingAt = now + 65000;
    this.time.delayedCall(6500, () => { if(this.__officeWallboard && !this.__incidentActive)this.__officeWallboard.setText('● OPERATIONS: ALL SYSTEMS NOMINAL').setColor('#9ee7c1'); });
  }
  // Short, role-aware colleague conversations appear periodically without blocking movement.
  if (this.__conversationAt && now >= this.__conversationAt && !this.__incidentActive && !isDialogueOpen) {
    const pairs = [['Dana','Mira','Link is up; I am checking the route table.'],['Alex','Sam','I have the timestamps. Please preserve the endpoint evidence.'],['Zero','Rin','Scope is confirmed; record only what the lab permits.'],['Nadia','Kai','Show me the evidence before you change the system.']];
    const pair = pairs[Math.floor(now/12000)%pairs.length];
    const first = npcs.find(n=>(n.data||{}).name===pair[0]);
    const second = npcs.find(n=>(n.data||{}).name===pair[1]);
    if(first && second){
      [first,second].forEach((n,i)=>{const d=n.data||{};d.wait=Math.max(d.wait||0,650);d.routine='collaborating';if(d.statusLabel)d.statusLabel.setText('↗ TALKING TO TEAM').setColor('#93c5fd');n.facing=i===0?'right':'left';animateSprite(n,false,n.facing);});
      const bubble=this.add.text((first.x+second.x)/2,(first.y+second.y)/2-48,pair[2],{fontFamily:'Arial',fontSize:'10px',color:'#e5f3ff',backgroundColor:'#122438ee',padding:{x:8,y:5},wordWrap:{width:230},align:'center'}).setOrigin(0.5).setDepth(Math.max(first.y,second.y)+20);
      this.tweens.add({targets:bubble,alpha:0,y:bubble.y-8,duration:4800,delay:900,onComplete:()=>bubble.destroy()});
    }
    this.__conversationAt=now+18000;
  }
  // Animated workstation displays: terminal cursors, telemetry graphs and status colours.
  officeWorkstations.forEach((ws,i)=>{
    ws.phase += (this.game.loop.delta || 16) * 0.001;
    const mode = Math.floor((now/2600 + i*1.7) % 4);
    if (mode !== ws.mode) {
      ws.mode=mode;
      const palettes=[{bg:0x123b4a,fg:'#8df3d0',text:now%5200<2600?'> triage _':'> verify _'},{bg:0x182b4a,fg:'#9cc7ff',text:now%5200<2600?'NET ▂▅▇':'LAT 18ms'},{bg:0x44262c,fg:'#ffb4b4',text:now%5200<2600?'ALERT':'REVIEW'},{bg:0x26394a,fg:'#d2c5ff',text:now%5200<2600?'LOG 04':'AUTH OK'}];
      const pal=palettes[mode]; ws.screen.setFillStyle(pal.bg,1); ws.glow.setFillStyle(pal.bg,0.9); ws.screenText.setColor(pal.fg).setText(pal.text);
    }
    ws.glow.setAlpha(0.72 + Math.sin(ws.phase*3)*0.12);
  });
  // Typing is visible even when staff are stationary: tiny keyboard-hand pulses and chair posture.
  npcs.forEach(n=>{
    const d=n.data||{};
    if(d.statusLabel && /TYPING|MONITORING|REVIEWING|NOTES/.test(d.statusLabel.text)) {
      const pulse=0.5+Math.abs(Math.sin(now/130+(d.phase||0)))*0.5;
      d.statusLabel.setAlpha(0.72+pulse*0.25);
    }
    if(d.responseRing){d.responseRing.setPosition(n.x,n.y+8).setAlpha(0.28+Math.abs(Math.sin(now/220))*0.5);}
  });
  // Rotating short peer conversations make the office feel social without interrupting play.
  if (!isDialogueOpen && !isJournalOpen && now >= officeNextConversationAt) {
    startOfficeConversation(this, now);
    officeNextConversationAt = now + 9000 + Math.random()*7000;
  }
  // Animate keyboard hands and terminal cursor at each workstation.
  officeWorkstations.forEach((ws,i)=>{
    const pulse=0.5+Math.abs(Math.sin(now/105 + ws.typingPhase))*0.5;
    ws.leftHand.setAlpha(0.15+pulse*0.72).setY(ws.y+18+(pulse>0.75?2:0));
    ws.rightHand.setAlpha(0.15+(1-pulse)*0.72).setY(ws.y+18+(pulse<0.25?2:0));
    ws.cursor.setX(ws.x-13+Math.floor((now/450+i*3)%10)*2).setAlpha(0.2+0.8*Math.abs(Math.sin(now/230+i)));
  });
  if(activeNPC){promptText.setPosition(activeNPC.x,activeNPC.y-82).setVisible(!isDialogueOpen);}
  else promptText.setVisible(false);
}
function animateSprite(sprite,moving,facing) {
  if(!sprite || !sprite.active) return;
  sprite.facing=facing || sprite.facing || 'down';
  const prefix='human-'+(sprite.isPlayer?(sprite.spriteVariant || 'player'):(sprite.data && sprite.data.variant ? sprite.data.variant:'staff1'));
  const key=prefix+(moving?'-walk-':'-idle-')+sprite.facing;
  if(sprite.anims.currentAnim && sprite.anims.currentAnim.key===key) return;
  sprite.play(key,true);
}
