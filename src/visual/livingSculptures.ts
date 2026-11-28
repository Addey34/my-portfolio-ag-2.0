import type { VisualDirector } from './VisualDirector';
import type { SculptureProjection } from './sculptureProjection';
import { activeSculpture } from './sculptureProjection';
import { getLocale, onLocaleChange } from '@/i18n';

/** La racine relie les disclosures au directeur ; la visibilité vient d'IntersectionObserver. */
export function bindLivingSculptures(director: VisualDirector): () => void {
  const entries = [
    ['galaxy', 'galaxy-observatory'],
    ['ludora', 'ludora-sync-lab'],
    ['magnotes', 'magnotes-knowledge-lab'],
  ] as const;
  const projections = new Map<string, SculptureProjection>();
  const visible = new Set<Element>();
  const caption = document.createElement('p');
  caption.className = 'living-caption';
  caption.setAttribute('aria-hidden', 'true');
  document.body.append(caption);
  let active: SculptureProjection | undefined;
  const refresh = () => {
    const scene = director.getState().scene;
    const entry = entries.find(
      ([id, key]) =>
        id === scene &&
        visible.has(document.getElementById(key)!) &&
        (document.getElementById(key) as HTMLDetailsElement).open
    );
    active = activeSculpture(
      scene,
      entry ? projections.get(entry[0]) : undefined,
      Boolean(entry),
      Boolean(entry)
    );
    director.setSculpture(active);
    if (active) document.body.dataset.living = active.scene;
    else delete document.body.dataset.living;
    caption.textContent = active
      ? getLocale() === 'fr'
        ? 'Sculpture liée à votre instrument · interprétation'
        : 'Sculpture linked to your instrument · interpretation'
      : '';
  };
  const receive = (event: Event) => {
    const projection = (event as CustomEvent<SculptureProjection>).detail;
    const entry = entries.find(([scene]) => scene === projection.scene);
    // Seul le panneau attendu peut publier son état ; un panneau fermé ne s'active jamais.
    if (
      !entry ||
      !(event.target instanceof Element) ||
      !document.getElementById(entry[1])?.contains(event.target)
    )
      return;
    projections.set(projection.scene, projection);
    refresh();
  };
  const observer = new IntersectionObserver(
    (changes) => {
      for (const change of changes) {
        if (change.isIntersecting) visible.add(change.target);
        else visible.delete(change.target);
      }
      refresh();
    },
    { rootMargin: '-65px 0px -80px 0px' }
  );
  for (const [, id] of entries) {
    const details = document.getElementById(id)!;
    observer.observe(details);
    details.addEventListener('toggle', refresh);
  }
  document.addEventListener('sculpture-projection', receive);
  const stopScene = director.onSceneChange(refresh);
  const stopLocale = onLocaleChange(refresh);
  return () => {
    observer.disconnect();
    stopScene();
    stopLocale();
    document.removeEventListener('sculpture-projection', receive);
    for (const [, id] of entries)
      document.getElementById(id)?.removeEventListener('toggle', refresh);
    director.setSculpture(undefined);
    delete document.body.dataset.living;
    caption.remove();
  };
}
