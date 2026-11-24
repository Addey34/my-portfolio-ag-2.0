import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SmoothScroll } from '@/core/SmoothScroll';
import { ScrollChoreographer } from '@/core/ScrollChoreographer';
import { initHero } from '@/core/heroAnim';
import { initReveals } from '@/core/reveals';
import { initScrollScenes } from '@/core/scrollScenes';
import { SectionTransitions } from '@/core/sectionTransitions';
import { VisualDirector } from '@/visual/VisualDirector';
import type { SceneLab } from '@/visual/SceneLab';
import { FPSCounter } from '@/utils/FPSCounter';
import {
  renderHeroProjects,
  renderProjects,
  renderStudies,
} from '@/content/renderProjects';
import { initI18n, initLocaleNavigation, initLocaleToggle, t } from '@/i18n';
import { CommandPalette } from '@/ui/CommandPalette';
import { ControlPanel } from '@/ui/ControlPanel';
import { SectionRail } from '@/ui/SectionRail';
import { initExhibitPlaque } from '@/ui/ExhibitPlaque';
import { CONTACT_EMAIL } from '@/content/contact';
import { initGitHubProfile } from '@/integrations/githubProfile';

/**
 * Racine de composition. Ordre : contenu → i18n → smooth-scroll → décors →
 * reveals → UI → boucle maîtresse. Tout ce qui doit tourner par frame passe par
 * le ticker GSAP, jamais par un requestAnimationFrame séparé : une seule horloge
 * pour scroll, animations et chapitres = pas de désynchronisation ni
 * de jank en scroll rapide.
 */
function initContactForm(): void {
  const form = document.getElementById('contact-form');
  if (!(form instanceof HTMLFormElement)) return;

  const fields = form.querySelector('fieldset');
  const nameInput = form.querySelector('#contact-name');
  const emailInput = form.querySelector('#contact-email');
  const messageInput = form.querySelector('#contact-message');
  if (
    !(fields instanceof HTMLFieldSetElement) ||
    !(nameInput instanceof HTMLInputElement) ||
    !(emailInput instanceof HTMLInputElement) ||
    !(messageInput instanceof HTMLTextAreaElement)
  )
    return;

  // Nature de la demande : simple libellé de l'objet du mail, sans donnée envoyée.
  type Intent = 'mission' | 'role' | 'other';
  let intent: Intent | null = null;
  const intentButtons = Array.from(
    form.querySelectorAll<HTMLButtonElement>('[data-intent]')
  );
  const selectIntent = (next: Intent | null): void => {
    intent = next;
    intentButtons.forEach((button) =>
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.intent === next)
      )
    );
  };
  intentButtons.forEach((button) =>
    button.addEventListener('click', () => {
      const value = button.dataset.intent as Intent;
      selectIntent(intent === value ? null : value);
    })
  );
  // Les appels à l'action des solutions préparent le formulaire avant le défilement.
  document
    .querySelectorAll<HTMLAnchorElement>('[data-contact-intent]')
    .forEach((link) =>
      link.addEventListener('click', () => {
        selectIntent(link.dataset.contactIntent as Intent);
        const disclosure = form.closest('details');
        if (disclosure) disclosure.open = true;
      })
    );

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const message = messageInput.value.trim();
    if (!name || !message) {
      (name ? messageInput : nameInput).focus();
      return;
    }
    const subject = encodeURIComponent(
      `${t(intent ? `contact.subject.${intent}` : 'contact.subject')} — ${name}`
    );
    const body = encodeURIComponent(
      `${t('contact.form.name')} : ${name}\nEmail : ${email}\n\n${message}`
    );

    const link = document.createElement('a');
    link.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    link.click();
  });
  fields.disabled = false;
}

function initDisclosureRefresh(): void {
  document.querySelectorAll('details').forEach((details) => {
    details.addEventListener('toggle', () => {
      gsap.delayedCall(0.05, () => ScrollTrigger.refresh());
    });
  });
}

