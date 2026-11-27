/* global window, document, performance, PerformanceObserver, requestAnimationFrame */
import { chromium, devices, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Cadrages reproductibles : poses réduites pour les planches, mouvement réel pour les mesures.
const mode = process.argv[2] ?? 'capture';
const phase = process.argv[3] ?? 'after';
const output = 'test-results/artistic-004';
const urls = {
  before: 'http://127.0.0.1:43131',
  after: 'http://127.0.0.1:43132',
};
const profiles = [
  ['desktop', { viewport: { width: 1440, height: 900 } }],
  ['mobile', devices['Pixel 7']],
];
const pieces = [
  ['galaxy', 'galaxy-observatory', '.observatory__instrument'],
  ['ludora', 'ludora-sync-lab', '.sync-lab__instrument'],
  ['magnotes', 'magnotes-knowledge-lab', '.knowledge__instrument'],
  ['studies', 'aigen-execution-lab', '.execution__instrument'],
  ['studies', 'siteguardian-resilience-lab', '.resilience__instrument'],
];
await mkdir(`${output}/${phase}`, { recursive: true });
if (mode === 'capture') {
  for (const [name, device] of profiles) {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({
        ...device,
        locale: 'fr-FR',
        reducedMotion: 'reduce',
      });
      await page.clock.install({ time: new Date('2026-11-27T12:00:00Z') });
      await page.goto(urls[phase]);
      await expect(page.locator('#boot-loader')).toBeHidden({ timeout: 90000 });
      const capture = (label) =>
        page.screenshot({
          path: `${output}/${phase}/${name}-${label}.png`,
          scale: 'css',
        });
      await capture('hero');
      for (const id of ['stack', 'galaxy']) {
        await page
          .locator(`.rail__dot[data-rail="${id}"]`)
          .evaluate((node) => node.click());
        await expect(
          page.locator(`#${id}`).getByRole('heading').first()
        ).toBeInViewport();
        await page.waitForTimeout(1200);
        await capture(id);
      }
      for (const [chapter, id, instrument] of pieces) {
        await page
          .locator(`.rail__dot[data-rail="${chapter}"]`)
          .evaluate((node) => node.click());
        const details = page.locator(`#${id}`);
        await details.locator('summary').click();
        await expect(details.locator(instrument)).toBeVisible();
        await details
          .locator('summary')
          .evaluate((node) => node.scrollIntoView({ block: 'start' }));
        await page.waitForTimeout(300);
        await capture(id);
        await details.locator('summary').click();
      }
      console.log(`${phase}/${name}: 8 cadrages réels capturés`);
    } finally {
      await browser.close();
    }
  }
} else if (mode === 'measure') {
  const results = [];
  for (const [name, device] of profiles) {
    for (const variant of ['before', 'after', 'after', 'before']) {
      const browser = await chromium.launch();
      try {
        const page = await browser.newPage({ ...device, locale: 'fr-FR' });
        await page.addInitScript(() => {
          const data = { tasks: [], frames: [], shifts: [] };
          window.__museumMeasure = data;
          new PerformanceObserver((list) =>
            list
              .getEntries()
              .forEach((entry) =>
                data.tasks.push({
                  start: entry.startTime,
                  duration: entry.duration,
                })
              )
          ).observe({ type: 'longtask', buffered: true });
          new PerformanceObserver((list) =>
            list.getEntries().forEach((entry) => {
              if (!entry.hadRecentInput) data.shifts.push(entry.value);
            })
          ).observe({ type: 'layout-shift', buffered: true });
          let last;
          function frame(time) {
            if (last !== undefined)
              data.frames.push({ start: last, duration: time - last });
            last = time;
            requestAnimationFrame(frame);
          }
          requestAnimationFrame(frame);
        });
        await page.goto(urls[variant]);
        await expect(page.locator('#boot-loader')).toBeHidden({
          timeout: 90000,
        });
        const opened = await page.evaluate(() => performance.now());
        // Le tout premier scroll suit l'ouverture : pas de préchauffage ou de saut préalable.
        await page.mouse.wheel(0, 700);
        await page.waitForTimeout(2500);
        const firstEnd = await page.evaluate(() => performance.now());
        for (const id of [
          'stack',
          'freelance',
          'projects-intro',
          'galaxy',
          'ludora',
          'magnotes',
          'ludora',
        ]) {
          await page
            .locator(`.rail__dot[data-rail="${id}"]`)
            .evaluate((node) => node.click());
          await page.waitForTimeout(800);
        }
        const transitionsEnd = await page.evaluate(() => performance.now());
        await page.waitForTimeout(1500);
        const row = await page.evaluate(
          ({ opened, firstEnd, transitionsEnd }) => {
            const data = window.__museumMeasure;
            const stats = (start, end) => {
              const frames = data.frames
                .filter((x) => x.start >= start && x.start < end)
                .map((x) => x.duration)
                .sort((a, b) => a - b);
              const tasks = data.tasks.filter(
                (x) => x.start >= start && x.start < end
              );
              return {
                frames: frames.length,
                p95: frames[Math.floor((frames.length - 1) * 0.95)] ?? null,
                max: frames.at(-1) ?? null,
                longTasks: tasks.length,
                blockingMs: tasks.reduce(
                  (n, x) => n + Math.max(0, x.duration - 50),
                  0
                ),
              };
            };
            const gl = document.querySelector('canvas')?.getContext('webgl2');
            const debug = gl?.getExtension('WEBGL_debug_renderer_info');
            return {
              readyMs: opened,
              firstScroll: stats(opened, firstEnd),
              transitions: stats(firstEnd, transitionsEnd),
              settled: stats(transitionsEnd, performance.now()),
              clsObserved: data.shifts.reduce((a, b) => a + b, 0),
              gpu: debug
                ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
                : 'non exposé',
              canvas: document.querySelectorAll('canvas').length,
            };
          },
          { opened, firstEnd, transitionsEnd }
        );
        await page
          .locator('.rail__dot[data-rail="studies"]')
          .evaluate((node) => node.click());
        const instrument = page.locator('#siteguardian-resilience-lab');
        await instrument.locator('summary').click();
        await expect(
          instrument.locator('.resilience__instrument')
        ).toBeVisible();
        const input = await instrument.evaluate((element) => {
          const start = performance.now();
          element.querySelector('button[data-probe="failure"]').click();
          return {
            scriptedHandlerMs: performance.now() - start,
            state: element.querySelector('.resilience__instrument').dataset
              .state,
          };
        });
        expect(input.state).toBe('suspected');
        results.push({ profile: name, variant, ...row, ...input });
        console.log(JSON.stringify(results.at(-1)));
      } finally {
        await browser.close();
      }
    }
  }
  await writeFile(
    `${output}/performance.json`,
    JSON.stringify(results, null, 2)
  );
} else throw new Error('Mode inconnu');
