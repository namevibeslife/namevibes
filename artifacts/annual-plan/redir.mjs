import {chromium} from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const b=await chromium.launch({executablePath:'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe'});
const p=await b.newPage();
for(const u of ['/ambassador/register','/ambassador/dashboard']){await p.goto('http://localhost:5173'+u);await p.waitForTimeout(500);console.log(u,'->',p.url().replace('http://localhost:5173',''));}
await b.close();