/** Adresse visible et copiable : le formulaire mailto ne suffit pas en webmail. */
function initContactEmail(): void {
  const link = document.querySelector<HTMLAnchorElement>(
    '[data-contact-email]'
  );
  const copy = document.querySelector<HTMLButtonElement>('[data-copy-email]');
  const primary = document.querySelector<HTMLAnchorElement>(
    '[data-contact-primary]'
  );
  if (primary) primary.href = `mailto:${CONTACT_EMAIL}`;
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

/**
 * Écran d'attente : retiré quand la scène 3D est entièrement installée (événement `world-settled`),
 * ou sur demande, après 12 s au plus tard, ou si la 3D est indisponible.
 */
function initBootLoader(hasWorld: boolean): () => void {
  const loader = document.getElementById('boot-loader');
  if (!loader) return () => {};
  const skip = loader.querySelector<HTMLButtonElement>('[data-boot-skip]');
  const focusContent = () =>
    document.querySelector<HTMLAnchorElement>('.hero__cta--primary')?.focus();
  const dismiss = (): void => {
    if (loader.classList.contains('is-done')) return;
    const restoreFocus = loader.contains(document.activeElement);
    loader.classList.add('is-done');
    if (skip) skip.disabled = true;
    if (restoreFocus) focusContent();
    loader.setAttribute('aria-hidden', 'true');
    window.setTimeout(() => loader.remove(), 700);
  };
  // L'accès au HTML ne supprime ni la préparation 3D, ni sa fermeture automatique.
  if (skip) {
    skip.disabled = false;
    skip.addEventListener(
      'click',
      () => {
        dismiss();
        focusContent();
      },
      { once: true }
    );
  }
  if (!hasWorld) {
    dismiss();
    return dismiss;
  }
  // On attend la fin du chargement de fond (objets analysés, shaders et pièces
  // amorcés) : c'est lui qui faisait saccader les premières secondes de défilement.
  const earlyBootExperiment =
    (import.meta.env.DEV || import.meta.env.MODE === 'startup-experiment') &&
    new URLSearchParams(window.location.search).has('early-boot');
  window.addEventListener(
    earlyBootExperiment ? 'world-ready' : 'world-settled',
    dismiss,
    { once: true }
  );
  window.setTimeout(dismiss, 12000);
  return dismiss;
}

function createFpsProbe(): FPSCounter {
  const el = document.createElement('div');
  el.className = 'fps';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  return new FPSCounter(el);
}

function boot(): void {
  // 1. Contenu injecté depuis la source unique (les chapitres projet).
  const projectsMount = document.getElementById('projects');
  if (projectsMount) {
    const content = document.createElement('div');
    renderProjects(content);
    projectsMount.replaceChildren(...content.childNodes);
  }
  const heroProjectsMount = document.getElementById('hero-projects');
  if (heroProjectsMount) renderHeroProjects(heroProjectsMount);
  const studiesMount = document.getElementById('studies-list');
  if (studiesMount) {
    const content = document.createElement('div');
    renderStudies(content);
    studiesMount.replaceChildren(...content.childNodes);
  }

  // 2. i18n : applique la langue courante à tout le DOM (statique + dynamique).
  initI18n();
  initDisclosureRefresh();
  initContactForm();
  initContactEmail();
  const langBtn = document.getElementById('lang-toggle');
  if (langBtn) initLocaleToggle(langBtn);

  // Éléments secondaires montés après le premier rendu (voir `whenIdle`).
  let disposeGitHubProfile: () => void = () => {};
  let rail: SectionRail | null = null;

  // 3. Scroll lissé (installe Lenis sur le ticker GSAP, sauf reduced-motion).
  const scroll = new SmoothScroll();
  initLocaleNavigation(({ id, fraction }) => {
    ScrollTrigger.refresh();
    const section = document.getElementById(id);
    if (!section) return;
    const position =
      window.scrollY +
      section.getBoundingClientRect().top +
      fraction * section.offsetHeight;
    scroll.scrollTo(position, 0, { immediate: true });
    ScrollTrigger.update();
  });

  // 3a. Diaporama intelligent : les chapitres s'aimantent quand le scroll se
  // pose à proximité — jamais pendant que l'utilisateur bouge.
  const choreographer = new ScrollChoreographer(scroll);

  // 3b. Animation inaugurale du héros (split-text + badges + CTAs).
  initHero(scroll);

  // 4. Monde 3D continu, piloté par l'état visuel du récit.
  const canvas = document.getElementById(
    'world-3d'
  ) as HTMLCanvasElement | null;
  const visual = new VisualDirector();
  // Sur petit écran, les dossiers opaques passent devant le décor pendant la lecture.
  const storyRoot = document.getElementById('scroll-root');
  const stopStudyComposition = visual.onSceneChange((scene) => {
    storyRoot?.classList.toggle('is-reading-studies', scene === 'studies');
  });
  const stopPlaque = initExhibitPlaque(visual);
  let sceneLab: SceneLab | null = null;
  if (
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).has('scene-lab')
  ) {
    void import('@/visual/SceneLab').then(({ SceneLab }) => {
      sceneLab = new SceneLab(scroll, visual);
    });
  }
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

  // Le contenu, les ancres et les contrôles démarrent avant le téléchargement
  // de Three.js. Le monde rejoint ensuite l'état visuel courant, même si le
  // visiteur a déjà navigué ou modifié ses préférences.
  const dismissLoader = initBootLoader(Boolean(canvas));
  if (canvas) {
    const loadWorld = () => {
      void import('@/visual/StoryWorld3D')
        .then(({ StoryWorld3D }) => {
          visual.attachField(new StoryWorld3D(canvas));
          // Un contexte indisponible masque le canvas sans lever d'erreur.
          if (canvas.hidden) dismissLoader();
        })
        .catch(() => {
          // Une erreur de chargement laisse le récit HTML utilisable.
          canvas.hidden = true;
          dismissLoader();
        });
    };
    const scheduleWorld = () => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(loadWorld, { timeout: 2500 });
      } else {
        setTimeout(loadWorld, 250);
      }
    };
    if (document.readyState === 'complete') scheduleWorld();
    else window.addEventListener('load', scheduleWorld, { once: true });
  }

  // 6. Reveals + parallaxe du héros.
  initReveals();
  initScrollScenes();
  const transitions = new SectionTransitions();

  // 8. Panneau de réglages visuels (⚙) : fond, souris, chapitres.
  const controls = new ControlPanel({
    hero: visual,
    chapters: visual,
    transitions,
  });
  const controlsBtn = document.getElementById('controls-open');
  if (controlsBtn) controls.attachTrigger(controlsBtn);

  // Les chapitres sont injectés par JS : le navigateur peut manquer leur ancre initiale.
  const restoreInitialAnchor = () => {
    const target = document.getElementById(window.location.hash.slice(1));
    if (!target) return;
    gsap.delayedCall(0, () => {
      ScrollTrigger.refresh();
      scroll.scrollTo(target, 0, { immediate: true });
      ScrollTrigger.update();
    });
  };
  if (document.readyState === 'complete') restoreInitialAnchor();
  else window.addEventListener('load', restoreInitialAnchor, { once: true });

  // Le premier rendu n'attend ni la palette, ni le rail, ni
  // l'appel GitHub : ils sont montés dès que le thread principal est libre.
  whenIdle(() => {
    // 2b. Intégration GitHub REST publique : activité et profil dans le contact.
    disposeGitHubProfile = initGitHubProfile();

    // 7. Command palette (Ctrl/⌘+K) + son déclencheur dans le HUD.
    const palette = new CommandPalette(scroll);
    const paletteBtn = document.getElementById('palette-open');
    if (paletteBtn) palette.attachTrigger(paletteBtn);

    // 9. Fil de progression vertical. Suit la section active via
    // ScrollTrigger, sans écouteur scroll propre.
    rail = new SectionRail(scroll, visual);
  });

  // 10. Boucle maîtresse : tout le rendu par frame, sur le MÊME ticker que le scroll.
  // La sonde FPS n'existe que pour le développeur : ajouter ?fps à l'URL.
  const fps = new URLSearchParams(window.location.search).has('fps')
    ? createFpsProbe()
    : null;
  gsap.ticker.add(() => {
    const now = performance.now();
    visual.render(now);
    sceneLab?.update(now);
    choreographer.update(now);
    fps?.tick(now);
  });

  // Sortie propre pour un futur routeur/HMR.
  window.addEventListener('beforeunload', () => {
    scroll.destroy();
    transitions.destroy();
    choreographer.destroy();
    stopStudyComposition();
    stopPlaque();
    visual.destroy();
    sceneLab?.destroy();
    rail?.destroy();
    disposeGitHubProfile();
  });
}

// En cas d'échec synchrone au démarrage, restaurer le contenu statique complet.
const staticMarkup = document.body.innerHTML;
try {
  if (
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).has('compact-mobile')
  ) {
    document.documentElement.classList.add('compact-mobile');
  }
  document.documentElement.classList.replace('no-js', 'js');
  boot();
} catch (error) {
  document.body.innerHTML = staticMarkup;
  document.documentElement.classList.remove('compact-mobile');
  document.documentElement.classList.replace('js', 'no-js');
  console.error('Échec du démarrage du portfolio :', error);
}
