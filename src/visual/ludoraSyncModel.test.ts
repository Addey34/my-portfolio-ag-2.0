import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LudoraSyncModel, type Clock, type ClientId } from './ludoraSyncModel';

const clock: Clock = {
  after(delay, task) {
    const timer = setTimeout(task, delay);
    return () => clearTimeout(timer);
  },
};
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('autorité serveur Ludora simulée', () => {
  it('ignore même un callback ancien déjà extrait de la file avant annulation', () => {
    const queue: Array<() => void> = [];
    const model = new LudoraSyncModel({
      after(_delay, task) {
        queue.push(task);
        return () => {};
      },
    });
    model.send('A');
    model.reset();
    model.send('A');
    queue[0]();
    expect(model.snapshot().server.version).toBe(0);
    expect(model.snapshot().pending).toBe(1);
    queue[1]();
    queue[2]();
    queue[3]();
    expect(model.snapshot().clients.B.version).toBe(1);
    expect(model.snapshot().pending).toBe(0);
  });
  for (const latency of [100, 600, 1400] as const) {
    it(`valide puis propage à ${latency} ms aller simple, sans prédiction locale`, () => {
      const model = new LudoraSyncModel(clock);
      model.setLatency(latency);
      expect(model.send('A')).toBe(true);
      expect(model.snapshot().server.version).toBe(0);
      vi.advanceTimersByTime(latency);
      expect(model.snapshot().server).toEqual({
        version: 1,
        remaining: 4,
        turn: 'B',
      });
      expect(model.snapshot().clients.A.version).toBe(0);
      expect(model.snapshot().clients.B.version).toBe(0);
      vi.advanceTimersByTime(latency);
      const result = model.snapshot();
      expect(result.clients.A).toEqual(result.server);
      expect(result.clients.B).toEqual(result.server);
      expect(result.busy).toEqual({ A: false, B: false });
      expect(result.pending).toBe(0);
      expect(vi.getTimerCount()).toBe(0);
    });
  }

  it('rejette le mauvais tour sans changer le serveur et retourne le motif', () => {
    const model = new LudoraSyncModel(clock);
    model.send('B');
    vi.advanceTimersByTime(600);
    expect(model.snapshot().server).toEqual({
      version: 0,
      remaining: 5,
      turn: 'A',
    });
    expect(model.snapshot().events.slice(-1)[0]).toMatchObject({
      kind: 'rejected',
      reason: 'turn',
    });
    vi.runAllTimers();
    expect(model.snapshot().events.slice(-1)[0]).toMatchObject({
      kind: 'received',
      reason: 'turn',
      client: 'B',
    });
  });

  it('sérialise deux commandes concurrentes et rejette la version devenue obsolète', () => {
    const model = new LudoraSyncModel(clock);
    model.send('A');
    model.send('B');
    vi.advanceTimersByTime(600);
    expect(model.snapshot().events).toContainEqual({
      kind: 'rejected',
      command: 2,
      client: 'B',
      version: 1,
      expected: 0,
      reason: 'stale',
    });
    expect(model.snapshot().server.remaining).toBe(4);
    vi.runAllTimers();
    expect(model.snapshot().clients.B).toEqual(model.snapshot().server);
    model.send('B');
    vi.runAllTimers();
    expect(model.snapshot().clients.A).toEqual({
      version: 2,
      remaining: 3,
      turn: 'A',
    });
  });

  it('rejette une commande rejouée sans consommer un deuxième jeton', () => {
    const model = new LudoraSyncModel(clock);
    model.send('A');
    vi.runAllTimers();
    model.send('B', 0);
    vi.runAllTimers();
    expect(model.snapshot().server.remaining).toBe(4);
    expect(
      model.snapshot().events.some((event) => event.reason === 'stale')
    ).toBe(true);
  });

  it('refuse de jouer dans une réserve épuisée', () => {
    const model = new LudoraSyncModel(clock);
    for (const player of ['A', 'B', 'A', 'B', 'A'] satisfies ClientId[]) {
      model.send(player);
      vi.runAllTimers();
    }
    model.send('B');
    vi.runAllTimers();
    expect(model.snapshot().server.remaining).toBe(0);
    expect(model.snapshot().server.version).toBe(5);
    expect(
      model.snapshot().events.some((event) => event.reason === 'empty')
    ).toBe(true);
  });

  for (const elapsed of [0, 600]) {
    it(`annule commande ou propagation en transit après ${elapsed} ms`, () => {
      const model = new LudoraSyncModel(clock);
      model.send('A');
      vi.advanceTimersByTime(elapsed);
      model.reset();
      expect(vi.getTimerCount()).toBe(0);
      vi.advanceTimersByTime(10000);
      expect(model.snapshot().server).toEqual({
        version: 0,
        remaining: 5,
        turn: 'A',
      });
      expect(model.snapshot().clients.A).toEqual(model.snapshot().server);
      expect(model.snapshot().pending).toBe(0);
      model.send('A');
      vi.runAllTimers();
      expect(model.snapshot().server.version).toBe(1);
    });
  }

  it('garde le délai capturé pour les messages déjà en vol', () => {
    const model = new LudoraSyncModel(clock);
    model.send('A');
    model.setLatency(100);
    vi.advanceTimersByTime(200);
    expect(model.snapshot().server.version).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(model.snapshot().clients.A.version).toBe(1);
    expect(model.snapshot().pending).toBe(0);
  });

  it('borne la file par client et isole ses snapshots des mutations externes', () => {
    const model = new LudoraSyncModel(clock);
    expect(model.send('A')).toBe(true);
    expect(model.send('A')).toBe(false);
    model.snapshot().server.remaining = 99;
    model.snapshot().clients.B.version = 99;
    model.snapshot().events.length = 0;
    expect(model.snapshot().server.remaining).toBe(5);
    expect(model.snapshot().clients.B.version).toBe(0);
    expect(model.snapshot().events.length).toBe(2);
  });
});
