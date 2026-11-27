export type ServiceState =
  'operational' | 'suspected' | 'incident' | 'recovering';
export type Probe = 'success' | 'failure';
export type Scenario = 'isolated' | 'outage' | 'unstable';
export interface Thresholds {
  failure: number;
  recovery: number;
}
export interface Observation {
  sequence: number;
  probe: Probe;
  state: ServiceState;
  incident: string | null;
  event: 'sample' | 'opened' | 'resolved' | 'relapse';
  thresholds: Thresholds;
}
export const HISTORY_LIMIT = 18;
export const SCENARIOS: Record<Scenario, readonly Probe[]> = {
  isolated: ['failure', 'success'],
  outage: [
    'failure',
    'failure',
    'failure',
    'failure',
    'success',
    'success',
    'success',
  ],
  unstable: [
    'failure',
    'failure',
    'failure',
    'success',
    'failure',
    'success',
    'success',
    'success',
  ],
};

/** Réducteur événementiel : aucune horloge, donnée réseau ou activité au repos. */
export class SiteguardianResilienceModel {
  private state: ServiceState = 'operational';
  private thresholds: Thresholds = { failure: 3, recovery: 3 };
  private failures = 0;
  private successes = 0;
  private sequence = 0;
  private opened = 0;
  private resolved = 0;
  private active: string | null = null;
  private history: Observation[] = [];

  snapshot() {
    return {
      state: this.state,
      thresholds: { ...this.thresholds },
      failures: this.failures,
      successes: this.successes,
      opened: this.opened,
      resolved: this.resolved,
      active: this.active,
      history: this.history.map((row) => ({
        ...row,
        thresholds: { ...row.thresholds },
      })),
    };
  }

  /** Nouvelle fenêtre de comptage ; l'incident actif et les preuves restent acquis. */
  configure(next: Thresholds): boolean {
    if (
      ![next.failure, next.recovery].every(
        (n) => Number.isInteger(n) && n >= 2 && n <= 4
      )
    )
      return false;
    if (
      next.failure === this.thresholds.failure &&
      next.recovery === this.thresholds.recovery
    )
      return true;
    this.thresholds = { ...next };
    this.failures = this.successes = 0;
    this.state = this.active ? 'incident' : 'operational';
    return true;
  }

  probe(probe: Probe): boolean {
    if (probe !== 'success' && probe !== 'failure') return false;
    let event: Observation['event'] = 'sample';
    if (probe === 'failure') {
      this.failures++;
      this.successes = 0;
      if (this.active) {
        if (this.state === 'recovering') event = 'relapse';
        this.state = 'incident';
      } else if (this.failures >= this.thresholds.failure) {
        this.active = `I${String(++this.opened).padStart(2, '0')}`;
        this.state = 'incident';
        event = 'opened';
      } else this.state = 'suspected';
    } else {
      this.successes++;
      this.failures = 0;
      if (this.active && this.successes >= this.thresholds.recovery) {
        event = 'resolved';
        this.resolved++;
        this.state = 'operational';
      } else this.state = this.active ? 'recovering' : 'operational';
    }
    // Le dernier relevé garde l'identifiant de l'incident qu'il vient de clore.
    this.history.push({
      sequence: ++this.sequence,
      probe,
      state: this.state,
      incident: this.active,
      event,
      thresholds: { ...this.thresholds },
    });
    if (event === 'resolved') this.active = null;
    this.history = this.history.slice(-HISTORY_LIMIT);
    this.failures = Math.min(this.failures, this.thresholds.failure);
    this.successes = Math.min(this.successes, this.thresholds.recovery);
    return true;
  }

  reset(): void {
    this.state = 'operational';
    this.thresholds = { failure: 3, recovery: 3 };
    this.failures =
      this.successes =
      this.sequence =
      this.opened =
      this.resolved =
        0;
    this.active = null;
    this.history = [];
  }
}
