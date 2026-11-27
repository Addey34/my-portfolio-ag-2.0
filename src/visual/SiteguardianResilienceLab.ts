import { getLocale, onLocaleChange } from '@/i18n';
import '../styles/resilience.css';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  HISTORY_LIMIT,
  SCENARIOS,
  SiteguardianResilienceModel,
  type Scenario,
} from './siteguardianResilienceModel';

const COPY = {
  fr: {
    intro:
      'Un signal n’est pas un incident. Envoyez des sondes fictives, puis observez les deux seuils qui protègent le diagnostic des oscillations.',
    operational: 'Opérationnel',
    suspected: 'Anomalie suspectée',
    incident: 'Incident confirmé',
    recovering: 'Rétablissement en cours',
    failure: 'Sonde en échec',
    success: 'Sonde réussie',
    confirmation: 'Échecs pour confirmer',
    recovery: 'Succès pour rétablir',
    policy:
      'Changer un seuil ouvre une nouvelle fenêtre de comptage. L’historique reste intact et un incident actif reste ouvert ; aucun recalcul rétroactif.',
    isolated: 'Anomalie isolée',
    outage: 'Panne persistante',
    unstable: 'Service instable',
    scenarios: 'Partitions de diagnostic',
    scenarioNote:
      'Chaque partition réinitialise les seuils à 3 / 3. Avancez sonde par sonde ; aucune lecture automatique.',
    next: 'Sonde suivante',
    reset: 'Réinitialiser le diagnostic',
    opened: 'Ouverture · alerte unique',
    resolved: 'Rétablissement confirmé',
    relapse: 'Rechute · même incident',
    sample: 'Observation',
    log: 'Bande de diagnostic · 18 dernières sondes',
    active: 'Incident actif',
    none: 'Aucun',
    alerts: 'Alertes d’ouverture',
    restored: 'Incidents rétablis',
    window: 'Fenêtre de confirmation',
    restoreWindow: 'Fenêtre de rétablissement',
    ready: 'Sondes manuelles disponibles.',
    step: 'sondes lues',
    thresholds: 'seuils échec / succès',
    note: 'Simulation pédagogique locale, distincte de SiteGuardian. Données fictives ; aucun site surveillé, appel réseau ou envoi d’alerte. Pas de mesure de disponibilité ni de persistance. Fermer réinitialise le diagnostic. Une seule alerte simulée à l’ouverture de chaque incident ; une rechute ne le duplique pas.',
  },
  en: {
    intro:
      'A signal is not an incident. Send fictional probes and observe the two thresholds that protect the diagnosis from oscillation.',
    operational: 'Operational',
    suspected: 'Suspected anomaly',
    incident: 'Confirmed incident',
    recovering: 'Recovery in progress',
    failure: 'Failed probe',
    success: 'Successful probe',
    confirmation: 'Failures to confirm',
    recovery: 'Successes to recover',
    policy:
      'Changing a threshold starts a new counting window. History stays intact and an active incident stays open; no retroactive recalculation.',
    isolated: 'Isolated anomaly',
    outage: 'Persistent outage',
    unstable: 'Unstable service',
    scenarios: 'Diagnostic scores',
    scenarioNote:
      'Each score resets thresholds to 3 / 3. Advance one probe at a time; no automatic playback.',
    next: 'Next probe',
    reset: 'Reset diagnosis',
    opened: 'Opening · single alert',
    resolved: 'Recovery confirmed',
    relapse: 'Relapse · same incident',
    sample: 'Observation',
    log: 'Diagnostic strip · latest 18 probes',
    active: 'Active incident',
    none: 'None',
    alerts: 'Opening alerts',
    restored: 'Recovered incidents',
    window: 'Confirmation window',
    restoreWindow: 'Recovery window',
    ready: 'Manual probes available.',
    step: 'probes read',
    thresholds: 'failure / success thresholds',
    note: 'Local teaching simulation, separate from SiteGuardian. Fictional data; no monitored site, network call or alert delivery. No availability measurement or persistence. Closing resets diagnosis. One simulated opening alert per incident; a relapse does not duplicate it.',
  },
};

