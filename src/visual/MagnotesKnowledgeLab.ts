import { getLocale, onLocaleChange } from '@/i18n';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  MagnotesKnowledgeModel,
  NOTE_STATUSES,
  type KnowledgeNote,
  type NoteId,
} from './magnotesKnowledgeModel';

// Textes différés avec l'atelier ; aucune donnée personnelle ou requête produit.
const COPY = {
  fr: {
    intro:
      'Trois notes, une seule matière. Déplacez une idée, changez son statut ou son échéance, puis changez de projection : les identifiants et les propriétés restent les mêmes.',
    graph: 'Graphe',
    kanban: 'Kanban',
    timeline: 'Chronologie',
    projection: 'Projection du modèle',
    selected: 'Note à manipuler',
    status: 'Statut',
    due: 'Échéance fictive',
    day: 'Jour',
    explore: 'À explorer',
    working: 'En cours',
    clear: 'Clarifié',
    left: 'Déplacer à gauche',
    right: 'Déplacer à droite',
    up: 'Déplacer en haut',
    down: 'Déplacer en bas',
    position: 'Position sur la grille 3 × 3',
    moveHelp:
      'Un pas par bouton, au toucher ou avec Tab puis Entrée. Aucun glisser-déposer requis.',
    source: 'Source unique',
    revision: 'révision',
    links: 'Relations fixes',
    empty: 'Aucune note',
    reset: 'Restaurer les trois notes',
    ready: 'Choisissez une note ou une projection.',
    changed:
      'Modèle mis à jour : toutes les projections utilisent cette révision.',
    blocked:
      'Déplacement refusé : bord de grille ou case occupée. Le modèle reste inchangé.',
    restored: 'Scène initiale restaurée.',
    note: 'Atelier pédagogique local, distinct de MagNotes. Notes et semaine de sept jours entièrement fictives ; relations fixes. Pas de moteur de placement automatique ni de sauvegarde. Fermer conserve cet état en mémoire ; restaurer remet la scène à zéro.',
  },
  en: {
    intro:
      'Three notes, one shared source. Move an idea, change its status or due day, then change projection: the identifiers and properties stay the same.',
    graph: 'Graph',
    kanban: 'Kanban',
    timeline: 'Timeline',
    projection: 'Model projection',
    selected: 'Note to edit',
    status: 'Status',
    due: 'Fictional due day',
    day: 'Day',
    explore: 'To explore',
    working: 'In progress',
    clear: 'Clarified',
    left: 'Move left',
    right: 'Move right',
    up: 'Move up',
    down: 'Move down',
    position: 'Position on the 3 × 3 grid',
    moveHelp:
      'One step per button, by touch or Tab then Enter. No dragging required.',
    source: 'Single source',
    revision: 'revision',
    links: 'Fixed relations',
    empty: 'No notes',
    reset: 'Restore the three notes',
    ready: 'Choose a note or a projection.',
    changed: 'Model updated: every projection uses this revision.',
    blocked:
      'Move rejected: grid boundary or occupied cell. The model is unchanged.',
    restored: 'Initial scene restored.',
    note: 'Local teaching workshop, separate from MagNotes. Entirely fictional notes and seven-day week; fixed relations. No automatic layout engine or persistence. Closing keeps this state in memory; restoring resets the scene.',
  },
};
type View = 'graph' | 'kanban' | 'timeline';
type Message = 'ready' | 'changed' | 'blocked' | 'restored';
const SVG_NS = 'http://www.w3.org/2000/svg';

