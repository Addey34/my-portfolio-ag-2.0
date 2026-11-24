import { expect, test, type Page } from '@playwright/test';
import { requireDevSources } from './dev-sources';

interface SyncState {
  scene: string;
  openingVariant: string;
  clockAgProgress: number;
  identityStackProgress: number;
  stackSolutionsProgress: number;
}

interface SyncWorld {
  state: SyncState;
  programsReady: boolean;
  clockReady: boolean;
  clock: { visible: boolean };
  pendantTrim: { visible: boolean; children: unknown[] };
  setVisualState: (state: SyncState) => void;
  render: (time: number) => void;
}

interface SyncFrame {
  scene: string;
  clock: number;
  clockReady: boolean;
  clockVisible: boolean;
  pendant: boolean;
}

interface SyncProbe {
  world: SyncWorld | null;
  frames: SyncFrame[];
  settled: boolean;
  loaded: { immediate: boolean; frame: SyncFrame | null } | null;
}

declare global {
  interface Window {
    __syncTest?: SyncProbe;
    __syncBegin?: (world: SyncWorld) => void;
    __syncFrame?: (world: SyncWorld) => void;
    __syncLoad?: (world: SyncWorld) => void;
  }
}

/** Sonde locale : observe les objets après le vrai renderer.render. */
async function instrument(page: Page): Promise<void> {
  await requireDevSources(page);
  await page.addInitScript(() => {
    const probe: SyncProbe = {
      world: null,
      frames: [],
      settled: false,
      loaded: null,
    };
    window.__syncTest = probe;
    window.__syncBegin = (world) => {
      probe.world = world;
    };
    window.__syncFrame = (world) => {
      probe.frames.push({
        scene: world.state?.scene,
        clock: world.state?.clockAgProgress,
        clockReady: world.clockReady,
        clockVisible: world.clock.visible,
        pendant: world.pendantTrim.visible,
      });
    };
    window.__syncLoad = () => {
      const before = probe.frames.length;
      queueMicrotask(() => {
        const frame = probe.frames.at(-1) ?? null;
        probe.loaded = { immediate: probe.frames.length > before, frame };
      });
    };
    window.addEventListener(
      'world-settled',
      () => {
        probe.settled = true;
      },
      { once: true }
    );
  });

  await page.route(
    /\/StoryWorld3D(?:-[^/]+\.js|\.ts)(?:\?.*)?$/,
    async (route) => {
      const response = await route.fetch();
      let body = await response.text();
      const production = body.includes('setVisualState(t){');
      const changes = production
        ? [
            [
              'setVisualState(t){',
              'setVisualState(t){window.__syncBegin?.(this);',
            ],
            [
              'this.programsReady&&this.renderer.render(this.scene,this.camera)',
              'this.programsReady&&(this.renderer.render(this.scene,this.camera),window.__syncFrame?.(this))',
            ],
            [
              'this.clockReady=!0,this.render(0)',
              'this.clockReady=!0,window.__syncLoad?.(this),this.render(0)',
            ],
          ]
        : [
            [
              'setVisualState(state) {',
              'setVisualState(state) { window.__syncBegin?.(this);',
            ],
            [
              'this.renderer.render(this.scene, this.camera);',
              'this.renderer.render(this.scene, this.camera); window.__syncFrame?.(this);',
            ],
            [
              'this.clockReady = true;\n      this.render(0);',
              'this.clockReady = true;\n      window.__syncLoad?.(this);\n      this.render(0);',
            ],
          ];
      for (const [before, after] of changes) {
        if (body.split(before).length !== 2) {
          throw new Error('Repère de sonde absent ou ambigu : ' + before);
        }
        body = body.replace(before, after);
      }
      await route.fulfill({ response, body });
    }
  );
}

test.use({ reducedMotion: 'reduce' });

test('la phase visible est redessinée immédiatement, y compris au retour rapide', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await instrument(page);
  await page.goto('/');
  await page.waitForFunction(
    () => {
      const probe = window.__syncTest;
      const world = probe?.world;
      return (
        probe?.settled &&
        world?.programsReady &&
        world.clockReady &&
        world.pendantTrim.children.length > 0
      );
    },
    null,
    { timeout: 90000 }
  );

  const results = await page.evaluate(() => {
    const probe = window.__syncTest!;
    const world = probe.world!;
    const original = world.state;
    const state = {
      ...original,
      scene: 'identity',
      openingVariant: 'medallion',
      clockAgProgress: 0,
      identityStackProgress: 0,
      stackSolutionsProgress: 0,
    };
    world.setVisualState(state);
    world.render(0);
    const steps = [];
    for (const value of [1, 0, 1, 1, 0]) {
      const before = probe.frames.length;
      state.clockAgProgress = value;
      world.setVisualState(state);
      const count = probe.frames.length - before;
      steps.push({ value, count, frame: count ? probe.frames.at(-1)! : null });
    }
    world.setVisualState(original);
    return steps;
  });

  expect(results.map((step) => step.count)).toEqual([1, 1, 1, 0, 1]);
  for (const step of results.filter((item) => item.count > 0)) {
    expect(step.frame?.scene).toBe('identity');
    expect(step.frame?.clockReady).toBe(true);
    expect(step.frame?.clockVisible).toBe(true);
    expect(step.frame?.pendant).toBe(step.value === 0);
  }
});

test('le modèle différé est dessiné dès sa réception dans la phase courante', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await instrument(page);
  let releaseClock = (): void => {};
  const gate = new Promise<void>((resolve) => {
    releaseClock = resolve;
  });
  await page.route('**/models/clock.glb', async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.__syncTest?.world, null, {
      timeout: 60000,
    });
    await page.locator('#intro').evaluate((element) => {
      window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY);
    });
    await page.waitForFunction(
      () => {
        const world = window.__syncTest?.world;
        return (
          world?.programsReady &&
          !world.clockReady &&
          world.state.scene === 'identity' &&
          world.state.clockAgProgress >= 0.5
        );
      },
      null,
      { timeout: 60000 }
    );
    releaseClock();
    await page.waitForFunction(() => !!window.__syncTest?.loaded, null, {
      timeout: 60000,
    });
    const loaded = await page.evaluate(() => window.__syncTest!.loaded!);
    expect(loaded.immediate).toBe(true);
    expect(loaded.frame?.clockReady).toBe(true);
    expect(loaded.frame?.clockVisible).toBe(true);
    expect(loaded.frame?.pendant).toBe(false);
    expect(loaded.frame?.scene).toBe('identity');
  } finally {
    releaseClock();
  }
});
