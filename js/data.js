window.AVATARS = [
  { id: 'mira', name: 'Mira Chen', role: 'Network Engineer', face: '🌐', sprite: 'mira', style: 'Field-ready technician', affinity: 'networking', description: 'Practical, methodical and focused on keeping infrastructure online.' },
  { id: 'sam', name: 'Sam Rivera', role: 'SOC Analyst', face: '🛡️', sprite: 'sam', style: 'SOC operations', affinity: 'cybersecurity', description: 'Calm under pressure; looks for patterns in alerts and logs.' },
  { id: 'zero', name: 'Zero Vale', role: 'Ethical Hacker', face: '⌘', sprite: 'zero', style: 'Dark hoodie · Red Team', affinity: 'hacker', description: 'A hoodie-wearing security researcher who tests only authorised lab targets.' },
  { id: 'alex', name: 'Alex Morgan', role: 'Incident Responder', face: '🚨', sprite: 'alex', style: 'Incident response', affinity: 'cybersecurity', description: 'Direct, observant and ready to coordinate containment and recovery.' },
  { id: 'nadia', name: 'Nadia Perera', role: 'Network Lead', face: '🧭', sprite: 'nadia', style: 'Network operations lead', affinity: 'networking', description: 'Thinks in topology, dependencies and reliable change management.' },
  { id: 'rin', name: 'Rin Okafor', role: 'Security Researcher', face: '🔎', sprite: 'rin', style: 'Research lab', affinity: 'hacker', description: 'Curious and evidence-driven, with a focus on careful validation.' }
];
window.OUTFITS = [];
window.CODEX = [];

const MISSIONS = [];

