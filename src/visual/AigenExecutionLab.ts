import { getLocale, onLocaleChange } from '@/i18n';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  AigenExecutionModel,
  EXECUTION_CAPACITY,
  type ExecutionTask,
} from './aigenExecutionModel';

// Textes chargés avec l'instrument uniquement ; aucune donnée ni ressource produit.
const COPY = {
  fr: {
    intro:
      'Soumettez des bons de génération fictifs. L’orchestrateur les range ; un seul agent simulé les traite. Annulez un bon ou provoquez une erreur pour comparer les chemins.',
    web: 'Interface web',
    webNote: 'Soumission',
    orchestration: 'Orchestrateur',
    fifo: 'File FIFO',
    agent: 'Agent simulé',
    idle: 'Agent au repos',
    attempt: 'essai',
    progress: 'progression simulée',
    submit: 'Soumettre une tâche fictive',
    failure: 'Erreur contrôlée au premier essai de la prochaine tâche',
    limit:
      'Quatre bons par manche, terminés compris. Réinitialiser libère les emplacements.',
    queued: 'En attente',
    running: 'Exécution',
    succeeded: 'Terminée',
    failed: 'Erreur contrôlée',
    cancelled: 'Annulée',
    retry: 'Relance',
    cancel: 'Annuler',
    restart: 'Relancer',
    empty: 'Emplacement libre',
    result: 'Épreuve simulée',
    noResult: 'Aucune épreuve',
    reset: 'Réinitialiser la chaîne',
    journal: 'Six derniers événements',
    ready: 'La chaîne est prête.',
    resetMessage: 'Chaîne vidée, callbacks annulés.',
    rejected:
      'Action refusée : état incompatible ou quatre emplacements occupés.',
    accepted: 'Action transmise à l’orchestrateur.',
    active: 'Agent actif',
    count: 'bons conservés',
    note: 'Simulation pédagogique locale, distincte d’AIGen. Aucun GPU, modèle IA, agent local réel ou appel réseau. Les pourcentages sont quatre paliers fictifs de 800 ms après 300 ms d’orchestration ; les épreuves sont décoratives, pas des images générées. Pas de persistance. Fermer ou réinitialiser annule et vide la chaîne.',
  },
  en: {
    intro:
      'Submit fictional generation tickets. The orchestrator queues them; a single simulated agent processes them. Cancel a ticket or trigger an error to compare the paths.',
    web: 'Web interface',
    webNote: 'Submission',
    orchestration: 'Orchestrator',
    fifo: 'FIFO queue',
    agent: 'Simulated agent',
    idle: 'Agent idle',
    attempt: 'attempt',
    progress: 'simulated progress',
    submit: 'Submit a fictional task',
    failure: 'Controlled error on the next task’s first attempt',
    limit:
      'Four tickets per round, including finished ones. Reset frees the slots.',
    queued: 'Queued',
    running: 'Running',
    succeeded: 'Completed',
    failed: 'Controlled error',
    cancelled: 'Cancelled',
    retry: 'Retry',
    cancel: 'Cancel',
    restart: 'Retry',
    empty: 'Free slot',
    result: 'Simulated proof',
    noResult: 'No proof',
    reset: 'Reset the chain',
    journal: 'Six latest events',
    ready: 'The chain is ready.',
    resetMessage: 'Chain cleared, callbacks cancelled.',
    rejected: 'Action rejected: incompatible state or four occupied slots.',
    accepted: 'Action passed to the orchestrator.',
    active: 'Agent active',
    count: 'tickets retained',
    note: 'Local teaching simulation, separate from AIGen. No GPU, AI model, real local agent or network call. Percentages are four fictional 800 ms steps after 300 ms of orchestration; proofs are decorative, not generated images. No persistence. Closing or resetting cancels and clears the chain.',
  },
};
type Message = 'ready' | 'resetMessage' | 'rejected' | 'accepted';

