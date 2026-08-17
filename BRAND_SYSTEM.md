# OPSIQO HCM Brand System — v3.6.1

## Approved source identity
The production UI uses the user-supplied OPSIQO wordmark composition and glowing Q icon as its source identity. Runtime derivatives are limited to crop/resize/format operations required for web and app-icon surfaces; the core logo geometry and visual identity are preserved.

## Runtime assets
- `public/brand/opsiqo-wordmark.png` — primary navigation/authentication wordmark.
- `public/brand/opsiqo-logo.png` — composition-derived brand artwork for large surfaces.
- `public/brand/opsiqo-icon.png` — Q icon for compact product surfaces.
- `src/app/icon.png` — Next.js app icon.
- `src/app/apple-icon.png` — Apple touch icon.
- `src/app/favicon.ico` — multi-size browser favicon.

## Palette
- Jet Black: `#05070B`
- Deep Navy: `#07111D` / `#0A1120`
- Steel/Silver text: `#C7CDD6`
- Electric Blue: `#1E5BFF`
- Cyan Glow: `#00E5FF`
- Success: `#45D48A`
- Warning: `#F0AE4D`
- Critical: `#FF6B70`

The UI uses dark navy/black surfaces, steel-white primary text, cyan/electric-blue focus and active states, restrained glow, and red/amber only for risk states.

## Interface principles
1. **Evidence before confidence** — insufficient evidence is shown explicitly; it is never converted into a healthy or critical score by default.
2. **High information density without collisions** — KPI label, value, context and status are separate visual rows.
3. **Independent navigation** — the desktop sidebar and main workspace scroll independently.
4. **Grouped navigation** — modules are organized into Command, People, Talent, Workforce, Employee Governance, Risk & Assurance, and Platform.
5. **State clarity** — loading, loaded-empty, loaded-with-data and error states are visually distinct.
6. **Human-governed decisions** — the visual language never implies that AI or readiness scoring authorizes consequential employment decisions.
7. **Accessible motion** — reduced-motion and high-contrast preferences are respected.

## Typography
The application does not package or redistribute proprietary font files. It uses the existing system/UI font stack for readable enterprise content, with letter-spaced display treatments where the brand calls for a futuristic feel.
