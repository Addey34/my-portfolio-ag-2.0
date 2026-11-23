import {
  DICTIONARIES,
  LOCALES,
  type Locale,
  type Localized,
} from '@/i18n/dictionary';
import { prefersReducedMotion } from '@/core/motion';
import { LANGUAGE_PATHS, localeFromPath, syncSeo } from './seo';

/**
 * Runtime i18n — sans dépendance, sans framework.
 *
 * Deux familles de textes :
 *  - UI statique : nœuds `[data-i18n="clé"]` → recopiés par `applyI18n`.
 *  - Contenu dynamique (taglines projet) : enregistré via `registerDynamic`,
 *    ré-évalué à chaque changement de langue.
 *
 * Le switch de langue passe par `document.startViewTransition` quand il est
 * disponible : le texte se cross-fade proprement au lieu de « sauter ».
 */
const STORAGE_KEY = 'ag-locale';

type DynamicNode = { el: HTMLElement; get: () => string };

const dynamicNodes: DynamicNode[] = [];
const subscribers = new Set<(locale: Locale) => void>();

let current: Locale = detectLocale();

function detectLocale(): Locale {
  return localeFromPath(window.location.pathname);
}

function safeStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function getLocale(): Locale {
  return current;
}

/** Traduction d'une clé d'UI (fallback = la clé elle-même, visible en dev). */
export function t(key: string): string {
  return DICTIONARIES[current][key] ?? key;
}

/** Résout une valeur de contenu déclinée par langue. */
export function tl(value: Localized): string {
  return value[current];
}

/** Enregistre un nœud dont le texte dépend de la langue (ex. tagline projet). */
export function registerDynamic(el: HTMLElement, get: () => string): void {
  dynamicNodes.push({ el, get });
  el.textContent = get();
}

/** Purge le registre dynamique (avant un re-render complet du contenu). */
export function clearDynamic(): void {
  dynamicNodes.length = 0;
}

/** S'abonner aux changements de langue (ex. re-render d'un composant). */
export function onLocaleChange(cb: (locale: Locale) => void): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

/** Applique la langue courante à tout le DOM statique + dynamique. */
export function applyI18n(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    const key = el.dataset.i18nAria;
    if (key) el.setAttribute('aria-label', t(key));
  });
  dynamicNodes.forEach(({ el, get }) => (el.textContent = get()));
}

/** Change la langue, persiste, et notifie tout le monde (avec View Transition). */
export function setLocale(locale: Locale): void {
  if (localeFromPath(location.pathname) !== locale) {
    const position = capturePosition();
    history.replaceState(
      { ...history.state, agPosition: position },
      '',
      location.href
    );
    history.pushState(
      { ...history.state, agPosition: position },
      '',
      LANGUAGE_PATHS[locale] + location.search + location.hash
    );
  }
  applyLocale(locale);
}

type StoryPosition = { id: string; fraction: number };
let restorePosition: ((position: StoryPosition) => void) | undefined;

function capturePosition(): StoryPosition {
  const sections = [
    ...document.querySelectorAll<HTMLElement>(
      'main section[id], #projects article[id]'
    ),
  ];
  const section =
    sections
      .reverse()
      .find((item) => item.getBoundingClientRect().top <= innerHeight * 0.25) ??
    document.getElementById('top');
  return {
    id: section?.id ?? 'top',
    fraction: section
      ? -section.getBoundingClientRect().top / Math.max(1, section.offsetHeight)
      : 0,
  };
}

function applyLocale(locale: Locale, position = capturePosition()): void {
  if (locale === current) return;
  current = locale;
  safeStorageSet(STORAGE_KEY, locale);
  document.documentElement.lang = locale;

  const commit = (): void => {
    // Une bascule plus récente peut précéder le callback d'une View Transition.
    if (locale !== current) return;
    applyI18n();
    syncSeo(locale);
    syncLanguageLink();
    subscribers.forEach((cb) => cb(locale));
    restorePosition?.(position);
  };

  const vt = document as Document & {
    startViewTransition?: (cb: () => void) => void;
  };
  if (!prefersReducedMotion() && typeof vt.startViewTransition === 'function') {
    vt.startViewTransition(commit);
  } else {
    commit();
  }
}

/** Bascule FR ↔ EN. */
export function toggleLocale(): void {
  setLocale(current === 'fr' ? 'en' : 'fr');
}

/**
 * Câble le lien de bascule de langue : met à jour son libellé à chaque
 * changement et déclenche `toggleLocale` au clic.
 */
export function initLocaleToggle(button: HTMLElement): void {
  button.addEventListener('click', (event) => {
    // Le rail utilise replaceState, qui ne déclenche pas hashchange.
    syncLanguageLink();
    if (
      !(event instanceof MouseEvent) ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      (button.hasAttribute('target') &&
        button.getAttribute('target') !== '_self') ||
      button.hasAttribute('download')
    )
      return;
    event.preventDefault();
    toggleLocale();
  });
  syncLanguageLink();
}

function syncLanguageLink(): void {
  const link = document.getElementById('lang-toggle');
  if (!link) return;
  const other = current === 'fr' ? 'en' : 'fr';
  link.textContent = t('lang.toggle');
  link.setAttribute('aria-label', t('lang.toggle.aria'));
  link.setAttribute(
    'href',
    LANGUAGE_PATHS[other] + location.search + location.hash
  );
  link.setAttribute('hreflang', other);
  link.setAttribute('lang', other);
}

/** Synchronise immédiatement l'adresse partageable, sans entrée d'historique supplémentaire. */
export function replaceStoryHash(hash: string): void {
  history.replaceState(history.state, '', hash);
  syncLanguageLink();
}

/** Seul raccord au défilement ; aucun nouveau montage du monde ou de ses abonnés. */
export function initLocaleNavigation(
  restore: (position: StoryPosition) => void
): void {
  restorePosition = restore;
  window.addEventListener('popstate', (event) => {
    const position: unknown = event.state?.agPosition;
    const valid =
      typeof position === 'object' &&
      position !== null &&
      'id' in position &&
      typeof position.id === 'string' &&
      'fraction' in position &&
      typeof position.fraction === 'number';
    applyLocale(
      detectLocale(),
      valid ? (position as StoryPosition) : capturePosition()
    );
    syncLanguageLink();
  });
  window.addEventListener('hashchange', syncLanguageLink);
}

/** Initialise la langue au boot : pose `lang` et applique le dictionnaire. */
export function initI18n(): void {
  document.documentElement.lang = current;
  applyI18n();
  syncSeo(current);
}

export { LOCALES };
export type { Locale, Localized };
