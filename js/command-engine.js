/* CyberOps Command Lab v1
 * Browser-only, state-aware command interpreter. It NEVER invokes the host shell,
 * subprocesses, network sockets, or real scanning tools. The adapter boundary is
 * intentionally small so a future isolated lab backend can implement the same API.
 */
window.CommandLab = (function () {
  'use strict';
  const STORAGE_KEY = 'cyberops.commandlab.v1';
  const DEVICE_MAP = {
    'ws-01': { host: 'ANALYST-WS', os: 'Windows 11 (simulated)', ip: '10.10.10.25', mask: '255.255.255.0', gateway: '10.10.10.1', dns: '10.10.20.53', segment: 'USER-LAN', type: 'workstation' },
    'sw-01': { host: 'ACCESS-SW1', os: 'Cisco IOS-style (simulated)', ip: '10.10.10.2', mask: '255.255.255.0', gateway: '10.10.10.1', dns: '10.10.20.53', segment: 'USER-LAN', type: 'switch' },
    'fw-01': { host: 'EDGE-FW1', os: 'Network appliance (simulated)', ip: '10.10.10.1', mask: '255.255.255.0', gateway: '10.10.10.254', dns: '10.10.20.53', segment: 'EDGE', type: 'firewall' },
    'dns-01': { host: 'DNS-SRV1', os: 'Linux server (simulated)', ip: '10.10.20.53', mask: '255.255.255.0', gateway: '10.10.20.1', dns: '127.0.0.1', segment: 'SERVER-LAN', type: 'server' },
    'web-01': { host: 'INTRANET-WEB1', os: 'Linux server (simulated)', ip: '10.10.20.20', mask: '255.255.255.0', gateway: '10.10.20.1', dns: '10.10.20.53', segment: 'SERVER-LAN', type: 'server' },
    'siem-01': { host: 'SIEM-COLLECTOR', os: 'Linux server (simulated)', ip: '10.10.30.15', mask: '255.255.255.0', gateway: '10.10.30.1', dns: '10.10.20.53', segment: 'SECURITY-LAN', type: 'server' }
  };
  const DNS = { 'intranet.cyberops.test': '10.10.20.20', 'dns.cyberops.test': '10.10.20.53', 'siem.cyberops.test': '10.10.30.15', 'gateway.cyberops.test': '10.10.10.1' };
  const SERVICES = { '10.10.20.20': ['22/tcp open ssh', '80/tcp open http', '443/tcp open https'], '10.10.20.53': ['22/tcp open ssh', '53/tcp open domain'], '10.10.30.15': ['22/tcp open ssh', '514/udp open syslog'] };
  function loadConfig() {
    const base = { mode: 'exec', device: 'ws-01', selectedInterface: 'GigabitEthernet0/1', interfaces: { 'GigabitEthernet0/1': { ip: '10.10.10.2', mask: '255.255.255.0', status: 'up', vlan: 10 }, 'GigabitEthernet0/2': { ip: 'unassigned', mask: 'unassigned', status: 'up', vlan: 20 }, 'Vlan10': { ip: '10.10.10.2', mask: '255.255.255.0', status: 'up', vlan: 10 } }, vlans: [10,20,30], saved: true };
    try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); if (saved && saved.interfaces && saved.vlans) return Object.assign(base, saved); } catch (_) {}
    return base;
  }
  let config = loadConfig();
  function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch (_) {} }
  function out(lines, flags) { return { lines: lines.map(x => typeof x === 'string' ? { text: x, cls: 'sys' } : x), flags: flags || {} }; }
  function line(text, cls) { return { text, cls: cls || 'sys' }; }
  function ipValid(s) { return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(s || '') && s.split('.').every(n => +n >= 0 && +n <= 255); }
  function enterprise(ctx) { try { return window.Game && window.Game.getEnterpriseState ? window.Game.getEnterpriseState() : null; } catch (_) { return null; } }
  function dev(ctx, id) { const e = enterprise(ctx); const real = e && e.devices && e.devices.find(d => d.id === id); return real ? Object.assign({}, DEVICE_MAP[id] || {}, real) : (DEVICE_MAP[id] ? Object.assign({}, DEVICE_MAP[id]) : null); }
  function status(ctx, id) { const d = dev(ctx, id); return d ? d.status || 'up' : 'down'; }
  function active(ctx) { const session = ctx.labSession || (ctx.labSession = {}); const missionDevices = ctx.net && ctx.net.devices; const missionId = ctx.activeDeviceId || (ctx.mission && ctx.mission.terminal && ctx.mission.terminal.device); const requested = session.device || config.device || 'ws-01'; const id = missionDevices && (missionDevices[requested] || missionDevices[missionId]) ? (missionDevices[requested] ? requested : missionId) : requested; if (missionDevices && missionDevices[id]) { const md = missionDevices[id], iface = Object.values(md.ifaces || {})[0] || {}; return { id, d: { host: md.name || md.id || id, os: 'Mission lab OS (simulated)', ip: iface.ip || 'unassigned', mask: iface.mask || 'unassigned', gateway: iface.gateway || 'unassigned', dns: iface.dns || 'not configured', segment: 'MISSION-LAB', type: md.type || 'host', status: iface.up === false ? 'down' : 'up' } }; } return { id, d: dev(ctx, id) || dev(ctx, 'ws-01') }; }
  function dnsUp(ctx) { const e = enterprise(ctx); return !e || !e.services || e.services.dns === 'up'; }
  function reachable(ctx, ip) {
    if (!ipValid(ip)) return false;
    if (ctx.net && window.Sim && window.Sim.isReachable) { const src = active(ctx); if (ctx.net.devices && ctx.net.devices[src.id]) return window.Sim.isReachable(ctx.net, src.id, ip); }
    const e = enterprise(ctx); const d = e && e.devices && e.devices.find(x => x.ip === ip);
    if (d && d.status !== 'up') return false;
    const src = active(ctx); if (src.d && src.d.status === 'down') return false;
    if (src.id === 'sw-01' && config.interfaces[config.selectedInterface] && config.interfaces[config.selectedInterface].status === 'down') return false;
    return !!(d || Object.values(DEVICE_MAP).some(x => x.ip === ip));
  }
  function command(raw, ctx) {
    const text = String(raw || '').trim(); if (!text) return null;
    const args = text.split(/\s+/); const lower = args.map(x => x.toLowerCase());
    const cmd = lower[0], a = args.slice(1), al = lower.slice(1); const lines = []; const flags = {};
    const activeDev = active(ctx); const d = activeDev.d || DEVICE_MAP['ws-01']; const id = activeDev.id;
    const usage = (s) => lines.push(line('Usage: ' + s, 'warn'));
    const known = new Set(['connect','terminal','hostname','ipconfig','ip','ping','tracert','traceroute','nslookup','dig','arp','netstat','ss','show','configure','interface','shutdown','no','vlan','switchport','write','exit','end','nmap','curl','gobuster','whatweb','nikto','nc','grep','sha256sum','journalctl','help-real','commands']);
    if (!known.has(cmd)) return null;
    if (['show','configure','interface','shutdown','no','vlan','switchport','write'].includes(cmd) && id !== 'sw-01') { lines.push(line('This command family is available on the simulated Cisco access switch. Run `connect sw-01` first.', 'err')); return out(lines); }
    if (cmd === 'commands' || cmd === 'help-real') {
      lines.push(line('REAL-WORLD SYNTAX · STATE-AWARE BROWSER SIMULATION', 'ok'));
      lines.push(line('Device/session: connect <ws-01|sw-01|fw-01|dns-01|web-01|siem-01> · terminal', 'sys'));
      lines.push(line('Windows: hostname · ipconfig /all · ping <IP> · tracert <IP> · nslookup <name> · arp -a · netstat -ano', 'sys'));
      lines.push(line('Linux: ip addr · ip route · ping <IP> · traceroute <IP> · dig <name> · ss -tuln · grep <text> auth.log · journalctl', 'sys'));
      lines.push(line('Cisco IOS-style: show ip interface brief · show ip route · show vlan brief · show running-config · configure terminal', 'sys'));
      lines.push(line('Lab tools: nmap -sn <in-scope-CIDR> · nmap -sV <in-scope-IP> · curl -I <lab-URL>', 'sys'));
      lines.push(line('Web assessment (simulated): gobuster dir -u <lab-URL> -w common.txt · whatweb <lab-URL> · nikto -h <lab-URL> · nc -vz <in-scope-IP> <port>', 'sys'));
      lines.push(line('Evidence: grep <text> auth.log · journalctl · sha256sum <filename>', 'sys'));
      lines.push(line('Existing game tools: company, services, diagnose, scenario, tickets, verify, resolve, logs.', 'sys'));
      lines.push(line('These commands are parsed locally; no host shell, real network, or real Nmap scan is executed.', 'warn'));
      return out(lines, flags);
    }
    if (cmd === 'connect') {
      const target = (a[0] || '').toLowerCase(); if (!DEVICE_MAP[target]) { usage('connect <ws-01|sw-01|fw-01|dns-01|web-01|siem-01>'); return out(lines); }
      if (status(ctx, target) !== 'up') { lines.push(line('Connection refused: device is marked DOWN in the simulated inventory.', 'err')); return out(lines); }
      if (!ctx.labSession) ctx.labSession = {}; ctx.labSession.device = target; config.device = target; persist();
      lines.push(line('Connected to ' + target + ' · ' + DEVICE_MAP[target].os, 'ok')); lines.push(line('This is a simulated device session, not a real remote connection.', 'warn')); return out(lines, { ['lab:connect:' + target]: true });
    }
    if (cmd === 'terminal') { lines.push(line('Session: ' + id + ' | ' + d.os + ' | Hostname: ' + d.host, 'sys')); lines.push(line('Use commands or `connect <device-id>` to switch simulated devices.', 'sys')); return out(lines); }
    if (cmd === 'hostname') { lines.push(line(d.host, 'ok')); flags['cmd:hostname'] = true; return out(lines, flags); }
    if (cmd === 'ipconfig') {
      if ((al[0] || '') !== '/all') { lines.push(line('Windows IP Configuration', 'sys')); lines.push(line('Use `ipconfig /all` for the detailed simulated adapter view.', 'sys')); }
      else { lines.push(line('Windows IP Configuration (simulated)', 'sys')); lines.push(line('Host Name . . . . . . . . . . . : ' + d.host, 'sys')); lines.push(line('Ethernet adapter Ethernet0:', 'sys')); lines.push(line('   IPv4 Address. . . . . . . . . : ' + d.ip, 'ok')); lines.push(line('   Subnet Mask . . . . . . . . . : ' + d.mask, 'sys')); lines.push(line('   Default Gateway . . . . . . . : ' + d.gateway, 'sys')); lines.push(line('   DNS Servers . . . . . . . . . : ' + d.dns, dnsUp(ctx) ? 'sys' : 'err')); lines.push(line('   Media State . . . . . . . . . : ' + (status(ctx,id) === 'up' ? 'connected' : 'disconnected'), status(ctx,id) === 'up' ? 'ok' : 'err')); }
      flags['cmd:ipconfig'] = true; return out(lines, flags);
    }
    if (cmd === 'ip') {
      if (al[0] === 'addr' || al[0] === 'address' || al[0] === 'a') { lines.push(line('1: lo: <LOOPBACK,UP> inet 127.0.0.1/8', 'sys')); lines.push(line('2: eth0: <BROADCAST,MULTICAST,' + (status(ctx,id)==='up'?'UP':'DOWN') + '> inet ' + d.ip + '/24', status(ctx,id)==='up'?'ok':'err')); lines.push(line('    link/ether 02:cy:be:00:' + d.ip.split('.').slice(-2).map(x => (+x).toString(16).padStart(2,'0')).join(':') + ' brd ff:ff:ff:ff:ff:ff', 'sys')); return out(lines, { 'cmd:ipconfig': true }); }
      if (al[0] === 'route') { lines.push(line('default via ' + d.gateway + ' dev eth0', 'sys')); lines.push(line(d.ip.slice(0,d.ip.lastIndexOf('.')) + '.0/24 dev eth0 proto kernel src ' + d.ip, 'sys')); lines.push(line('10.10.20.0/24 via ' + d.gateway + ' dev eth0', 'sys')); lines.push(line('10.10.30.0/24 via ' + d.gateway + ' dev eth0', 'sys')); return out(lines); }
      usage('ip addr | ip route'); return out(lines);
    }
    if (cmd === 'ping') {
      const target = a.find(x => ipValid(x)); if (!target) { usage('ping <IPv4 address>'); return out(lines); }
      if (reachable(ctx,target)) { lines.push(line('PING ' + target + ' (32 bytes):', 'sys')); for (let n=0;n<4;n++) lines.push(line('Reply from ' + target + ': bytes=32 time=' + (1+n) + 'ms TTL=' + (target.startsWith('10.10.20.')?63:128), 'ok')); lines.push(line('Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)', 'ok')); flags['ping:'+target]=true; }
      else { lines.push(line('Pinging ' + target + ' with 32 bytes of data:', 'sys')); for(let n=0;n<4;n++) lines.push(line('Request timed out.', 'err')); lines.push(line('Packets: Sent = 4, Received = 0, Lost = 4 (100% loss)', 'err')); }
      return out(lines,flags);
    }
    if (cmd === 'tracert' || cmd === 'traceroute') {
      const target = a.find(x => ipValid(x)); if (!target) { usage(cmd+' <IPv4 address>'); return out(lines); }
      lines.push(line('Tracing route to ' + target + ' over a maximum of 8 hops', 'sys'));
      if (reachable(ctx,target)) { lines.push(line('  1    1 ms    1 ms    1 ms  ' + d.gateway, 'ok')); if (!target.startsWith('10.10.10.')) lines.push(line('  2    2 ms    2 ms    3 ms  10.10.20.1', 'ok')); lines.push(line('  ' + (target.startsWith('10.10.10.')?2:3) + '    3 ms    2 ms    3 ms  ' + target, 'ok')); lines.push(line('Trace complete.', 'ok')); flags['tracert:'+target]=true; }
      else { lines.push(line('  1    1 ms    1 ms    1 ms  ' + d.gateway, 'sys')); lines.push(line('  2     *        *        *     Request timed out.', 'err')); lines.push(line('Trace incomplete: simulated route or destination unavailable.', 'warn')); }
      return out(lines,flags);
    }
    if (cmd === 'nslookup' || cmd === 'dig') {
      const name = a.find(x => !x.startsWith('@'));
      if (!name) { usage(cmd==='dig'?'dig <hostname>':'nslookup <hostname>'); return out(lines); }
      const found = (ctx.run && ctx.run.dnsRecords && ctx.run.dnsRecords[name]) || DNS[name.toLowerCase()];
      const missionIface = ctx.net && ctx.net.devices && ctx.net.devices[id] && Object.values(ctx.net.devices[id].ifaces || {})[0];
      if (ctx.run && ctx.run.approvedDns && missionIface && missionIface.dns !== ctx.run.approvedDns) { lines.push(line('Server: ' + (missionIface.dns || 'not configured') + '\nDNS request timed out. Check the configured resolver.', 'err')); return out(lines); }
      if (!dnsUp(ctx) && id !== 'dns-01') { lines.push(line('DNS query timed out: internal resolver 10.10.20.53 is DOWN.', 'err')); }
      else if (found) { if(cmd==='dig') { lines.push(line(';; ->>HEADER<<- status: NOERROR', 'sys')); lines.push(line(';; QUESTION: ' + name + ' IN A', 'sys')); lines.push(line(name + '. 300 IN A ' + found, 'ok')); } else { lines.push(line('Server:  ' + d.dns, 'sys')); lines.push(line('Name:    ' + name, 'sys')); lines.push(line('Address: ' + found, 'ok')); } flags['nslookup:'+name]=true; }
      else { lines.push(line(cmd==='dig'?'status: NXDOMAIN':'*** No record found for '+name, 'warn')); }
      return out(lines,flags);
    }
    if (cmd === 'arp' && al[0] === '-a') { lines.push(line('Interface: ' + d.ip, 'sys')); lines.push(line('  Internet Address      Physical Address      Type', 'sys')); lines.push(line('  ' + d.gateway.padEnd(22) + ' 02-10-10-10-00-01      dynamic', 'sys')); lines.push(line('  10.10.10.2             02-10-10-10-00-02      dynamic', 'sys')); if(reachable(ctx,'10.10.20.20')) lines.push(line('  10.10.20.20            02-10-20-20-00-20      dynamic','sys')); return out(lines); }
    if (cmd === 'netstat' && al[0] === '-ano') { lines.push(line('Proto  Local Address          Foreign Address        State       PID', 'sys')); lines.push(line('TCP    '+d.ip+':49822       10.10.20.20:443        ESTABLISHED 2416', 'ok')); lines.push(line('TCP    '+d.ip+':49823       10.10.20.53:53         ESTABLISHED 1180', dnsUp(ctx)?'sys':'err')); lines.push(line('TCP    0.0.0.0:445          0.0.0.0:0              LISTENING   4', 'sys')); return out(lines); }
    if (cmd === 'ss' && al[0] === '-tuln') { lines.push(line('Netid State  Recv-Q Send-Q Local Address:Port Peer Address:Port', 'sys')); lines.push(line('tcp   LISTEN 0      128    0.0.0.0:22       0.0.0.0:*', 'sys')); if(id==='dns-01') lines.push(line('udp   UNCONN 0      0      0.0.0.0:53       0.0.0.0:*',status(ctx,id)==='up'?'ok':'err')); if(id==='web-01') { lines.push(line('tcp   LISTEN 0      128    0.0.0.0:80       0.0.0.0:*', 'sys')); lines.push(line('tcp   LISTEN 0      128    0.0.0.0:443      0.0.0.0:*', 'sys')); } return out(lines); }
    // Web and transport tools use a small fictional target catalogue. URLs/IPs
    // outside this catalogue are rejected; no browser fetch or socket is opened.
    function labUrl(rawUrl) {
      try {
        const u = new URL(rawUrl);
        const host = u.hostname.toLowerCase();
        const allowed = ['intranet.cyberops.test', 'web.cyberops.test', '10.10.20.20'];
        return ['http:', 'https:'].includes(u.protocol) && allowed.includes(host) ? u : null;
      } catch (_) { return null; }
    }
    if (cmd === 'curl') {
      const urlArg = a.find(x => /^https?:\/\//i.test(x));
      if (!urlArg) { usage('curl -I http://intranet.cyberops.test'); return out(lines); }
      const u = labUrl(urlArg);
      if (!u) { lines.push(line('SCOPE BLOCK: curl simulation accepts only intranet.cyberops.test, web.cyberops.test, or 10.10.20.20.', 'err')); return out(lines); }
      const e = enterprise(ctx); const webUp = !(e && e.services && e.services.intranet !== 'up');
      if (!webUp || !reachable(ctx, '10.10.20.20')) { lines.push(line('curl: (7) Failed to connect to ' + u.hostname + ' port ' + (u.port || (u.protocol==='https:'?'443':'80')) + ': simulated service unavailable', 'err')); return out(lines); }
      lines.push(line('HTTP/1.1 200 OK', 'ok')); lines.push(line('Server: CyberOps-Web/2.4 (simulated)', 'sys')); lines.push(line('Content-Type: text/html; charset=UTF-8', 'sys')); lines.push(line('X-Content-Type-Options: nosniff', 'sys')); lines.push(line('Strict-Transport-Security: max-age=31536000 (HTTPS profile)', 'sys')); lines.push(line('Transfer-Encoding: chunked', 'sys')); lines.push(line('Response generated from fictional lab data; no request was sent.', 'warn')); return out(lines, {['web:headers:'+u.hostname]:true,'cmd:curl':true});
    }
    if (cmd === 'gobuster') {
      const urlIndex = al.indexOf('-u'), wordIndex = al.indexOf('-w');
      if (al[0] !== 'dir' || urlIndex < 0 || !a[urlIndex+1]) { usage('gobuster dir -u http://intranet.cyberops.test -w common.txt'); return out(lines); }
      const u = labUrl(a[urlIndex+1]);
      if (!u) { lines.push(line('SCOPE BLOCK: directory enumeration is restricted to fictional CyberOps lab web hosts.', 'err')); return out(lines); }
      if (wordIndex >= 0 && a[wordIndex+1] !== 'common.txt' && a[wordIndex+1] !== 'small.txt') { lines.push(line('Wordlist not present in the fictional workspace. Available: common.txt, small.txt', 'err')); return out(lines); }
      if (!reachable(ctx, '10.10.20.20')) { lines.push(line('Target host unavailable in simulated inventory.', 'err')); return out(lines); }
      lines.push(line('Gobuster 3.x · directory mode (SIMULATED)', 'sys')); lines.push(line('Target: '+u.origin+' | Wordlist: '+(wordIndex>=0?a[wordIndex+1]:'common.txt'), 'sys'));
      [['/admin', '301'], ['/assets', '200'], ['/help', '200'], ['/backup', '403'], ['/login', '200']].forEach(([path,code])=>lines.push(line(u.origin+path+'  (Status: '+code+')', code==='403'?'warn':'ok')));
      lines.push(line('Results are deterministic training data, not a real HTTP enumeration.', 'warn')); return out(lines, {['web:dirs:'+u.hostname]:true,'cmd:gobuster':true});
    }
    if (cmd === 'whatweb') {
      const urlArg = a.find(x => /^https?:\/\//i.test(x)); if (!urlArg) { usage('whatweb http://intranet.cyberops.test'); return out(lines); }
      const u = labUrl(urlArg); if (!u) { lines.push(line('SCOPE BLOCK: WhatWeb simulation is limited to the fictional lab host allowlist.', 'err')); return out(lines); }
      lines.push(line(u.hostname+' [200 OK] (simulated)', 'ok')); lines.push(line('[HTTPServer] CyberOps-Web/2.4', 'sys')); lines.push(line('[HTML5] HTML5 doctype', 'sys')); lines.push(line('[Script] app.js', 'sys')); lines.push(line('[Title] CyberOps Intranet', 'sys')); lines.push(line('Fingerprints are fictional teaching indicators, not a live scan.', 'warn')); return out(lines, {['web:fingerprint:'+u.hostname]:true});
    }
    if (cmd === 'nikto') {
      const hi = al.indexOf('-h'); if (hi < 0 || !a[hi+1]) { usage('nikto -h http://intranet.cyberops.test'); return out(lines); }
      const u = labUrl(a[hi+1]); if (!u) { lines.push(line('SCOPE BLOCK: Nikto simulation only supports the fictional lab host allowlist.', 'err')); return out(lines); }
      lines.push(line('Nikto 2.x · web checks (SIMULATED)', 'sys')); lines.push(line('+ Target: '+u.origin, 'sys')); lines.push(line('+ /backup/: directory may be exposed (training finding; verify access controls)', 'warn')); lines.push(line('+ /server-status: not found (404)', 'sys')); lines.push(line('+ X-Frame-Options header: not observed in this fictional profile', 'warn')); lines.push(line('+ 0 host(s) tested beyond the fictional lab dataset.', 'sys')); lines.push(line('Treat these as leads to validate, not confirmed real vulnerabilities.', 'warn')); return out(lines, {['web:checks:'+u.hostname]:true});
    }
    if (cmd === 'nc') {
      const target = a.find(x => ipValid(x)); const portIndex = al.indexOf('port'); const port = Number(a[a.findIndex(x => ipValid(x))+1]);
      if (al[0] !== '-vz' || !target || !Number.isInteger(port) || port < 1 || port > 65535) { usage('nc -vz 10.10.20.20 443'); return out(lines); }
      const scope = Object.values(DEVICE_MAP).some(x=>x.ip===target) || (ctx.run && (ctx.run.hosts||[]).some(h=>h.ip===target));
      if (!scope) { lines.push(line('SCOPE BLOCK: netcat simulation only permits an IP inside the fictional lab inventory or mission scope.', 'err')); return out(lines); }
      const serviceLines = SERVICES[target] || []; const isOpen = serviceLines.some(x=>x.startsWith(port+'/')) && reachable(ctx,target);
      lines.push(line('Connection to '+target+' '+port+' port [tcp/*] '+(isOpen?'succeeded':'failed')+' (simulated)', isOpen?'ok':'warn'));
      lines.push(line('No TCP connection was opened; result came from local lab state.', 'warn')); return out(lines, {['portcheck:'+target+':'+port]:isOpen});
    }
    if (cmd === 'nmap' && al[0] === '-sn') {
      const cidr = a.find(x => /^\d{1,3}(?:\.\d{1,3}){3}\/(?:24|32)$/.test(x));
      const allowedCidrs = ['10.10.10.0/24','10.10.20.0/24','10.10.30.0/24'];
      if (!cidr) { usage('nmap -sn <in-scope-lab-CIDR, e.g. 10.10.20.0/24>'); return out(lines); }
      if (!allowedCidrs.includes(cidr)) { lines.push(line('SCOPE BLOCK: host discovery is restricted to the fictional lab subnets 10.10.10.0/24, 10.10.20.0/24 and 10.10.30.0/24.', 'err')); return out(lines); }
      const prefix = cidr.split('/')[0].split('.').slice(0,3).join('.')+'.';
      const hosts = Object.entries(DEVICE_MAP).filter(([deviceId,device])=>device.ip.startsWith(prefix) && reachable(ctx,device.ip));
      lines.push(line('Nmap 7.x host discovery (SIMULATED; no packets sent)', 'sys'));
      lines.push(line('Nmap scan report for '+cidr, 'sys'));
      if (!hosts.length) lines.push(line('No hosts reported up in simulated inventory.', 'warn'));
      hosts.forEach(([deviceId,device])=>{ lines.push(line('Host is up: '+device.ip+' ('+device.host+')', 'ok')); });
      lines.push(line(hosts.length+' simulated host(s) discovered. Inventory only; no packets were sent.', 'warn'));
      return out(lines, {'cmd:host-discovery':true});
    }
    if (cmd === 'nmap') {
      const target = a.find(x => ipValid(x)); if (!target) { usage('nmap -sV <in-scope lab IPv4>'); return out(lines); }
      const scope = (ctx.run && ctx.run.hosts || []).some(h=>h.ip===target) || Object.values(DEVICE_MAP).some(x=>x.ip===target);
      if (!scope) { lines.push(line('SCOPE BLOCK: target is not part of this fictional lab inventory or mission scope.', 'err')); return out(lines); }
      if (!reachable(ctx,target)) { lines.push(line('Note: Host seems down (simulated reachability check failed).', 'err')); return out(lines); }
      lines.push(line('Starting Nmap 7.x (SIMULATED; no packets sent)', 'sys')); lines.push(line('Nmap scan report for '+target, 'sys')); lines.push(line('Host is up (simulated).', 'ok')); const e=enterprise(ctx); const ports=(target==='10.10.20.20' && e && e.services && e.services.intranet!=='up')?['22/tcp open ssh','80/tcp closed http','443/tcp closed https']:(target==='10.10.20.53' && !dnsUp(ctx))?['22/tcp open ssh','53/tcp closed domain']:(SERVICES[target]||['80/tcp open http']); ports.forEach(s=>lines.push(line(s,/closed/.test(s)?'warn':'ok'))); lines.push(line('Service detection performed against fictional lab data only.', 'warn')); flags['discovered:'+target]=true; flags['cmd:scan']=true; return out(lines,flags);
    }
    if (cmd === 'grep') { const query = a[0]; if(!query) { usage('grep <text> auth.log'); return out(lines); } const e=enterprise(ctx); const logs=(e&&e.logs||[]).concat((ctx.run&&ctx.run.logs)||[]); const matches=logs.filter(l=>JSON.stringify(l).toLowerCase().includes(query.toLowerCase())).slice(0,12); if(!matches.length) lines.push(line('No matching entries in the available simulated logs.', 'warn')); else matches.forEach(l=>lines.push(line(new Date(l.at||Date.now()).toISOString()+' '+(l.host||'lab')+' '+(l.event||'event')+' '+(l.detail||l.user||''), /failed|suspicious|warn|error/i.test(JSON.stringify(l))?'warn':'sys'))); flags['cmd:logs']=true; return out(lines,flags); }
    if (cmd === 'journalctl') { const e=enterprise(ctx); const logs=e&&e.logs||[]; if(!logs.length) lines.push(line('-- No entries --','sys')); else logs.slice(0,10).forEach(l=>lines.push(line(new Date(l.at).toISOString()+' '+l.host+' '+l.event+': '+l.detail,/WARN|ERROR/.test(l.severity)?'warn':'sys'))); return out(lines,{'cmd:logs':true}); }
    if (cmd === 'sha256sum') { if(!a[0]) { usage('sha256sum <lab-filename>'); return out(lines); } const hashes={'sample.txt':'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855','suspicious_file.txt':'2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824','evidence.txt':'d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592'}; if(hashes[a[0]]) lines.push(line(hashes[a[0]]+'  '+a[0],'ok')); else lines.push(line('File not found in the fictional lab workspace. Available: sample.txt, suspicious_file.txt, evidence.txt','err')); return out(lines); }
    if (cmd === 'show') {
      if (al[0] === 'ip' && al[1] === 'interface' && al[2] === 'brief') { lines.push(line('Interface              IP-Address      OK? Method Status                Protocol','sys')); Object.entries(config.interfaces).forEach(([name,v])=>lines.push(line(name.padEnd(23)+(v.ip||'unassigned').padEnd(16)+'YES manual '+(v.status==='up'?'up':'administratively down').padEnd(22)+(v.status==='up'?'up':'down'),v.status==='up'?'ok':'err'))); return out(lines); }
      if (al[0] === 'ip' && al[1] === 'route') { lines.push(line('Gateway of last resort is 10.10.10.1 to network 0.0.0.0','sys')); lines.push(line('C 10.10.10.0/24 is directly connected, Vlan10','ok')); lines.push(line('S 10.10.20.0/24 [1/0] via 10.10.10.1','sys')); lines.push(line('S 10.10.30.0/24 [1/0] via 10.10.10.1','sys')); return out(lines); }
      if (al[0] === 'vlan' && al[1] === 'brief') { lines.push(line('VLAN Name                             Status    Ports','sys')); config.vlans.slice().sort((x,y)=>x-y).forEach(v=>lines.push(line(String(v).padEnd(5)+(v===10?'USERS':v===20?'SERVERS':v===30?'SECURITY':'VLAN'+v).padEnd(34)+'active    '+(v===10?'Gi0/1':v===20?'Gi0/2':'—'), 'sys'))); return out(lines); }
      if (al[0] === 'running-config') { lines.push(line('Building configuration...','sys')); lines.push(line('hostname ACCESS-SW1','sys')); lines.push(line('vlan 10\n name USERS\nvlan 20\n name SERVERS\nvlan 30\n name SECURITY','sys')); Object.entries(config.interfaces).forEach(([name,v])=>lines.push(line('interface '+name+'\n ip address '+v.ip+' '+v.mask+'\n switchport access vlan '+v.vlan+(v.status==='down'?'\n shutdown':'\n no shutdown'),'sys'))); lines.push(line('! Running configuration is simulated and local to this browser profile.','warn')); return out(lines); }
      if (al[0] === 'mac' && al[1] === 'address-table') { lines.push(line('Vlan    Mac Address       Type       Ports','sys')); lines.push(line('10      00aa.1010.0025    DYNAMIC    Gi0/1','sys')); lines.push(line('20      00bb.2020.0020    DYNAMIC    Gi0/2','sys')); return out(lines); }
      usage('show ip interface brief | show ip route | show vlan brief | show running-config | show mac address-table'); return out(lines);
    }
    if (cmd === 'configure' && al[0] === 'terminal') { config.mode='config'; persist(); lines.push(line('Enter configuration commands, one per line. End with `end` or `exit`.', 'ok')); return out(lines); }
    if (cmd === 'interface') { const name=a.join(' '); if(!name) { usage('interface <GigabitEthernet0/1|GigabitEthernet0/2|Vlan10>'); return out(lines); } if(!config.interfaces[name]) config.interfaces[name]={ip:'unassigned',mask:'unassigned',status:'up',vlan:10}; config.selectedInterface=name; config.mode='interface'; persist(); lines.push(line('Selected interface '+name+' (simulated).', 'ok')); return out(lines); }
    if (cmd === 'shutdown' || (cmd==='no' && al[0]==='shutdown')) { const statusValue=cmd==='shutdown'?'down':'up'; const selected=config.interfaces[config.selectedInterface]; if(!selected) { lines.push(line('Select an interface first with `interface <name>`.', 'err')); return out(lines); } selected.status=statusValue; persist(); if(id==='sw-01' && config.selectedInterface==='GigabitEthernet0/1' && window.Game && window.Game.setEnterpriseDevice) window.Game.setEnterpriseDevice('sw-01',statusValue); lines.push(line(config.selectedInterface+' administratively '+(statusValue==='down'?'shut down':'enabled')+'.',statusValue==='up'?'ok':'warn')); lines.push(line('Configuration saved to the browser lab profile; no physical device was changed.','sys')); return out(lines,{['interface:'+config.selectedInterface+':'+statusValue]:true}); }
    if (cmd === 'vlan') { const n=Number(a[0]); if(!Number.isInteger(n)||n<1||n>4094) { usage('vlan <1-4094>'); return out(lines); } if(!config.vlans.includes(n)) config.vlans.push(n); config.mode='vlan'; persist(); lines.push(line('VLAN '+n+' created in the simulated switch configuration.', 'ok')); return out(lines,{['vlan:'+n]:true}); }
    if (cmd === 'switchport') { const idx=al.indexOf('vlan'); const n=Number(a[idx+1]); const selected=config.interfaces[config.selectedInterface]; if(idx<0||!selected||!Number.isInteger(n)||n<1||n>4094) { usage('switchport access vlan <1-4094> (after selecting an interface)'); return out(lines); } if(!config.vlans.includes(n)) { lines.push(line('VLAN '+n+' does not exist. Create it with `vlan '+n+'` first.','err')); return out(lines); } selected.vlan=n; persist(); lines.push(line(config.selectedInterface+' assigned to access VLAN '+n+'.','ok')); return out(lines,{['switchport:vlan:'+n]:true}); }
    if (cmd === 'write' && al[0] === 'memory') { persist(); lines.push(line('[OK] Simulated running configuration saved to browser storage.', 'ok')); return out(lines,{'cmd:write-memory':true}); }
    if (cmd === 'exit' || cmd === 'end') { config.mode='exec'; persist(); lines.push(line('Returned to simulated privileged EXEC mode.', 'sys')); return out(lines); }
    return null;
  }
  return { exec: command, getConfig: () => JSON.parse(JSON.stringify(config)), reset: () => { config = loadConfig(); try { localStorage.removeItem(STORAGE_KEY); } catch (_) {} config = loadConfig(); } };
})();
