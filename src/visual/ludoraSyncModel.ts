export type ClientId = 'A' | 'B';
export type Latency = 100 | 600 | 1400;
export interface GameState {
  version: number;
  remaining: number;
  turn: ClientId;
}
export type Rejection = 'stale' | 'turn' | 'empty';
export interface SyncEvent {
  kind: 'reset' | 'sent' | 'accepted' | 'rejected' | 'received';
  command: number;
  client: ClientId;
  version: number;
  expected?: number;
  reason?: Rejection;
}
export interface Clock {
  after(delay: number, task: () => void): () => void;
}
const initialState = (): GameState => ({ version: 0, remaining: 5, turn: 'A' });

/** Simulation locale : commandes versionnées, autorité unique et réponses différées.
 * Le délai aller simple est capturé à l'envoi ; aucune extrapolation client.
 * L'horloge injectée permet de tester sans DOM ni attente réelle. */
export class LudoraSyncModel {
  private server = initialState();
  private clients = { A: initialState(), B: initialState() };
  private busy = { A: false, B: false };
  private latency: Latency = 600;
  private command = 0;
  private epoch = 0;
  private tasks = new Set<() => void>();
  private events: SyncEvent[] = [
    { kind: 'reset', command: 0, client: 'A', version: 0 },
  ];

  constructor(
    private clock: Clock,
    private changed: () => void = () => {}
  ) {}

  snapshot() {
    return {
      server: { ...this.server },
      clients: { A: { ...this.clients.A }, B: { ...this.clients.B } },
      busy: { ...this.busy },
      latency: this.latency,
      pending: this.tasks.size,
      events: this.events.map((event) => ({ ...event })),
    };
  }

  setLatency(latency: Latency): void {
    this.latency = latency;
    this.changed();
  }

  /** Un envoi en vol par client ; le tour est vérifié au serveur, pas dans l'UI. */
  send(client: ClientId, expected = this.clients[client].version): boolean {
    if (this.busy[client]) return false;
    this.busy[client] = true;
    const command = ++this.command;
    const delay = this.latency;
    this.record({ kind: 'sent', command, client, version: expected });
    this.plan(delay, () => {
      const reason: Rejection | undefined =
        expected !== this.server.version
          ? 'stale'
          : this.server.remaining === 0
            ? 'empty'
            : client !== this.server.turn
              ? 'turn'
              : undefined;
      if (reason) {
        this.record({
          kind: 'rejected',
          command,
          client,
          version: this.server.version,
          expected,
          reason,
        });
      } else {
        this.server = {
          version: this.server.version + 1,
          remaining: this.server.remaining - 1,
          turn: client === 'A' ? 'B' : 'A',
        };
        this.record({
          kind: 'accepted',
          command,
          client,
          version: this.server.version,
        });
      }
      const state = { ...this.server };
      const recipients: ClientId[] = reason ? [client] : ['A', 'B'];
      for (const recipient of recipients)
        this.plan(delay, () => {
          // Une réponse ancienne ne peut jamais ramener une réplique en arrière.
          if (state.version >= this.clients[recipient].version)
            this.clients[recipient] = { ...state };
          if (recipient === client) this.busy[client] = false;
          this.record({
            kind: 'received',
            command,
            client: recipient,
            version: this.clients[recipient].version,
            reason,
          });
        });
    });
    this.changed();
    return true;
  }

  /** Fermeture et reset partagent la même annulation atomique de la manche. */
  reset(): void {
    this.epoch++;
    for (const cancel of this.tasks) cancel();
    this.tasks.clear();
    this.server = initialState();
    this.clients = { A: initialState(), B: initialState() };
    this.busy = { A: false, B: false };
    this.command = 0;
    this.events = [{ kind: 'reset', command: 0, client: 'A', version: 0 }];
    this.changed();
  }

  private plan(delay: number, task: () => void): void {
    const epoch = this.epoch;
    const cancel = this.clock.after(delay, () => {
      this.tasks.delete(cancel);
      if (epoch !== this.epoch) return;
      task();
      this.changed();
    });
    this.tasks.add(cancel);
  }

  private record(event: SyncEvent): void {
    this.events = [...this.events, event].slice(-6);
  }
}
