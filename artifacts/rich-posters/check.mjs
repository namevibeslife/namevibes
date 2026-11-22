import { chromium } from 'file:///C:/Users/sresq/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const browser=await chromium.launch({executablePath:'C:/Users/sresq/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/learn-more');await page.getByRole('button',{name:'How It Works'}).click();await page.locator('section img').waitFor();await page.screenshot({path:'artifacts/rich-posters/explainer.png',fullPage:true});
console.log('Tab',await page.getByRole('button',{name:'How It Works'}).getAttribute('aria-pressed'),'overflow',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
const results=await page.evaluate(async()=>{
const {parseNameToElements}=await import('/src/utils/elements.js');const {buildPosterImage}=await import('/src/utils/posterImage.js');const {buildFamilyPosterImage}=await import('/src/utils/familyPosterImage.js');const {buildPosterPDF,loadPosterLogo,loadPosterArtwork}=await import('/src/utils/posterReport.js');
const members=['Vibes','Sreshan','Neha','Arun'].map(fullName=>({fullName,elements:parseNameToElements(fullName),relation:'Family member'}));
const out={};const toData=blob=>new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(blob);});
for(const theme of ['gold','dark']){
out['single-'+theme+'.png']=await toData(await buildPosterImage(members[0],false,theme));out['family-'+theme+'.png']=await toData(await buildFamilyPosterImage(members,theme));
const logo=await loadPosterLogo(theme),artwork=await loadPosterArtwork(theme);
for(const family of [false,true])out[(family?'family':'single')+'-'+theme+'.pdf']=await toData(buildPosterPDF(family?members:[members[0]],{theme,logo,artwork,family}).output('blob'));
}
return out;
});for(const [name,data]of Object.entries(results))fs.writeFileSync('artifacts/rich-posters/'+name,Buffer.from(data,'base64'));
console.log('Exported',Object.keys(results),'errors',errors);await browser.close();
