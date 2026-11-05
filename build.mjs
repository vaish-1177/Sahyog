import fs from 'node:fs';
await import('./bundle-client.mjs');
fs.rmSync('dist',{recursive:true,force:true});fs.mkdirSync('dist');
for(const file of ['index.html','css','js','assets'])fs.cpSync(file,'dist/'+file,{recursive:true});
fs.rmSync('dist/js/demo-store.js');
console.log('Static site built to dist/. Upload that folder to your frontend host.');
