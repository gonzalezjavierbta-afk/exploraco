const fs=require('fs');
const c=fs.readFileSync('_lacandelaria2_body.html','utf8');
const idx=c.indexOf('pintarQR');
const seg=c.substring(idx,idx+300);
console.log('body:',JSON.stringify(seg));
// Also check QR stars in HTML
const qridx=c.indexOf('qr-stars');
console.log('qr-stars html:',JSON.stringify(c.substring(qridx, qridx+200)));
