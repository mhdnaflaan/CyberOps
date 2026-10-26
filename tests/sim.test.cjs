const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const events = [];
const enterprise = { services: { intranet: 'up', dns: 'up' }, tickets: [{ id:'INC-104', priority:'HIGH', title:'VPN alert', status:'OPEN', team:'SOC' }], changes: [], events: [], verified:{} };
const game = {
  get: () => ({ username:'Test', careerPath:'networking', xp:100 }),
  rankFor: () => 'IT Trainee',
  getEnterpriseState: () => enterprise,
  setEnterpriseService: (name,status) => { if (!(name in enterprise.services)) return {ok:false,message:'Unknown service'}; enterprise.services[name]=status; enterprise.events.unshift({at:Date.now(),category:'change',action:'service '+status,detail:name}); return {ok:true,status}; },
  verifyEnterpriseService: name => { if (!(name in enterprise.services)) return {ok:false,message:'Unknown service'}; const ok=enterprise.services[name]==='up'; enterprise.verified[name]=ok; enterprise.events.unshift({at:Date.now(),category:'verification',action:'verify',detail:name}); return {ok,status:enterprise.services[name]}; },
  addChangeRecord: summary => { const x={id:'CHG-101',summary,at:Date.now(),by:'Test'}; enterprise.changes.unshift(x); return x; }
};
const context = { window:{Game:game}, Date, String, Object, Number, Math, Array, JSON };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/sim.js','utf8'),context);
const Sim=context.window.Sim;
const mission={terminal:{commands:['help','company','services','service','verify','tickets','ticket','changes','change','history']}};
const run={flags:{},hosts:[],alerts:[],logs:[]};
let r=Sim.exec('company',{mission,run,net:null}); assert.ok(r.lines.some(x=>x.text.includes('simulated service health')));
r=Sim.exec('service stop intranet',{mission,run,net:null}); assert.equal(enterprise.services.intranet,'down');
r=Sim.exec('verify intranet',{mission,run,net:null}); assert.equal(r.flags['verify:intranet'],false);
Sim.exec('service start intranet',{mission,run,net:null});
r=Sim.exec('verify intranet',{mission,run,net:null}); assert.equal(r.flags['verify:intranet'],true);
r=Sim.exec('ticket INC-104',{mission,run,net:null}); assert.ok(r.flags['ticket:INC-104']);
r=Sim.exec('change record documented recovery',{mission,run,net:null}); assert.ok(r.flags['change:CHG-101']);
r=Sim.exec('service stop 192.0.2.1',{mission,run,net:null}); assert.ok(r.lines.some(x=>x.cls==='err'));
console.log('Simulation tests passed: enterprise overview, service changes, verification, ticket lookup, change logging, invalid service handling.');
