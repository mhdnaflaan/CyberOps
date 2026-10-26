const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const enterprise = {
  services: { intranet: 'up', dns: 'up', vpn: 'up', 'file-share': 'up', monitoring: 'up' },
  devices: [
    {id:'ws-01',name:'Analyst Workstation',ip:'10.10.10.25',segment:'USER-LAN',status:'up'},
    {id:'sw-01',name:'Access Switch',ip:'10.10.10.2',segment:'USER-LAN',status:'up'},
    {id:'fw-01',name:'Edge Firewall',ip:'10.10.10.1',segment:'EDGE',status:'up'},
    {id:'dns-01',name:'Internal DNS Server',ip:'10.10.20.53',segment:'SERVER-LAN',status:'up'},
    {id:'web-01',name:'Intranet Web Server',ip:'10.10.20.20',segment:'SERVER-LAN',status:'up'},
    {id:'siem-01',name:'Monitoring Collector',ip:'10.10.30.15',segment:'SECURITY-LAN',status:'up'}
  ], logs: [{at:Date.now(),host:'web-01',event:'service health check',severity:'INFO',detail:'passed'}]
};
const store = {};
const game = { getEnterpriseState:()=>enterprise, setEnterpriseDevice:(id,status)=>{const d=enterprise.devices.find(x=>x.id===id);if(!d)return {ok:false};d.status=status;return {ok:true};} };
const context = { window:{Game:game}, localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]}, Date, String, Object, Number, Math, Array, JSON, Set, URL };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/command-engine.js','utf8'),context);
const lab=context.window.CommandLab;
let r=lab.exec('commands',{run:{hosts:[],logs:[]}}); assert.ok(r.lines.some(x=>x.text.includes('Windows:')));
r=lab.exec('connect ws-01',{run:{hosts:[],logs:[]}}); assert.ok(r.lines.some(x=>x.text.includes('Connected to ws-01')));
r=lab.exec('ipconfig /all',{run:{hosts:[],logs:[]}}); assert.ok(r.lines.some(x=>x.text.includes('10.10.10.25')));
r=lab.exec('ping 10.10.20.20',{run:{hosts:[],logs:[]}}); assert.ok(r.lines.some(x=>x.text.includes('0% loss')));
r=lab.exec('nslookup intranet.cyberops.test',{run:{hosts:[],logs:[]}}); assert.ok(r.lines.some(x=>x.text.includes('10.10.20.20')));
r=lab.exec('show ip interface brief',{run:{hosts:[],logs:[]}}); assert.ok(r.lines.some(x=>x.text.includes('simulated Cisco access switch')));
r=lab.exec('connect sw-01',{run:{hosts:[],logs:[]}}); assert.ok(r.lines.some(x=>x.text.includes('Connected to sw-01')));
r=lab.exec('show ip interface brief',{run:{hosts:[],logs:[]}}); assert.ok(r.lines.some(x=>x.text.includes('GigabitEthernet0/1')));
lab.exec('interface GigabitEthernet0/1',{run:{hosts:[],logs:[]}}); r=lab.exec('shutdown',{run:{hosts:[],logs:[]}}); assert.ok(r.lines.some(x=>x.text.includes('shut down'))); assert.equal(enterprise.devices.find(x=>x.id==='sw-01').status,'down');
r=lab.exec('ping 10.10.20.20',{run:{hosts:[],logs:[]}}); assert.ok(r.lines.some(x=>x.text.includes('100% loss')));
lab.exec('no shutdown',{run:{hosts:[],logs:[]}}); assert.equal(enterprise.devices.find(x=>x.id==='sw-01').status,'up');
r=lab.exec('nmap -sV 203.0.113.99',{run:{hosts:[],logs:[]}}); assert.ok(r.lines.some(x=>x.text.includes('SCOPE BLOCK')));
r=lab.exec('nmap -sV 10.10.20.20',{run:{hosts:[],logs:[]}}); assert.ok(r.lines.some(x=>x.text.includes('no packets sent')));
r=lab.exec('sha256sum suspicious_file.txt',{run:{hosts:[],logs:[]}}); assert.ok(r.lines.some(x=>x.text.includes('suspicious_file.txt')));
r=lab.exec('nmap -sn 10.10.20.0/24',{run:{hosts:[],logs:[]}}); assert.ok(r.lines.some(x=>x.text.includes('simulated host(s) discovered')));
r=lab.exec('nmap -sn 192.168.1.0/24',{run:{hosts:[],logs:[]}}); assert.ok(r.lines.some(x=>x.text.includes('SCOPE BLOCK')));
r=lab.exec('curl -I http://intranet.cyberops.test',{run:{hosts:[],logs:[]}}); assert.ok(r.lines.some(x=>x.text.includes('HTTP/1.1 200 OK')));
r=lab.exec('curl -I http://example.com',{run:{hosts:[],logs:[]}}); assert.ok(r.lines.some(x=>x.text.includes('SCOPE BLOCK')));
r=lab.exec('gobuster dir -u http://intranet.cyberops.test -w common.txt',{run:{hosts:[],logs:[]}}); assert.ok(r.lines.some(x=>x.text.includes('/backup')));
r=lab.exec('whatweb http://intranet.cyberops.test',{run:{hosts:[],logs:[]}}); assert.ok(r.lines.some(x=>x.text.includes('HTTPServer')));
r=lab.exec('nikto -h http://intranet.cyberops.test',{run:{hosts:[],logs:[]}}); assert.ok(r.lines.some(x=>x.text.includes('training finding')));
r=lab.exec('nc -vz 10.10.20.20 443',{run:{hosts:[],logs:[]}}); assert.ok(r.lines.some(x=>x.text.includes('succeeded (simulated)')));
console.log('Command Lab tests passed: device sessions, OS/Cisco commands, DNS, state-aware network checks, interface recovery, scoped Nmap discovery/service detection, simulated curl/Gobuster/WhatWeb/Nikto/netcat, scope blocks and hashes.');
