import { getLocale, onLocaleChange } from '@/i18n';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { publishSculpture, syncProjection } from './sculptureProjection';
import {
  LudoraSyncModel,
  type GameState,
  type SyncEvent,
} from './ludoraSyncModel';

// Ces textes restent dans le module différé, pas dans la charge initiale.
const COPY = {
  fr: {
    intro:
      'Cinq jetons, deux joueurs. A commence, puis chacun son tour. Envoyez une prise depuis un client : seul le serveur peut retirer le jeton.',
    latency: 'Délai réseau aller simple',
    timing:
      '100 / 600 / 1 400 ms par trajet. Le délai choisi est fixé à l’envoi : aller au serveur, puis retour aux clients.',
    client: 'Client',
    server: 'Serveur',
    authority: 'Seule autorité',
    replica: 'Copie locale',
    version: 'Version',
    tokens: 'jetons',
    turn: 'Tour',
    take: 'Prendre 1',
    stale: 'Envoyer v−1',
    staleHelp:
      '« Envoyer v−1 » rejoue une ancienne version pour provoquer un rejet. Un envoi en vol maximum par client.',
    reset: 'Recommencer la manche',
    log: 'Les six derniers événements',
    idle: 'Copies convergentes. Le réseau simulé est au repos.',
    pending: 'Message(s) en transit',
    note: 'Simulation pédagogique locale, sans connexion à Ludora ni à Nakama. Ni prédiction client, ni protocole réseau réel. Fermer ou recommencer annule tous les messages et remet la manche à zéro.',
    sent: 'commande envoyée',
    accepted: 'prise validée',
    received: 'copie synchronisée',
    resetEvent: 'Nouvelle manche · A commence · v0',
    staleReason: 'version obsolète',
    turnReason: 'ce n’est pas votre tour',
    emptyReason: 'réserve épuisée',
    rejected: 'rejet',
    reply: 'refus reçu',
  },
  en: {
    intro:
      'Five tokens, two players. A starts, then take turns. Send a move from either client: only the server can remove the token.',
    latency: 'One-way network delay',
    timing:
      '100 / 600 / 1,400 ms per trip. The delay is fixed when sending: to the server, then back to the clients.',
    client: 'Client',
    server: 'Server',
    authority: 'Sole authority',
    replica: 'Local copy',
    version: 'Version',
    tokens: 'tokens',
    turn: 'Turn',
    take: 'Take 1',
    stale: 'Send v−1',
    staleHelp:
      '“Send v−1” replays an old version to trigger a rejection. At most one command in flight per client.',
    reset: 'Restart the round',
    log: 'The six latest events',
    idle: 'Copies converged. The simulated network is idle.',
    pending: 'Message(s) in transit',
    note: 'Local teaching simulation, with no connection to Ludora or Nakama. No client prediction or real network protocol. Closing or restarting cancels all messages and resets the round.',
    sent: 'command sent',
    accepted: 'move accepted',
    received: 'copy synchronized',
    resetEvent: 'New round · A starts · v0',
    staleReason: 'stale version',
    turnReason: 'not your turn',
    emptyReason: 'no tokens left',
    rejected: 'rejected',
    reply: 'rejection received',
  },
};

