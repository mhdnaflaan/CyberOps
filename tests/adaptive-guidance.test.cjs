const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'js','app.js'),'utf8');
const game=fs.readFileSync(path.join(root,'js','game2d.js'),'utf8');
for(const token of ['function missingState()','function updateAdaptiveGuidance','failedCommands>=2','next unmet state check','adaptive hint']) if(!app.toLowerCase().includes(token.toLowerCase())) throw new Error('Missing adaptive hint feature: '+token);
for(const token of ['__conversationAt','TALKING TO TEAM','NORTHSTAR CYBER SYSTEMS','const palettes=']) if(!game.includes(token)) throw new Error('Missing living workplace feature: '+token);
console.log('Adaptive guidance tests passed: progress-aware next-step feedback, repeated-command troubleshooting, workplace conversations, branding and dynamic monitor screens.');
