const GITHUB_API = 'https://api.github.com';
const USERNAME = 'Addey34';
const CACHE_KEY = 'portfolio:github-profile:v1';
const CACHE_TTL_MS = 30 * 60 * 1000;

interface GitHubUser {
  public_repos: number;
  followers: number;
  html_url: string;
}

interface GitHubRepo {
  name: string;
  html_url: string;
  pushed_at: string | null;
  fork: boolean;
  archived: boolean;
}

interface GitHubSnapshot {
  publicRepos: number;
  followers: number;
  profileUrl: string;
  latestRepo: {
    name: string;
    url: string;
    pushedAt: string | null;
  } | null;
  cachedAt: number;
}

function getCachedSnapshot(): GitHubSnapshot | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as GitHubSnapshot;
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function cacheSnapshot(snapshot: GitHubSnapshot): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage can be unavailable in strict/private browsing modes.
  }
}

async function githubFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    signal,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function fetchSnapshot(signal?: AbortSignal): Promise<GitHubSnapshot> {
  const [user, repos] = await Promise.all([
    githubFetch<GitHubUser>(`/users/${USERNAME}`, signal),
    githubFetch<GitHubRepo[]>(
      `/users/${USERNAME}/repos?type=owner&sort=pushed&direction=desc&per_page=30`,
      signal
    ),
  ]);

  const latest = repos.find((repo) => !repo.fork && !repo.archived) ?? null;

  return {
    publicRepos: user.public_repos,
    followers: user.followers,
    profileUrl: user.html_url,
    latestRepo: latest
      ? {
          name: latest.name,
          url: latest.html_url,
          pushedAt: latest.pushed_at,
        }
      : null,
    cachedAt: Date.now(),
  };
}

function formatDate(value: string | null): string | null {
  if (!value) return null;

  const locale = document.documentElement.lang === 'fr' ? 'fr-FR' : 'en-GB';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function renderSnapshot(root: HTMLElement, snapshot: GitHubSnapshot): void {
  const summary = root.querySelector<HTMLElement>('[data-github-summary]');
  const latest = root.querySelector<HTMLAnchorElement>('[data-github-latest]');

  if (summary) {
    const repoLabel = snapshot.publicRepos > 1 ? 'repos' : 'repo';
    const followerLabel = snapshot.followers > 1 ? 'followers' : 'follower';
    summary.textContent =
      `${snapshot.publicRepos} public ${repoLabel} · ${snapshot.followers} ${followerLabel}`;
  }

  if (latest && snapshot.latestRepo) {
    const date = formatDate(snapshot.latestRepo.pushedAt);
    latest.href = snapshot.latestRepo.url;
    latest.textContent = date
      ? `Latest activity: ${snapshot.latestRepo.name} · ${date}`
      : `Latest activity: ${snapshot.latestRepo.name}`;
    latest.hidden = false;
  }

  root.dataset.githubState = 'ready';
}

export function initGitHubProfile(): () => void {
  const root = document.querySelector<HTMLElement>('[data-github-profile]');
  if (!root) return () => undefined;

  const cached = getCachedSnapshot();
  if (cached) {
    renderSnapshot(root, cached);
    return () => undefined;
  }

  const controller = new AbortController();

  fetchSnapshot(controller.signal)
    .then((snapshot) => {
      cacheSnapshot(snapshot);
      renderSnapshot(root, snapshot);
    })
    .catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      root.dataset.githubState = 'fallback';
    });

  return () => controller.abort();
}
