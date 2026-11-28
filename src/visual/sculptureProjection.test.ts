import { describe, expect, it, vi } from 'vitest';
import {
  activeSculpture,
  knowledgeProjection,
  syncProjection,
} from './sculptureProjection';
import { LudoraSyncModel } from './ludoraSyncModel';
import { MagnotesKnowledgeModel } from './magnotesKnowledgeModel';

describe('projections de sculptures', () => {
  it('suit la transmission, la validation et la convergence réelles', () => {
    vi.useFakeTimers();
    const model = new LudoraSyncModel({
      after(delay, task) {
        const id = setTimeout(task, delay);
        return () => clearTimeout(id);
      },
    });
    model.send('A');
    expect(syncProjection(model.snapshot())).toMatchObject({
      phase: 'sent',
      versions: [0, 0, 0],
      busy: [true, false],
    });
    vi.advanceTimersByTime(600);
    expect(syncProjection(model.snapshot())).toMatchObject({
      phase: 'accepted',
      versions: [0, 1, 0],
    });
    vi.advanceTimersByTime(600);
    expect(syncProjection(model.snapshot())).toMatchObject({
      phase: 'received',
      versions: [1, 1, 1],
      busy: [false, false],
    });
    model.send('A', 0);
    vi.advanceTimersByTime(600);
    expect(syncProjection(model.snapshot())).toMatchObject({
      phase: 'rejected',
      versions: [1, 1, 1],
      rejected: true,
    });
    model.reset();
    vi.runAllTimers();
    expect(syncProjection(model.snapshot())).toMatchObject({
      phase: 'idle',
      versions: [0, 0, 0],
      rejected: false,
    });
    vi.useRealTimers();
  });
  it('projette les mêmes identifiants, positions et propriétés sans modifier le modèle', () => {
    const model = new MagnotesKnowledgeModel();
    const before = model.snapshot();
    const graph = knowledgeProjection(before, 'graph');
    model.move('N01', 1, 0);
    const next = knowledgeProjection(model.snapshot(), 'graph');
    expect(next).not.toEqual(graph);
    for (const view of ['graph', 'kanban', 'timeline'] as const) {
      const projected = knowledgeProjection(model.snapshot(), view);
      if (projected.scene !== 'magnotes')
        throw new Error('Projection inattendue');
      expect(projected.notes.map((n) => n.id)).toEqual(['N01', 'N02', 'N03']);
    }
    expect(model.snapshot().relations).toEqual(before.relations);
    model.setStatus('N01', 'clear');
    const kanban = knowledgeProjection(model.snapshot(), 'kanban');
    if (kanban.scene !== 'magnotes') throw new Error('Projection inattendue');
    expect(kanban.notes[0].x).toBe(0.8);
    model.setDay('N01', 7);
    const timeline = knowledgeProjection(model.snapshot(), 'timeline');
    if (timeline.scene !== 'magnotes') throw new Error('Projection inattendue');
    expect(timeline.notes[0].x).toBeCloseTo(0.78);
    expect(before.notes[0]).toMatchObject({ status: 'explore', day: 1, x: 0 });
    model.reset();
    expect(knowledgeProjection(model.snapshot(), 'graph')).toEqual(graph);
  });
  it('neutralise fermeture, sortie de viewport et changement de chapitre sans effacer les données', () => {
    const state = knowledgeProjection(
      new MagnotesKnowledgeModel().snapshot(),
      'kanban'
    );
    expect(activeSculpture('magnotes', state, true, true)).toBe(state);
    expect(activeSculpture('magnotes', state, false, true)).toBeUndefined();
    expect(activeSculpture('magnotes', state, true, false)).toBeUndefined();
    expect(activeSculpture('ludora', state, true, true)).toBeUndefined();
    expect(activeSculpture('magnotes', state, true, true)).toBe(state);
  });
});
