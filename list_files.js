const fs=require('fs');
const d=fs.readdirSync('.');
console.log(d.filter(f=>f.toLowerCase().includes('gold')||f.toLowerCase().includes('shield')||f.toLowerCase().includes('check')||f.toLowerCase().includes('test')||f.toLowerCase().includes('lint')||f.toLowerCase().includes('build')));