// --- NETWORKING ---
MISSIONS.push({
  id: 'net-01', title: 'First Connection', path: 'networking', track: 'Network Engineer', difficulty: 'easy', xp: 120, requires: [], timeLimit: 180,
  tagline: 'A workstation cannot reach its gateway.', story: 'At 08:42, the help desk reports that PC-01 cannot reach services on the office network after a desk move. The workstation is powered on, but connectivity is unreliable.', briefing: 'Inspect the workstation configuration, compare its network details with the gateway, and restore connectivity. Record what you changed and why.',
  terminal: { device: 'pc-01', commands: ['help', 'clear', 'ipconfig', 'ping'] }, skillGains: { networking: 3 }, hints: ['Compare the workstation address and subnet with the gateway. Are they on the same network?', 'Use the device configuration panel to assign a host address in the gateway’s subnet with the matching subnet mask.'],
  setup() { return { net: { devices: { 'pc-01': { id: 'pc-01', name: 'PC-01', type: 'pc', ifaces: { eth0: { ip: '192.168.1.50', mask: '255.255.255.0', gateway: '10.0.10.1', up: true } } }, 'gw': { id: 'gw', name: 'RTR', type: 'router', ifaces: { e0: { ip: '10.0.10.1', mask: '255.255.255.0', up: true } } } } }, activeDeviceId: 'pc-01' }; },
  objectives: [ { id: 'o1', text: 'Run ipconfig', check: r => !!r.flags['cmd:ipconfig'] }, { id: 'o2', text: 'Fix the IP address to 10.0.10.x', check: r => Sim.sameSubnet(r.net.devices['pc-01'].ifaces.eth0.ip, '255.255.255.0', '10.0.10.1') } ],
  debrief: 'You fixed the IP configuration.', penaltyNotes: { hints: 10 }
});
MISSIONS.push({
  id: 'net-02', title: 'DNS Failure', path: 'networking', track: 'Troubleshooter', difficulty: 'easy', xp: 140, requires: ['net-01'], timeLimit: 240,
  tagline: 'Names do not resolve.', story: 'Several users can reach internal systems by IP address, but internal service names fail to load. The network team suspects a name-resolution issue.', briefing: 'Inspect the workstation resolver settings and use the available evidence to determine whether the configured DNS server is appropriate.', terminal: { device: 'pc-02', commands: ['help', 'clear', 'ipconfig', 'ping', 'nslookup'] }, skillGains: { networking: 2 }, hints: ['If IP connectivity works but names fail, which service translates names to addresses?', 'Inspect the configured resolver and compare it with the approved DNS service: 10.0.10.53.'],
  setup() { return { net: { devices: { 'pc-02': { id: 'pc-02', name: 'PC-02', type: 'pc', ifaces: { eth0: { ip: '10.0.10.61', mask: '255.255.255.0', gateway: '10.0.10.1', dns: '10.0.10.99', up: true } } } } }, activeDeviceId: 'pc-02', approvedDns: '10.0.10.53', dnsRecords: { 'intranet.cyberops.test': '10.0.10.20' } }; },
  objectives: [ { id: 'o1', text: 'Configure the approved DNS resolver', check: r => r.net.devices['pc-02'].ifaces.eth0.dns === '10.0.10.53' }, { id: 'o2', text: 'Verify name resolution with nslookup intranet.cyberops.test', check: r => !!r.flags['nslookup:intranet.cyberops.test'] } ],
  debrief: 'You fixed DNS.', penaltyNotes: { hints: 10 }
});
MISSIONS.push({
  id: 'net-03', title: 'Office Outage', path: 'networking', track: 'NOC', difficulty: 'medium', xp: 180, requires: ['net-02'], timeLimit: 120,
  tagline: 'The router interface is down.', story: 'A maintenance window has ended, but an office segment remains offline. Monitoring reports a loss of link near the gateway.', briefing: 'Check device and interface status, identify the failed link, and restore the interface only after confirming the likely cause.', terminal: { device: 'pc-01', commands: ['help', 'clear', 'status', 'ping'] }, skillGains: { networking: 4 }, hints: ['The workstation configuration looks correct. Check the status indicator for each device in the topology.', 'Select the router and use its device configuration to bring the down interface back up.'],
  setup() { return { net: { devices: { 'pc-01': { id: 'pc-01', name: 'PC-01', type: 'pc', ifaces: { eth0: { ip: '10.0.10.50', mask: '255.255.255.0', gateway: '10.0.10.1', up: true } } }, 'gw': { id: 'gw', name: 'RTR', type: 'router', ifaces: { e0: { ip: '10.0.10.1', mask: '255.255.255.0', up: false } } } } }, activeDeviceId: 'pc-01' }; },
  objectives: [ { id: 'o1', text: 'Restore the failed router interface', check: r => r.net.devices['gw'].ifaces.e0.up === true } ],
  debrief: 'You restored the link.', penaltyNotes: { hints: 10 }
});

