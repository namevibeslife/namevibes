import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe'});
const errors=[];
const c=await b.newContext({viewport:{width:1280,height:900}});
const sess=(s)=>c.addInitScript(x=>localStorage.setItem('nv_mock_session',JSON.stringify(x)),s);
await sess({uid:'mock-admin',email:'admin@namevibes.test',displayName:'Admin'});
let p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
const tabs=async()=>(await p.getByRole('tab').allInnerTexts()).join(' | ');
const ambTab=async()=>{await p.goto('http://localhost:5173/admin');await p.waitForTimeout(900);await p.getByRole('button',{name:/^Ambassadors/}).first().click();await p.waitForTimeout(500)};
await ambTab();
console.log('tabs before',await tabs());
await p.getByLabel('Full name *').fill('Ravi Invitee');await p.getByLabel('Google email *').fill('ravi.invitee@gmail.com');await p.getByLabel('Country *').selectOption('IN');await p.getByRole('button',{name:'Create invite'}).click();await p.waitForTimeout(1200);
console.log('tabs after invite',await tabs());
await p.getByRole('tab',{name:/^Invited/}).click();let t=await p.locator('table').first().innerText();
console.log('INVITED tab has Ravi',t.includes('Ravi Invitee'),'badge',t.includes('Invited – not signed in'),'resend',t.includes('Resend invite'));
await p.getByRole('tab',{name:/^Active/}).click();t=await p.locator('body').innerText();console.log('ACTIVE tab has Ravi',t.includes('Ravi Invitee'));
// Ravi signs in
const q=await c.newPage();q.on('pageerror',e=>errors.push(e.message));
await q.addInitScript(()=>localStorage.setItem('nv_mock_session',JSON.stringify({uid:'mock-ravi',email:'ravi.invitee@gmail.com',displayName:'Ravi'})));
await q.goto('http://localhost:5173/ambassador');await q.waitForTimeout(1200);console.log('ravi sees tabs',await q.getByRole('navigation',{name:'Ambassador sections'}).count());
await q.close();
await sess({uid:'mock-admin',email:'admin@namevibes.test',displayName:'Admin'});
await ambTab();console.log('tabs after sign-in',await tabs());
await p.getByRole('tab',{name:/^Active/}).click();t=await p.locator('table').first().innerText();console.log('ACTIVE tab now has Ravi',t.includes('Ravi Invitee'),'cols',(await p.locator('table').first().locator('th').allInnerTexts()).join('|'));
await p.getByRole('tab',{name:/^Invited/}).click();t=await p.locator('body').innerText();console.log('INVITED no longer has Ravi',!t.includes('Ravi Invitee'));
await p.getByRole('tab',{name:/^Deactivated/}).click();console.log('deactivated empty msg',(await p.locator('body').innerText()).includes('No deactivated ambassadors'));
// deactivate Ravi from Active
await p.getByRole('tab',{name:/^Active/}).click();await p.getByRole('row',{name:/Ravi Invitee/}).getByRole('button',{name:'Deactivate'}).click().catch(()=>{});
p.once('dialog',d=>d.accept());await p.waitForTimeout(800);console.log('tabs after deactivate',await tabs());
// payouts 360
const m=await b.newContext({viewport:{width:360,height:900}});await m.addInitScript(x=>localStorage.setItem('nv_mock_session',JSON.stringify(x)),{uid:'mock-admin',email:'admin@namevibes.test',displayName:'Admin'});
const r=await m.newPage();r.on('pageerror',e=>errors.push(e.message));
await r.goto('http://localhost:5173/admin');await r.waitForTimeout(900);
await r.getByRole('button',{name:/Ambassador Payouts|Payouts/}).first().click();await r.waitForTimeout(800);
t=await r.locator('tbody').first().innerText().catch(()=>'');console.log('admin payout rows:',JSON.stringify(t.slice(0,160)));
console.log('360 doc overflow',await r.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
await r.screenshot({path:'artifacts/annual-plan/payouts-360.png'});
// accounts
const a=await b.newContext({viewport:{width:360,height:900}});await a.addInitScript(x=>localStorage.setItem('nv_mock_session',JSON.stringify(x)),{uid:'mock-accounts',email:'accounts@namevibes.test',displayName:'Accounts'});
const w=await a.newPage();w.on('pageerror',e=>errors.push(e.message));
await w.goto('http://localhost:5173/accounts');await w.waitForTimeout(1200);
const body=await w.locator('body').innerText();console.log('accounts shows code-name',/IN KL 00001 – Arjun Ambassador/.test(body),'doc overflow',await w.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
await w.screenshot({path:'artifacts/annual-plan/accounts-360.png'});
console.log('errors',errors);await b.close();
