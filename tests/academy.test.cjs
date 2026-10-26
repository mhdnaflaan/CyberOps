const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const store = new Map();
const context = {window:{},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},console};
vm.createContext(context); vm.runInContext(fs.readFileSync('js/academy.js','utf8'),context);
const A=context.window.Academy;
assert.equal(A.paths.length,6); assert.equal(A.challengeCount,12);
const linux=A.paths.find(p=>p.id==='linux'); const c=linux.challenges[0];
assert.equal(c.initial.pwd,false); let state={...c.initial};
for(const cmd of ['pwd','ls','cat /home/operator/notes/incident.txt']){const r=A.execute(c,cmd,state);state=r.state;assert.ok(!r.output.includes('not recognised'),cmd)}
assert.equal(A.verify(c,state).ok,true);
const a=A.complete(c.id,c.xp); assert.equal(a.newlyCompleted,true); assert.equal(A.getProgress().completed.length,1);
assert.equal(A.complete(c.id,c.xp).newlyCompleted,false); assert.equal(A.getProgress().xp,c.xp);
const hack=A.paths.find(p=>p.id==='pentest').challenges[0]; let hs={...hack.initial};
assert.equal(A.execute(hack,'nmap -sV 192.0.2.10',hs).state.scanned,false);
for(const cmd of ['scope show','scope verify 192.0.2.10','nmap -sV 192.0.2.10'])hs=A.execute(hack,cmd,hs).state;
assert.equal(A.verify(hack,hs).ok,true);
console.log('Academy tests passed: six paths, 12 challenges, simulated command state, objective validation, persistent progress, no duplicate XP, scope-first lab.');
