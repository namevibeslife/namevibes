import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe'});
const errs=[];
async function run(label,seedCode){
  const c=await b.newContext({viewport:{width:390,height:900}});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(s=>localStorage.setItem('nv_mock_session',JSON.stringify(s)),{uid:'mock-unpaid',email:'unpaid@namevibes.test',displayName:'Unpaid User'});
  await p.goto('http://localhost:5199/');await p.waitForTimeout(800);
  if(seedCode){await p.evaluate(async c=>{const f=await import('/src/firebase.js');const m=await import('/src/mock/firestore.js');await m.updateDoc(m.doc(f.db,'users','mock-unpaid'),{referralCodeUsed:c});},seedCode);}
  await p.goto('http://localhost:5199/pricing');await p.waitForTimeout(1200);
  const card=(await p.locator('main, body').first().innerText()).replace(/\s+/g,' ');
  console.log(label,'PRICING:',card.match(/EVERYTHING INCLUDED.{0,110}/)?.[0]);
  console.log('  Save text present:',/Save ₹/.test(card),'overflow',await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
  await p.screenshot({path:`artifacts/annual-plan/price-${label}.png`,fullPage:true});
  await p.getByRole('button',{name:/Get the Annual Plan/}).first().click().catch(e=>console.log('click fail'));
  await p.waitForTimeout(1200);
  const pay=(await p.locator('body').innerText()).replace(/\s+/g,' ');
  console.log('  PAYMENT url',p.url().replace('http://localhost:5199',''),'::',pay.match(/Secure payment.{0,260}/)?.[0]);
  await p.screenshot({path:`artifacts/annual-plan/pay-${label}.png`,fullPage:true});
  await c.close();
}
await run('nocode',null);await run('code','IN988595');
console.log('errors',errs);await b.close();
