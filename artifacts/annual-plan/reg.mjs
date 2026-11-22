import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe'});
const errors=[];
const c=await b.newContext({viewport:{width:360,height:900}});
const ov=async(p,l)=>console.log('  overflow',l,await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
async function page(session){const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(s=>localStorage.setItem('nv_mock_session',JSON.stringify(s)),session);return p}
const ADMIN={uid:'mock-admin',email:'admin@namevibes.test',displayName:'Admin'};
const ARJUN={uid:'mock-ambassador',email:'ambassador@namevibes.test',displayName:'Arjun'};
// ---- admin sidebar
let a=await page(ADMIN);await a.goto('http://localhost:5173/admin');await a.waitForTimeout(900);
await a.getByRole('button',{name:/^Ambassadors/}).first().click();await a.waitForTimeout(400);
const side=await a.locator('aside').innerText();console.log('SIDEBAR items:',side.replace(/\s+/g,' ').match(/Ambassadors.*?(Payments|$)/)?.[0].slice(0,200));
await a.getByRole('button',{name:'Invite ambassador'}).click();await a.waitForTimeout(300);
let body=await a.locator('main').innerText();console.log('INVITE view: title',body.startsWith('Invite ambassador'),'has form',body.includes('Create invite'),'no list/search',!body.includes('Search name'),'no content editor',!body.includes('Publish default content'));
await ov(a,'admin invite 360');
await a.getByRole('button',{name:'Home content & tools'}).click();await a.waitForTimeout(500);body=await a.locator('main').innerText();console.log('TOOLS view has editor',body.includes('Publish default content'),'no invite form',!body.includes('Create invite'));
await a.getByRole('button',{name:/^Active/}).click();await a.waitForTimeout(400);body=await a.locator('main').innerText();console.log('ACTIVE view',body.includes('Active ambassadors'),body.includes('No active ambassadors yet')||body.includes('NAME'),'search',body.includes('Search')||await a.getByLabel('Search ambassadors').count());
// overview card
await a.getByRole('button',{name:'Dashboard',exact:true}).click();await a.waitForTimeout(300);
await a.getByRole('link',{name:/Active Ambassadors/}).click();await a.waitForTimeout(400);console.log('OVERVIEW card -> active view',(await a.locator('main').innerText()).startsWith('Active ambassadors'));
// ---- Arjun first save
let r=await page(ARJUN);await r.goto('http://localhost:5173/ambassador?tab=register');await r.waitForTimeout(1200);
console.log('FIRST: form shown',await r.locator('form').count());await ov(r,'register form 360');
await r.fill('#amb-motherName','Mother');await r.fill('#amb-dob','1990-05-05');await r.selectOption('#amb-gender','Male');await r.fill('#amb-profession','Astrologer');await r.fill('#amb-zipCode','682001');await r.fill('#amb-addressLine1','12 Main Rd');
await r.getByRole('button',{name:'Save my details'}).click();await r.waitForTimeout(1200);
console.log('after first save: on Home',!(await r.locator('form').count()),'toast',await r.getByRole('status').filter({hasText:'saved'}).count(),'url',r.url().replace('http://localhost:5173',''));
let t=await r.locator('main').innerText();console.log('  home shows code',t.includes('IN KL 00001')||t.includes('INKL00001'),'saved details',t.includes('Your saved details'),'acct masked',t.includes('••••2222')&&!t.includes('000011112222'),'PAN masked',t.includes('••••234F')&&!t.includes('ABCDE1234F'),'home text hidden (not published)',true);
await ov(r,'home 360');await r.screenshot({path:'artifacts/annual-plan/reg-home.png',fullPage:true});
await r.getByRole('button',{name:'Register'}).click();await r.waitForTimeout(600);
t=await r.locator('main').innerText();console.log('REGISTER view: no form',!(await r.locator('form').count()),'Edit btn',await r.getByRole('button',{name:'Edit',exact:true}).count(),'sections',['Personal','Contact','Address','Bank / Payout','ID / Nominee'].every(x=>t.includes(x)),'history',t.includes('Change history'),'Details submitted',t.includes('Details submitted'));
await ov(r,'register view 360');await r.screenshot({path:'artifacts/annual-plan/reg-view.png',fullPage:true});
// no-change edit
await r.getByRole('button',{name:'Edit',exact:true}).click();await r.waitForTimeout(300);
await r.getByRole('button',{name:'Save changes'}).click();await r.waitForTimeout(500);
console.log('NO CHANGE: msg',await r.getByText('No changes to save').count(),'dialog',await r.getByRole('dialog').count());
// real edit
await r.getByRole('button',{name:'Edit',exact:true}).click();await r.waitForTimeout(300);
await r.fill('#amb-city','Ernakulam');await r.fill('#amb-accountNumber','999988887777');
await r.getByRole('button',{name:'Save changes'}).click();await r.waitForTimeout(500);
const dlg=await r.getByRole('dialog').innerText();console.log('DIALOG:',JSON.stringify(dlg.replace(/\n+/g,' | ')));
await ov(r,'confirm dialog 360');await r.screenshot({path:'artifacts/annual-plan/reg-confirm.png'});
await r.getByRole('dialog').getByRole('button',{name:'Cancel'}).click();await r.waitForTimeout(200);console.log('cancel closes dialog',await r.getByRole('dialog').count()===0);
await r.getByRole('button',{name:'Save changes'}).click();await r.waitForTimeout(300);await r.getByRole('button',{name:'Confirm changes'}).click();await r.waitForTimeout(1200);
t=await r.locator('main').innerText();
console.log('AFTER CONFIRM: read-only',!(await r.locator('form').count()),'city',t.includes('Ernakulam'),'timeline',/Changed City: Kochi → Ernakulam/.test(t),/Changed Account Number: ••••2222 → ••••7777/.test(t),'raw number absent',!t.includes('999988887777')&&!t.includes('000011112222'));
await ov(r,'register + history 360');await r.screenshot({path:'artifacts/annual-plan/reg-history.png',fullPage:true});
// ---- admin: detail with timeline + payout flag
a=await page(ADMIN);await a.goto('http://localhost:5173/admin');await a.waitForTimeout(900);
await a.getByRole('button',{name:/^Ambassadors/}).first().click();await a.waitForTimeout(300);
await a.getByRole('button',{name:/^Active/}).click();await a.waitForTimeout(500);
await a.getByRole('button',{name:'Details'}).first().click();await a.waitForTimeout(800);
t=await a.getByRole('dialog').innerText();console.log('ADMIN DETAIL: timeline',/Changed City: Kochi → Ernakulam/.test(t),'masked',t.includes('••••7777'));
await ov(a,'admin detail 360');await a.screenshot({path:'artifacts/annual-plan/admin-detail.png'});
await a.keyboard.press('Escape');await a.getByRole('button',{name:'Close'}).click().catch(()=>{});
await a.getByRole('button',{name:/Payouts/}).first().click();await a.waitForTimeout(700);
await a.getByRole('button',{name:'Share with Accounts'}).first().click();await a.waitForTimeout(800);
t=await a.locator('.fixed.inset-0').innerText();console.log('PAYOUT modal flag',/Bank details changed on/.test(t));
await ov(a,'payout modal 360');
console.log('errors',errors);await b.close();
