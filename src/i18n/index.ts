import {
  DICTIONARIES,
  LOCALES,
  type Locale,
  type Localized,
} from '@/i18n/dictionary';
import { prefersReducedMotion } from '@/core/motion';

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
  const stored = safeStorageGet(STORAGE_KEY);
  if (stored === 'fr' || stored === 'en') return stored;
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'fr';
}

function safeStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // mode privé / stockage bloqué : on dégrade sans casser.
  }
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
  if (locale === current) return;
  current = locale;
  safeStorageSet(STORAGE_KEY, locale);
  document.documentElement.lang = locale;

  const commit = (): void => {
    applyI18n();
    subscribers.forEach((cb) => cb(locale));
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
 * Câble un bouton de bascule de langue : met à jour son libellé à chaque
 * changement et déclenche `toggleLocale` au clic.
 */
export function initLocaleToggle(button: HTMLElement): void {
  const sync = (): void => {
    button.textContent = t('lang.toggle');
    button.setAttribute('aria-label', t('lang.toggle.aria'));
  };
  button.addEventListener('click', () => toggleLocale());
  onLocaleChange(sync);
  sync();
}

/** Initialise la langue au boot : pose `lang` et applique le dictionnaire. */
export function initI18n(): void {
  document.documentElement.lang = current;
  applyI18n();
}

export { LOCALES };
export type { Locale, Localized };