// --- CYBERSECURITY ---
MISSIONS.push({
  id: 'sec-01', title: 'Suspicious Login', path: 'cybersecurity', track: 'Blue Team', difficulty: 'easy', xp: 150, requires: [], timeLimit: 180,
  tagline: 'Triage the alerts.', story: 'The VPN monitoring queue shows an unusual burst of failed sign-ins followed by a successful login outside normal hours. The account owner has not yet confirmed the activity.', briefing: 'Correlate the alert with authentication logs. Decide whether the pattern is suspicious and be ready to explain which evidence supports your verdict.', terminal: { device: null, commands: ['help', 'clear', 'alerts', 'logs', 'inspect'] }, skillGains: { security: 3 }, hints: ['Look for repeated authentication failures, then check whether a success follows from the same source.', 'Compare the source address and event sequence in the logs before submitting your classification.'],
  setup() { return { alerts: [{ id: 'ALT-1041', title: 'Auth Failures', severity: 'high', ts: '02:14', src: '203.0.113.45', detail: '218 failures then success.' }], logs: [{ ts: '02:03', host: 'VPN', event: 'fail', user: 'j.hall', src: '203.0.113.45', suspicious: true }] }; },
  analysis: { title: 'Submit Finding', fields: [{ key: 'verdict', label: 'Verdict', type: 'select', options: ['Brute Force', 'Benign'] }] },
  evaluateAnalysis: v => ({ ok: v.verdict === 'Brute Force', message: v.verdict === 'Brute Force' ? 'Correct.' : 'Wrong.' }),
  objectives: [ { id: 'o1', text: 'Classify the authentication pattern and submit your finding', check: r => r.flags['classified'] === true } ],
  debrief: 'Identified brute force.', penaltyNotes: { hints: 10 }
});
MISSIONS.push({
  id: 'sec-02', title: 'Data Exfiltration', path: 'cybersecurity', track: 'SOC', difficulty: 'medium', xp: 170, requires: ['sec-01'], timeLimit: 150,
  tagline: 'Large upload detected.', story: 'An endpoint sent an unusually large volume of data to an unfamiliar external destination. The service owner has not yet confirmed whether the transfer was expected.', briefing: 'Review the alert and related activity. Decide whether the transfer is consistent with normal business activity or needs incident escalation.', terminal: { device: null, commands: ['help', 'clear', 'alerts', 'logs', 'inspect'] }, skillGains: { security: 4 }, hints: ['Submit "Malicious" for ALT-202.'],
  setup() { return { alerts: [{ id: 'ALT-202', title: 'Large Outbound Transfer', severity: 'high', ts: '04:10', src: '10.0.10.55', detail: '4GB sent to unknown IP.' }], logs: [{ ts: '04:09', host: 'PC-04', event: 'upload', user: 'sys', src: '10.0.10.55', suspicious: true }] }; },
  analysis: { title: 'Submit Finding', fields: [{ key: 'verdict', label: 'Verdict', type: 'select', options: ['Malicious', 'Benign Backup'] }] },
  evaluateAnalysis: v => ({ ok: v.verdict === 'Malicious', message: v.verdict === 'Malicious' ? 'Correct.' : 'Wrong.' }),
  objectives: [ { id: 'o1', text: 'Determine whether the outbound transfer is malicious', check: r => r.flags['classified'] === true } ],
  debrief: 'You stopped exfiltration.', penaltyNotes: { hints: 10 }
});
MISSIONS.push({
  id: 'sec-03', title: 'False Positive', path: 'cybersecurity', track: 'SOC', difficulty: 'medium', xp: 160, requires: ['sec-02'], timeLimit: 200,
  tagline: 'Is it real?', story: 'A low-severity port-scan alert came from an internal management workstation during a scheduled maintenance period. The SOC must avoid both missed threats and unnecessary escalation.', briefing: 'Compare the alert source and event details with the available logs before deciding whether the activity is authorised.', terminal: { device: null, commands: ['help', 'clear', 'alerts', 'logs', 'inspect'] }, skillGains: { security: 2 }, hints: ['Check whether the source is an internal management host and whether the timestamp matches the maintenance context.', 'Use the source and event details together; an alert alone does not prove malicious intent.'],
  setup() { return { alerts: [{ id: 'ALT-303', title: 'Port Scan', severity: 'low', ts: '09:00', src: '10.0.10.10', detail: 'Nmap scan detected.' }], logs: [{ ts: '09:00', host: 'FW', event: 'scan', user: 'admin', src: '10.0.10.10', suspicious: false }] }; },
  analysis: { title: 'Submit Finding', fields: [{ key: 'verdict', label: 'Verdict', type: 'select', options: ['Malicious', 'Benign'] }] },
  evaluateAnalysis: v => ({ ok: v.verdict === 'Benign', message: v.verdict === 'Benign' ? 'Correct.' : 'Wrong.' }),
  objectives: [ { id: 'o1', text: 'Determine whether the scan is authorised activity', check: r => r.flags['classified'] === true } ],
  debrief: 'You avoided a false positive.', penaltyNotes: { hints: 10 }
});

