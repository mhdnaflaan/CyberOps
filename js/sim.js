window.Sim = (function () {
  'use strict';
  function isValidIp(ip) { return typeof ip === 'string' && /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) && ip.split('.').every(o => parseInt(o) <= 255); }
  function ipToInt(ip) { return ip.split('.').reduce((a, o) => (a << 8) + parseInt(o), 0) >>> 0; }
  function sameSubnet(ip, mask, other) { return isValidIp(ip) && isValidIp(mask) && isValidIp(other) && (ipToInt(ip) & ipToInt(mask)) === (ipToInt(other) & ipToInt(mask)); }

  function findDeviceByIp(net, ip) {
    if (!net || !net.devices) return null;
    for (const id in net.devices) {
      for (const n in net.devices[id].ifaces) {
        if (net.devices[id].ifaces[n].ip === ip) return { dev: net.devices[id], iface: net.devices[id].ifaces[n] };
      }
    }
    return null;
  }

  function isReachable(net, srcId, dstIp) {
    if (!net || !net.devices) return false;
    const src = net.devices[srcId]; if (!src) return false;
    const si = Object.values(src.ifaces)[0]; if (!si || !si.up || !isValidIp(si.ip)) return false;
    if (sameSubnet(si.ip, si.mask, dstIp)) { const found = findDeviceByIp(net, dstIp); return !!(found && found.iface.up); }
    if (!isValidIp(si.gateway) || !sameSubnet(si.ip, si.mask, si.gateway)) return false;
    const gw = findDeviceByIp(net, si.gateway);
    return !!(gw && gw.iface.up);
  }

  function exec(raw, ctx) {
    // Real-world syntax is interpreted by a safe browser-only command engine first.
    // Unknown commands fall through to the existing CyberOps mission/enterprise commands.
    if (window.CommandLab && typeof window.CommandLab.exec === 'function') {
      const labResult = window.CommandLab.exec(raw, ctx);
      if (labResult) return labResult;
    }
    const parts = raw.trim().split(/\s+/); const cmd = parts[0].toLowerCase(); const args = parts.slice(1);
    const lines = []; const flags = {}; const push = (text, cls) => lines.push({ text, cls: cls || '' });
    const net = ctx.net, activeId = ctx.activeDeviceId, run = ctx.run;

    switch (cmd) {
      case 'help': push('Mission tools: ' + (ctx.mission.terminal.commands || []).join(', '), 'sys'); push('Real-syntax lab: commands, connect <device>, ipconfig /all, ip addr, ip route, ping <IP>, tracert <IP>, nslookup <name>, dig <name>, arp -a, netstat -ano, ss -tuln, nmap -sV <in-scope-IP>, grep <text>, sha256sum <file>, show ip interface brief, show ip route, show vlan brief, show running-config, configure terminal, interface <name>, shutdown, no shutdown, vlan <id>, switchport access vlan <id>, write memory.', 'sys'); push('Enterprise tools: company, whoami, services, service <start|stop|restart> <name>, verify <service>, network, devices, device <ID>, device set <ID> <up|down>, diagnose <service>, logs, scenario start <ticketID>, tickets, ticket <ID>, ticket update <ID> <investigating|open|pending>, resolve <ticketID>, changes, change record <summary>, history, route, netstat, tracert <IPv4>, arp -a', 'sys'); push('All commands operate only on this fictional training environment.', 'warn'); break;
      case 'clear': return { clear: true };
      case 'ipconfig':
        if (!net || !net.devices) { push('No network interfaces found.', 'err'); break; }
        const d = net.devices[activeId] || net.devices[ctx.mission.terminal.device];
        if (d) { const i = Object.values(d.ifaces)[0]; push(`IPv4: ${i.ip || 'none'} | Mask: ${i.mask || 'none'} | GW: ${i.gateway || 'none'} | DNS: ${i.dns || 'none'}`, 'sys'); }
        flags['cmd:ipconfig'] = true; break;
      case 'ping':
        if (!args[0]) { push('Usage: ping <IPv4 address>', 'warn'); break; }
        if (isReachable(net, activeId || ctx.mission.terminal.device, args[0])) { push('Reply from ' + args[0] + ': bytes=32 time=1ms TTL=128', 'ok'); flags['ping:' + args[0]] = true; }
        else push('Request timed out.', 'err'); break;
      case 'nslookup': {
        const name = args[0];
        if (!name) { push('Usage: nslookup <host name>', 'warn'); break; }
        const dnsDevice = net && net.devices && (net.devices[activeId] || net.devices[ctx.mission.terminal.device]);
        const dnsIface = dnsDevice && Object.values(dnsDevice.ifaces)[0];
        const approved = run.dnsRecords && run.dnsRecords[name];
        if (!dnsIface || !dnsIface.dns) push('No DNS resolver configured.', 'err');
        else if (run.approvedDns && dnsIface.dns !== run.approvedDns) push(`Server: ${dnsIface.dns}\nDNS request timed out. Check the configured resolver.`, 'err');
        else if (approved) { push(`Server: ${dnsIface.dns}\nName: ${name}\nAddress: ${approved}`, 'ok'); flags['nslookup:' + name] = true; }
        else push(`Server: ${dnsIface.dns}\n*** No record found for ${name}`, 'warn');
        break;
      }
      case 'whoami': {
        const p = window.Game && window.Game.get && window.Game.get();
        push(`Operator: ${p ? p.username : 'Guest'} | Career: ${p ? p.careerPath : 'none'} | Rank: ${p ? window.Game.rankFor(p.xp, p.careerPath) : 'unassigned'}`, 'sys');
        break;
      }
      case 'company': {
        const e = window.Game && window.Game.getEnterpriseState && window.Game.getEnterpriseState();
        if (!e) { push('No active personnel profile.', 'err'); break; }
        const up = Object.values(e.services).filter(v => v === 'up').length;
        push('CYBEROPS DEMO ENTERPRISE | simulated service health: ' + up + '/' + Object.keys(e.services).length + ' online', up === Object.keys(e.services).length ? 'ok' : 'warn');
        push('Open tickets: ' + e.tickets.filter(t => t.status !== 'CLOSED').length + ' | Change records: ' + e.changes.length + ' | Audit events: ' + e.events.length, 'sys');
        flags['cmd:company'] = true; break;
      }
      case 'services': {
        const e = window.Game && window.Game.getEnterpriseState && window.Game.getEnterpriseState();
        if (!e) { push('No active personnel profile.', 'err'); break; }
        Object.entries(e.services).forEach(([name, status]) => {
          const health = window.Game.serviceHealth ? window.Game.serviceHealth(name) : { ok: status === 'up' };
          push(`${name.padEnd(14)} ${status.toUpperCase()}${e.verified[name] ? ' · VERIFIED' : ''}${!health.ok && health.issues ? ' · DEPENDENCY FAULT' : ''}`, health.ok ? 'ok' : 'err');
        });
        flags['cmd:services'] = true; break;
      }
      case 'network':
      case 'devices': {
        const e = window.Game && window.Game.getEnterpriseState && window.Game.getEnterpriseState();
        if (!e) { push('No active personnel profile.', 'err'); break; }
        push('SIMULATED ENTERPRISE TOPOLOGY · NOT TO SCALE', 'sys');
        e.devices.forEach(d => push(`${d.id.padEnd(8)} ${d.ip.padEnd(15)} ${d.name} | ${d.segment} | ${d.status.toUpperCase()}`, d.status === 'up' ? 'ok' : 'err'));
        push('Segments: USER-LAN → EDGE → SERVER-LAN; SECURITY-LAN receives monitoring events.', 'sys');
        flags['cmd:network'] = true; break;
      }
      case 'device': {
        const game = window.Game; const e = game && game.getEnterpriseState && game.getEnterpriseState();
        if (!e) { push('No active personnel profile.', 'err'); break; }
        if ((args[0] || '').toLowerCase() === 'set') {
          const result = game.setEnterpriseDevice && game.setEnterpriseDevice((args[1] || '').toLowerCase(), (args[2] || '').toLowerCase());
          if (result && result.ok) { push(`${result.device.id} changed from ${result.previous} to ${result.status}.`, result.status === 'up' ? 'ok' : 'warn'); flags['device:' + result.device.id + ':' + result.status] = true; }
          else push(result && result.message || 'Usage: device set <ID> <up|down>', 'err'); break;
        }
        const d = e.devices.find(x => x.id.toLowerCase() === String(args[0] || '').toLowerCase());
        if (!d) { push('Usage: device <ID> or device set <ID> <up|down>. Run devices to list IDs.', 'warn'); break; }
        push(`${d.name} (${d.id})`, 'sys'); push(`Type: ${d.type} | IP: ${d.ip} | Segment: ${d.segment} | Status: ${d.status.toUpperCase()}`, d.status === 'up' ? 'ok' : 'err'); flags['device:' + d.id] = true; break;
      }
      case 'diagnose': {
        const name = (args[0] || '').toLowerCase();
        const result = window.Game && window.Game.getEnterpriseDiagnosis && window.Game.getEnterpriseDiagnosis(name);
        if (!result || !result.ok) { push(result && result.message || 'Usage: diagnose <intranet|dns|vpn|file-share|monitoring>', 'err'); break; }
        push(`Diagnostic report: ${result.service}`, 'sys');
        result.dependencies.forEach(dep => push(`${dep.name.padEnd(20)} ${String(dep.status).toUpperCase()}`, dep.status === 'up' ? 'ok' : 'err'));
        if (result.healthy) push('No current dependency fault detected. Confirm with verification and relevant logs.', 'ok');
        else result.issues.forEach(issue => push('Finding: ' + issue, 'warn'));
        flags['diagnose:' + name] = true; break;
      }
      case 'scenario': {
        if ((args[0] || '').toLowerCase() !== 'start' || !args[1]) { push('Usage: scenario start <ticketID> (try INC-105)', 'warn'); break; }
        const result = window.Game && window.Game.startEnterpriseScenario && window.Game.startEnterpriseScenario(args[1]);
        if (result && result.ok) { push(result.message, 'ok'); flags['scenario:' + args[1].toUpperCase()] = true; }
        else push(result && result.message || 'Scenario engine unavailable.', 'err'); break;
      }
      case 'service': {
        const action = (args[0] || '').toLowerCase(), name = (args[1] || '').toLowerCase();
        if (!['start','stop','restart'].includes(action) || !name) { push('Usage: service <start|stop|restart> <intranet|dns|vpn|file-share|monitoring>', 'warn'); break; }
        const game = window.Game;
        if (!game || !game.getEnterpriseState) { push('Enterprise simulator unavailable.', 'err'); break; }
        if (action === 'stop') {
          const result = game.setEnterpriseService(name, 'down');
          if (result.ok) { push(`${name} stopped in the fictional lab. Availability is now affected.`, 'warn'); flags['service:' + name + ':down'] = true; }
          else push(result.message, 'err');
        } else {
          const result = game.setEnterpriseService(name, 'up');
          if (result.ok) { push(`${name} ${action === 'restart' ? 'restarted' : 'started'} in the fictional lab. Run verify ${name} to check it.`, 'ok'); flags['service:' + name + ':up'] = true; }
          else push(result.message, 'err');
        }
        break;
      }
      case 'verify': {
        const name = (args[0] || '').toLowerCase();
        if (!name) { push('Usage: verify <service-name>', 'warn'); break; }
        const result = window.Game && window.Game.verifyEnterpriseService && window.Game.verifyEnterpriseService(name);
        if (!result || !result.ok && !result.status) push(result && result.message || 'Verification unavailable.', 'err');
        else if (result.ok) { push(`Verification passed: ${name} is UP.`, 'ok'); flags['verify:' + name] = true; }
        else { push(`Verification failed: ${name} is DOWN. Restore it, then verify again.`, 'err'); flags['verify:' + name] = false; }
        break;
      }
      case 'tickets': {
        const e = window.Game && window.Game.getEnterpriseState && window.Game.getEnterpriseState();
        if (!e) { push('No active personnel profile.', 'err'); break; }
        e.tickets.forEach(t => push(`${t.id} [${t.priority}] ${t.status} · ${t.team} · ${t.title}`, t.priority === 'HIGH' ? 'warn' : 'sys'));
        flags['cmd:tickets'] = true; break;
      }
      case 'ticket': {
        if ((args[0] || '').toLowerCase() === 'update') {
          const result = window.Game && window.Game.updateEnterpriseTicket && window.Game.updateEnterpriseTicket(args[1], String(args[2] || '').toUpperCase());
          if (result && result.ok) { push(`${result.ticket.id} status updated to ${result.ticket.status}.`, 'ok'); flags['ticket:' + result.ticket.id] = true; }
          else push(result && result.message || 'Usage: ticket update <ID> <investigating|open|pending>', 'err'); break;
        }
        const e = window.Game && window.Game.getEnterpriseState && window.Game.getEnterpriseState();
        const t = e && e.tickets.find(x => x.id.toLowerCase() === String(args[0] || '').toLowerCase());
        if (t) { push(`${t.id}: ${t.title}`, 'sys'); push(`Priority: ${t.priority} | Status: ${t.status} | Assigned team: ${t.team}`, 'sys'); if (t.scenario) push(`Playable scenario: scenario start ${t.id}`, 'sys'); if (t.resolution) push(`Resolution: ${t.resolution}`, 'ok'); flags['ticket:' + t.id] = true; }
        else push('Ticket not found. Run tickets to list fictional tickets.', 'err');
        break;
      }
      case 'resolve': {
        const result = window.Game && window.Game.resolveEnterpriseTicket && window.Game.resolveEnterpriseTicket(args[0]);
        if (result && result.ok) { push(`${result.ticket.id} resolved and closed.`, 'ok'); push(`Resolution: ${result.ticket.resolution}`, 'sys'); flags['resolved:' + result.ticket.id] = true; }
        else push(result && result.message || 'Usage: resolve <ticketID>', 'err'); break;
      }
      case 'changes': {
        const e = window.Game && window.Game.getEnterpriseState && window.Game.getEnterpriseState();
        if (!e) { push('No active personnel profile.', 'err'); break; }
        if (!e.changes.length) push('No change records yet. Use: change record <summary>', 'sys');
        e.changes.slice(0, 10).forEach(c => push(`${c.id} | ${new Date(c.at).toLocaleString()} | ${c.summary} | by ${c.by}`, 'sys'));
        flags['cmd:changes'] = true; break;
      }
      case 'change': {
        if ((args[0] || '').toLowerCase() !== 'record' || args.length < 2) { push('Usage: change record <short summary of the change>', 'warn'); break; }
        const record = window.Game && window.Game.addChangeRecord && window.Game.addChangeRecord(args.slice(1).join(' '));
        if (record) { push(`Recorded ${record.id}: ${record.summary}`, 'ok'); flags['change:' + record.id] = true; }
        else push('No active personnel profile.', 'err');
        break;
      }
      case 'history': {
        const e = window.Game && window.Game.getEnterpriseState && window.Game.getEnterpriseState();
        if (!e) { push('No active personnel profile.', 'err'); break; }
        if (!e.events.length) push('No enterprise audit events recorded yet.', 'sys');
        e.events.slice(0, 8).forEach(ev => push(`${new Date(ev.at).toLocaleTimeString()} | ${ev.category.toUpperCase()} | ${ev.action} — ${ev.detail}`, 'sys'));
        flags['cmd:history'] = true; break;
      }
      case 'route': {
        const d = net && net.devices && (net.devices[activeId] || net.devices[ctx.mission.terminal.device]);
        const i = d && Object.values(d.ifaces)[0];
        if (!i) push('No active simulated route table for this assignment.', 'warn');
        else { push('Network Destination     Netmask          Gateway', 'sys'); push(`0.0.0.0                 0.0.0.0          ${i.gateway || 'on-link'}`, 'sys'); push(`${i.ip || '0.0.0.0'}              ${i.mask || 'unknown'}     on-link`, 'sys'); flags['cmd:route'] = true; }
        break;
      }
      case 'netstat': {
        push('Active simulated connections:', 'sys');
        push('TCP 10.0.10.50:51522 10.0.10.20:443 ESTABLISHED (intranet)', 'ok');
        push('TCP 10.0.10.50:51528 10.0.10.53:53  TIME_WAIT (dns)', 'sys');
        push('TCP 10.0.10.50:51601 198.51.100.24:443 CLOSE_WAIT (external demo)', 'warn');
        flags['cmd:netstat'] = true; break;
      }
      case 'tracert': {
        if (!args[0] || !isValidIp(args[0])) { push('Usage: tracert <IPv4 address>', 'warn'); break; }
        const d = net && net.devices && (net.devices[activeId] || net.devices[ctx.mission.terminal.device]);
        const i = d && Object.values(d.ifaces)[0];
        if (!i || !i.up) push('  1  * * * Request timed out.', 'err');
        else if (sameSubnet(i.ip, i.mask, args[0])) { push(`  1  1 ms  ${args[0]}  (same subnet)`, 'ok'); flags['tracert:' + args[0]] = true; }
        else if (isReachable(net, activeId || ctx.mission.terminal.device, args[0])) { push(`  1  1 ms  ${i.gateway || 'gateway'}`, 'sys'); push(`  2  3 ms  ${args[0]}`, 'ok'); flags['tracert:' + args[0]] = true; }
        else push('  1  ' + (i.gateway || '*') + '  Destination unreachable or route unavailable.', 'err');
        break;
      }
      case 'arp': {
        if (args[0] !== '-a') { push('Usage: arp -a', 'warn'); break; }
        if (!net || !net.devices) { push('No simulated ARP cache.', 'err'); break; }
        Object.values(net.devices).forEach(dev => { const iface = Object.values(dev.ifaces)[0]; if (iface.ip) push(`${iface.ip}  dynamic  02-00-5E-${String(dev.id.length).padStart(2,'0')}-10-01  ${dev.name}`, 'sys'); });
        flags['cmd:arp'] = true; break;
      }
      case 'status':
        if (!net || !net.devices) { push('No network devices found.', 'err'); break; }
        Object.values(net.devices).forEach(d => push(`${d.name}: ${Object.values(d.ifaces)[0].up ? 'UP' : 'DOWN'}`, Object.values(d.ifaces)[0].up ? 'ok' : 'err'));
        flags['cmd:status'] = true; break;
      case 'alerts':
        (run.alerts || []).forEach(a => push(`[${a.severity.toUpperCase()}] ${a.id} - ${a.title} (src: ${a.src})`, a.severity === 'high' ? 'err' : 'warn'));
        flags['cmd:alerts'] = true; break;
      case 'logs': {
        if (ctx.enterpriseConsole) {
          const e = window.Game && window.Game.getEnterpriseState && window.Game.getEnterpriseState();
          if (!e || !e.logs.length) push('No enterprise events recorded.', 'sys');
          else e.logs.slice(0, 12).forEach(l => push(`${new Date(l.at).toLocaleTimeString()} | ${l.severity} | ${l.host} | ${l.event} — ${l.detail}`, l.severity === 'WARN' || l.severity === 'ERROR' ? 'warn' : 'sys'));
        } else (run.logs || []).forEach(l => push(`${l.ts} | ${l.host} | ${l.event} | user=${l.user} | src=${l.src}`, l.suspicious ? 'warn' : 'sys'));
        flags['cmd:logs'] = true; break;
      }
      case 'inspect':
        const alert = (run.alerts || []).find(a => a.id === args[0]);
        if (alert) { push(`ALERT ${alert.id}: ${alert.detail}`, 'sys'); flags['inspect:' + args[0]] = true; }
        else push('Target not found.', 'err'); break;
      case 'scan':
        (run.hosts || []).forEach(h => { push(`Host ${h.ip} is up (${h.host})`, 'ok'); flags['discovered:' + h.ip] = true; });
        flags['cmd:scan'] = true; break;
      case 'osint': push('OSINT complete. Found hash: 5f4dcc3b5aa765d61d8327deb882cf99', 'ok'); flags['cmd:osint'] = true; break;
      case 'crack':
        if (args[0] === '5f4dcc3b5aa765d61d8327deb882cf99') { push('Password cracked: admin123', 'ok'); flags['cmd:crack'] = true; }
        else push('Hash not recognized.', 'err'); break;
      case 'exploit': {
        const target = args[0];
        const inScope = target && (run.hosts || []).some(h => h.ip === target);
        if (!target) push('Usage: exploit <in-scope lab IPv4 address>', 'warn');
        else if (!inScope) push("SCOPE BLOCK: target is not listed in this mission's authorised lab scope.", 'err');
        else if (!run.flags['discovered:' + target]) push('Pre-check required: run the simulated scan and verify the target is in scope first.', 'warn');
        else { push(`Simulated validation succeeded against in-scope lab host ${target}. Record the finding and remediation.`, 'ok'); flags['exploited:' + target] = true; }
        break;
      }
      default: push('Unknown command.', 'err');
    }
    return { lines, flags };
  }
  return { isValidIp, sameSubnet, isReachable, exec };
})();