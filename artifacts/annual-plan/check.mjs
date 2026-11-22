import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const B='http://localhost:5173';
const browser=await chromium.launch({executablePath:'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe'});
const errors=[];
async function ctx(session,w=360){const c=await browser.newContext({viewport:{width:w,height:800}});await c.addInitScript(s=>{if(s)localStorage.setItem('nv_mock_session',JSON.stringify(s))},session);const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push('console:'+m.text())});return p}
const overflow=p=>p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
let p=await ctx({uid:'mock-individual',email:'individual@namevibes.test',displayName:'Indira'});
await p.goto(B+'/pricing');await p.waitForTimeout(800);
let t=await p.locator('body').innerText();
console.log('pricing: annual',t.includes('NAMASUTRA Annual Plan'),'399',t.includes('₹399'),'individual word',/individual/i.test(t),'family plan',/family plan/i.test(t),'overflow',await overflow(p));
await p.screenshot({path:'artifacts/annual-plan/pricing.png'});
await p.getByRole('button',{name:'Get the Annual Plan'}).click();await p.waitForTimeout(500);
t=await p.locator('body').innerText();console.log('payment:',t.includes('NAMASUTRA Annual Plan'),new URL(p.url()).pathname);
// ambassador signed out
p=await ctx(null);await p.goto(B+'/ambassador');await p.waitForTimeout(500);
t=await p.locator('body').innerText();
console.log('amb signed-out: title',t.includes('Become an Ambassador. Inspire Lives'),'google btn',t.includes('Sign in with Google'),'tabs',(await p.getByRole('navigation',{name:'Ambassador sections'}).locator('button').allInnerTexts()).join('|'),'overflow',await overflow(p));
await p.screenshot({path:'artifacts/annual-plan/amb-out.png',fullPage:true});
await p.goto(B+'/ambassador/register');console.log('register redirect',new URL(p.url()).pathname);
// menu
await p.getByRole('button',{name:'Menu',exact:true}).click();const menu=await p.getByRole('navigation',{name:'All pages'}).innerText();console.log('menu has Ambassador Login',menu.includes('Ambassador Login'),'Become',menu.includes('Become an Ambassador'),'Partners',menu.includes('Partners'));
// non-invited
p=await ctx({uid:'mock-family',email:'family@namevibes.test',displayName:'Farah'});await p.goto(B+'/ambassador?tab=followers');await p.waitForTimeout(800);
t=await p.locator('body').innerText();console.log('non-invited msg',t.includes("isn't an invited NAMASUTRA Ambassador"),'signout',await p.getByRole('button',{name:'Sign out'}).count());
// invited ambassador
p=await ctx({uid:'mock-amb',email:'ambassador@namevibes.test',displayName:'Arjun'});await p.goto(B+'/ambassador');await p.waitForTimeout(1000);
t=await p.locator('body').innerText();console.log('amb home: code card',t.includes('IN KL 00001')||t.includes('INKL00001'),'banner',t.includes('Complete your details to receive payouts'),'overflow',await overflow(p));
await p.screenshot({path:'artifacts/annual-plan/amb-home.png',fullPage:true});
await p.getByRole('button',{name:'My Followers'}).click();await p.waitForTimeout(1000);t=await p.locator('body').innerText();
console.log('followers: members',/Members/.test(t),'tier',/more members? to reach 50%/.test(t),t.match(/Total earnings[\s\S]{0,40}/)?.[0].replace(/\n/g,' '),'overflow',await overflow(p));
await p.screenshot({path:'artifacts/annual-plan/amb-followers.png',fullPage:true});
await p.getByRole('button',{name:'Register'}).click();await p.waitForTimeout(500);console.log('register fields',await p.locator('form input, form select').count(),'overflow',await overflow(p));
await p.fill('#amb-motherName','M');await p.fill('#amb-dob','1990-01-01');await p.selectOption('#amb-gender','Male');await p.fill('#amb-profession','Astrologer');await p.fill('#amb-mobileNumber','999');await p.selectOption('#amb-countryCode','IN');await p.selectOption('#amb-stateCode','KL');await p.fill('#amb-city','K');await p.fill('#amb-zipCode','1');await p.fill('#amb-addressLine1','a');await p.fill('#amb-bankAccountName','A');await p.fill('#amb-bankName','B');await p.fill('#amb-accountNumber','1');await p.fill('#amb-ifscCode','I');await p.fill('#amb-idNumber','1');
await p.getByRole('button',{name:'Save my details'}).click();await p.waitForTimeout(800);console.log('save msg',(await p.locator('[role=status]').allInnerTexts()).join('|'));
await p.getByRole('button',{name:'Home'}).click();await p.waitForTimeout(300);t=await p.locator('body').innerText();console.log('banner after save gone',!t.includes('Complete your details to receive payouts'));
// admin invite
p=await ctx({uid:'mock-admin',email:'admin@namevibes.test',displayName:'Admin'},1280);await p.goto(B+'/admin');await p.waitForTimeout(1000);
await p.getByRole('button',{name:/^Ambassadors/}).first().click();await p.waitForTimeout(500);
await p.getByLabel('Full name *').fill('Ravi Invitee');await p.getByLabel('Google email *').fill('Ravi.Invitee@Gmail.com');await p.getByLabel('Country *').selectOption('IN');await p.getByRole('button',{name:'Create invite'}).click();await p.waitForTimeout(1200);
t=await p.locator('body').innerText();console.log('invite created',t.includes('Ravi Invitee is invited'),'msg',t.includes('ravi.invitee@gmail.com'),'INVITED badge',t.includes('INVITED'));
await p.getByLabel('Full name *').fill('Dup');await p.getByLabel('Google email *').fill('ravi.invitee@gmail.com');await p.getByLabel('Country *').selectOption('IN');await p.getByRole('button',{name:'Create invite'}).click();await p.waitForTimeout(800);
console.log('dup error',(await p.locator('[role=alert]').allInnerTexts()).join('|'));
await p.screenshot({path:'artifacts/annual-plan/admin-invite.png',fullPage:true});
// country pricing
await p.getByRole('button',{name:/Countries|Country/}).first().click().catch(()=>{});await p.waitForTimeout(400);
console.log('errors',errors);await browser.close();
