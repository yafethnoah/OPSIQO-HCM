export interface NavigationSearchItem { label: string; href: string; keywords?: string[]; priority: number }

const normalize = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ').trim();

export function scoreNavigationMatch(item: NavigationSearchItem, query: string): number {
  const q = normalize(query); if (!q) return 0;
  const label = normalize(item.label), href = normalize(item.href), keywords = (item.keywords || []).map(normalize);
  if (label === q) return 10000 + item.priority;
  if (label.startsWith(q)) return 7000 + item.priority;
  if (label.includes(q)) return 5000 + item.priority;
  if (keywords.some(word => word === q)) return 4500 + item.priority;
  if (keywords.some(word => word.includes(q) || q.includes(word))) return 3500 + item.priority;
  const terms = q.split(/\s+/).filter(Boolean);
  const haystack = [label, href, ...keywords].join(' ');
  const matched = terms.filter(term => haystack.includes(term)).length;
  return matched ? matched * 800 + Math.round((matched / terms.length) * 500) + item.priority : 0;
}

export function rankNavigationItems<T extends NavigationSearchItem>(items: T[], query: string): T[] {
  return items.map(item => ({ item, score: scoreNavigationMatch(item, query) })).filter(row => row.score > 0).sort((a, b) => b.score - a.score || b.item.priority - a.item.priority).map(row => row.item);
}