/** Instrument sans boucle : chaque entrée utilisateur produit une observation. */
export function mountSiteguardianResilienceLab(mount: HTMLElement): {
  reset(): void;
} {
  const model = new SiteguardianResilienceModel();
  let selected: Scenario | null = null;
  let cursor = 0;
  let height = 0;
  const root = document.createElement('div');
  root.className = 'resilience__instrument';
  const make = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className = ''
  ) => {
    const node = document.createElement(tag);
    node.className = className;
    return node;
  };
  const intro = make('p');
  const dial = make('div', 'resilience__dial');
  const state = make('h5', 'resilience__state');
  const incident = make('p', 'resilience__incident');
  const counters = make('p', 'resilience__counters');
  dial.append(state, incident, counters);
  const windows = make('div', 'resilience__windows');
  const meters = ['failure', 'recovery'].map((kind) => {
    const label = make('label');
    const title = make('span');
    const meter = make('meter');
    meter.min = 0;
    meter.max = 3;
    const value = make('span');
    label.append(title, meter, value);
    windows.append(label);
    return { kind, title, meter, value };
  });
  const controls = make('div', 'resilience__controls');
  const probes = (['failure', 'success'] as const).map((probe) => {
    const button = make('button');
    button.type = 'button';
    button.dataset.probe = probe;
    button.addEventListener('click', () => {
      selected = null;
      cursor = 0;
      model.probe(probe);
      render();
    });
    controls.append(button);
    return { probe, button };
  });
  const settings = make('div', 'resilience__settings');
  const selects = (['failure', 'recovery'] as const).map((kind) => {
    const label = make('label');
    const title = make('span');
    const select = make('select');
    select.dataset.threshold = kind;
    for (const value of [2, 3, 4]) {
      const option = make('option');
      option.value = String(value);
      option.textContent = String(value);
      select.append(option);
    }
    label.append(title, select);
    settings.append(label);
    select.addEventListener('change', () => {
      model.configure({
        ...model.snapshot().thresholds,
        [kind]: Number(select.value),
      });
      selected = null;
      cursor = 0;
      render();
    });
    return { kind, title, select };
  });
  const policy = make('p', 'resilience__note');
  const scoreTitle = make('h5');
  const scores = make('div', 'resilience__scores');
  const scenarios = (Object.keys(SCENARIOS) as Scenario[]).map((name) => {
    const button = make('button');
    button.type = 'button';
    button.dataset.scenario = name;
    button.addEventListener('click', () => {
      model.reset();
      selected = name;
      cursor = 0;
      render();
    });
    scores.append(button);
    return { name, button };
  });
  const scenarioNote = make('p', 'resilience__note');
  const score = make('p', 'resilience__score');
  const next = make('button');
  next.type = 'button';
  next.className = 'resilience__next';
  next.addEventListener('click', () => {
    if (selected && cursor < SCENARIOS[selected].length)
      model.probe(SCENARIOS[selected][cursor++]);
    render();
  });
  const logTitle = make('h5');
  logTitle.id = 'resilience-log';
  const log = make('ol', 'resilience__strip');
  log.setAttribute('aria-labelledby', logTitle.id);
  const rows = Array.from({ length: HISTORY_LIMIT }, () => {
    const row = make('li');
    log.append(row);
    return row;
  });
  const status = make('p', 'resilience__status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-atomic', 'true');
  const reset = make('button');
  reset.type = 'button';
  reset.className = 'resilience__reset';
  const note = make('p', 'resilience__note');
  const clear = () => {
    model.reset();
    selected = null;
    cursor = 0;
    render();
  };
  reset.addEventListener('click', clear);

  function render(): void {
    const words = COPY[getLocale()];
    const data = model.snapshot();
    root.dataset.state = data.state;
    root.dataset.opened = String(data.opened);
    root.dataset.resolved = String(data.resolved);
    root.dataset.active = data.active ?? '';
    intro.textContent = words.intro;
    state.textContent = words[data.state];
    incident.textContent = `${words.active} · ${data.active ?? words.none}`;
    counters.textContent = `${words.alerts} ${data.opened} / ${words.restored} ${data.resolved}`;
    for (const meter of meters) {
      const failure = meter.kind === 'failure';
      meter.title.textContent = failure ? words.window : words.restoreWindow;
      meter.meter.max = failure
        ? data.thresholds.failure
        : data.thresholds.recovery;
      meter.meter.value = failure ? data.failures : data.successes;
      meter.value.textContent = `${meter.meter.value} / ${meter.meter.max}`;
    }
    for (const control of probes)
      control.button.textContent = words[control.probe];
    for (const control of selects) {
      control.title.textContent =
        control.kind === 'failure' ? words.confirmation : words.recovery;
      control.select.value = String(data.thresholds[control.kind]);
    }
    policy.textContent = words.policy;
    scoreTitle.textContent = words.scenarios;
    scenarioNote.textContent = words.scenarioNote;
    for (const scenario of scenarios) {
      scenario.button.textContent = words[scenario.name];
      scenario.button.setAttribute(
        'aria-pressed',
        String(selected === scenario.name)
      );
    }
    score.textContent = selected
      ? `${words[selected]} · ${cursor}/${SCENARIOS[selected].length} ${words.step} · ${SCENARIOS[selected].map((probe, index) => `${index === cursor ? '▸' : ''}${probe === 'failure' ? '×' : '✓'}`).join(' ')}`
      : words.ready;
    next.textContent = words.next;
    next.disabled = !selected || cursor >= SCENARIOS[selected].length;
    logTitle.textContent = words.log;
    rows.forEach((row, index) => {
      const event = data.history[index];
      row.hidden = !event;
      row.dataset.event = event?.event ?? '';
      row.dataset.probe = event?.probe ?? '';
      row.textContent = event
        ? `${String(event.sequence).padStart(2, '0')} ${event.probe === 'failure' ? '×' : '✓'} ${words[event.probe]} · ${words[event.state]} · ${event.incident ?? '—'} · ${words[event.event]} · ${words.thresholds} ${event.thresholds.failure}/${event.thresholds.recovery}`
        : '';
    });
    const latest = data.history[data.history.length - 1];
    const announcement = `${words[data.state]} · ${data.active ?? words.none} · ${words.alerts} ${data.opened} · ${words.restored} ${data.resolved}${latest ? ` · ${latest.sequence} ${words[latest.event]}` : ''}`;
    if (status.textContent !== announcement) status.textContent = announcement;
    reset.textContent = words.reset;
    note.textContent = words.note;
    if (root.offsetHeight !== height) {
      height = root.offsetHeight;
      ScrollTrigger.refresh();
    }
  }
  root.append(
    intro,
    dial,
    windows,
    controls,
    settings,
    policy,
    scoreTitle,
    scores,
    scenarioNote,
    score,
    next,
    logTitle,
    log,
    status,
    reset,
    note
  );
  mount.replaceChildren(root);
  onLocaleChange(render);
  render();
  return { reset: clear };
}
