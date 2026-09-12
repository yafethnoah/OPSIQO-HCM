'use client';

import Link from 'next/link';
import { useState } from 'react';
import { OntarioComplianceFoundation } from '@/components/ontario-compliance-foundation';
import { SaudiCountryPackFoundation } from '@/components/saudi-country-pack-foundation';
import { SaudiEmploymentRulesFoundation } from '@/components/saudi-employment-rules-foundation';
import { SaudiPayrollGuardPanel } from '@/components/saudi-payroll-guard-panel';

type Tab = 'overview' | 'ontario' | 'saudi';

export function CountryComplianceWorkspace() {
  const [tab, setTab] = useState<Tab>('overview');

  return <div className="stack">
    <section className="card">
      <div className="rowBetween">
        <div>
          <h2 className="sectionTitle">Jurisdiction packs</h2>
          <p className="muted">
            Country/province-specific law, employment-rule and statutory-payroll governance lives here.
            Generic Canadian Payroll remains a separate operational workspace.
          </p>
        </div>
        <Link className="button secondary compact" href="/payroll">Open Canadian Payroll</Link>
      </div>
      <div className="row wrap">
        {([
          ['overview', 'Overview'],
          ['ontario', 'Ontario · Canada'],
          ['saudi', 'Saudi Arabia'],
        ] as const).map(([key, label]) => (
          <button key={key} className={`button ${tab === key ? '' : 'secondary'} compact`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
    </section>

    {tab === 'overview' && <>
      <section className="grid2">
        <article className="card">
          <div className="rowBetween"><h2 className="sectionTitle">Ontario · Canada</h2><span className="badge">NOT CERTIFIED</span></div>
          <p>
            Employment Standards, recruiting, OHSA, human rights, accessibility, pay equity, WSIB, EHT and
            federal payroll-source provenance with deterministic ESA previews.
          </p>
          <button className="button" onClick={() => setTab('ontario')}>Open Ontario foundation</button>
        </article>
        <article className="card">
          <div className="rowBetween"><h2 className="sectionTitle">Saudi Arabia</h2><span className="badge">NOT CERTIFIED</span></div>
          <p>
            HRSD/GOSI source foundation, employment rules and Saudi Payroll Guard are isolated from the generic
            Canadian Payroll workspace.
          </p>
          <button className="button" onClick={() => setTab('saudi')}>Open Saudi foundation</button>
        </article>
      </section>
      <section className="card">
        <h3 className="sectionTitle">Architecture boundary</h3>
        <ul>
          <li><strong>Payroll:</strong> Canadian operational payroll, profiles, runs, member-specific release dates, provider exports and reconciliation.</li>
          <li><strong>Country Compliance:</strong> jurisdiction-specific law packs, statutory previews, evidence gates and country payroll guards.</li>
          <li>Country-specific rules may consume shared employee/pay evidence but cannot silently mutate generic payroll.</li>
          <li>Every country pack remains independently source-versioned, human-governed and certification-gated.</li>
        </ul>
      </section>
    </>}

    {tab === 'ontario' && <OntarioComplianceFoundation />}

    {tab === 'saudi' && <div className="stack">
      <SaudiCountryPackFoundation />
      <SaudiEmploymentRulesFoundation />
      <SaudiPayrollGuardPanel />
    </div>}
  </div>;
}