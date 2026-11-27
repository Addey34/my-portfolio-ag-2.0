export const EXECUTION_CAPACITY = 4;
export const DISPATCH_DELAY = 300;
export const EXECUTION_STEP = 800;
export type TaskState =
  'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
const TASK_TRANSITIONS: Readonly<Record<TaskState, readonly TaskState[]>> = {
  queued: ['running', 'cancelled'],
  running: ['succeeded', 'failed', 'cancelled'],
  succeeded: [],
  failed: ['queued'],
  cancelled: [],
};
export interface ExecutionClock {
  after(delay: number, task: () => void): () => void;
}
export interface ExecutionTask {
  id: string;
  attempt: number;
  state: TaskState;
  progress: number;
  failFirst: boolean;
  order: number;
  result: string | null;
}
export interface ExecutionEvent {
  id: string;
  attempt: number;
  kind: TaskState | 'retry';
}

/** Ordonnanceur pédagogique : quatre bons conservés, un seul message planifié.
 * Aucun GPU, réseau, DOM ou intervalle ; l'horloge est entièrement injectable. */
export class AigenExecutionModel {
  private tasks: ExecutionTask[] = [];
  private events: ExecutionEvent[] = [];
  private sequence = 0;
  private order = 0;
  private token = 0;
  private timer: (() => void) | undefined;
  private scheduledFor: string | undefined;

  constructor(
    private clock: ExecutionClock,
    private changed: () => void = () => {}
  ) {}

  snapshot() {
    return {
      tasks: this.tasks.map((task) => ({ ...task })),
      events: this.events.map((event) => ({ ...event })),
      active: this.tasks.find((task) => task.state === 'running')?.id ?? null,
      pending: this.timer !== undefined,
      capacity: EXECUTION_CAPACITY,
    };
  }

  submit(failFirst = false): string | null {
    if (this.tasks.length >= EXECUTION_CAPACITY) return null;
    const task: ExecutionTask = {
      id: `J${String(++this.sequence).padStart(2, '0')}`,
      attempt: 1,
      state: 'queued',
      progress: 0,
      failFirst,
      order: ++this.order,
      result: null,
    };
    this.tasks.push(task);
    this.record(task, 'queued');
    this.pump();
    this.changed();
    return task.id;
  }

  cancel(id: string): boolean {
    const task = this.tasks.find((task) => task.id === id);
    if (!task || !this.transition(task, 'cancelled')) return false;
    if (this.scheduledFor === id) this.invalidate();
    this.pump();
    this.changed();
    return true;
  }

  retry(id: string): boolean {
    const task = this.tasks.find((task) => task.id === id);
    if (!task || !this.transition(task, 'queued', false)) return false;
    task.attempt++;
    task.progress = 0;
    task.result = null;
    task.order = ++this.order;
    this.record(task, 'retry');
    this.pump();
    this.changed();
    return true;
  }

  /** Fermer ou réinitialiser invalide même un callback déjà extrait de sa file. */
  reset(): void {
    this.invalidate();
    this.tasks = [];
    this.events = [];
    this.sequence = 0;
    this.order = 0;
    this.changed();
  }

  private transition(
    task: ExecutionTask,
    state: TaskState,
    record = true
  ): boolean {
    if (!TASK_TRANSITIONS[task.state].includes(state)) return false;
    task.state = state;
    if (record) this.record(task, state);
    return true;
  }

  private pump(): void {
    if (this.timer) return;
    const active = this.tasks.find((task) => task.state === 'running');
    if (active) {
      this.plan(active, EXECUTION_STEP, 'running', () => {
        active.progress += 25;
        if (active.failFirst && active.attempt === 1 && active.progress === 50)
          this.transition(active, 'failed');
        else if (active.progress === 100) {
          this.transition(active, 'succeeded');
          active.result = `${active.id}/a${active.attempt}`;
        }
      });
      return;
    }
    const next = this.tasks
      .filter((task) => task.state === 'queued')
      .sort((a, b) => a.order - b.order)[0];
    if (next)
      this.plan(next, DISPATCH_DELAY, 'queued', () => {
        this.transition(next, 'running');
      });
  }

  private plan(
    task: ExecutionTask,
    delay: number,
    expected: TaskState,
    action: () => void
  ): void {
    const token = ++this.token,
      attempt = task.attempt;
    this.scheduledFor = task.id;
    this.timer = this.clock.after(delay, () => {
      if (
        token !== this.token ||
        task.attempt !== attempt ||
        task.state !== expected ||
        !this.tasks.includes(task)
      )
        return;
      this.timer = undefined;
      this.scheduledFor = undefined;
      action();
      this.pump();
      this.changed();
    });
  }

  private invalidate(): void {
    this.token++;
    this.timer?.();
    this.timer = undefined;
    this.scheduledFor = undefined;
  }

  private record(task: ExecutionTask, kind: ExecutionEvent['kind']): void {
    this.events = [
      ...this.events,
      { id: task.id, attempt: task.attempt, kind },
    ].slice(-6);
  }
}
