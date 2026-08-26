import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import {
  inferRouteSurface,
  routeLocalizationOwnership,
} from '@/lib/opsiqo-one/legacy-surface-i18n';
import {
  normalizeRuntimeLocale,
  runtimeLocaleDirection,
} from '@/lib/opsiqo-one/runtime-locale';

const read=(p:string)=>fs.readFileSync(p,'utf8');

describe('OPSIQO V7.32 H28 locale authority closure',()=>{
  it('normalizes supported locales and direction deterministically',()=>{
    expect(normalizeRuntimeLocale('ar-SA')).toBe('ar');
    expect(normalizeRuntimeLocale('fr-CA')).toBe('fr');
    expect(normalizeRuntimeLocale('es-MX')).toBe('es');
    expect(normalizeRuntimeLocale('unknown')).toBe('en');
    expect(runtimeLocaleDirection('ar')).toBe('rtl');
    expect(runtimeLocaleDirection('en')).toBe('ltr');
  });

  it('provides deterministic localization ownership for live-UAT pages',()=>{
    for(const route of [
      '/grant-workforce',
      '/safety',
      '/settings',
      '/translation-readiness',
      '/identity',
      '/org-design',
      '/organizational-memory',
    ]){
      expect(routeLocalizationOwnership(route).kind,route).not.toBe('none');
    }

    expect(routeLocalizationOwnership('/grant-workforce')).toMatchObject({
      kind:'reviewed-surface',
      surfaceId:'grant-workforce',
    });

    expect(routeLocalizationOwnership('/translation-readiness')).toEqual({
      kind:'native-react',
      surfaceId:null,
    });

    expect(inferRouteSurface('/translation-readiness')).toBeNull();
  });

  it('protects the entire React-owned navigation from global DOM translation',()=>{
    const nav=read('src/components/nav.tsx');
    expect(nav).toContain('data-opsiqo-shell-i18n="true" aria-label={shellText(\'Application navigation\'');
  });

  it('keeps one locale authority in application source',()=>{
    const files=[
      'src/components/language-bootstrap.tsx',
      'src/components/settings-workspace.tsx',
      'src/components/superapp-workspace.tsx',
    ];
    for(const file of files)expect(read(file),file).not.toMatch(/\bapplyRuntimeLocale\s*\(/);
    expect(read('src/lib/opsiqo-one/runtime-locale.ts')).toContain('export function applyRuntimeLocale(');
  });

  it('removes the duplicate network language bootstrap from RootLayout',()=>{
    const layout=read('src/app/layout.tsx');
    expect(layout).not.toContain('LanguageBootstrap');
    expect(layout).toContain('RuntimeLocaleBootstrap');
    expect(layout).toContain('suppressHydrationWarning');
  });

  it('makes route-local reviewed translations outrank global reuse',()=>{
    const legacy=read('src/lib/opsiqo-one/legacy-surface-i18n.ts');
    expect(legacy).toContain('applyRouteSurfaceTranslation');
    expect(legacy).toContain("parent?.closest('[data-opsiqo-route-surface]')");
    expect(legacy).toContain("parent.closest('[data-opsiqo-legacy-surface]')");
  });
});
