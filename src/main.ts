import '@/style.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SmoothScroll } from '@/core/SmoothScroll';
import { ScrollChoreographer } from '@/core/ScrollChoreographer';
import { initHero } from '@/core/heroAnim';
import { initReveals } from '@/core/reveals';
import { initScrollScenes } from '@/core/scrollScenes';
import { ChapterManager } from '@/chapters/ChapterManager';
import { SignalField } from '@/visual/SignalField';
import { VisualDirector } from '@/visual/VisualDirector';
import { FPSCounter } from '@/utils/FPSCounter';
import { renderProjects, renderStudies } from '@/content/renderProjects';
import { initI18n, initLocaleToggle, t } from '@/i18n';
import { CommandPalette } from '@/ui/CommandPalette';
import { ControlPanel } from '@/ui/ControlPanel';
import { MagneticCursor } from '@/ui/MagneticCursor';
import { SectionRail } from '@/ui/SectionRail';
import { CONTACT_EMAIL } from '@/content/contact';
import { initGitHubProfile } from '@/integrations/githubProfile';

/**
 * Racine de composition. Ordre : contenu → i18n → smooth-scroll → décors →
 * reveals → UI → boucle maîtresse. Tout ce qui doit tourner par frame passe par
 * le ticker GSAP, jamais par un requestAnimationFrame séparé : une seule horloge
 * pour scroll, animations, chapitres et curseur = pas de désynchronisation ni
 * de jank en scroll rapide.
 */
function enableDeferredFonts(): void {
  const stylesheet = document.getElementById('font-stylesheet');
  if (stylesheet instanceof HTMLLinkElement) stylesheet.media = 'all';
}

function initContactForm(): void {
  const form = document.getElementById('contact-form');
  if (!(form instanceof HTMLFormElement)) return;

  const disclosure = form.closest('details');
  disclosure?.addEventListener('toggle', () => {
    // Le dépliage change la hauteur du document : les ancres restent exactes.
    gsap.delayedCall(0.05, () => ScrollTrigger.refresh());
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const message = String(data.get('message') ?? '').trim();
    const subject = encodeURIComponent(`Projet — ${name}`);
    const body = encodeURIComponent(
      `Nom : ${name}\nEmail : ${email}\n\n${message}`
    );

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  });
}

/** Adresse visible et copiable : le formulaire mailto ne suffit pas en webmail. */
function initContactEmail(): void {
  const link = document.querySelector<HTMLAnchorElement>(
    '[data-contact-email]'
  );
  const copy = document.querySelector<HTMLButtonElement>('[data-copy-email]');
  if (link) {
    link.href = `mailto:${CONTACT_EMAIL}`;
    link.textContent = CONTACT_EMAIL;
  }
  copy?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
    } catch {
      return;
    }
    copy.dataset.i18n = 'contact.copied';
    copy.textContent = t('contact.copied');
    window.setTimeout(() => {
      copy.dataset.i18n = 'contact.copy';
      copy.textContent = t('contact.copy');
    }, 1800);
  });
}

/**
 * Exécute `task` quand le navigateur est disponible (ou après 1,2 s au plus).
 * Ce n'est pas une boucle d'animation : l'horloge unique reste le ticker GSAP.
 */
function whenIdle(task: () => void): void {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(task, { timeout: 1200 });
  } else {
    setTimeout(task, 200);
  }
}