// --- HACKER ---
MISSIONS.push({
  id: 'hack-01', title: 'The Bug Bounty', path: 'hacker', track: 'OSINT', difficulty: 'medium', xp: 200, requires: [], timeLimit: 180,
  tagline: 'Assess an authorised training target.', story: 'A fictional bug-bounty programme has provided a single lab host and written permission to assess it. Your task is to map the exposed surface and document a validated finding.', briefing: 'Stay within the assigned lab scope. Gather context, inspect the simulated host, and validate the finding only using the training environment. Do not target real systems.', terminal: { device: null, commands: ['help', 'clear', 'osint', 'crack', 'scan', 'exploit'] }, skillGains: { hacking: 5 }, hints: ['Start by collecting information about the fictional programme target; the simulated terminal help lists available commands.', 'Use the simulated results to identify the assigned host and validate only the lab finding. Keep all actions inside CyberOps.'],
  setup() { return { hosts: [{ ip: '10.20.30.15', host: 'initech', ports: [] }] }; },
  objectives: [ { id: 'o1', text: 'Gather OSINT', check: r => !!r.flags['cmd:osint'] }, { id: 'o2', text: 'Audit the supplied sample hash', check: r => !!r.flags['cmd:crack'] }, { id: 'o3', text: 'Discover the authorised target with scan', check: r => !!r.flags['discovered:10.20.30.15'] }, { id: 'o4', text: 'Validate the finding against the in-scope host', check: r => !!r.flags['exploited:10.20.30.15'] } ],
  debrief: 'You hacked the target.', penaltyNotes: { hints: 10 }
});
MISSIONS.push({
  id: 'hack-02', title: 'Privilege Escalation', path: 'hacker', track: 'Exploit Dev', difficulty: 'hard', xp: 250, requires: ['hack-01'], timeLimit: 150,
  tagline: 'Investigate a lab privilege boundary.', story: 'A deliberately vulnerable training host is available inside the isolated CyberOps lab. The exercise is to identify the exposed service and determine whether the evidence supports a privilege-boundary weakness.', briefing: 'Confirm the host and service from the simulated results first. Work only against the provided lab target and describe the impact in your final debrief.', terminal: { device: null, commands: ['help', 'clear', 'scan', 'exploit'] }, skillGains: { hacking: 6 }, hints: ['Do not assume a weakness: first inspect what the simulated scan reports for the assigned host.', 'If the lab evidence identifies a vulnerable service, use the corresponding simulated validation step and record the impact.'],
  setup() { return { hosts: [{ ip: '10.20.30.16', host: 'target', ports: [] }] }; },
  objectives: [ { id: 'o1', text: 'Scan the authorised lab target', check: r => !!r.flags['discovered:10.20.30.16'] }, { id: 'o2', text: 'Validate the finding on the in-scope host', check: r => !!r.flags['exploited:10.20.30.16'] } ],
  debrief: 'Root achieved.', penaltyNotes: { hints: 10 }
});
MISSIONS.push({
  id: 'hack-03', title: 'Password Spray', path: 'hacker', track: 'Red Team', difficulty: 'hard', xp: 260, requires: ['hack-02'], timeLimit: 120,
  tagline: 'Audit a sample credential hash.', story: 'A training report contains a sample password hash that may represent a weak credential policy. No production account or real service is involved.', briefing: 'Use the provided lab evidence to assess the password risk, then consider what defensive control would reduce the risk. This exercise is limited to the supplied sample.', terminal: { device: null, commands: ['help', 'clear', 'osint', 'crack'] }, skillGains: { hacking: 5 }, hints: ['Start by inspecting the supplied sample and identify what kind of evidence you have.', 'The exercise is about weak credential risk: use the simulated credential-audit workflow and think about how to prevent password reuse.'],
  setup() { return { hosts: [] }; },
  objectives: [ { id: 'o1', text: 'Crack the password', check: r => !!r.flags['cmd:crack'] } ],
  debrief: 'Password cracked.', penaltyNotes: { hints: 10 }
});

