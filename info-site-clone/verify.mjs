import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { startServer } from './server.mjs';

await mkdir('screenshots', {recursive:true});
const server = await startServer(0);
const local = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({args:['--no-sandbox']});
const report = [];
try {
  for (const width of [1440,390]) {
    const context = await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
    for (const [label,url] of [['original','https://info.dongthaiduong.com/'],['local',local]]) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(url,{waitUntil:'networkidle',timeout:45000});
      await page.waitForFunction(() => document.getElementById('start-text').textContent.includes('Click For Peak'));
      await page.screenshot({path:`screenshots/${label}-${width}-start.png`});
      await page.locator('#start-screen').click();
      await page.waitForFunction(() => document.getElementById('profile-name').textContent.includes('Lucas'));
      await page.screenshot({path:`screenshots/${label}-${width}-profile.png`});
      const geometry=await page.locator('#profile-block').boundingBox();
      const links=await page.locator('#social-links a').evaluateAll(els=>els.map(el=>el.getAttribute('href')));
      assert.equal(links[0],'https://discord.gg/qMbUPN4Bby');
      assert.equal(links[1],'https://www.tiktok.com/@duongdt02');
      if(label==='local') {
        await page.locator('#volume-slider').evaluate(el=>{el.value='0.55';el.dispatchEvent(new Event('input',{bubbles:true}));});
        assert.equal(await page.locator('#background-music').evaluate(el=>el.volume),0.55);
        await page.locator('#volume-icon').click();
        assert.equal(await page.locator('#background-music').evaluate(el=>el.muted),true);
        await page.locator('#transparency-slider').evaluate(el=>{el.value='0.4';el.dispatchEvent(new Event('input',{bubbles:true}));});
        assert.match(await page.locator('#profile-block').evaluate(el=>el.style.backgroundColor),/0.4/);
        await page.locator('#profile-picture').click();
        assert.equal(await page.locator('#profile-picture').evaluate(el=>el.complete && el.naturalWidth>0),true);
        assert.equal(await page.locator('#start-screen').evaluate(el=>el.classList.contains('hidden')),true);
        assert.deepEqual(errors,[]);
        const original=report.find(r=>r.label==='original'&&r.width===width);
        for(const key of ['width','height']) assert.ok(Math.abs(geometry[key]-original.geometry[key])<2,`${width}: profile ${key} differs`);
      }
      report.push({label,width,geometry,links,errors,menu:await page.locator('nav').count(),scrollHeight:await page.evaluate(()=>document.documentElement.scrollHeight)});
      await page.close();
    }
    await context.close();
  }
  await writeFile('screenshots/report.json',JSON.stringify(report,null,2));
  console.log('PASS: original/local screenshots at 1440 and 390; profile geometry, entrance, links, volume, mute, transparency and avatar.');
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
