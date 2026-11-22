import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe'});
const errs=[];
const who={
 'ambassador (no plan)':{uid:'mock-ambassador',email:'ambassador@namevibes.test',displayName:'Arjun Ambassador'},
 'plan member':{uid:'mock-family',email:'family@namevibes.test',displayName:'Farah Family'},
 'admin':{uid:'mock-admin',email:'admin@namevibes.test',displayName:'Super Admin'},
 'signed out':null};
for(const [name,sess] of Object.entries(who)){
  const c=await b.newContext({viewport:{width:390,height:900}});
  const open=async()=>{const p=await c.newPage();p.on('pageerror',e=>errs.push(name+': '+e.message));if(sess)await p.addInitScript(s=>localStorage.setItem('nv_mock_session',JSON.stringify(s)),sess);return p};
  let p=await open();await p.goto('http://localhost:5199/'+(name==='admin'?'admin':''));await p.waitForTimeout(1200);
  await p.getByRole('button',{name:/Menu/}).click();
  const links=await p.locator('#site-navigation-menu a').evaluateAll(a=>a.map(x=>[x.textContent.trim(),x.getAttribute('href')]));
  console.log(`\n== ${name}: ${links.length} menu links`);
  for(const [label,href] of links){
    const q=await open();await q.goto('http://localhost:5199'+href);await q.waitForTimeout(1300);
    const path=new URL(q.url()).pathname;const txt=(await q.locator('body').innerText()).replace(/\s+/g,' ');
    const pay=/Get the Annual Plan|Complete Payment|EVERYTHING INCLUDED/.test(txt);
    console.log(`  ${label.padEnd(30)} ${href.padEnd(24)} -> ${path.padEnd(18)} ${pay?'PAYMENT CARD':''}${path!==href?' (redirected)':' opens'}`);
    await q.close();
  }
  await c.close();
}
console.log('errors',errs);await b.close();