/** Chaîne miniature événementielle ; un seul timer de simulation au maximum. */
export function mountAigenExecutionLab(mount: HTMLElement): { reset(): void } {
  let message: Message = 'ready';
  let layoutHeight = 0;
  const root = document.createElement('div');
  root.className = 'execution__instrument';
  const intro = document.createElement('p');
  const chain = document.createElement('ol');
  chain.className = 'execution__chain';
  const stages = ['web', 'orchestration', 'agent'].map((id) => {
    const item = document.createElement('li');
    item.dataset.stage = id;
    const title = document.createElement('strong');
    const value = document.createElement('span');
    item.append(title, value);
    chain.append(item);
    return { title, value };
  });
  const label = document.createElement('label');
  label.className = 'execution__failure';
  const failure = document.createElement('input');
  failure.type = 'checkbox';
  failure.id = 'execution-fail-first';
  const labelText = document.createElement('span');
  label.append(failure, labelText);
  const submit = document.createElement('button');
  submit.type = 'button';
  submit.className = 'execution__submit';
  submit.setAttribute('aria-describedby', 'execution-limit');
  const limit = document.createElement('p');
  limit.id = 'execution-limit';
  limit.className = 'execution__note';
  const tasks = document.createElement('ol');
  tasks.className = 'execution__tasks';
  const slots = Array.from({ length: EXECUTION_CAPACITY }, (_, index) => {
    const item = document.createElement('li');
    item.className = 'execution__ticket';
    item.dataset.slot = String(index + 1);
    const placeholder = document.createElement('p');
    placeholder.className = 'execution__empty';
    const content = document.createElement('div');
    content.className = 'execution__job';
    const title = document.createElement('h5');
    title.id = `execution-ticket-${index}`;
    const state = document.createElement('p');
    state.className = 'execution__state';
    const progress = document.createElement('progress');
    progress.max = 100;
    const percent = document.createElement('p');
    percent.className = 'execution__percent';
    const actions = document.createElement('div');
    actions.className = 'execution__actions';
    const buttons = (['cancel', 'restart'] as const).map((action) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.action = action;
      button.addEventListener('click', () => {
        const id = item.dataset.task;
        if (id)
          message = (action === 'cancel' ? model.cancel(id) : model.retry(id))
            ? 'accepted'
            : 'rejected';
        render();
      });
      actions.append(button);
      return button;
    });
    const proof = document.createElement('p');
    proof.className = 'execution__proof';
    content.append(title, state, progress, percent, actions, proof);
    item.append(placeholder, content);
    tasks.append(item);
    return {
      item,
      placeholder,
      content,
      title,
      state,
      progress,
      percent,
      proof,
      buttons,
    };
  });
  const status = document.createElement('p');
  status.className = 'execution__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-atomic', 'true');
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'execution__reset';
  const logTitle = document.createElement('h5');
  logTitle.id = 'execution-journal';
  const log = document.createElement('ol');
  log.className = 'execution__log';
  log.setAttribute('aria-labelledby', logTitle.id);
  for (let index = 0; index < 6; index++)
    log.append(document.createElement('li'));
  const note = document.createElement('p');
  note.className = 'execution__note';
  const model = new AigenExecutionModel(
    {
      after(delay, task) {
        const timer = window.setTimeout(task, delay);
        return () => window.clearTimeout(timer);
      },
    },
    render
  );

  function resetChain(): void {
    message = 'resetMessage';
    failure.checked = false;
    model.reset();
  }
  submit.addEventListener('click', () => {
    message = model.submit(failure.checked) ? 'accepted' : 'rejected';
    failure.checked = false;
    render();
  });
  reset.addEventListener('click', resetChain);

  function render(): void {
    const words = COPY[getLocale()],
      snapshot = model.snapshot();
    const active = snapshot.tasks.find((task) => task.id === snapshot.active);
    root.dataset.active = snapshot.active ?? '';
    root.dataset.pending = String(snapshot.pending);
    root.dataset.count = String(snapshot.tasks.length);
    intro.textContent = words.intro;
    stages[0].title.textContent = words.web;
    stages[0].value.textContent = words.webNote;
    stages[1].title.textContent = words.orchestration;
    const queued = snapshot.tasks
      .filter((task) => task.state === 'queued')
      .sort((a, b) => a.order - b.order);
    stages[1].value.textContent = `${words.fifo} · ${queued.map((task) => `${task.id}/a${task.attempt}`).join(' → ') || '—'}`;
    stages[2].title.textContent = words.agent;
    stages[2].value.textContent = active
      ? `${active.id} · ${words.attempt} ${active.attempt} · ${active.progress} %`
      : words.idle;
    labelText.textContent = words.failure;
    submit.textContent = words.submit;
    submit.disabled = snapshot.tasks.length >= EXECUTION_CAPACITY;
    limit.textContent = words.limit;
    const identity = (task: ExecutionTask) =>
      `${task.id} · ${words.attempt} ${task.attempt}`;
    for (const [index, slot] of slots.entries()) {
      const task = snapshot.tasks[index];
      slot.placeholder.textContent = `${String(index + 1).padStart(2, '0')} · ${words.empty}`;
      slot.placeholder.hidden = !!task;
      slot.content.hidden = !task;
      slot.item.dataset.task = task?.id ?? '';
      slot.item.dataset.state = task?.state ?? 'empty';
      slot.item.dataset.attempt = String(task?.attempt ?? 0);
      if (!task) continue;
      slot.title.textContent = identity(task);
      slot.state.textContent = words[task.state];
      slot.progress.value = task.progress;
      slot.progress.setAttribute(
        'aria-label',
        `${identity(task)} · ${words.progress}`
      );
      slot.percent.textContent = `${task.progress} % · ${words.progress}`;
      slot.buttons[0].textContent = words.cancel;
      slot.buttons[1].textContent = words.restart;
      for (const button of slot.buttons)
        button.setAttribute(
          'aria-label',
          `${button.textContent} · ${identity(task)}`
        );
      slot.buttons[0].disabled =
        task.state !== 'queued' && task.state !== 'running';
      slot.buttons[1].disabled = task.state !== 'failed';
      slot.proof.textContent = task.result
        ? `${words.result} ${task.result}`
        : words.noResult;
      slot.proof.dataset.result = task.result ?? '';
    }
    const statusText = `${words[message]} ${snapshot.tasks.length}/${EXECUTION_CAPACITY} ${words.count} · ${active ? `${words.active} ${active.id}` : words.idle}.`;
    if (status.textContent !== statusText) status.textContent = statusText;
    reset.textContent = words.reset;
    logTitle.textContent = words.journal;
    note.textContent = words.note;
    [...log.children].forEach((row, index) => {
      const event = snapshot.events[index];
      row.setAttribute('aria-hidden', String(!event));
      row.textContent = event
        ? `${event.id} · ${words.attempt} ${event.attempt} → ${words[event.kind]}`
        : '—';
    });
    const height = root.offsetHeight;
    if (height !== layoutHeight) {
      layoutHeight = height;
      ScrollTrigger.refresh();
    }
  }
  onLocaleChange(render);
  root.append(
    intro,
    chain,
    label,
    submit,
    limit,
    tasks,
    status,
    reset,
    logTitle,
    log,
    note
  );
  mount.replaceChildren(root);
  render();
  return { reset: resetChain };
}
