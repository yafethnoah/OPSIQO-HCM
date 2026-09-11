# OPSIQO H51.30 — Style-Adaptive Resume Intelligence

Parent: **H51.29**
Parent SHA: `d23976c675387b9897961ab14f45c5d2e3ffd075`

## Live UAT evidence addressed

The H51.29 workflow successfully reached candidate review, but live review exposed
semantic record-purity defects:

- `GOVERNANCE, ADVISORY & INTERNATIONAL ENGAGEMENT` was treated as an employer.
- `storage, and expiry-control practices.` was treated as an employer and inherited
  unrelated dates/location.
- skills could be empty despite source-supported competency sections.
- education location could contain `in progress / expected ...` status metadata.
- the UI could display `100% candidate-verified` even while structural defects
  remained.
- the submit control looked available before all verification/consent gates were met.

## H51.30 architecture

### 1. Style-adaptive document understanding

OPSIQO now recognizes resumes that are:

- reverse chronological or chronological
- functional / skills-first
- combination / hybrid
- executive biography / leadership profile
- academic CV
- consulting / project portfolio
- NGO / humanitarian / international-development style
- multi-column, table/timeline, or visually designed

Section recognition is semantic rather than dependent on a fixed heading list.

### 2. Entity purity

The deterministic reconciliation layer rejects:

- thematic/all-caps section and subsection labels as employers/titles
- narrative/bullet fragments as employers/titles/institutions/degrees
- education status/date phrases embedded inside location
- dates/locations that are not within the same local source neighborhood as
  the employment or education anchors

### 3. V11 AI reasoning

V11 explicitly reasons about varied resume styles, local record neighborhoods,
section/subsection structure, entity purity, skills completeness, and education
field separation. Semantic contamination itself triggers the existing bounded
repair pass.

### 4. Candidate-side repair and verification

The candidate review screen:

- shows critical structural issues separately
- offers **Improve these records with AI**
- prevents the review confirmation checkbox while obvious critical structure
  issues remain
- replaces misleading `100% candidate-verified` wording with separate
  **Candidate review** and **Structured resume verification** states
- visibly disables final Submit until resume review, structural readiness,
  accuracy declaration, privacy consent, and required cover letter are satisfied

### 5. Server authority remains fail-closed

Final submission still reparses the original resume and runs
`candidateVerificationGate`. Remaining critical structure still returns
`resume_structural_review_required`.

No automatic hire/reject/advance logic is introduced. Fit % remains grounded in
the original uploaded resume evidence. Production remains untouched.
