/* ============================================================
   sim.js — deterministic, fictional network simulation.
   Nothing here touches a real network.
   ============================================================ */
window.Sim = (function () {
  'use strict';

  /* ---------- IP math ---------- */
  function isValidIp(ip) {
    if (typeof ip !== 'string') return false;
    const p = ip.trim().split('.');
    if (p.length !== 4) return false;
    return p.every(s => /^\d{1,3}$/.test(s) && Number(s) >= 0 && Number(s) <= 255);
  }
  function ipToInt(ip) {
    const p = ip.trim().split('.').map(Number);
    return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
  }
  function intToIp(n) {
    n = n >>> 0;
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  }
  function sameSubnet(ip, mask, other) {
    if (!isValidIp(ip) || !isValidIp(mask) || !isValidIp(other)) return false;
    const m = ipToInt(mask);
    return ((ipToInt(ip) & m) >>> 0) === ((ipToInt(other) & m) >>> 0);
  }
  function networkOf(ip, mask) {
    if (!isValidIp(ip) || !isValidIp(mask)) return '—';
    return intToIp((ipToInt(ip) & ipToInt(mask)) >>> 0);
  }

  /* ---------- device helpers ---------- */
  function iface(dev, name) { return dev && dev.ifaces ? dev.ifaces[name] : null; }
  function ifaceNames(dev) { return dev && dev.ifaces ? Object.keys(dev.ifaces) : []; }
  function primaryIf(dev) { const n = ifaceNames(dev); return n.length ? dev.ifaces[n[0]] : null; }

  function findDeviceByIp(net, ip) {
    for (const id in net.devices) {
      const d = net.devices[id];
      for (const n of ifaceNames(d)) {
        const i = d.ifaces[n];
        if (i.ip && i.ip === ip) return { dev: d, name: n, iface: i };
      }
    }
    return null;
  }

  function linkIsUp(net, l) {
    const a = net.devices[l.a], b = net.devices[l.b];
    if (!a || !b) return false;
    const ai = iface(a, l.aIf), bi = iface(b, l.bIf);
    return !!(ai && bi && ai.up && bi.up);
  }

  /** BFS over up-links. Returns array of device ids or null. */
  function pathExists(net, fromId, toId) {
    if (fromId === toId) return [fromId];
    const adj = {};
    net.links.forEach(l => {
      if (!linkIsUp(net, l)) return;
      (adj[l.a] = adj[l.a] || []).push(l.b);
      (adj[l.b] = adj[l.b] || []).push(l.a);
    });
    const prev = { [fromId]: null };
    const q = [fromId];
    while (q.length) {
      const cur = q.shift();
      if (cur === toId) {
        const path = [];
        let c = cur;
        while (c !== null) { path.unshift(c); c = prev[c]; }
        return path;
      }
      (adj[cur] || []).forEach(nx => {
        if (!(nx in prev)) { prev[nx] = cur; q.push(nx); }
      });
    }
    return null;
  }

  /**
   * Core reachability. Returns
   * { ok, reason, latency, hops:[deviceId], via:'local'|'gateway' }
   */
  function reach(net, srcId, dstIp) {
    const src = net.devices[srcId];
    if (!src) return { ok: false, reason: 'Unknown source device.' };
    const si = primaryIf(src);
    if (!si) return { ok: false, reason: 'Device has no network interface.' };
    if (!si.up) return { ok: false, reason: 'Media disconnected (interface is administratively down).' };
    if (!si.ip) return { ok: false, reason: 'No IP address is configured on this interface.' };
    if (!isValidIp(si.ip)) return { ok: false, reason: 'The configured IP address is not valid.' };
    if (!isValidIp(si.mask)) return { ok: false, reason: 'The configured subnet mask is not valid.' };
    if (!isValidIp(dstIp)) return { ok: false, reason: 'Invalid destination address.' };

    const dst = findDeviceByIp(net, dstIp);

    // Same subnet -> direct delivery
    if (sameSubnet(si.ip, si.mask, dstIp)) {
      if (!dst) return { ok: false, reason: 'Destination host unreachable (no ARP reply).' };
      if (dst.dev.id === srcId) return { ok: true, via: 'local', hops: [srcId], latency: '<1' };
      const p = pathExists(net, srcId, dst.dev.id);
      if (!p) return { ok: false, reason: 'Destination host unreachable (no path at layer 2).' };
      return { ok: true, via: 'local', hops: p, latency: String(1 + (p.length - 2)) };
    }

    // Off-subnet -> needs a working default gateway
    if (!isValidIp(si.gateway)) {
      return { ok: false, reason: 'General failure — no default gateway configured, destination is on a remote subnet.' };
    }
    if (!sameSubnet(si.ip, si.mask, si.gateway)) {
      return { ok: false, reason: 'Default gateway ' + si.gateway + ' is not on the local subnet ' + networkOf(si.ip, si.mask) + '/' + si.mask + '.' };
    }
    const gw = findDeviceByIp(net, si.gateway);
    if (!gw) return { ok: false, reason: 'Destination host unreachable (gateway address has no ARP reply).' };
    if (!pathExists(net, srcId, gw.dev.id)) {
      return { ok: false, reason: 'Destination host unreachable (gateway is not reachable at layer 2).' };
    }
    if (!dst) return { ok: false, reason: 'Request timed out (no route to destination network).' };
    const p2 = pathExists(net, gw.dev.id, dst.dev.id);
    if (!p2) return { ok: false, reason: 'Destination net unreachable (the router has no route or the far interface is down).' };
    const hops = [srcId].concat(p2);
    return { ok: true, via: 'gateway', hops, latency: String(1 + (hops.length - 2) * 2) };
  }

  function isReachable(net, srcId, dstIp) { return reach(net, srcId, dstIp).ok; }

  /* ---------- tracert ---------- */
  function traceRoute(net, srcId, dstIp) {
    const r = reach(net, srcId, dstIp);
    if (!r.ok) return { ok: false, reason: r.reason, hops: [] };
    return { ok: true, hops: r.hops.map(id => net.devices[id].name), latency: r.latency };
  }

  /* ---------- dns ---------- */
  function resolve(net, srcId, name) {
    const src = net.devices[srcId];
    if (!src) return { ok: false, reason: 'Unknown device.' };
    const si = primaryIf(src);
    if (!si) return { ok: false, reason: 'Device has no network interface.' };
    if (!si.up) return { ok: false, reason: 'Media disconnected.' };
    if (!isValidIp(si.dns)) return { ok: false, reason: 'No DNS server is configured on this interface.' };

    const dnsDev = findDeviceByIp(net, si.dns);
    const r = reach(net, srcId, si.dns);
    if (!dnsDev || !r.ok) {
      return { ok: false, reason: 'DNS request timed out.\n    timeout was 2 seconds.\n    Server:  ' + si.dns + '\n    *** Request to ' + si.dns + ' timed out.', dns: si.dns };
    }
    const rec = net.dns && net.dns[name.toLowerCase()];
    if (!rec) {
      return { ok: false, reason: 'Server:  ' + si.dns + '\n    *** ' + si.dns + " can't find " + name + ': Non-existent domain', dns: si.dns };
    }
    return { ok: true, ip: rec, dns: si.dns, server: dnsDev.dev.name };
  }

  /* ---------- arp table ---------- */
  function arpTable(net, srcId) {
    const src = net.devices[srcId];
    const si = primaryIf(src);
    if (!si || !si.ip || !isValidIp(si.ip)) return [];
    const rows = [];
    for (const id in net.devices) {
      if (id === srcId) continue;
      const d = net.devices[id];
      for (const n of ifaceNames(d)) {
        const i = d.ifaces[n];
        if (!i.ip || !i.up || !sameSubnet(si.ip, si.mask, i.ip)) continue;
        if (!pathExists(net, srcId, id)) continue;
        rows.push({ ip: i.ip, mac: fakeMac(id + n), iface: n });
      }
    }
    return rows;
  }
  function fakeMac(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const b = [0x02, (h >>> 24) & 255, (h >>> 16) & 255, (h >>> 8) & 255, h & 255, (h * 7) & 255];
    return b.map(x => x.toString(16).padStart(2, '0')).join(':').toUpperCase();
  }

  /* ---------- terminal command engine ---------- */
  /**
   * exec(cmd, ctx) -> { lines:[{text,cls}], flags:{}, clear:bool, event?:{} }
   * ctx = { net, activeDeviceId, mission, run }
   */
  function exec(raw, ctx) {
    const out = [];
    const push = (text, cls) => out.push({ text: String(text), cls: cls || '' });
    const cmdline = String(raw || '').trim();
    if (!cmdline) return { lines: out };

    const parts = cmdline.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    const flags = {};
    const net = ctx.net;
    const devId = ctx.activeDeviceId;
    const dev = net.devices[devId];
    const allowed = (ctx.mission.terminal && ctx.mission.terminal.commands) || [];

    function deny() {
      push("'" + cmd + "' is not available in this mission context.", 'err');
      push('Type "help" for the command list.', 'sys');
      return true;
    }
    if (allowed.length && allowed.indexOf(cmd) === -1) return { lines: out, denied: true };

    switch (cmd) {
      case 'help': {
        push('Available commands:', 'sys');
        allowed.forEach(c => push('  ' + c + '   — ' + HELP[c], ''));
        push('', '');
        push('All output is generated by a fictional simulator. No real traffic is produced.', 'sys');
        break;
      }
      case 'clear':
        return { lines: out, clear: true };

      case 'ipconfig': {
        flags['cmd:ipconfig'] = true;
        const target = args[0] ? resolveDevice(net, args[0]) : dev;
        if (!target) { push('No device matches "' + args[0] + '".', 'err'); break; }
        push('Windows IP Configuration — ' + target.name, 'sys');
        push('');
        ifaceNames(target).forEach(n => {
          const i = target.ifaces[n];
          if (!i.ip) { push('  ' + n + ': (no IP — layer 2 port, state ' + (i.up ? 'UP' : 'DOWN') + ')'); return; }
          push('Ethernet adapter ' + n + ':');
          push('   Media State . . . . . . . . . : ' + (i.up ? 'Connected' : 'Media disconnected'));
          push('   IPv4 Address. . . . . . . . . : ' + i.ip);
          push('   Subnet Mask . . . . . . . . . : ' + i.mask);
          push('   Default Gateway . . . . . . . : ' + (i.gateway || '(none)'));
          push('   DNS Servers . . . . . . . . . : ' + (i.dns || '(none)'));
          push('');
        });
        break;
      }

      case 'ping': {
        if (!args[0]) { push('Usage: ping <ip-or-hostname>', 'err'); break; }
        const target = args[0];
        let ip = target, nameNote = '';
        if (!isValidIp(target)) {
          const res = resolve(net, devId, target);
          if (!res.ok) { push('Ping request could not find host ' + target + '. Please check the name and try again.', 'err'); break; }
          ip = res.ip; nameNote = ' [' + ip + ']';
        }
        flags['ping:' + ip] = true;
        push('Pinging ' + ip + nameNote + ' with 32 bytes of data:', '');
        const r = reach(net, devId, ip);
        if (!r.ok) {
          for (let k = 0; k < 4; k++) push('Request timed out.', 'err');
          push('');
          push(r.reason, 'warn');
          break;
        }
        const lat = Number(r.latency) || 1;
        for (let k = 0; k < 4; k++) push('Reply from ' + ip + ': bytes=32 time=' + (lat + k) + 'ms TTL=' + (128 - r.hops.length), 'ok');
        push('');
        push('Ping statistics for ' + ip + ':');
        push('    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),', 'ok');
        push('Approximate round trip times: Minimum = ' + lat + 'ms, Maximum = ' + (lat + 3) + 'ms, Average = ' + lat + 'ms');
        break;
      }

      case 'tracert': {
        if (!args[0]) { push('Usage: tracert <ip>', 'err'); break; }
        const r = traceRoute(net, devId, args[0]);
        push('Tracing route to ' + args[0] + ' over a maximum of 30 hops:', '');
        if (!r.ok) { push('Unable to resolve target system name ' + args[0] + '.', 'err'); push(r.reason, 'warn'); break; }
        r.hops.forEach((n, i) => push('  ' + (i + 1) + '    ' + (1 + i) + ' ms   ' + n, 'ok'));
        push('');
        push('Trace complete.', 'sys');
        break;
      }

      case 'nslookup': {
        if (!args[0]) { push('Usage: nslookup <hostname>', 'err'); break; }
        flags['cmd:nslookup'] = true;
        const r = resolve(net, devId, args[0]);
        if (!r.ok) { push(r.reason, 'err'); break; }
        push('Server:  ' + r.server, '');
        push('Address:  ' + r.dns, '');
        push('');
        push('Non-authoritative answer:');
        push('Name:    ' + args[0], 'ok');
        push('Address: ' + r.ip, 'ok');
        break;
      }

      case 'arp': {
        flags['cmd:arp'] = true;
        push('Interface: ' + (primaryIf(dev).ip || '—'), 'sys');
        push('  Internet Address      Physical Address      Type');
        const rows = arpTable(net, devId);
        if (!rows.length) { push('  (no entries — no neighbours responded)', 'sys'); break; }
        rows.forEach(r => push('  ' + r.ip.padEnd(22) + r.mac.padEnd(22) + 'dynamic'));
        break;
      }

      case 'netstat': {
        flags['cmd:netstat'] = true;
        push('Active Connections', 'sys');
        push('  Proto  Local Address        Foreign Address        State');
        push('  TCP    ' + (primaryIf(dev).ip || '0.0.0.0') + ':49152   10.0.10.20:445         ESTABLISHED');
        push('  TCP    ' + (primaryIf(dev).ip || '0.0.0.0') + ':49160   10.0.10.53:53          ESTABLISHED');
        push('  UDP    ' + (primaryIf(dev).ip || '0.0.0.0') + ':5353    *:*');
        break;
      }

      case 'status': {
        flags['cmd:status'] = true;
        push('NETWORK STATUS SUMMARY', 'sys');
        push('─'.repeat(58));
        Object.keys(net.devices).forEach(id => {
          const d = net.devices[id];
          const states = ifaceNames(d).map(n => {
            const i = d.ifaces[n];
            return n + '=' + (i.up ? 'UP' : 'DOWN');
          });
          const anyDown = ifaceNames(d).some(n => !d.ifaces[n].up);
          push('  ' + d.name.padEnd(10) + (anyDown ? '⚠ ' : '✔ ') + states.join('  '), anyDown ? 'warn' : 'ok');
        });
        push('');
        push('Tip: an interface in DOWN state is administratively disabled.', 'sys');
        break;
      }

      case 'alerts': {
        flags['cmd:alerts'] = true;
        const list = (ctx.run.alerts || []);
        push('SECURITY ALERT QUEUE — ' + list.length + ' open', 'sys');
        push('─'.repeat(72));
        list.forEach(a => {
          const sev = a.severity === 'high' ? 'sev-high' : a.severity === 'medium' ? 'sev-med' : 'sev-low';
          push(a.id + '  [' + a.severity.toUpperCase() + ']  ' + a.ts + '  ' + a.title, sev);
          push('     src=' + a.src + '  status=' + a.status + '  —  run "inspect ' + a.id + '" for details', 'sys');
        });
        break;
      }

      case 'inspect': {
        if (!args[0]) { push('Usage: inspect <alert-id | host | ip>', 'err'); break; }
        const q = args[0];
        flags['inspect:' + q] = true;
        const alert = (ctx.run.alerts || []).find(a => a.id.toLowerCase() === q.toLowerCase());
        if (alert) {
          push('ALERT ' + alert.id, 'sys');
          push('─'.repeat(58));
          push('Title      : ' + alert.title);
          push('Severity   : ' + alert.severity.toUpperCase());
          push('Timestamp  : ' + alert.ts);
          push('Source     : ' + alert.src);
          push('Status     : ' + alert.status);
          push('');
          push('Description:');
          push(alert.detail, '');
          if (alert.related && alert.related.length) {
            push('');
            push('Related events:');
            alert.related.forEach(r => push('  • ' + r, 'sys'));
          }
          break;
        }
        const host = (ctx.run.hosts || []).find(h => h.ip === q || (h.host || '').toLowerCase() === q.toLowerCase());
        if (host) {
          push('HOST ' + host.ip + '  (' + host.host + ')', 'sys');
          push('─'.repeat(58));
          push('OS         : ' + host.os);
          push('Open ports :');
          host.ports.forEach(p => push('  ' + String(p.port).padEnd(7) + p.svc + '   ' + (p.note || '')));
          if (host.findings && host.findings.length) {
            push('');
            push('Observed weaknesses:');
            host.findings.forEach(f => push('  ⚠ ' + f, 'warn'));
          }
          break;
        }
        push('Nothing matching "' + q + '" was found in the current evidence set.', 'err');
        break;
      }

      case 'scan': {
        if (!args[0]) { push('Usage: scan <cidr | ip>  (authorised lab range only)', 'err'); break; }
        flags['cmd:scan'] = true;
        const hosts = (ctx.run.hosts || []);
        const prefix = args[0].split('/')[0].split('.').slice(0, 3).join('.');
        const inRange = hosts.filter(h => h.ip.startsWith(prefix + '.'));
        if (!inRange.length) { push('No hosts responded in ' + args[0] + '.', 'err'); break; }
        push('Starting authorised discovery scan against ' + args[0], 'sys');
        push('(simulated — no packets leave this browser)', 'sys');
        push('');
        inRange.forEach(h => {
          push('Host ' + h.ip + ' is up   (' + h.host + ')', 'ok');
          h.ports.forEach(p => push('  ' + String(p.port).padEnd(6) + 'open   ' + p.svc));
          flags['discovered:' + h.ip] = true;
        });
        push('');
        push(inRange.length + ' host(s) discovered.', 'sys');
        break;
      }

      case 'logs': {
        flags['cmd:logs'] = true;
        const filter = (args[0] || '').toLowerCase();
        const logs = (ctx.run.logs || []);
        push('EVENT LOG  (' + (filter ? 'filter="' + filter + '"' : 'all sources') + ')', 'sys');
        push('─'.repeat(78));
        let shown = 0;
        logs.forEach(l => {
          const hay = (l.ts + ' ' + l.host + ' ' + l.user + ' ' + l.event + ' ' + l.src + ' ' + (l.note || '')).toLowerCase();
          if (filter && hay.indexOf(filter) === -1) return;
          shown++;
          push(l.ts + '  ' + String(l.host).padEnd(9) + String(l.event).padEnd(16) +
               'user=' + String(l.user || '-').padEnd(10) + 'src=' + l.src + (l.note ? '  ' + l.note : ''),
               l.suspicious ? 'warn' : '');
        });
        if (!shown) push('  No matching events.', 'sys');
        break;
      }

      case 'report': {
        flags['cmd:report'] = true;
        push('Opening the findings report panel…', 'sys');
        return { lines: out, event: { type: 'open-report' } };
      }

      default:
        push("'" + cmd + "' is not recognized as a command.", 'err');
        push('Type "help" for the list of available commands.', 'sys');
    }
    return { lines: out, flags };
  }

  function resolveDevice(net, token) {
    const t = String(token).toLowerCase();
    for (const id in net.devices) {
      const d = net.devices[id];
      if (id.toLowerCase() === t || d.name.toLowerCase() === t) return d;
    }
    return null;
  }

  const HELP = {
    help: 'show this list',
    clear: 'clear the terminal',
    ipconfig: 'show interface configuration',
    ping: 'test reachability to an address or name',
    tracert: 'show the simulated path to a destination',
    nslookup: 'query the simulated DNS server',
    arp: 'display the neighbour cache',
    netstat: 'display active connections',
    scan: 'authorised simulated discovery scan',
    inspect: 'show details for an alert, host or IP',
    logs: 'query the event log (optional filter)',
    alerts: 'show the security alert queue',
    status: 'summarise device and interface state',
    report: 'open the findings report panel'
  };

  return {
    isValidIp, ipToInt, intToIp, sameSubnet, networkOf,
    iface, ifaceNames, primaryIf, findDeviceByIp,
    pathExists, reach, isReachable, traceRoute, resolve, arpTable,
    exec, HELP
  };
})();