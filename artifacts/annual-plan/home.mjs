import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe'});
const errors=[];
const must=['Daily Muhurat Timings:','Daily Horas (Planetary Hours):','Earn 30% of every subscription fee paid by members who join using your unique Ambassador Code, and 50% for every member from your 301st onward.','Keep earning year after year!','Your own Ambassador Dashboard:','No additional investment required:','Your Influence Deserves a Lasting Reward.',"Together, Let's Build a World in Harmony.",'Become a NAMASUTRA Ambassador Today.','Generate your unique Ambassador Code.','NAMASUTRA — Your Elemental Identity, in Harmony with Nature.','Share Your Wisdom. Grow Your Rewards.'];
for(const [w,session] of [[360,null],[1440,null],[360,{uid:'mock-ambassador',email:'ambassador@namevibes.test',displayName:'Arjun'}]]){
  const c=await b.newContext({viewport:{width:w,height:800}});await c.addInitScript(s=>{if(s)localStorage.setItem('nv_mock_session',JSON.stringify(s))},session);
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://localhost:5173/ambassador');await p.waitForTimeout(1000);
  const t=await p.locator('body').innerText();
  console.log(w,session?'ambassador':'signed-out','missing:',must.filter(m=>!t.includes(m)),'overflow',await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'bullets',await p.locator('article li').count(),'signin',t.includes('Sign in with Google'));
  await p.screenshot({path:`artifacts/annual-plan/home-${w}-${session?'amb':'out'}.png`,fullPage:true});
  await c.close();
}
console.log('errors',errors);await b.close();
