import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe'});
const errors=[];const urls=new Set();
async function ctx(session,w=360){const c=await b.newContext({viewport:{width:w,height:900}});await c.addInitScript(s=>{if(s)localStorage.setItem('nv_mock_session',JSON.stringify(s))},session);const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.url().includes('/src/')||r.url().includes('/assets/'))urls.add(r.url())});return {p,c}}
const ov=p=>p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
// signed out
let {p}=await ctx(null);
const reqs=[];p.on('request',r=>reqs.push(r.url()));
await p.goto('http://localhost:5173/ambassador');await p.waitForTimeout(800);
let t=await p.locator('main').innerText();console.log('SIGNED OUT main text:',JSON.stringify(t));
console.log('tabs',await p.getByRole('navigation',{name:'Ambassador sections'}).count(),'copy/area modules requested',reqs.filter(u=>/AmbassadorArea|ambassadorCopy|AmbassadorFollowers/.test(u)).length,'overflow',await ov(p));
await p.screenshot({path:'artifacts/annual-plan/signin-out.png'});
await p.getByRole('button',{name:'Menu',exact:true}).click();console.log('menu',(await p.getByRole('navigation',{name:'All pages'}).innerText()).includes('Ambassador Login'));
// non-invited
({p}=await ctx({uid:'mock-family',email:'family@namevibes.test',displayName:'Farah'}));
const reqs2=[];p.on('request',r=>reqs2.push(r.url()));
await p.goto('http://localhost:5173/ambassador');await p.waitForTimeout(1000);
console.log('NON-INVITED:',JSON.stringify(await p.locator('main').innerText()),'area chunk requested',reqs2.some(u=>/AmbassadorArea/.test(u)));
// admin publishes default content
({p}=await ctx({uid:'mock-admin',email:'admin@namevibes.test',displayName:'Admin'},1280));
await p.goto('http://localhost:5173/admin');await p.waitForTimeout(1000);
await p.getByRole('button',{name:/^Ambassadors/}).first().click();await p.waitForTimeout(600);
console.log('admin sees content section',await p.getByText('Ambassador Home content').count(),'empty note',await p.getByText(/Nothing is published yet/).count());
await p.getByRole('button',{name:'Publish default content'}).click();await p.waitForTimeout(1200);
console.log('published msg',(await p.getByText('Default content published.').count()),'editor sections',await p.locator('fieldset').count());
// edit and save a heading
const first=p.locator('fieldset').first().locator('input').first();await first.fill('More Than Name Chemistry — A Companion for Everyday Life');
await p.getByRole('button',{name:'Save changes'}).click();await p.waitForTimeout(800);console.log('saved',await p.getByText('Content saved.').count());
await p.getByRole('button',{name:'Sync ambassador access list'}).click();await p.waitForTimeout(800);console.log('sync',await p.getByText(/Access list synced/).count());
// invited ambassador (same browser storage? mock db is per-context; reuse same context)
const c=p.context();const p2=await c.newPage();p2.on('pageerror',e=>errors.push(e.message));
await p2.evaluate(()=>0).catch(()=>{});
await p2.addInitScript(()=>localStorage.setItem('nv_mock_session',JSON.stringify({uid:'mock-ambassador',email:'ambassador@namevibes.test',displayName:'Arjun'})));
await p2.goto('http://localhost:5173/ambassador');await p2.waitForTimeout(1500);
t=await p2.locator('main').innerText();
console.log('INVITED tabs',(await p2.getByRole('navigation',{name:'Ambassador sections'}).locator('button').allInnerTexts()).join('|'),'has 50% bullet',t.includes('50% for every member from your 301st onward. Commission is calculated on the amount paid, excluding GST.'),'tagline',t.includes('Your Elemental Identity'));
await p2.getByRole('button',{name:'Menu',exact:true}).click();console.log('menu label',(await p2.getByRole('navigation',{name:'All pages'}).innerText()).includes('Ambassador area'));
console.log('errors',errors);await b.close();
