import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe'});
const errors=[];
const c=await b.newContext({viewport:{width:360,height:900}});
const sess=(s)=>c.addInitScript(x=>localStorage.setItem('nv_mock_session',JSON.stringify(x)),s);
await sess({uid:'mock-admin',email:'admin@namevibes.test',displayName:'Admin'});
let p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
await p.goto('http://localhost:5173/admin');await p.waitForTimeout(900);
await p.getByRole('button',{name:/Payouts/}).first().click();await p.waitForTimeout(700);
console.log('row:',JSON.stringify((await p.locator('tbody').first().innerText()).slice(0,60)),'overflow',await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
await p.getByRole('button',{name:'Share with Accounts'}).first().click();await p.waitForTimeout(500);
console.log('modal',(await p.locator('.fixed.inset-0').innerText()).replace(/\s+/g,' ').slice(0,260));
await p.screenshot({path:'artifacts/annual-plan/share-modal-360.png'});
await p.getByRole('button',{name:'Confirm & Share'}).click();await p.waitForTimeout(1000);
// Accounts + Payout Management with current month
await p.close();
await c.clearCookies();
const c2=c; await c2.addInitScript(x=>localStorage.setItem('nv_mock_session',JSON.stringify(x)),{uid:'mock-accounts',email:'accounts@namevibes.test',displayName:'Accounts'});
const w=await c2.newPage();w.on('pageerror',e=>errors.push(e.message));
await w.addInitScript(x=>localStorage.setItem('nv_mock_session',JSON.stringify(x)),{uid:'mock-accounts',email:'accounts@namevibes.test',displayName:'Accounts'});
await w.goto('http://localhost:5173/accounts');await w.waitForTimeout(1200);
for(const m of ['Oct','Nov']){await w.getByText(m,{exact:true}).first().click().catch(()=>{});}
await w.waitForTimeout(500);
const t=await w.locator('tbody').first().innerText();console.log('accounts row:',JSON.stringify(t.slice(0,80)),'overflow',await w.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
await w.screenshot({path:'artifacts/annual-plan/accounts-360.png'});
console.log('errors',errors);await b.close();
