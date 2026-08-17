'use client';
export type AppearanceTheme='system'|'light'|'dark';
export type AppearanceDensity='comfortable'|'compact';
export type AppearanceFontScale='normal'|'large';
export type AppearancePreferences={theme:AppearanceTheme;density:AppearanceDensity;fontScale:AppearanceFontScale;reducedMotion:boolean};
export const APPEARANCE_STORAGE_KEY='opsiqo.appearance.v1';
export const DEFAULT_APPEARANCE:AppearancePreferences={theme:'system',density:'comfortable',fontScale:'normal',reducedMotion:false};
export function readAppearance():AppearancePreferences{if(typeof window==='undefined')return DEFAULT_APPEARANCE;try{const raw=window.localStorage.getItem(APPEARANCE_STORAGE_KEY);if(!raw)return DEFAULT_APPEARANCE;const p=JSON.parse(raw) as Partial<AppearancePreferences>;return{theme:p.theme==='light'||p.theme==='dark'||p.theme==='system'?p.theme:'system',density:p.density==='compact'||p.density==='comfortable'?p.density:'comfortable',fontScale:p.fontScale==='large'?'large':'normal',reducedMotion:p.reducedMotion===true}}catch{return DEFAULT_APPEARANCE}}
export function resolvedTheme(theme:AppearanceTheme){if(theme!=='system')return theme;if(typeof window==='undefined'||!window.matchMedia)return'dark';return window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}
export function applyAppearance(p:AppearancePreferences){if(typeof document==='undefined')return;const r=document.documentElement;r.dataset.theme=resolvedTheme(p.theme);r.dataset.themePreference=p.theme;r.dataset.density=p.density;r.dataset.fontScale=p.fontScale;r.dataset.reducedMotion=p.reducedMotion?'true':'false'}
export function saveAppearance(p:AppearancePreferences){if(typeof window==='undefined')return;window.localStorage.setItem(APPEARANCE_STORAGE_KEY,JSON.stringify(p));applyAppearance(p);window.dispatchEvent(new CustomEvent('opsiqo:appearance-changed',{detail:p}))}
