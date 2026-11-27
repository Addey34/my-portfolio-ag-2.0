import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AigenExecutionModel,
  DISPATCH_DELAY,
  EXECUTION_STEP,
  type ExecutionClock,
} from './aigenExecutionModel';
const clock: ExecutionClock = {
  after(delay, task) {
    const timer = setTimeout(task, delay);
    return () => clearTimeout(timer);
  },
};
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('chaîne d’exécution AIGen simulée', () => {
  it('ne rejoue ni un callback de tentative échouée ni une relance déjà acceptée', () => {
    const callbacks: Array<() => void> = [];
    const model = new AigenExecutionModel({
      after(_delay, task) {
        callbacks.push(task);
        return () => {};
      },
    });
    model.submit(true);
    callbacks[0]();
    callbacks[1]();
    callbacks[2]();
    expect(model.snapshot().tasks[0].state).toBe('failed');
    expect(model.retry('J01')).toBe(true);
    expect(model.retry('J01')).toBe(false);
    callbacks[2]();
    expect(model.snapshot().tasks[0]).toMatchObject({
      state: 'queued',
      attempt: 2,
      progress: 0,
      result: null,
    });
    callbacks[3]();
    expect(model.retry('J01')).toBe(false);
    callbacks[2]();
    for (let i = 4; i <= 7; i++) callbacks[i]();
    expect(model.snapshot().tasks[0]).toMatchObject({
      state: 'succeeded',
      attempt: 2,
      result: 'J01/a2',
    });
    callbacks[7]();
    expect(
      model.snapshot().events.filter((event) => event.kind === 'succeeded')
    ).toHaveLength(1);
  });
  it('reste sans timer au repos et borne les bons conservés', () => {
    const model = new AigenExecutionModel(clock);
    expect(vi.getTimerCount()).toBe(0);
    expect([
      model.submit(),
      model.submit(),
      model.submit(),
      model.submit(),
    ]).toEqual(['J01', 'J02', 'J03', 'J04']);
    const before = model.snapshot();
    expect(model.submit()).toBeNull();
    expect(model.snapshot()).toEqual(before);
    expect(vi.getTimerCount()).toBe(1);
  });
  it('distingue orchestration, progression par paliers et terminaison', () => {
    const model = new AigenExecutionModel(clock);
    model.submit();
    expect(model.snapshot().tasks[0].state).toBe('queued');
    vi.advanceTimersByTime(DISPATCH_DELAY);
    expect(model.snapshot().tasks[0]).toMatchObject({
      state: 'running',
      progress: 0,
      result: null,
    });
    vi.advanceTimersByTime(EXECUTION_STEP);
    expect(model.snapshot().tasks[0].progress).toBe(25);
    vi.advanceTimersByTime(EXECUTION_STEP * 3);
    expect(model.snapshot().tasks[0]).toMatchObject({
      id: 'J01',
      state: 'succeeded',
      progress: 100,
      result: 'J01/a1',
    });
    expect(model.snapshot().active).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('respecte FIFO et un worker unique à chaque notification', () => {
    const starts: string[] = [];
    const model = new AigenExecutionModel(clock, () => {
      const running = model
        .snapshot()
        .tasks.filter((task) => task.state === 'running');
      expect(running.length).toBeLessThanOrEqual(1);
      expect(vi.getTimerCount()).toBeLessThanOrEqual(1);
      if (running[0] && !starts.includes(running[0].id))
        starts.push(running[0].id);
    });
    model.submit();
    model.submit();
    model.submit();
    vi.runAllTimers();
    expect(starts).toEqual(['J01', 'J02', 'J03']);
    expect(
      model.snapshot().tasks.every((task) => task.state === 'succeeded')
    ).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('annule une tâche en attente sans exécution ni résultat ultérieur', () => {
    const model = new AigenExecutionModel(clock);
    model.submit();
    model.submit();
    expect(model.cancel('J02')).toBe(true);
    vi.runAllTimers();
    expect(model.snapshot().tasks[1]).toMatchObject({
      state: 'cancelled',
      progress: 0,
      result: null,
    });
    expect(
      model
        .snapshot()
        .events.some((event) => event.id === 'J02' && event.kind === 'running')
    ).toBe(false);
  });
  it('annule la tête en cours de dispatch et donne la place au suivant', () => {
    const model = new AigenExecutionModel(clock);
    model.submit();
    model.submit();
    model.cancel('J01');
    vi.advanceTimersByTime(DISPATCH_DELAY);
    expect(model.snapshot().active).toBe('J02');
    vi.runAllTimers();
    expect(model.snapshot().tasks[0].result).toBeNull();
  });
  it('annule une exécution active en conservant le palier atteint, sans résultat tardif', () => {
    const model = new AigenExecutionModel(clock);
    model.submit();
    model.submit();
    vi.advanceTimersByTime(DISPATCH_DELAY + EXECUTION_STEP);
    model.cancel('J01');
    vi.runAllTimers();
    expect(model.snapshot().tasks[0]).toMatchObject({
      state: 'cancelled',
      progress: 25,
      result: null,
    });
    expect(model.snapshot().tasks[1].state).toBe('succeeded');
  });
  it('échoue de façon contrôlée et relance le même identifiant en tentative2 à la fin de file', () => {
    const model = new AigenExecutionModel(clock);
    model.submit(true);
    model.submit();
    vi.advanceTimersByTime(DISPATCH_DELAY + EXECUTION_STEP * 2);
    expect(model.snapshot().tasks[0]).toMatchObject({
      state: 'failed',
      attempt: 1,
      progress: 50,
    });
    expect(model.retry('J01')).toBe(true);
    expect(model.snapshot().tasks[0]).toMatchObject({
      state: 'queued',
      attempt: 2,
      progress: 0,
    });
    vi.advanceTimersByTime(DISPATCH_DELAY);
    expect(model.snapshot().active).toBe('J02');
    vi.runAllTimers();
    expect(model.snapshot().tasks[0]).toMatchObject({
      state: 'succeeded',
      attempt: 2,
      result: 'J01/a2',
    });
    expect(
      model
        .snapshot()
        .events.filter(
          (event) => event.id === 'J01' && event.kind === 'succeeded'
        )
    ).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('rejette les actions incompatibles et les identifiants inconnus sans corruption', () => {
    const model = new AigenExecutionModel(clock);
    model.submit();
    const queued = model.snapshot();
    expect(model.retry('J01')).toBe(false);
    expect(model.cancel('absent')).toBe(false);
    expect(model.retry('absent')).toBe(false);
    expect(model.snapshot()).toEqual(queued);
    vi.runAllTimers();
    const done = model.snapshot();
    expect(model.retry('J01')).toBe(false);
    expect(model.cancel('J01')).toBe(false);
    expect(model.snapshot()).toEqual(done);
    model.reset();
    model.submit();
    model.cancel('J01');
    const cancelled = model.snapshot();
    expect(model.cancel('J01')).toBe(false);
    expect(model.retry('J01')).toBe(false);
    expect(model.snapshot()).toEqual(cancelled);
  });
  for (const elapsed of [0, DISPATCH_DELAY, DISPATCH_DELAY + EXECUTION_STEP]) {
    it(`reset/fermeture annule la chaîne après ${elapsed} ms`, () => {
      const model = new AigenExecutionModel(clock);
      model.submit();
      model.submit();
      vi.advanceTimersByTime(elapsed);
      model.reset();
      expect(vi.getTimerCount()).toBe(0);
      vi.advanceTimersByTime(10000);
      expect(model.snapshot()).toMatchObject({
        tasks: [],
        events: [],
        active: null,
        pending: false,
      });
      model.submit();
      vi.runAllTimers();
      expect(model.snapshot().tasks[0].result).toBe('J01/a1');
    });
  }
  it('ignore un callback déjà extrait après annulation, reset ou nouvelle tentative', () => {
    const callbacks: Array<() => void> = [];
    const model = new AigenExecutionModel({
      after(_delay, task) {
        callbacks.push(task);
        return () => {};
      },
    });
    model.submit();
    callbacks[0]();
    callbacks[1]();
    model.cancel('J01');
    callbacks[2]();
    expect(model.snapshot().tasks[0]).toMatchObject({
      state: 'cancelled',
      progress: 25,
      result: null,
    });
    model.reset();
    model.submit();
    callbacks[0]();
    callbacks[1]();
    callbacks[2]();
    expect(model.snapshot().tasks[0]).toMatchObject({
      state: 'queued',
      progress: 0,
    });
    callbacks[3]();
    expect(model.snapshot().active).toBe('J01');
  });
  it('protège les snapshots contre les mutations externes et borne le journal', () => {
    const model = new AigenExecutionModel(clock);
    model.submit();
    model.snapshot().tasks[0].state = 'succeeded';
    model.snapshot().tasks[0].attempt = 99;
    vi.runAllTimers();
    expect(model.snapshot().tasks[0]).toMatchObject({
      state: 'succeeded',
      attempt: 1,
      result: 'J01/a1',
    });
    model.submit();
    model.submit();
    model.submit();
    vi.runAllTimers();
    expect(model.snapshot().events.length).toBeLessThanOrEqual(6);
    model.snapshot().events.length = 0;
    expect(model.snapshot().events.length).toBeGreaterThan(0);
  });
});
