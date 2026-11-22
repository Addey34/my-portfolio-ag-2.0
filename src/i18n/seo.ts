import type { Locale } from './dictionary';

export const ORIGIN = 'https://www.adrianguichard.dev';
export const LANGUAGE_PATHS: Record<Locale, string> = { fr: '/', en: '/en/' };
export const SEO: Record<
  Locale,
  {
    title: string;
    description: string;
    socialDescription: string;
    ogLocale: string;
    imageAlt: string;
    jobTitle: string;
  }
> = {
  fr: {
    title: 'Adrian Guichard — Développeur full-stack TypeScript',
    description:
      'Développeur full-stack TypeScript : produits web complets, de l’interface au déploiement, 3D et expériences interactives. Galaxy, Ludora, MagNotes.',
    socialDescription:
      'Je conçois des produits web complets, de l’interface aux données, au temps réel et au déploiement. Galaxy, Ludora, MagNotes.',
    ogLocale: 'fr_FR',
    imageAlt:
      'Adrian Guichard, développeur full-stack TypeScript : pendentif AG sous une lampe, thème titane et laiton.',
    jobTitle: 'Développeur full-stack TypeScript',
  },
  en: {
    title: 'Adrian Guichard — Full-stack TypeScript developer',
    description:
      'Full-stack TypeScript developer building complete web products, from interface to deployment, 3D and interactive experiences. Galaxy, Ludora, MagNotes.',
    socialDescription:
      'I design complete web products, from interfaces to data, real-time systems and deployment. Galaxy, Ludora, MagNotes.',
    ogLocale: 'en_US',
    imageAlt:
      'Adrian Guichard, full-stack TypeScript developer: AG pendant beneath a lamp, in titanium and brass.',
    jobTitle: 'Full-stack TypeScript developer',
  },
};

export function localeFromPath(path: string): Locale {
  return path === '/en' || path === '/en/' || path === '/en/index.html'
    ? 'en'
    : 'fr';
}

/** Même identité dans les deux représentations du portfolio. */
export function personData(locale: Locale): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${ORIGIN}/#person`,
    url: `${ORIGIN}/`,
    name: 'Adrian Guichard',
    jobTitle: SEO[locale].jobTitle,
    sameAs: [
      'https://github.com/Addey34',
      'https://www.linkedin.com/in/adrianguichard/',
    ],
    knowsAbout: [
      'TypeScript',
      'WebGL',
      'full-stack development',
      'real-time systems',
      'product engineering',
    ],
  };
}

export function seoMeta(locale: Locale): Record<string, string> {
  const content = SEO[locale];
  return {
    description: content.description,
    'og:title': content.title,
    'og:description': content.socialDescription,
    'og:url': ORIGIN + LANGUAGE_PATHS[locale],
    'og:locale': content.ogLocale,
    'og:locale:alternate': SEO[locale === 'fr' ? 'en' : 'fr'].ogLocale,
    'og:image:alt': content.imageAlt,
    'twitter:title': content.title,
    'twitter:description': content.socialDescription,
    'twitter:image:alt': content.imageAlt,
  };
}

export function syncSeo(locale: Locale): void {
  document.title = SEO[locale].title;
  document.documentElement.lang = locale;
  for (const [key, value] of Object.entries(seoMeta(locale))) {
    document
      .querySelector<HTMLMetaElement>(
        `meta[name="${key}"], meta[property="${key}"]`
      )
      ?.setAttribute('content', value);
  }
  document
    .querySelector('link[rel="canonical"]')
    ?.setAttribute('href', ORIGIN + LANGUAGE_PATHS[locale]);
  const person = document.querySelector('script[type="application/ld+json"]');
  if (person) person.textContent = JSON.stringify(personData(locale));
}
