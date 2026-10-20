/* ============================================================
   data.js — missions, avatars, codex. All content is fictional.
   ============================================================ */
window.AVATARS = [
  { id: 'av-1', face: '👩‍💻', name: 'Analyst' },
  { id: 'av-2', face: '👨‍💻', name: 'Engineer' },
  { id: 'av-3', face: '🧑‍🔧', name: 'Technician' },
  { id: 'av-4', face: '👩‍🚀', name: 'Operator' },
  { id: 'av-5', face: '🧑‍🎓', name: 'Graduate' },
  { id: 'av-6', face: '🕵️', name: 'Investigator' }
];
window.OUTFITS = [
  { id: 'of-1', name: 'Navy',   color: '#1f3a5f' },
  { id: 'of-2', name: 'Slate',  color: '#334155' },
  { id: 'of-3', name: 'Teal',   color: '#14524b' },
  { id: 'of-4', name: 'Indigo', color: '#2e2a63' },
  { id: 'of-5', name: 'Steel',  color: '#2b3a4a' }
];

window.CODEX = [
  { cat: 'Networking', title: 'IPv4 addressing', body: 'An IPv4 address identifies an interface on a network. Combined with a subnet mask it defines which addresses are local (reachable at layer 2) and which must be sent to a default gateway.' },
  { cat: 'Networking', title: 'Subnet masks', body: 'A mask such as 255.255.255.0 (/24) means the first three octets identify the network. Two hosts can talk directly only if their addresses share the same network portion.' },
  { cat: 'Networking', title: 'Default gateway', body: 'A router address on the local subnet. Any destination outside the local subnet is sent to the gateway. If the gateway is not on the local subnet, the host cannot use it.' },
  { cat: 'Networking', title: 'DNS resolution', body: 'DNS maps names to IP addresses. A client sends a query to its configured DNS server. If that server is unreachable or the record is missing, name lookups fail with "request timed out" or "non-existent domain".' },
  { cat: 'Networking', title: 'ARP', body: 'Address Resolution Protocol maps a known IPv4 address to a MAC address on the local segment. No ARP reply usually means "host unreachable" at layer 2.' },
  { cat: 'Networking', title: 'Administratively down', body: 'A router or switch interface can be physically fine but disabled by configuration. It shows as DOWN and no traffic passes until it is enabled.' },
  { cat: 'Security', title: 'Brute force vs. password spray', body: 'Brute force tries many passwords against one account. Password spray tries one common password against many accounts to avoid lockout thresholds. Both show up as bursts of authentication failures.' },
  { cat: 'Security', title: 'True vs. false positives', body: 'An alert is a true positive only when the underlying behaviour is genuinely malicious. Scheduled backups, travel, and admin scripts frequently generate benign alerts. Always correlate with context before escalating.' },
  { cat: 'Security', title: 'Attack surface', body: 'Every exposed service is attack surface. A database port reachable from an untrusted network is unnecessary exposure even if the database is patched.' },
  { cat: 'Security', title: 'SQL injection', body: 'Occurs when user input is concatenated into a query instead of being parameterised. Defences: prepared statements, input validation, least-privilege database accounts, and a WAF as defence in depth.' },
  { cat: 'Security', title: 'Authorised testing', body: 'Offensive techniques are only legal and ethical inside an explicitly authorised scope. Always confirm written authorisation, stay inside the defined range, and stop if you discover real data.' },
  { cat: 'Security', title: 'Severity scoring', body: 'Severity reflects impact × likelihood. Remote unauthenticated code execution is critical; an information leak with no direct impact is low. Severity drives remediation priority.' }
];

/* ============================================================
   Shared world builders
   ============================================================ */
function officeNet(opts) {
  const net = {
    devices: {
      'pc-01': { id: 'pc-01', name: 'PC-01', type: 'pc', x: 70, y: 60,
        ifaces: { eth0: { ip: opts.pcIp, mask: opts.pcMask, gateway: opts.pcGw, dns: opts.pcDns, up: true } } },
      'sw-01': { id: 'sw-01', name: 'SW-01', type: 'switch', x: 260, y: 60,
        ifaces: { 'Fa0/1': { up: true }, 'Fa0/2': { up: true }, 'Fa0/3': { up: true }, 'Fa0/4': { up: true } } },
      'rtr-01': { id: 'rtr-01', name: 'RTR-01', type: 'router', x: 450, y: 60,
        ifaces: { 'Gi0/0': { ip: '10.0.10.1', mask: '255.255.255.0', up: true },
                  'Gi0/1': { ip: '10.0.20.1', mask: '255.255.255.0', up: true } } },
      'srv-01': { id: 'srv-01', name: 'SRV-01', type: 'server', x: 260, y: 210,
        ifaces: { eth0: { ip: '10.0.10.20', mask: '255.255.255.0', gateway: '10.0.10.1', up: true } } },
      'srv-dns': { id: 'srv-dns', name: 'SRV-DNS', type: 'server', x: 450, y: 210,
        ifaces: { eth0: { ip: '10.0.10.53', mask: '255.255.255.0', gateway: '10.0.10.1', up: true } } }
    },
    links: [
      { a: 'pc-01', aIf: 'eth0', b: 'sw-01', bIf: 'Fa0/1' },
      { a: 'sw-01', aIf: 'Fa0/2', b: 'rtr-01', bIf: 'Gi0/0' },
      { a: 'sw-01', aIf: 'Fa0/3', b: 'srv-01', bIf: 'eth0' },
      { a: 'sw-01', aIf: 'Fa0/4', b: 'srv-dns', bIf: 'eth0' }
    ],
    dns: {
      'files.cybero.local': '10.0.10.20',
      'intranet.cybero.local': '10.0.10.20',
      'dns.cybero.local': '10.0.10.53',
      'gw.cybero.local': '10.0.10.1'
    }
  };
  return net;
}