/** Plateau événementiel : seuls des timers de messages ponctuels sont actifs. */
export function mountLudoraSyncLab(mount: HTMLElement): { reset(): void } {
  const root = document.createElement('div');
  root.className = 'sync-lab__instrument';
  const intro = document.createElement('p');
  intro.id = 'ludora-sync-intro';
  const latencyLabel = document.createElement('label');
  latencyLabel.htmlFor = 'ludora-sync-latency';
  const select = document.createElement('select');
  select.id = 'ludora-sync-latency';
  select.setAttribute('aria-describedby', 'ludora-sync-timing');
  for (const value of [100, 600, 1400]) {
    const option = document.createElement('option');
    option.value = String(value);
    option.textContent = `${value} ms`;
    select.append(option);
  }
  select.value = '600';
  const timing = document.createElement('p');
  timing.id = 'ludora-sync-timing';
  timing.className = 'sync-lab__note';
  const board = document.createElement('div');
  board.className = 'sync-lab__board';
  const trays = (['A', 'server', 'B'] as const).map((id) => {
    const tray = document.createElement('section');
    tray.className = 'sync-lab__tray';
    tray.dataset.peer = id;
    const title = document.createElement('h4');
    title.id = `sync-peer-${id}`;
    tray.setAttribute('aria-labelledby', title.id);
    const role = document.createElement('p');
    role.className = 'sync-lab__role';
    const chips = document.createElement('div');
    chips.className = 'sync-lab__chips';
    chips.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 5; i++) chips.append(document.createElement('span'));
    const state = document.createElement('p');
    state.className = 'sync-lab__state';
    const turn = document.createElement('p');
    turn.className = 'sync-lab__turn';
    tray.append(title, role, chips, state, turn);
    const buttons: HTMLButtonElement[] = [];
    if (id !== 'server') {
      for (const action of ['take', 'stale'] as const) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.action = action;
        button.setAttribute('aria-describedby', 'ludora-sync-help');
        button.addEventListener('click', () => {
          model.send(
            id,
            action === 'stale'
              ? model.snapshot().clients[id].version - 1
              : undefined
          );
        });
        buttons.push(button);
        tray.append(button);
      }
    }
    board.append(tray);
    return { id, title, role, chips, state, turn, buttons };
  });
  const help = document.createElement('p');
  help.id = 'ludora-sync-help';
  help.className = 'sync-lab__note';
  const status = document.createElement('p');
  status.className = 'sync-lab__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-atomic', 'true');
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'sync-lab__reset';
  const logTitle = document.createElement('h4');
  logTitle.id = 'ludora-sync-log';
  const log = document.createElement('ol');
  log.className = 'sync-lab__log';
  log.setAttribute('aria-labelledby', logTitle.id);
  // Six emplacements réservés : le journal ne pousse pas le récit à chaque message.
  for (let i = 0; i < 6; i++) log.append(document.createElement('li'));
  const note = document.createElement('p');
  note.className = 'sync-lab__note';
  const model = new LudoraSyncModel(
    {
      after(delay, task) {
        const timer = window.setTimeout(task, delay);
        return () => window.clearTimeout(timer);
      },
    },
    render
  );

  function render(): void {
    const words = COPY[getLocale()];
    const snapshot = model.snapshot();
    publishSculpture(mount, syncProjection(snapshot));
    root.dataset.pending = String(snapshot.pending);
    intro.textContent =
      words.intro +
      (getLocale() === 'fr'
        ? ' Sculpture : le dé est le serveur ; les modules à 1 et 4 points sont A et B. Ils avancent en transit, se reposent à convergence ; un refus incline le dé sans changer sa version.'
        : ' Sculpture: the die is the server; modules with 1 and 4 dots are A and B. They advance in transit and settle on convergence; rejection tilts the die without advancing its version.');
    latencyLabel.textContent = words.latency;
    timing.textContent = words.timing;
    help.textContent = words.staleHelp;
    note.textContent = words.note;
    reset.textContent = words.reset;
    logTitle.textContent = words.log;
    const stateText = (state: GameState): string =>
      `${words.version} ${state.version} · ${state.remaining} ${words.tokens}`;
    for (const tray of trays) {
      const id = tray.id;
      const state = id === 'server' ? snapshot.server : snapshot.clients[id];
      tray.title.textContent =
        id === 'server' ? words.server : `${words.client} ${id}`;
      tray.role.textContent = id === 'server' ? words.authority : words.replica;
      tray.state.textContent = stateText(state);
      tray.state.dataset.version = String(state.version);
      tray.turn.textContent = `${words.turn} ${state.turn}`;
      [...tray.chips.children].forEach((chip, index) => {
        (chip as HTMLElement).dataset.present = String(index < state.remaining);
      });
      if (id !== 'server')
        tray.buttons.forEach((button, index) => {
          button.textContent = `${index === 0 ? words.take : words.stale} · ${id}`;
          button.disabled =
            snapshot.busy[id] || (index === 1 && state.version === 0);
        });
    }
    const eventText = (event: SyncEvent): string => {
      if (event.kind === 'reset') return words.resetEvent;
      const prefix = `#${event.command}`;
      if (event.kind === 'sent')
        return `${prefix} ${event.client} → S · v${event.version} · ${words.sent}`;
      if (event.kind === 'accepted')
        return `${prefix} S · v${event.version} · ${words.accepted}`;
      const reason =
        event.reason === 'stale'
          ? words.staleReason
          : event.reason === 'turn'
            ? words.turnReason
            : words.emptyReason;
      if (event.kind === 'rejected')
        return `${prefix} S · ${words.rejected} : ${reason}${event.reason === 'stale' ? ` (v${event.expected} ≠ v${event.version})` : ''}`;
      return `${prefix} S → ${event.client} · v${event.version} · ${event.reason ? words.reply : words.received}`;
    };
    [...log.children].forEach((row, index) => {
      const event = snapshot.events[index];
      row.textContent = event ? eventText(event) : '—';
      row.setAttribute('aria-hidden', String(!event));
      (row as HTMLElement).dataset.kind = event?.kind ?? 'blank';
    });
    const decision = [...snapshot.events]
      .reverse()
      .find((event) => event.kind === 'accepted' || event.kind === 'rejected');
    const rejection =
      decision?.reason === 'stale'
        ? words.staleReason
        : decision?.reason === 'turn'
          ? words.turnReason
          : words.emptyReason;
    status.textContent = snapshot.pending
      ? `${words.pending} : ${snapshot.pending}`
      : `${decision?.kind === 'rejected' ? `${words.rejected} : ${rejection}. ` : ''}${words.idle}`;
  }
  select.addEventListener('change', () => {
    const delay = Number(select.value);
    if (delay === 100 || delay === 600 || delay === 1400)
      model.setLatency(delay);
  });
  reset.addEventListener('click', () => model.reset());
  onLocaleChange(render);
  root.append(
    intro,
    latencyLabel,
    select,
    timing,
    board,
    help,
    status,
    reset,
    logTitle,
    log,
    note
  );
  mount.replaceChildren(root);
  render();
  ScrollTrigger.refresh();
  return { reset: () => model.reset() };
}
