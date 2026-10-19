// BlackPhage - petits outils communs : chargement des données, sélecteurs, échappement.
import { BASE } from './i18n.js';

const cache = new Map();
export function getJSON(path) {
  const url = BASE + path;
  if (!cache.has(url)) cache.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error(url); return r.json(); }));
  return cache.get(url);
}
export const loadSite = () => getJSON('assets/data/site.json');
export const loadPrograms = () => getJSON('assets/data/programs.json');

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function copyText(text, field) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    if (field) { field.focus(); field.select(); try { return document.execCommand('copy'); } catch { return false; } }
    return false;
  }
}

export const ARROW = '<svg class="arr" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M10.5 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
