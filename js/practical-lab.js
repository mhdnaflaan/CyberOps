/* CyberOps 8.4 Practical Career Simulator: deterministic, stateful fictional network lab. */
(function(){
  const KEY='cyberops84-network-lab';
  const initial=()=>({pc:{ip:'10.10.10.25',mask:'255.255.255.0',gateway:'10.10.10.1',dns:'10.10.20.53'},devices:{'SW-01':'up','RTR-01':'up','DNS-01':'down','WEB-01':'up','FW-01':'up'},flags:{mapped:false,diagnosed:false,restored:false,verified:false,reported:false},history:[],xp:0});
  function load(){try{return Object.assign(initial(),JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(e){return initial();}}
  function save(s){localStorage.setItem(KEY,JSON.stringify(s));}
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function stateLine(s){return `PC-01 ${s.pc.ip} /24 · GW ${s.pc.gateway} · DNS ${s.pc.dns}\nSW-01 ${s.devices['SW-01']} | RTR-01 ${s.devices['RTR-01']} | DNS-01 ${s.devices['DNS-01']} | WEB-01 ${s.devices['WEB-01']} | FW-01 ${s.devices['FW-01']}`;}
  function execute(raw,s){const cmd=raw.trim().replace(/\s+/g,' ');const c=cmd.toLowerCase();let out='',ok=true,xp=0;
    if(!cmd)return {out:'Enter a command. Type help to see supported commands.',ok:false};
    if(c==='help')out='Supported commands:\nhelp · map · ipconfig · devices · ping <gateway|web|dns> · nslookup intranet.corp · diagnose intranet · service status dns · service start dns · verify intranet · report <summary> · objectives';
    else if(c==='map'){s.flags.mapped=true;out='NETWORK MAP\nPC-01 → SW-01 → RTR-01 → FW-01 → WEB-01\n                         └→ DNS-01\nTopology recorded. DNS-01 is currently DOWN; other listed devices are UP.';xp=5;}
    else if(c==='ipconfig')out=`Windows IP Configuration\nIPv4 Address . . . : ${s.pc.ip}\nSubnet Mask . . . : ${s.pc.mask}\nDefault Gateway . : ${s.pc.gateway}\nDNS Servers . . . : ${s.pc.dns}`;
    else if(c==='devices')out=stateLine(s);
    else if(c==='ping gateway'||c==='ping 10.10.10.1')out=s.devices['RTR-01']==='up'?'Reply from 10.10.10.1: bytes=32 time<1ms TTL=64\nPackets: Sent=4, Received=4, Lost=0 (0% loss)':'Request timed out. Gateway path unavailable.';
    else if(c==='ping web'||c==='ping 10.10.20.20')out=s.devices['WEB-01']==='up'&&s.devices['RTR-01']==='up'?'Reply from 10.10.20.20: bytes=32 time=2ms TTL=64\nPackets: Sent=4, Received=4, Lost=0 (0% loss)':'Request timed out. Check routing and service reachability.';
    else if(c==='ping dns'||c==='ping 10.10.20.53')out=s.devices['DNS-01']==='up'?'Reply from 10.10.20.53: bytes=32 time=1ms TTL=64':'Request timed out. DNS server 10.10.20.53 is not responding.';
    else if(c==='nslookup intranet.corp')out=s.devices['DNS-01']==='up'?'Server: dns-01.corp (10.10.20.53)\nName: intranet.corp\nAddress: 10.10.20.20':'DNS request timed out. Server 10.10.20.53 did not respond. Verify server reachability and DNS service status.';
    else if(c==='diagnose intranet'){s.flags.diagnosed=true;out=`INTRANET DIAGNOSTIC\nWorkstation configuration: OK\nDefault gateway: ${s.devices['RTR-01']==='up'?'reachable':'unreachable'}\nWeb server: ${s.devices['WEB-01']==='up'?'online':'offline'}\nDNS server: ${s.devices['DNS-01']==='up'?'online':'offline'}\nLikely fault: ${s.devices['DNS-01']==='up'?'No DNS fault currently detected':'DNS-01 is offline; hostname resolution will fail even if the web server is online.'}`;xp=5;}
    else if(c==='service status dns')out=`DNS-01 service: ${s.devices['DNS-01']==='up'?'RUNNING':'STOPPED'}\nHost: 10.10.20.53\nDependency: intranet hostname resolution`;
    else if(c==='service start dns'){if(s.devices['DNS-01']==='up'){out='DNS service is already running.';}else{s.devices['DNS-01']='up';s.flags.restored=true;out='DNS service started successfully in the simulated lab. Next: verify name resolution and intranet access.';xp=15;}}
    else if(c==='verify intranet'){if(s.devices['DNS-01']==='up'&&s.devices['WEB-01']==='up'&&s.devices['RTR-01']==='up'){s.flags.verified=true;out='VERIFICATION PASSED\nDNS resolves intranet.corp to 10.10.20.20.\nWeb service is online.\nIncident impact: intranet access restored.';xp=15;}else{out='Verification failed. Check gateway, DNS service, and web server status before retrying.';ok=false;}}
    else if(c.startsWith('report ')){const summary=cmd.slice(7).trim();if(summary.length<12){out='Report too short. Include the symptom, root cause, action and verification.';ok=false;}else if(!s.flags.verified){out='Do not close the incident before verification passes.';ok=false;}else{s.flags.reported=true;out=`INC-204 REPORT SAVED\nSummary: ${summary}\nRoot cause: DNS-01 service was stopped.\nRemediation: restarted simulated DNS service.\nVerification: intranet.corp resolves and service is reachable.\nStatus: READY TO CLOSE`;xp=10;}}
    else if(c==='objectives')out=`MISSION 1 · Map and inspect: ${s.flags.mapped?'COMPLETE':'PENDING'}\nMISSION 2 · Diagnose and restore DNS: ${s.flags.diagnosed&&s.flags.restored?'COMPLETE':'PENDING'}\nMISSION 3 · Verify and report: ${s.flags.verified&&s.flags.reported?'COMPLETE':'PENDING'}`;
    else {out=`Command not recognised: ${cmd}\nType help for supported commands. Use read-only checks before making changes.`;ok=false;}
    if(xp){s.xp+=xp;} s.history.push({at:new Date().toISOString(),command:cmd,ok,output:out});s.history=s.history.slice(-100);save(s);return {out,ok,xp};
  }
  window.CyberOpsPracticalLab={load,save,execute,reset(){localStorage.removeItem(KEY);return load();}};
})();