/** Projections à la demande : ni horloge, ni rendu permanent, ni backend. */
export function mountMagnotesKnowledgeLab(mount: HTMLElement): void {
  const model = new MagnotesKnowledgeModel();
  let view: View = 'graph';
  let selected: NoteId = 'N01';
  let message: Message = 'ready';
  let layoutHeight = 0;
  const root = document.createElement('div');
  root.className = 'knowledge__instrument';
  const intro = document.createElement('p');
  const revision = document.createElement('p');
  revision.className = 'knowledge__revision';
  const views = document.createElement('div');
  views.className = 'knowledge__views';
  views.setAttribute('role', 'group');
  const viewButtons = (['graph', 'kanban', 'timeline'] as const).map((id) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = `knowledge-view-${id}`;
    button.dataset.view = id;
    button.setAttribute('aria-controls', 'knowledge-projection');
    button.addEventListener('click', () => {
      view = id;
      render();
    });
    views.append(button);
    return button;
  });
  const panel = document.createElement('div');
  panel.id = 'knowledge-projection';
  panel.className = 'knowledge__projection';
  panel.setAttribute('role', 'region');
  const links = document.createElement('p');
  links.className = 'knowledge__relations';
  const inspector = document.createElement('div');
  inspector.className = 'knowledge__inspector';
  const fields = (['selected', 'status', 'due'] as const).map((key) => {
    const label = document.createElement('label');
    label.htmlFor = `knowledge-${key}`;
    const select = document.createElement('select');
    select.id = label.htmlFor;
    inspector.append(label, select);
    return { label, select };
  });
  const [noteField, statusField, dayField] = fields;
  for (const note of model.snapshot().notes) {
    const option = document.createElement('option');
    option.value = note.id;
    noteField.select.append(option);
  }
  for (const status of NOTE_STATUSES) {
    const option = document.createElement('option');
    option.value = status;
    statusField.select.append(option);
  }
  for (let day = 1; day <= 7; day++) {
    const option = document.createElement('option');
    option.value = String(day);
    dayField.select.append(option);
  }
  noteField.select.addEventListener('change', () => {
    const id = noteField.select.value;
    if (id === 'N01' || id === 'N02' || id === 'N03') {
      selected = id;
      render();
    }
  });
  statusField.select.addEventListener('change', () => {
    const status = statusField.select.value;
    if (status === 'explore' || status === 'working' || status === 'clear') {
      model.setStatus(selected, status);
      message = 'changed';
      render();
    }
  });
  dayField.select.addEventListener('change', () => {
    model.setDay(selected, Number(dayField.select.value));
    message = 'changed';
    render();
  });
  const position = document.createElement('p');
  position.className = 'knowledge__position';
  const moveHelp = document.createElement('p');
  moveHelp.id = 'knowledge-move-help';
  moveHelp.className = 'knowledge__note';
  const pad = document.createElement('div');
  pad.className = 'knowledge__pad';
  pad.setAttribute('role', 'group');
  pad.setAttribute('aria-describedby', moveHelp.id);
  const directions = [
    ['left', -1, 0, '←'],
    ['up', 0, -1, '↑'],
    ['down', 0, 1, '↓'],
    ['right', 1, 0, '→'],
  ] as const;
  const movement = directions.map(([key, dx, dy, arrow]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = arrow;
    button.dataset.move = key;
    button.addEventListener('click', () => {
      message = model.move(selected, dx, dy) ? 'changed' : 'blocked';
      render();
    });
    pad.append(button);
    return { button, key };
  });
  const status = document.createElement('p');
  status.className = 'knowledge__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-atomic', 'true');
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'knowledge__reset';
  reset.addEventListener('click', () => {
    model.reset();
    selected = 'N01';
    view = 'graph';
    message = 'restored';
    render();
  });
  const note = document.createElement('p');
  note.className = 'knowledge__note';

  function noteButton(data: KnowledgeNote): HTMLButtonElement {
    const words = COPY[getLocale()];
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.note = data.id;
    button.setAttribute('aria-pressed', String(data.id === selected));
    const identity = document.createElement('strong');
    identity.textContent = `${data.id} · ${data.title[getLocale()]}`;
    const properties = document.createElement('small');
    properties.textContent = `${words[data.status]} · ${words.day} ${data.day} · (${data.x}, ${data.y})`;
    button.append(identity, properties);
    button.addEventListener('click', () => {
      selected = data.id;
      render();
    });
    return button;
  }

  function render(): void {
    const locale = getLocale();
    const words = COPY[locale];
    const snapshot = model.snapshot();
    const current = snapshot.notes.find((note) => note.id === selected)!;
    root.dataset.revision = String(snapshot.revision);
    root.dataset.view = view;
    intro.textContent = words.intro;
    revision.textContent = `${words.source} · ${words.revision} ${snapshot.revision} · 3 notes`;
    views.setAttribute('aria-label', words.projection);
    for (const button of viewButtons) {
      button.textContent = words[button.dataset.view as View];
      button.setAttribute('aria-pressed', String(button.dataset.view === view));
    }
    panel.setAttribute('aria-labelledby', `knowledge-view-${view}`);
    fields.forEach((field, index) => {
      field.label.textContent = [words.selected, words.status, words.due][
        index
      ];
    });
    [...noteField.select.options].forEach((option, index) => {
      const data = snapshot.notes[index];
      option.textContent = `${data.id} · ${data.title[locale]}`;
    });
    [...statusField.select.options].forEach((option, index) => {
      option.textContent = words[NOTE_STATUSES[index]];
    });
    [...dayField.select.options].forEach((option, index) => {
      option.textContent = `${words.day} ${index + 1}`;
    });
    noteField.select.value = selected;
    statusField.select.value = current.status;
    dayField.select.value = String(current.day);
    position.textContent = `${words.position} · ${selected} (${current.x}, ${current.y})`;
    pad.setAttribute('aria-label', words.position);
    moveHelp.textContent = words.moveHelp;
    for (const { button, key } of movement) {
      button.setAttribute('aria-label', `${words[key]} · ${selected}`);
      button.title = words[key];
    }
    links.textContent = `${words.links} : ${snapshot.relations.map((link) => `${link.from} → ${link.to}`).join(' ; ')}`;
    status.textContent = words[message];
    reset.textContent = words.reset;
    note.textContent = words.note;
    // Restaurer le focus après la projection, sans déplacer le défilement de Lenis.
    const focused = panel.contains(document.activeElement)
      ? (document.activeElement as HTMLElement).dataset.note
      : undefined;
    panel.replaceChildren();
    if (view === 'graph') {
      const map = document.createElement('div');
      map.className = 'knowledge__map';
      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('viewBox', '0 0 1000 360');
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      const graph = model.graph();
      for (const edge of graph.edges) {
        const line = document.createElementNS(SVG_NS, 'line');
        line.dataset.relation = edge.id;
        line.setAttribute('x1', String(200 + edge.source.x * 300));
        line.setAttribute('y1', String(72 + edge.source.y * 108));
        line.setAttribute('x2', String(200 + edge.target.x * 300));
        line.setAttribute('y2', String(72 + edge.target.y * 108));
        line.setAttribute('vector-effect', 'non-scaling-stroke');
        svg.append(line);
      }
      map.append(svg);
      for (const data of graph.nodes) {
        const button = noteButton(data);
        button.className = 'knowledge__node';
        button.style.left = `${20 + data.x * 30}%`;
        button.style.top = `${20 + data.y * 30}%`;
        map.append(button);
      }
      panel.append(map);
    } else if (view === 'kanban') {
      const columns = document.createElement('div');
      columns.className = 'knowledge__columns';
      for (const column of model.kanban()) {
        const section = document.createElement('section');
        section.dataset.column = column.status;
        const heading = document.createElement('h5');
        heading.textContent = words[column.status];
        section.append(heading);
        for (const data of column.notes) section.append(noteButton(data));
        if (!column.notes.length) {
          const empty = document.createElement('p');
          empty.textContent = words.empty;
          section.append(empty);
        }
        columns.append(section);
      }
      panel.append(columns);
    } else {
      const days = document.createElement('ol');
      days.className = 'knowledge__days';
      for (const day of model.timeline()) {
        const row = document.createElement('li');
        row.dataset.day = String(day.day);
        const label = document.createElement('span');
        label.textContent = `${words.day} ${day.day}`;
        const entries = document.createElement('div');
        for (const data of day.notes) entries.append(noteButton(data));
        if (!day.notes.length) {
          const empty = document.createElement('span');
          empty.textContent = '—';
          empty.setAttribute('aria-label', words.empty);
          entries.append(empty);
        }
        row.append(label, entries);
        days.append(row);
      }
      panel.append(days);
    }
    if (focused)
      panel
        .querySelector<HTMLButtonElement>(`button[data-note="${focused}"]`)
        ?.focus({ preventScroll: true });
    // Recaler le récit seulement si cette action change la hauteur de l'atelier.
    const height = root.offsetHeight;
    if (height !== layoutHeight) {
      layoutHeight = height;
      ScrollTrigger.refresh();
    }
  }
  onLocaleChange(render);
  root.append(
    intro,
    revision,
    views,
    panel,
    links,
    inspector,
    position,
    pad,
    moveHelp,
    status,
    reset,
    note
  );
  mount.replaceChildren(root);
  render();
}
