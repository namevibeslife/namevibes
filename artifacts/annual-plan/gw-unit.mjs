import { resolveGateway, toSubunits, toGatewayAmount, currencyExponent, gatewayWarnings } from '../../src/data/gatewayCurrencies.js';
const rows = [
 ['INR','auto',false],['INR','auto',true],['AED','auto',false],['AED','auto',true],['USD','auto',false],['USD','auto',true],
 ['SEK','auto',false],['SEK','auto',true],['BRL','auto',false],['XYZ','auto',true],['AFN','auto',true],['AED','paypal',false],['SEK','razorpay',false],['USD','razorpay',true]];
for (const [c,o,f] of rows) console.log(c.padEnd(4), o.padEnd(8), 'intl='+f, '->', JSON.stringify(resolveGateway({currency:c,override:o,internationalEnabled:f})));
for (const [a,c] of [[399,'INR'],[359,'INR'],[25,'USD'],[50,'AED'],[3500,'JPY'],[8.5,'KWD'],[8,'BHD'],[250,'SEK'],[19.99,'USD'],[4000,'KRW'],[0.1+0.2,'USD']])
  console.log(c, a, 'exp', currencyExponent(c), 'subunits', toSubunits(a,c), 'paypal', toGatewayAmount(a,c));
console.log(gatewayWarnings('AE','AED',50,{internationalEnabled:false}).map(w=>w.text));
console.log(gatewayWarnings('AE','AED',50,{internationalEnabled:true}).map(w=>w.text));
console.log(gatewayWarnings('AF','AFN',50).map(w=>w.text));