/* ============================================================
   MISSIONS
   ============================================================ */
window.MISSIONS = [

/* ---------------- NETWORKING 1 ---------------- */
{
  id: 'net-01',
  title: 'First Connection',
  path: 'networking',
  track: 'Network Engineer',
  difficulty: 'easy',
  xp: 120,
  requires: [],
  tagline: 'A freshly imaged workstation cannot reach its gateway.',
  story: 'Day one at Nyx Technologies. Dana from the Service Desk drops a ticket on your desk before you have finished your coffee. The new workstation in the east wing cannot reach anything — not the file server, not the internet. The rest of the 10.0.10.0/24 office is fine.',
  briefing:
`TICKET #4821 — PC-01 unreachable

The workstation was re-imaged overnight. Colleagues on the same switch
are working normally.

Your tasks:
  1. Inspect PC-01's addressing with "ipconfig".
  2. Test the default gateway with "ping 10.0.10.1".
  3. Correct the addressing fault using the device panel.
  4. Verify the fix by reaching the file server at 10.0.10.20.`,
  learning: ['IPv4 addressing', 'Subnet masks', 'Default gateway', 'Layer-2 vs layer-3 reachability'],
  tools: ['topology', 'device-config', 'terminal'],
  terminal: { device: 'pc-01', commands: ['help', 'clear', 'ipconfig', 'ping', 'tracert', 'arp', 'netstat'] },
  skillGains: { networking: 3, troubleshooting: 2 },
  hints: [
    'Run "ipconfig" first. Compare the IP address and the subnet mask — do they put the gateway on the same network?',
    'PC-01 is configured as 192.168.10.50/24 but the office network is 10.0.10.0/24. A host can only reach its gateway if the gateway is on its own subnet.',
    'Open the device panel for PC-01 and set the IPv4 address to an unused address in 10.0.10.0/24 — for example 10.0.10.50 — keeping the mask 255.255.255.0.'
  ],
  setup() {
    return {
      net: officeNet({ pcIp: '192.168.10.50', pcMask: '255.255.255.0', pcGw: '10.0.10.1', pcDns: '10.0.10.53' }),
      activeDeviceId: 'pc-01'
    };
  },
  objectives: [
    { id: 'o1', text: 'Inspect PC-01 configuration with ipconfig.', check: r => !!r.flags['cmd:ipconfig'] },
    { id: 'o2', text: 'Test connectivity to the gateway 10.0.10.1.', check: r => !!r.flags['ping:10.0.10.1'] },
    { id: 'o3', text: 'Give PC-01 a valid address on the 10.0.10.0/24 network.', check: r => {
        const i = r.net.devices['pc-01'].ifaces.eth0;
        return Sim.isValidIp(i.ip) && Sim.sameSubnet(i.ip, i.mask, '10.0.10.1') && i.ip !== '10.0.10.1' &&
               i.ip !== '10.0.10.20' && i.ip !== '10.0.10.53';
      } },
    { id: 'o4', text: 'Verify PC-01 can reach the file server 10.0.10.20.', check: r => Sim.isReachable(r.net, 'pc-01', '10.0.10.20') && !!r.flags['ping:10.0.10.20'] }
  ],
  debrief:
`Correct answer: the workstation had an address from a different network
(192.168.10.50/24) while the office runs 10.0.10.0/24.

Because 192.168.10.0/24 and 10.0.10.1 are in different subnets, PC-01
considered the gateway "off-link" and could not ARP for it. Every packet
destined for the gateway was dropped before it ever reached the switch.

Placing the host at 10.0.10.50/24 with gateway 10.0.10.1 means:
  • 10.0.10.1 is on the local subnet, so ARP succeeds
  • 10.0.10.20 is also local, so traffic goes PC-01 → SW-01 → SRV-01
  • Off-subnet traffic is handed to RTR-01

Real-world note: this exact fault is common after imaging with a stale
answer file. Always verify address, mask and gateway together — not just
the address.`,
  penaltyNotes: { hints: 10 }
},

/* ---------------- NETWORKING 2 ---------------- */
{
  id: 'net-02',
  title: 'DNS Failure',
  path: 'networking',
  track: 'Network Troubleshooter',
  difficulty: 'easy',
  xp: 140,
  requires: ['net-01'],
  tagline: 'Names do not resolve, but numeric addresses still work.',
  story: 'The finance team can reach the intranet by IP address but every name-based link is broken. Marco from Infrastructure suspects DNS — he asks you to confirm before he touches the DNS server.',
  briefing:
`TICKET #4837 — Name resolution failing on PC-02

Users report:
  • "ping 10.0.10.20" works
  • "ping intranet.cybero.local" fails

Your tasks:
  1. Confirm the symptom with "nslookup intranet.cybero.local".
  2. Inspect PC-02's configured DNS server with "ipconfig".
  3. Correct the DNS server setting using the device panel.
  4. Prove resolution works with another "nslookup".`,
  learning: ['DNS client configuration', 'DNS query timeouts', 'Why IP works when names do not'],
  tools: ['topology', 'device-config', 'terminal'],
  terminal: { device: 'pc-02', commands: ['help', 'clear', 'ipconfig', 'ping', 'nslookup', 'arp', 'netstat'] },
  skillGains: { networking: 2, troubleshooting: 4 },
  hints: [
    'Run "nslookup intranet.cybero.local" and read the "Server:" line — that is the address the client is asking.',
    'PC-02 is pointing at 10.0.10.99. No device in this office has that address. The real DNS server is 10.0.10.53.',
    'Set the DNS server on PC-02 to 10.0.10.53 in the device panel, then re-run nslookup.'
  ],
  setup() {
    const net = officeNet({ pcIp: '10.0.10.61', pcMask: '255.255.255.0', pcGw: '10.0.10.1', pcDns: '10.0.10.99' });
    net.devices['pc-01'].id = 'pc-02';
    net.devices['pc-02'] = net.devices['pc-01'];
    delete net.devices['pc-01'];
    net.devices['pc-02'].name = 'PC-02';
    net.links[0].a = 'pc-02';
    return { net, activeDeviceId: 'pc-02' };
  },
  objectives: [
    { id: 'o1', text: 'Attempt a name lookup with nslookup.', check: r => !!r.flags['cmd:nslookup'] },
    { id: 'o2', text: 'Inspect PC-02 addressing with ipconfig.', check: r => !!r.flags['cmd:ipconfig'] },
    { id: 'o3', text: 'Set PC-02 to use the real DNS server 10.0.10.53.', check: r => r.net.devices['pc-02'].ifaces.eth0.dns === '10.0.10.53' },
    { id: 'o4', text: 'Confirm that intranet.cybero.local now resolves.', check: r => {
        const res = Sim.resolve(r.net, 'pc-02', 'intranet.cybero.local');
        return res.ok && res.ip === '10.0.10.20';
      } }
  ],
  debrief:
`Correct answer: PC-02's DNS server was set to 10.0.10.99, an address
that does not exist on the network. The client kept sending queries into
the void and timing out.

IP connectivity was fine the whole time, which is the signature of a DNS
fault rather than a routing fault. A useful triage rule:

  ping 8.8.8.8 fails   -> likely connectivity / routing
  ping 8.8.8.8 works,
  ping google.com fails -> almost always DNS

The fix is to point the client at a reachable resolver (10.0.10.53),
which is usually delivered by DHCP so this class of fault is rare on
DHCP clients and common on statically configured ones.`,
  penaltyNotes: { hints: 10 }
},

/* ---------------- NETWORKING 3 ---------------- */
{
  id: 'net-03',
  title: 'Office Network Outage',
  path: 'networking',
  track: 'NOC Engineer',
  difficulty: 'medium',
  xp: 180,
  requires: ['net-02'],
  tagline: 'The branch office subnet has gone dark.',
  story: 'The branch office at 10.0.20.0/24 stopped responding twenty minutes ago. Nobody changed anything on the branch side. The NOC wants a root cause and a restoration.',
  briefing:
`INCIDENT #5120 — Branch subnet 10.0.20.0/24 unreachable

  • HQ (10.0.10.0/24) is fully operational.
  • Branch server 10.0.20.30 does not answer from HQ.
  • No scheduled maintenance was recorded.

Your tasks:
  1. Run "status" to survey interface state across the estate.
  2. Confirm the outage with "ping 10.0.20.30".
  3. Restore the failing interface from the device panel.
  4. Verify end-to-end reachability.`,
  learning: ['Router interface state', 'Administratively down interfaces', 'Default gateway routing', 'NOC triage workflow'],
  tools: ['topology', 'device-config', 'terminal'],
  terminal: { device: 'pc-01', commands: ['help', 'clear', 'status', 'ipconfig', 'ping', 'tracert', 'arp', 'netstat'] },
  skillGains: { networking: 4, troubleshooting: 4 },
  hints: [
    'Start with "status". It prints every interface and whether it is UP or DOWN.',
    'RTR-01 Gi0/1 — the interface facing the branch — is DOWN. The link and the branch switch are healthy; the interface was administratively disabled.',
    'Select RTR-01 in the topology, then bring Gi0/1 up. Verify with "ping 10.0.20.30".'
  ],
  setup() {
    const net = {
      devices: {
        'pc-01': { id: 'pc-01', name: 'PC-01', type: 'pc', x: 60, y: 70,
          ifaces: { eth0: { ip: '10.0.10.50', mask: '255.255.255.0', gateway: '10.0.10.1', dns: '10.0.10.53', up: true } } },
        'sw-01': { id: 'sw-01', name: 'SW-01', type: 'switch', x: 240, y: 70,
          ifaces: { 'Fa0/1': { up: true }, 'Fa0/2': { up: true } } },
        'rtr-01': { id: 'rtr-01', name: 'RTR-01', type: 'router', x: 420, y: 70,
          ifaces: { 'Gi0/0': { ip: '10.0.10.1', mask: '255.255.255.0', up: true },
                    'Gi0/1': { ip: '10.0.20.1', mask: '255.255.255.0', up: false } } },
        'sw-02': { id: 'sw-02', name: 'SW-02', type: 'switch', x: 420, y: 220,
          ifaces: { 'Fa0/1': { up: true }, 'Fa0/2': { up: true } } },
        'srv-branch': { id: 'srv-branch', name: 'SRV-BR', type: 'server', x: 240, y: 220,
          ifaces: { eth0: { ip: '10.0.20.30', mask: '255.255.255.0', gateway: '10.0.20.1', up: true } } }
      },
      links: [
        { a: 'pc-01', aIf: 'eth0', b: 'sw-01', bIf: 'Fa0/1' },
        { a: 'sw-01', aIf: 'Fa0/2', b: 'rtr-01', bIf: 'Gi0/0' },
        { a: 'rtr-01', aIf: 'Gi0/1', b: 'sw-02', bIf: 'Fa0/2' },
        { a: 'sw-02', aIf: 'Fa0/1', b: 'srv-branch', bIf: 'eth0' }
      ],
      dns: { 'files.cybero.local': '10.0.10.20', 'branch.cybero.local': '10.0.20.30' }
    };
    return { net, activeDeviceId: 'pc-01' };
  },
  objectives: [
    { id: 'o1', text: 'Survey interface state with "status".', check: r => !!r.flags['cmd:status'] },
    { id: 'o2', text: 'Confirm the outage by pinging 10.0.20.30.', check: r => !!r.flags['ping:10.0.20.30'] },
    { id: 'o3', text: 'Bring RTR-01 interface Gi0/1 back into service.', check: r => r.net.devices['rtr-01'].ifaces['Gi0/1'].up === true },
    { id: 'o4', text: 'Verify the branch server is reachable.', check: r => Sim.isReachable(r.net, 'pc-01', '10.0.20.30') }
  ],
  debrief:
`Correct answer: RTR-01's Gi0/1 interface was administratively down.
Physically everything was fine — the cable, SW-02 and the branch server
were all healthy — but a disabled interface passes no traffic at all.

Because 10.0.20.0/24 sits behind that interface, HQ hosts received
"destination net unreachable" from the router: the router knew the route
existed but had no live path out of it.

NOC triage order that works:
  1. Is it one host or a whole subnet?  (scope)
  2. Is it layer 1/2 or layer 3?        (status / link lights)
  3. What changed?                      (config vs. hardware)
  4. Restore, then verify end to end.   (ping the far host)

Note: on real Cisco equipment an administratively down interface shows
"administratively down" in "show ip interface brief" and needs "no
shutdown" — the same concept as the toggle in this simulator.`,
  penaltyNotes: { hints: 10 }
},

/* ---------------- SECURITY 1 ---------------- */
{
  id: 'sec-01',
  title: 'Suspicious Login',
  path: 'cybersecurity',
  track: 'Blue Team / SOC',
  difficulty: 'easy',
  xp: 150,
  requires: [],
  tagline: 'Three alerts. One is real. Triage them.',
  story: 'Your first shift on the SOC. The alert queue has three open tickets and the tier-2 analyst is at lunch. You need to work the queue, decide what is genuinely malicious, and contain it.',
  briefing:
`SHIFT HANDOVER — 11 March

Three alerts are open. Historically about two thirds of this queue is
benign, so do not assume every alert is an attack.

Your tasks:
  1. Run "alerts" to read the queue.
  2. Run "logs auth" to review authentication events.
  3. Run "inspect <ALERT-ID>" on each alert you care about.
  4. Submit a conclusion in the Analysis panel.
  5. Contain the confirmed threat once you have classified it.`,
  learning: ['Alert triage', 'Authentication log analysis', 'True vs. false positive', 'Containment'],
  tools: ['alerts', 'logs', 'analysis'],
  terminal: { device: null, commands: ['help', 'clear', 'alerts', 'logs', 'inspect', 'status'] },
  skillGains: { security: 4, analysis: 4 },
  hints: [
    'Run "logs auth" and look for a burst of failures from a single external address, followed by a success.',
    'ALT-1041 shows 200+ failed logins from 203.0.113.45, then a success on the same account. ALT-1042 and ALT-1043 both have documented benign explanations in their details.',
    'In the Analysis panel choose alert ALT-1041, source 203.0.113.45, verdict "Confirmed brute force with successful login", then contain it.'
  ],
  setup() {
    return {
      alerts: [
        { id: 'ALT-1041', title: 'Repeated authentication failures', severity: 'high', ts: '2024-03-11 02:14', src: '203.0.113.45', status: 'open',
          detail: '218 failed authentication attempts for user j.hall over 11 minutes from a single external address, immediately followed by one successful login. The account then created a new mailbox rule.',
          related: ['auth fail j.hall from 203.0.113.45 x218 (02:03–02:14)', 'auth success j.hall from 203.0.113.45 (02:14)', 'mailbox rule created: forward all -> external'] },
        { id: 'ALT-1042', title: 'Unusual outbound data volume', severity: 'low', ts: '2024-03-11 01:30', src: '10.0.10.61', status: 'open',
          detail: 'Host FS-02 transferred 42 GB to 10.0.10.20 between 01:00 and 01:30. Change record CHG-2210 schedules a nightly backup window 01:00–02:00 to the file server. Volume matches the previous seven nights.',
          related: ['CHG-2210 approved by m.reyes', 'Last 7 nights: 39–45 GB in the same window'] },
        { id: 'ALT-1043', title: 'Impossible travel sign-in', severity: 'medium', ts: '2024-03-10 18:02', src: '198.51.100.77', status: 'open',
          detail: 'Sign-in for a.alvarez from Lisbon 40 minutes after a sign-in from the Madrid office. Travel record TR-889 shows an approved Madrid -> Lisbon flight departing 16:40.',
          related: ['Travel record TR-889 approved', 'Both sign-ins passed MFA'] }
      ],
      logs: [
        { ts: '02:03:11', host: 'VPN-GW', user: 'j.hall', event: 'auth.failure', src: '203.0.113.45' },
        { ts: '02:03:19', host: 'VPN-GW', user: 'j.hall', event: 'auth.failure', src: '203.0.113.45' },
        { ts: '02:04:02', host: 'VPN-GW', user: 'j.hall', event: 'auth.failure', src: '203.0.113.45' },
        { ts: '02:07:44', host: 'VPN-GW', user: 'j.hall', event: 'auth.failure', src: '203.0.113.45' },
        { ts: '02:11:50', host: 'VPN-GW', user: 'j.hall', event: 'auth.failure', src: '203.0.113.45' },
        { ts: '02:14:02', host: 'VPN-GW', user: 'j.hall', event: 'auth.success', src: '203.0.113.45', suspicious: true, note: 'after 218 failures' },
        { ts: '02:15:31', host: 'MAIL-01', user: 'j.hall', event: 'rule.create', src: '203.0.113.45', suspicious: true, note: 'forward to external address' },
        { ts: '01:00:04', host: 'FS-02', user: 'svc-backup', event: 'file.transfer', src: '10.0.10.61', note: 'scheduled backup' },
        { ts: '01:29:58', host: 'FS-02', user: 'svc-backup', event: 'file.transfer', src: '10.0.10.61', note: 'scheduled backup end' },
        { ts: '18:02:11', host: 'SSO', user: 'a.alvarez', event: 'auth.success', src: '198.51.100.77', note: 'MFA ok' },
        { ts: '17:22:40', host: 'SSO', user: 'a.alvarez', event: 'auth.success', src: '10.0.10.84', note: 'MFA ok' }
      ]
    };
  },
  objectives: [
    { id: 'o1', text: 'Review the alert queue.', check: r => !!r.flags['cmd:alerts'] },
    { id: 'o2', text: 'Review authentication events with "logs".', check: r => !!r.flags['cmd:logs'] },
    { id: 'o3', text: 'Inspect the alert you believe is genuine.', check: r => !!r.flags['inspect:ALT-1041'] || !!r.flags['inspect:alt-1041'] },
    { id: 'o4', text: 'Submit a correct classification in the Analysis panel.', check: r => r.flags['classified:ALT-1041'] === true },
    { id: 'o5', text: 'Contain the confirmed threat.', check: r => r.flags['contained'] === true }
  ],
  analysis: {
    title: 'Analysis — submit your conclusion',
    note: 'Choose carefully. A wrong classification costs points but you may retry.',
    fields: [
      { key: 'alert', label: 'Alert you are closing', type: 'select',
        options: ['— select —', 'ALT-1041', 'ALT-1042', 'ALT-1043'] },
      { key: 'src', label: 'Primary source address', type: 'select',
        options: ['— select —', '203.0.113.45', '10.0.10.61', '198.51.100.77', '10.0.10.20'] },
      { key: 'verdict', label: 'Verdict', type: 'select',
        options: ['— select —', 'Benign — approved change', 'Benign — legitimate travel',
                  'Confirmed brute force with successful login', 'Confirmed data exfiltration'] }
    ]
  },
  evaluateAnalysis(v) {
    const ok = v.alert === 'ALT-1041' && v.src === '203.0.113.45' && v.verdict === 'Confirmed brute force with successful login';
    return {
      ok,
      message: ok
        ? 'Classification accepted. 218 failures followed by a success from the same external address, then an external mail-forward rule — that is account compromise. Contain the source.'
        : 'Not quite. Check the timeline: which alert shows a failure burst followed by a success, and where did it come from?'
    };
  },
  debrief:
`Correct answer: ALT-1041 is a genuine compromise.

The chain is: 218 failed authentications from 203.0.113.45 → one success
on the same account → an inbox rule forwarding mail externally. Each
individual event is unremarkable; the sequence is the incident.

Why the others are false positives:
  • ALT-1042 — matches approved change CHG-2210 and the last seven nights
    of backup volume. Benign by design.
  • ALT-1043 — an approved flight (TR-889) explains the "impossible"
    travel, and both sign-ins passed MFA.

Investigative habits worth keeping:
  • Failure bursts alone are noise; a success at the end of a burst is signal.
  • Post-authentication behaviour (mail rules, new API keys, MFA changes)
    is often the strongest indicator.
  • Always look for a documented business reason before escalating.

Real-world note: blocking the source IP is a containment step, not a fix.
The account password must be reset, sessions revoked, and the malicious
mail rule removed.`,
  penaltyNotes: { hints: 10, wrongClassification: 15 }
},

/* ---------------- SECURITY 2 ---------------- */
{
  id: 'sec-02',
  title: 'Reconnaissance Lab',
  path: 'cybersecurity',
  track: 'Red Team / Authorised Offensive Security',
  difficulty: 'medium',
  xp: 170,
  requires: ['sec-01'],
  tagline: 'Map the authorised lab range before anyone touches it.',
  story: 'Nyx Technologies runs an isolated training range at 10.20.30.0/24. Written authorisation is on file for this engagement. Your first deliverable is simple reconnaissance — what exists, and what is listening.',
  briefing:
`ENGAGEMENT NYX-LAB-01 — AUTHORISED SCOPE: 10.20.30.0/24 ONLY

The range is a fictional, isolated environment. Nothing here touches a
real network.

Your tasks:
  1. Run "scan 10.20.30.0/24" to discover live hosts.
  2. Run "inspect <ip>" on each host to enumerate services.
  3. Identify which host exposes a database service to the network.
  4. Record the finding in the Analysis panel.`,
  learning: ['Host discovery', 'Service enumeration', 'Attack surface', 'Rules of engagement'],
  tools: ['scan', 'inspect', 'analysis'],
  terminal: { device: null, commands: ['help', 'clear', 'scan', 'inspect'] },
  skillGains: { offense: 4, analysis: 3 },
  hints: [
    'Start with "scan 10.20.30.0/24". It reports every live host and its listening ports.',
    'The web server is lab-web01 at 10.20.30.15. Run "inspect 10.20.30.15" to see its services and observed weaknesses.',
    'lab-web01 exposes MySQL on 3306. A database port should never be reachable from an untrusted network segment.'
  ],
  setup() {
    return {
      hosts: [
        { ip: '10.20.30.10', host: 'lab-dc01.cyberolab.local', os: 'Windows Server 2019',
          ports: [{ port: 53, svc: 'domain' }, { port: 88, svc: 'kerberos' }, { port: 389, svc: 'ldap' }], findings: [] },
        { ip: '10.20.30.15', host: 'lab-web01.cyberolab.local', os: 'Ubuntu 22.04',
          ports: [{ port: 22, svc: 'ssh' }, { port: 80, svc: 'http' }, { port: 3306, svc: 'mysql', note: 'exposed' }],
          findings: ['MySQL 3306 reachable from the entire lab subnet', 'HTTP login form reflects a SQL error on malformed input'] },
        { ip: '10.20.30.22', host: 'lab-files.cyberolab.local', os: 'Windows Server 2022',
          ports: [{ port: 445, svc: 'microsoft-ds' }, { port: 3389, svc: 'rdp' }], findings: [] }
      ]
    };
  },
  analysis: {
    title: 'Finding — exposed service',
    note: 'Record the asset and the service you consider unnecessarily exposed.',
    fields: [
      { key: 'host', label: 'Affected asset', type: 'select',
        options: ['— select —', 'lab-dc01 (10.20.30.10)', 'lab-web01 (10.20.30.15)', 'lab-files (10.20.30.22)'] },
      { key: 'port', label: 'Exposed service', type: 'select',
        options: ['— select —', 'none — no unnecessary exposure', 'MySQL (3306)', 'Kerberos (88)', 'RDP (3389)'] },
      { key: 'why', label: 'Why is this a problem?', type: 'select',
        options: ['— select —', 'It is a documented, required service',
                  'A database should not accept connections from an untrusted segment',
                  'The port number is unusual'] }
    ]
  },
  evaluateAnalysis(v) {
    const ok = v.host === 'lab-web01 (10.20.30.15)' && v.port === 'MySQL (3306)' &&
               v.why === 'A database should not accept connections from an untrusted segment';
    return { ok, message: ok
      ? 'Finding recorded. lab-web01 exposes MySQL to the whole lab segment — unnecessary attack surface regardless of patch level.'
      : 'Re-check which host in the scan output listed 3306, and think about what a database port on a general-purpose segment means.' };
  },
  objectives: [
    { id: 'o1', text: 'Run a discovery scan against the authorised range.', check: r => !!r.flags['cmd:scan'] },
    { id: 'o2', text: 'Discover all three hosts in the range.', check: r =>
        ['10.20.30.10', '10.20.30.15', '10.20.30.22'].every(ip => r.flags['discovered:' + ip]) },
    { id: 'o3', text: 'Enumerate services on lab-web01.', check: r => !!r.flags['inspect:10.20.30.15'] },
    { id: 'o4', text: 'Record the exposed-service finding.', check: r => r.flags['finding:exposed'] === true }
  ],
  debrief:
`Correct answer: lab-web01 exposes MySQL on 3306 to the entire
10.20.30.0/24 segment.

Why this matters:
  • A database should only accept connections from its application tier.
    Exposing it widens the attack surface and lets an attacker who lands
    anywhere on the segment talk to the database directly.
  • Service enumeration is the step where you convert "a host exists"
    into "here is what it can be attacked through".

Reconnaissance discipline:
  • Stay inside the authorised scope — 10.20.30.0/24 only.
  • Prefer quiet, low-volume queries; noisy scans are detected.
  • Record evidence as you go. A finding you cannot evidence is not a
    finding.

In this simulator "scan" and "inspect" are safe, deterministic
functions over fictional data. Real tooling of this kind is only
appropriate against systems you are authorised to test.`,
  penaltyNotes: { hints: 10 }
},
/* ---------------- SECURITY 3 ---------------- */
{
  id: 'sec-03',
  title: 'Vulnerability Assessment',
  path: 'cybersecurity',
  track: 'Penetration Tester',
  difficulty: 'hard',
  xp: 220,
  requires: ['sec-02'],
  tagline: 'Turn an observation into a defensible finding.',
  story: 'The lab engagement has produced an observation on lab-web01. Now it has to become a professional finding: name, evidence, severity, impact, remediation. Dana has to hand this to the client on Friday.',
  briefing:
`ENGAGEMENT NYX-LAB-01 — FINDING DELIVERABLE

You have already enumerated the range. Now produce one complete,
defensible finding.

Your tasks:
  1. Re-enumerate lab-web01 with "inspect 10.20.30.15".
  2. Review the observed weakness on the login form.
  3. Open the Findings panel ("report" or the panel button).
  4. Submit the vulnerability, its severity, and a remediation that a
     real team could act on.`,
  learning: ['Vulnerability identification', 'Severity assessment', 'Impact analysis', 'Remediation writing', 'Report quality'],
  tools: ['inspect', 'report', 'findings'],
  terminal: { device: null, commands: ['help', 'clear', 'scan', 'inspect', 'report'] },
  skillGains: { offense: 3, analysis: 5, security: 2 },
  hints: [
    'The login form returns a raw database error when given a malformed value — that is the signature of unsanitised input reaching a query.',
    'The correct vulnerability is "SQL injection in the login form". Severity is High: unauthenticated remote access to the database layer.',
    'A good remediation mentions parameterised queries / prepared statements, server-side input validation, least-privilege database accounts, and network restriction of 3306.'
  ],
  setup() {
    return {
      hosts: [
        { ip: '10.20.30.10', host: 'lab-dc01.cyberolab.local', os: 'Windows Server 2019',
          ports: [{ port: 53, svc: 'domain' }, { port: 88, svc: 'kerberos' }], findings: [] },
        { ip: '10.20.30.15', host: 'lab-web01.cyberolab.local', os: 'Ubuntu 22.04',
          ports: [{ port: 22, svc: 'ssh' }, { port: 80, svc: 'http' }, { port: 3306, svc: 'mysql', note: 'exposed' }],
          findings: [
            'login.php reflects raw SQL errors when the username field contains a quote character',
            'The query appears to concatenate user input directly',
            'MySQL 3306 is reachable from the entire lab subnet'
          ] },
        { ip: '10.20.30.22', host: 'lab-files.cyberolab.local', os: 'Windows Server 2022',
          ports: [{ port: 445, svc: 'microsoft-ds' }], findings: [] }
      ]
    };
  },
  analysis: {
    title: 'Finding report',
    note: 'This is the deliverable. Vague remediation costs points — be specific.',
    fields: [
      { key: 'vuln', label: 'Vulnerability', type: 'select',
        options: ['— select —', 'SQL injection in the login form', 'Missing HTTP security headers',
                  'SSH service is running', 'Self-signed TLS certificate'] },
      { key: 'asset', label: 'Affected asset', type: 'select',
        options: ['— select —', 'lab-web01 (10.20.30.15)', 'lab-dc01 (10.20.30.10)', 'lab-files (10.20.30.22)'] },
      { key: 'sev', label: 'Severity', type: 'select',
        options: ['— select —', 'Critical', 'High', 'Medium', 'Low'] },
      { key: 'rem', label: 'Recommended remediation', type: 'textarea', rows: 4,
        placeholder: 'e.g. Replace string concatenation with parameterised queries…' }
    ]
  },
  evaluateAnalysis(v) {
    const rem = String(v.rem || '').toLowerCase();
    const kw = ['parameter', 'prepared', 'sanitis', 'sanitiz', 'validat', 'least privilege', 'least-privilege',
                'restrict', 'firewall', 'waf', 'patch', 'escape', 'input'];
    const hits = kw.filter(k => rem.indexOf(k) !== -1).length;

    const correctVuln = v.vuln === 'SQL injection in the login form';
    const correctAsset = v.asset === 'lab-web01 (10.20.30.15)';
    const correctSev = v.sev === 'High';
    const goodRem = hits >= 2 && rem.length >= 40;

    const ok = correctVuln && correctAsset && correctSev && goodRem;
    let msg;
    if (!correctVuln) msg = 'The evidence on lab-web01 — raw SQL errors from a quote character — points to injection, not to headers or certificates.';
    else if (!correctAsset) msg = 'The observation was on lab-web01.';
    else if (!correctSev) msg = 'Unauthenticated remote access to the database layer is High: high impact, moderate likelihood, no special access required.';
    else if (!goodRem) msg = 'Remediation is too vague to act on. Say what to change technically — parameterised queries, validation, least privilege, network restriction.';
    else msg = 'Finding accepted. Specific vulnerability, correct asset, defensible severity, and remediation a team could implement.';

    return { ok, message: msg, extra: { hits, remLen: rem.length } };
  },
  objectives: [
    { id: 'o1', text: 'Enumerate services on lab-web01.', check: r => !!r.flags['inspect:10.20.30.15'] },
    { id: 'o2', text: 'Open the findings report panel.', check: r => !!r.flags['cmd:report'] || !!r.flags['finding:sql'] },
    { id: 'o3', text: 'Submit a finding with the correct vulnerability and asset.', check: r => r.flags['finding:sql'] === true },
    { id: 'o4', text: 'Assign an appropriate severity.', check: r => r.flags['finding:severity'] === true },
    { id: 'o5', text: 'Write an actionable remediation.', check: r => r.flags['finding:remediation'] === true }
  ],
  debrief:
`Correct answer: SQL injection in the login form on lab-web01, severity
High.

Evidence chain:
  • login.php returns a raw SQL error when the username contains a quote.
  • Errors of this shape mean user input reaches the query unescaped.
  • Combined with an internet-facing login form this allows an
    unauthenticated attacker to manipulate the query.

Why High and not Critical: exploitation requires interaction with the
form and does not by itself grant OS-level code execution. It is High
because it exposes the entire application database.

A remediation that would pass review:

  "Replace all dynamic SQL in login.php with parameterised queries
   (prepared statements). Add server-side input validation and escape
   output. Reduce the database account to the least privilege required
   by the application. Restrict MySQL 3306 to the application tier only
   and remove it from the general lab segment. Add a WAF rule as defence
   in depth, and re-test after the fix."

Notice the structure: fix the root cause → reduce blast radius →
add defence in depth → verify. That is what turns an observation into
a finding a client can act on.`,
  penaltyNotes: { hints: 12 }
}
];

/* helper used by objective checks in net-01 */
window.MISSION_BY_ID = function (id) { return window.MISSIONS.find(m => m.id === id); };