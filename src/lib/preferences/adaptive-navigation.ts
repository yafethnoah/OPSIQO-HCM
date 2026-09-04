'use client';

export interface AdaptiveNavigationState {
  version: 1;
  visits: Record<string, number>;
  recent: string[];
  pinned: string[];
}

const KEY = 'opsiqo.adaptiveNavigation.v1';
const EMPTY: AdaptiveNavigationState = { version: 1, visits: {}, recent: [], pinned: [] };

export function readAdaptiveNavigation(): AdaptiveNavigationState {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) || 'null') as Partial<AdaptiveNavigationState> | null;
    if (!raw || raw.version !== 1) return EMPTY;
    return { version: 1, visits: raw.visits || {}, recent: Array.isArray(raw.recent) ? raw.recent.slice(0, 12) : [], pinned: Array.isArray(raw.pinned) ? raw.pinned.slice(0, 8) : [] };
  } catch { return EMPTY; }
}

function write(state: AdaptiveNavigationState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('opsiqo:adaptive-navigation-changed'));
}

export function recordNavigationVisit(href: string) {
  if (!href.startsWith('/')) return;
  const current = readAdaptiveNavigation();
  const next: AdaptiveNavigationState = {
    version: 1,
    visits: { ...current.visits, [href]: Math.min(9999, Number(current.visits[href] || 0) + 1) },
    recent: [href, ...current.recent.filter(value => value !== href)].slice(0, 12),
    pinned: current.pinned,
  };
  write(next);
}

export function toggleNavigationPin(href: string) {
  const current = readAdaptiveNavigation();
  const pinned = current.pinned.includes(href)
    ? current.pinned.filter(value => value !== href)
    : [...current.pinned, href].slice(0, 8);
  write({ ...current, pinned });
}

export function suggestedNavigationHrefs(allowed: Set<string>, limit = 5): string[] {
  const state = readAdaptiveNavigation();
  const scored = [...allowed].map(href => ({
    href,
    score: (state.pinned.includes(href) ? 10000 : 0) + Number(state.visits[href] || 0) * 10 + Math.max(0, 20 - state.recent.indexOf(href)),
  }));
  return scored.filter(row => row.score > 0).sort((a, b) => b.score - a.score || a.href.localeCompare(b.href)).slice(0, limit).map(row => row.href);
}
