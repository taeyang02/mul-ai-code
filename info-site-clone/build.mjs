import { mkdir, cp, readFile } from 'node:fs/promises';
const files = ['index.html','script.js','configDisplay.js','profile.json','vendor','assets','IMG_9588.PNG','IMG_7351.gif','IMG_7350.gif','IMG_7345.gif','IMG_7344.gif','icons8-sun-96.png'];
await mkdir('dist', {recursive:true});
for (const file of files) await cp(file, `dist/${file}`, {recursive:true});
const profile = JSON.parse(await readFile('profile.json','utf8'));
for (const file of profile.audioFiles) await cp(file, `dist/${file}`);
console.log('Build successful: dist/');
