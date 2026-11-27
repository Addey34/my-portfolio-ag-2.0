import { describe, expect, it } from 'vitest';
import {
  MagnotesKnowledgeModel,
  type NoteId,
  type NoteStatus,
} from './magnotesKnowledgeModel';

describe('modèle partagé de l’atelier MagNotes', () => {
  it('projette exactement les mêmes identifiants et propriétés dans les trois vues', () => {
    const model = new MagnotesKnowledgeModel();
    const expected = model.snapshot().notes;
    const sorted = <T extends { id: string }>(notes: T[]) =>
      notes.sort((a, b) => a.id.localeCompare(b.id));
    expect(sorted(model.graph().nodes)).toEqual(expected);
    expect(sorted(model.kanban().flatMap((column) => column.notes))).toEqual(
      expected
    );
    expect(sorted(model.timeline().flatMap((day) => day.notes))).toEqual(
      expected
    );
    expect(new Set(expected.map((note) => note.id)).size).toBe(expected.length);
  });

  it('recalcule les extrémités des relations après déplacement sans changer les liens', () => {
    const model = new MagnotesKnowledgeModel();
    const before = model.snapshot().relations;
    expect(model.move('N01', 1, 0)).toBe(true);
    expect(model.graph().edges[0].source).toMatchObject({
      id: 'N01',
      x: 1,
      y: 0,
    });
    expect(model.snapshot().relations).toEqual(before);
    expect(model.kanban()[0].notes[0].x).toBe(1);
    expect(model.timeline()[0].notes[0].x).toBe(1);
  });

  it('déplace une seule note de colonne tout en conservant échéance, position et relations', () => {
    const model = new MagnotesKnowledgeModel();
    model.setStatus('N01', 'clear');
    expect(model.kanban()[0].notes).toHaveLength(0);
    expect(model.kanban()[2].notes.map((note) => note.id)).toEqual([
      'N01',
      'N03',
    ]);
    expect(model.graph().nodes[0]).toMatchObject({
      id: 'N01',
      status: 'clear',
      day: 1,
      x: 0,
      y: 0,
    });
    expect(model.timeline()[0].notes[0].status).toBe('clear');
    expect(model.snapshot().relations).toHaveLength(2);
  });

  it('réordonne la chronologie après mutation et garde les propriétés dans le graphe et Kanban', () => {
    const model = new MagnotesKnowledgeModel();
    model.setDay('N01', 7);
    expect(model.timeline()[0].notes).toHaveLength(0);
    expect(model.timeline()[6].notes[0].id).toBe('N01');
    expect(model.graph().nodes[0].day).toBe(7);
    expect(model.kanban()[0].notes[0].day).toBe(7);
  });

  it('bloque les bords et les collisions sans modifier l’état ni la révision', () => {
    const model = new MagnotesKnowledgeModel();
    const before = model.snapshot();
    expect(model.move('N01', -1, 0)).toBe(false);
    expect(model.snapshot()).toEqual(before);
    model.move('N01', 1, 0);
    const moved = model.snapshot();
    expect(model.move('N01', 0, 1)).toBe(false);
    expect(model.snapshot()).toEqual(moved);
  });

  it('refuse les mutations hors domaine et les identifiants inconnus sans effet partiel', () => {
    const model = new MagnotesKnowledgeModel();
    const before = model.snapshot();
    for (const day of [0, 8, NaN, 2.5])
      expect(() => model.setDay('N01', day)).toThrow(RangeError);
    expect(() => model.move('N01', 1, 1)).toThrow(RangeError);
    expect(() => model.move('N01', 0.5, 0.5)).toThrow(RangeError);
    expect(() => model.setDay('N99' as NoteId, 1)).toThrow(RangeError);
    expect(() => model.setStatus('N01', 'invalid' as NoteStatus)).toThrow(
      RangeError
    );
    expect(model.snapshot()).toEqual(before);
  });

  it('ne produit pas de révision lors d’une lecture, projection ou mutation sans changement', () => {
    const model = new MagnotesKnowledgeModel();
    model.graph();
    model.kanban();
    model.timeline();
    model.setStatus('N01', 'explore');
    model.setDay('N01', 1);
    expect(model.snapshot().revision).toBe(0);
  });

  it('isole le modèle des modifications faites aux snapshots et projections', () => {
    const model = new MagnotesKnowledgeModel();
    model.snapshot().notes[0].title.fr = 'Autre';
    model.graph().nodes[0].x = 99;
    model.graph().edges[0].target.day = 99;
    model.kanban()[0].notes[0].status = 'clear';
    model.timeline()[0].notes[0].day = 99;
    model.snapshot().relations[0].to = 'N01';
    expect(model.snapshot().notes[0]).toMatchObject({
      title: { fr: 'Observer' },
      x: 0,
      status: 'explore',
      day: 1,
    });
    expect(model.snapshot().relations[0].to).toBe('N02');
  });

  it('garde toutes les références cohérentes après une séquence de mutations et un reset', () => {
    const model = new MagnotesKnowledgeModel();
    const initial = model.snapshot();
    model.move('N01', 1, 0);
    model.setDay('N01', 7);
    model.setStatus('N01', 'working');
    model.setDay('N03', 7);
    const ids = new Set(model.snapshot().notes.map((note) => note.id));
    for (const edge of model.graph().edges) {
      expect(ids.has(edge.from) && ids.has(edge.to)).toBe(true);
      expect(edge.source.id).toBe(edge.from);
      expect(edge.target.id).toBe(edge.to);
    }
    expect(model.snapshot().revision).toBe(4);
    expect(model.timeline()[6].notes.map((note) => note.id)).toEqual([
      'N01',
      'N03',
    ]);
    model.reset();
    expect(model.snapshot()).toEqual(initial);
    expect(model.graph().nodes).toEqual(initial.notes);
  });
});
