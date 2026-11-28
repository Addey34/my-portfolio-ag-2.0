import type { LudoraSyncModel } from './ludoraSyncModel';
import type { MagnotesKnowledgeModel, NoteId } from './magnotesKnowledgeModel';

export type SculptureProjection =
  | { readonly scene: 'galaxy'; readonly radii: readonly number[] }
  | {
      readonly scene: 'ludora';
      readonly versions: readonly number[];
      readonly remaining: number;
      readonly busy: readonly boolean[];
      readonly phase: 'idle' | 'sent' | 'accepted' | 'rejected' | 'received';
      readonly rejected: boolean;
    }
  | {
      readonly scene: 'magnotes';
      readonly view: KnowledgeView;
      readonly notes: ReadonlyArray<{
        readonly id: NoteId;
        readonly x: number;
        readonly y: number;
        readonly z: number;
      }>;
    };
export type KnowledgeView = 'graph' | 'kanban' | 'timeline';

export function activeSculpture(
  scene: string,
  projection: SculptureProjection | undefined,
  open: boolean,
  visible: boolean
): SculptureProjection | undefined {
  return open && visible && projection?.scene === scene
    ? projection
    : undefined;
}

/** Contrats de lecture seulement : aucun moteur métier, aucune dépendance 3D. */
export function syncProjection(
  state: ReturnType<LudoraSyncModel['snapshot']>
): SculptureProjection {
  const last = state.events[state.events.length - 1];
  const decision = [...state.events]
    .reverse()
    .find((e) => e.kind === 'accepted' || e.kind === 'rejected');
  return {
    scene: 'ludora',
    versions: [
      state.clients.A.version,
      state.server.version,
      state.clients.B.version,
    ],
    remaining: state.server.remaining,
    busy: [state.busy.A, state.busy.B],
    phase: last.kind === 'reset' ? 'idle' : last.kind,
    rejected: decision?.kind === 'rejected',
  };
}

export function knowledgeProjection(
  state: ReturnType<MagnotesKnowledgeModel['snapshot']>,
  view: KnowledgeView
): SculptureProjection {
  return {
    scene: 'magnotes',
    view,
    notes: state.notes.map((note, index) => ({
      id: note.id,
      x:
        view === 'graph'
          ? (note.x - 1) * 0.75
          : view === 'kanban'
            ? (['explore', 'working', 'clear'].indexOf(note.status) - 1) * 0.8
            : (note.day - 4) * 0.26,
      y:
        view === 'graph'
          ? 1 - note.y * 0.5
          : view === 'kanban'
            ? 0.2 + index * 0.24
            : 0.2 + index * 0.25,
      z: view === 'timeline' ? index * 0.28 : index * 0.06,
    })),
  };
}

/** Le DOM transporte une projection déjà dérivée, jamais des commandes métier. */
export function publishSculpture(
  mount: HTMLElement,
  projection: SculptureProjection
): void {
  mount.dispatchEvent(
    new CustomEvent<SculptureProjection>('sculpture-projection', {
      bubbles: true,
      detail: projection,
    })
  );
}
