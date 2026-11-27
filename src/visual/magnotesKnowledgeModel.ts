export const NOTE_STATUSES = ['explore', 'working', 'clear'] as const;
export type NoteStatus = (typeof NOTE_STATUSES)[number];
export type NoteId = 'N01' | 'N02' | 'N03';
export interface KnowledgeNote {
  id: NoteId;
  title: { fr: string; en: string };
  status: NoteStatus;
  day: number;
  x: number;
  y: number;
}
export interface KnowledgeRelation {
  id: string;
  from: NoteId;
  to: NoteId;
}
const seed = (): KnowledgeNote[] => [
  {
    id: 'N01',
    title: { fr: 'Observer', en: 'Observe' },
    status: 'explore',
    day: 1,
    x: 0,
    y: 0,
  },
  {
    id: 'N02',
    title: { fr: 'Relier', en: 'Connect' },
    status: 'working',
    day: 3,
    x: 1,
    y: 1,
  },
  {
    id: 'N03',
    title: { fr: 'Transmettre', en: 'Share' },
    status: 'clear',
    day: 6,
    x: 2,
    y: 2,
  },
];
const relations = (): KnowledgeRelation[] => [
  { id: 'R01', from: 'N01', to: 'N02' },
  { id: 'R02', from: 'N02', to: 'N03' },
];

/** Trois projections, aucun stockage propre à une vue. Données fictives uniquement. */
export class MagnotesKnowledgeModel {
  private notes = seed();
  private revision = 0;

  snapshot() {
    return {
      revision: this.revision,
      notes: this.notes.map((note) => ({ ...note, title: { ...note.title } })),
      relations: relations(),
    };
  }

  graph() {
    const snapshot = this.snapshot();
    return {
      nodes: snapshot.notes,
      edges: snapshot.relations.map((relation) => ({
        ...relation,
        source: {
          ...snapshot.notes.find((note) => note.id === relation.from)!,
        },
        target: { ...snapshot.notes.find((note) => note.id === relation.to)! },
      })),
    };
  }

  kanban() {
    const notes = this.snapshot().notes;
    return NOTE_STATUSES.map((status) => ({
      status,
      notes: notes.filter((note) => note.status === status),
    }));
  }

  timeline() {
    const notes = this.snapshot().notes;
    return Array.from({ length: 7 }, (_, index) => ({
      day: index + 1,
      notes: notes.filter((note) => note.day === index + 1),
    }));
  }

  /** Une case cardinale à la fois ; limites et occupation ne modifient rien. */
  move(id: NoteId, dx: number, dy: number): boolean {
    const note = this.find(id);
    if (
      !Number.isInteger(dx) ||
      !Number.isInteger(dy) ||
      Math.abs(dx) + Math.abs(dy) !== 1
    )
      throw new RangeError('Déplacement cardinal requis.');
    const x = note.x + dx;
    const y = note.y + dy;
    if (
      x < 0 ||
      x > 2 ||
      y < 0 ||
      y > 2 ||
      this.notes.some(
        (other) => other.id !== id && other.x === x && other.y === y
      )
    )
      return false;
    note.x = x;
    note.y = y;
    this.revision++;
    return true;
  }

  setStatus(id: NoteId, status: NoteStatus): void {
    const note = this.find(id);
    if (!NOTE_STATUSES.includes(status))
      throw new RangeError('Statut inconnu.');
    if (note.status === status) return;
    note.status = status;
    this.revision++;
  }

  setDay(id: NoteId, day: number): void {
    const note = this.find(id);
    if (!Number.isInteger(day) || day < 1 || day > 7)
      throw new RangeError('Jour fictif hors semaine.');
    if (note.day === day) return;
    note.day = day;
    this.revision++;
  }

  reset(): void {
    this.notes = seed();
    this.revision = 0;
  }

  private find(id: NoteId): KnowledgeNote {
    const note = this.notes.find((note) => note.id === id);
    if (!note) throw new RangeError('Identifiant de note inconnu.');
    return note;
  }
}
