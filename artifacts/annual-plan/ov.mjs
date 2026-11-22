import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe'});
async function open(sess,path,tabName){const c=await b.newContext({viewport:{width:360,height:900}});await c.addInitScript(x=>localStorage.setItem('nv_mock_session',JSON.stringify(x)),sess);const p=await c.newPage();await p.goto('http://localhost:5173'+path);await p.waitForTimeout(1000);return p}
const admin={uid:'mock-admin',email:'admin@namevibes.test',displayName:'Admin'};
let p=await open(admin,'/admin');
async function wide(p){return p.evaluate(()=>{const w=innerWidth;return [...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>w+1&&!e.closest('table')&&!e.closest('.overflow-x-auto')).slice(0,6).map(e=>e.tagName+'.'+String(e.className).slice(0,60)+' r='+Math.round(e.getBoundingClientRect().right))})}
console.log('admin home overflow',await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),await wide(p));
await p.getByRole('button',{name:/Payouts/}).first().click();await p.waitForTimeout(600);
console.log('payouts overflow',await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),await wide(p));
await p.getByRole('button',{name:/^Ambassadors/}).first().click();await p.waitForTimeout(600);
console.log('ambassadors overflow',await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),await wide(p));
const acc={uid:'mock-accounts',email:'accounts@namevibes.test',displayName:'Accounts'};
p=await open(acc,'/accounts');
console.log((await p.locator('body').innerText()).slice(0,400));
await b.close();