function boot(): void {
  enableDeferredFonts();

  // 1. Contenu injecté depuis la source unique (les chapitres projet).
  const projectsMount = document.getElementById('projects');
  if (projectsMount) renderProjects(projectsMount);
  const studiesMount = document.getElementById('studies-list');
  if (studiesMount) renderStudies(studiesMount);

  // 2. i18n : applique la langue courante à tout le DOM (statique + dynamique).
  initI18n();
  initContactForm();
  initContactEmail();
  const langBtn = document.getElementById('lang-toggle');
  if (langBtn) initLocaleToggle(langBtn);

  // Éléments secondaires montés après le premier rendu (voir `whenIdle`).
  let disposeGitHubProfile: () => void = () => {};
  let cursor: MagneticCursor | null = null;
  let rail: SectionRail | null = null;

  // 3. Scroll lissé (installe Lenis sur le ticker GSAP, sauf reduced-motion).
  const scroll = new SmoothScroll();

  // 3a. Diaporama intelligent : les chapitres s'aimantent quand le scroll se
  // pose à proximité — jamais pendant que l'utilisateur bouge.
  const choreographer = new ScrollChoreographer(scroll);

  // 3b. Animation inaugurale du héros (split-text + badges + CTAs).
  initHero(scroll);

  // 4. Signature du héros : champ topographique Canvas, calme et réactif.
  const canvas = document.getElementById(
    'signal-field'
  ) as HTMLCanvasElement | null;
  const field = canvas ? new SignalField(canvas) : null;
  const visual = new VisualDirector(field);
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean } }
  ).connection;
  const liteMode = Boolean(
    connection?.saveData ||
    (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4) ||
    window.innerWidth < 480
  );
  visual.setLiteMode(liteMode);
  document.documentElement.classList.toggle('lite-mode', liteMode);

  // 5. Chapitres projet : décors immersifs lazy, scrubés au scroll.
  const storyStage = document.getElementById('story-stage');
  const chapters = new ChapterManager(document, storyStage, () =>
    visual.getState()
  );

  // 6. Reveals + parallaxe du héros.
  initReveals();
  initScrollScenes();

  // 8. Panneau de réglages visuels (⚙) : fond, souris, chapitres.
  const controls = new ControlPanel({ hero: visual, chapters });
  const controlsBtn = document.getElementById('controls-open');
  if (controlsBtn) controls.attachTrigger(controlsBtn);

  // Le premier rendu n'attend ni la palette, ni le rail, ni le curseur, ni
  // l'appel GitHub : ils sont montés dès que le thread principal est libre.
  whenIdle(() => {
    // 2b. Intégration GitHub REST publique : activité et profil dans le contact.
    disposeGitHubProfile = initGitHubProfile();

    // 7. Command palette (Ctrl/⌘+K) + son déclencheur dans le HUD.
    const palette = new CommandPalette(scroll);
    const paletteBtn = document.getElementById('palette-open');
    if (paletteBtn) palette.attachTrigger(paletteBtn);

    // 9. Curseur comète (pointeur fin uniquement, jamais en reduced-motion).
    // Il lit l'état visuel partagé pour prendre l'accent de l'univers actif.
    cursor = MagneticCursor.isSupported()
      ? new MagneticCursor(() => visual.getState())
      : null;

    // 9b. Fil de progression vertical. Suit la section active via
    // ScrollTrigger, sans écouteur scroll propre.
    rail = new SectionRail(scroll);
  });

  // 10. Boucle maîtresse : tout le rendu par frame, sur le MÊME ticker que le scroll.
  const fpsEl = document.getElementById('fps');
  const fps = fpsEl ? new FPSCounter(fpsEl) : null;
  gsap.ticker.add(() => {
    const now = performance.now();
    visual.render(now);
    chapters.renderVisible(now);
    choreographer.update(now);
    cursor?.update();
    fps?.tick(now);
  });

  // Sortie propre pour un futur routeur/HMR.
  window.addEventListener('beforeunload', () => {
    scroll.destroy();
    choreographer.destroy();
    visual.destroy();
    chapters.destroy();
    cursor?.destroy();
    rail?.destroy();
    disposeGitHubProfile();
  });
}

// La classe .no-js est retirée dès que ce module s'exécute : les [data-reveal]
// ne sont masqués (donc animables) que si le JS a bien démarré. SEO/no-JS safe.
document.documentElement.classList.replace('no-js', 'js');
boot();
