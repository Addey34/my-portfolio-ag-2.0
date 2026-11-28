/* global window, performance, requestAnimationFrame, WheelEvent */
import { chromium, devices } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Comparaison ciblée sur le même GPU : premier geste, frontières, trois instruments.
const output = 'test-results/living-performance.json';
const results = [];
const browser = await chromium.launch({ args: ['--use-angle=d3d11'] });
for (const device of ['desktop', 'android']) {
  for (const variant of ['A', 'B', 'B', 'A']) {
    const page = await browser.newPage(device === 'android' ? devices['Pixel 7'] : { viewport: { width: 1440, height: 900 } });
    await page.addInitScript(() => {
      window.measureFrames = async (duration) => {
        const values = []; let previous = performance.now();
        await new Promise(resolve => {
          const start = previous;
          const step = now => { values.push(now - previous); previous = now; if (now - start < duration) requestAnimationFrame(step); else resolve(); };
          requestAnimationFrame(step);
        });
        const sorted = [...values].sort((a,b) => a-b);
        return { values, p95: sorted[Math.floor(sorted.length * .95)], max: Math.max(...values) };
      };
    });
    const start = Date.now();
    await page.goto(variant === 'A' ? 'http://127.0.0.1:43136' : 'http://127.0.0.1:43135');
    await page.locator('#boot-loader').waitFor({state:'hidden',timeout:90000});
    const readyMs = Date.now()-start;
    const renderer = await page.locator('canvas').evaluate(canvas => {
      const gl=canvas.getContext('webgl2'); const ext=gl.getExtension('WEBGL_debug_renderer_info'); return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
    });
    if (/SwiftShader/i.test(renderer)) throw new Error('GPU matériel attendu');
    const first = page.evaluate(() => window.measureFrames(1600));
    await page.mouse.wheel(0, 1100);
    const firstScroll = await first;
    const transitions = [];
    for (const id of ['galaxy','ludora','magnotes','ludora']) {
      const measuring = page.evaluate(() => window.measureFrames(1000));
      await page.locator(`[data-rail="${id}"]`).click();
      transitions.push({id,...await measuring});
    }
    const interactions=[];
    for (const [id, details, control] of [
      ['galaxy','galaxy-observatory','[data-scale="100"]'],
      ['ludora','ludora-sync-lab','[data-peer="A"] [data-action="take"]'],
      ['magnotes','magnotes-knowledge-lab','[data-move="right"]'],
    ]) {
      await page.locator(`[data-rail="${id}"]`).click();
      await page.waitForTimeout(2800);
      const panel=page.locator('#'+details);
      await panel.locator('summary').click();
      const button=panel.locator(control);
      await button.waitFor();
      await button.evaluate(element => window.dispatchEvent(new WheelEvent('wheel',{deltaY:element.getBoundingClientRect().top-320,bubbles:true,cancelable:true})));
      await page.waitForTimeout(1600);
      const measuring=page.evaluate(() => window.measureFrames(1700));
      const inputStart=Date.now(); await button.click();
      interactions.push({id,clickAutomationMs:Date.now()-inputStart,...await measuring});
      await panel.locator('summary').evaluate(element=>window.dispatchEvent(new WheelEvent('wheel',{deltaY:element.getBoundingClientRect().top-320,bubbles:true,cancelable:true})));
      await page.waitForTimeout(1000); await panel.locator('summary').click();
    }
    const result={device,variant,renderer,readyMs,firstScroll,transitions,interactions};
    results.push(result);
    await mkdir('test-results',{recursive:true});
    await writeFile(output,JSON.stringify({protocol:'ABBA par profil, ANGLE D3D11, froid par contexte, rAF navigateur ; clickAutomationMs inclut Playwright et ne vaut pas INP',results},null,2));
    console.log(JSON.stringify({device,variant,renderer,readyMs,firstScrollP95:firstScroll.p95,transitions:transitions.map(x=>x.p95),interactions:interactions.map(x=>x.p95)}));
    await page.close();
  }
}
await browser.close();