// --- GENERATOR ---
for (let i = 4; i <= 10; i++) {
  MISSIONS.push({
    id: 'net-' + i, title: 'Routing Issue #' + i, path: 'networking', track: 'Engineer', difficulty: 'medium', xp: 100, requires: ['net-03'], timeLimit: 240,
    tagline: `Connectivity issue on workstation ${i}.`, story: `A workstation was moved to a different office area and can no longer communicate with the local gateway. The help desk needs a diagnosis before returning it to service.`, briefing: 'Inspect the current configuration and compare the workstation address with the intended local network. Use the objectives and hints as guidance, not as a substitute for checking the evidence.',
    terminal: { device: 'pc-01', commands: ['help', 'clear', 'ipconfig', 'ping'] }, skillGains: { networking: 2 },
    setup() { return { net: { devices: { 'pc-01': { id: 'pc-01', name: 'PC-01', type: 'pc', ifaces: { eth0: { ip: `192.168.5.${i}`, mask: '255.255.255.0', gateway: '10.0.10.1', up: true } } } } }, activeDeviceId: 'pc-01' }; },
    objectives: [ { id: 'o1', text: 'Change IP to 10.0.10.0/24', check: r => Sim.sameSubnet(r.net.devices['pc-01'].ifaces.eth0.ip, '255.255.255.0', '10.0.10.1') } ],
    debrief: 'Routing fixed.', penaltyNotes: { hints: 10 }
  });
  MISSIONS.push({
    id: 'sec-' + i, title: 'Threat Intel #' + i, path: 'cybersecurity', track: 'SOC', difficulty: 'medium', xp: 120, requires: ['sec-03'], timeLimit: 180,
    tagline: `Investigate a threat-intelligence alert.`, story: `A simulated firewall alert references external address 198.51.100.${i}. Analysts need to determine whether the surrounding event details indicate a genuine threat.`, briefing: 'Correlate the source, event type and alert details. Submit a verdict only after reviewing the evidence in the simulated logs.',
    terminal: { device: null, commands: ['help', 'clear', 'alerts', 'logs', 'inspect'] }, skillGains: { security: 2 },
    setup() { return { alerts: [{ id: 'ALT-' + (400+i), title: 'Suspicious Traffic', severity: 'high', ts: '12:00', src: `198.51.100.${i}`, detail: 'C2 beaconing.' }], logs: [{ ts: '12:00', host: 'FW', event: 'block', user: 'sys', src: `198.51.100.${i}`, suspicious: true }] }; },
    analysis: { title: 'Submit Finding', fields: [{ key: 'verdict', label: 'Verdict', type: 'select', options: ['Malicious', 'Benign'] }] },
    evaluateAnalysis: v => ({ ok: v.verdict === 'Malicious', message: v.verdict === 'Malicious' ? 'Correct.' : 'Wrong.' }),
    objectives: [ { id: 'o1', text: 'Determine whether the outbound transfer is malicious', check: r => r.flags['classified'] === true } ],
    debrief: 'Threat classified.', penaltyNotes: { hints: 10 }
  });
  MISSIONS.push({
    id: 'hack-' + i, title: 'Target Enumeration #' + i, path: 'hacker', track: 'Red Team', difficulty: 'hard', xp: 150, requires: ['hack-03'], timeLimit: 180,
    tagline: `Exploit 10.20.30.${20+i}.`, story: 'New target acquired.', briefing: `Scan and exploit 10.20.30.${20+i}.`,
    terminal: { device: null, commands: ['help', 'clear', 'scan', 'exploit'] }, skillGains: { hacking: 3 },
    setup() { return { hosts: [{ ip: `10.20.30.${20+i}`, host: 'target' + i, ports: [] }] }; },
    objectives: [ { id: 'o1', text: 'Discover the in-scope lab host', check: r => !!r.flags['discovered:10.20.30.' + (20+i)] }, { id: 'o2', text: 'Validate the finding only after discovery', check: r => !!r.flags['exploited:10.20.30.' + (20+i)] } ],
    debrief: 'Target compromised.', penaltyNotes: { hints: 10 }
  });
}
window.MISSIONS = MISSIONS;