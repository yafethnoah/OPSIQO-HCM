# v3.6.1 Production Evidence Closure — Primary Technical References

These sources inform the cloud-recovery and CI evidence design. They are implementation references, not certification claims. Re-check provider documentation before production changes.

## Cloud Firestore recovery
- Firebase, *Point-in-time recovery (PITR)*: https://firebase.google.com/docs/firestore/pitr
- Firebase, *Work with point-in-time recovery (PITR)*: https://firebase.google.com/docs/firestore/use-pitr
- Firebase, *Back up and restore data*: https://firebase.google.com/docs/firestore/backups
- Google Cloud SDK, `gcloud firestore backups list`: https://cloud.google.com/sdk/gcloud/reference/firestore/backups/list
- Google Cloud SDK, `gcloud firestore backups schedules list`: https://cloud.google.com/sdk/gcloud/reference/firestore/backups/schedules/list
- Google Cloud SDK, `gcloud firestore databases describe`: https://cloud.google.com/sdk/gcloud/reference/firestore/databases/describe
- Google Cloud SDK beta, `gcloud beta firestore databases restore`: https://cloud.google.com/sdk/gcloud/reference/beta/firestore/databases/restore
- Firestore REST API, `projects.databases.restore`: https://cloud.google.com/firestore/docs/reference/rest/v1/projects.databases/restore

## CI workload identity and security scanning
- Google GitHub Actions `auth` (Workload Identity Federation): https://github.com/google-github-actions/auth
- GitHub CodeQL Action: https://github.com/github/codeql-action
- Gitleaks Action: https://github.com/gitleaks/gitleaks-action

The v3.6.1 restore test verifies only the configured non-sensitive sentinel in the temporary restored database. It is one governed recovery evidence point, not exhaustive data validation or a guarantee of future recovery performance.

---

# v2.1 HR Diagnostic & Compliance Intelligence — Official Reference Pack

These references inform the shipped Ontario reference controls. Inclusion does not constitute legal advice, certification, or a conclusion that a control applies to a particular organization. Sources must be re-reviewed periodically because legislation, regulations, guidance, exemptions and organization facts can change.

## Ontario workplace violence and harassment
- Ontario, *Understand the law on workplace violence and harassment*: https://www.ontario.ca/page/understand-law-workplace-violence-and-harassment
- Ontario, OHSA Guide — Workplace violence and workplace harassment: https://www.ontario.ca/document/guide-occupational-health-and-safety-act/part-iii0i-workplace-violence-and-workplace-harassment

Reference use in v2.1: annual policy review; written/posting/accessibility threshold control; workplace-harassment program/instruction governance. Qualified review is still required for applicability and sufficiency.

## Ontario ESA — electronic monitoring
- Ontario, ESA Guide — Written policy on electronic monitoring of employees: https://www.ontario.ca/document/your-guide-employment-standards-act-0/written-policy-electronic-monitoring-employees

Reference use in v2.1: January-1 employee-count threshold and policy/timing/content governance. OPSIQO records applicability evidence; it does not determine all special-rule outcomes automatically.


## Ontario ESA — publicly advertised job postings (effective 2026)
- Ontario, ESA Guide — Requirements related to publicly advertised job postings: https://www.ontario.ca/document/your-guide-employment-standards-act-0/requirements-related-publicly-advertised-job
- Ontario Regulation 476/24 — Rules and Exemptions re Job Postings: https://www.ontario.ca/laws/regulation/240476

Reference use in v2.1: manual applicability review for the 25+ employer threshold and governance evidence for compensation/range disclosure, AI-use disclosure, vacancy disclosure, Canadian-experience prohibition and interviewed-applicant decision-status communication.

## Ontario accessibility / AODA
- Ontario, *How to make your business accessible*: https://www.ontario.ca/page/how-make-your-business-accessible
- Ontario, *Accessibility rules for businesses and non-profits*: https://www.ontario.ca/page/accessibility-rules-businesses-and-non-profits

Reference use in v2.1: accessibility-policy governance and 50+ organization multi-year accessibility planning/reporting readiness.

## Ontario Pay Equity
- Pay Equity Office Ontario, *I hire in Ontario — What you need to know about pay equity*: https://payequity.gov.on.ca/i-hire-in-ontario/
- Pay Equity Office Ontario, *Who is covered*: https://payequity.gov.on.ca/what-is-pay-equity/

Reference use in v2.1: applicability/maintenance review for covered Ontario public-sector and provincially regulated private-sector organizations. Formal job-class/comparison work remains in the compensation/pay-equity module and requires qualified review.

## AI governance retained from v2.0
- NIST AI Risk Management Framework: https://www.nist.gov/itl/ai-risk-management-framework
- Office of the Privacy Commissioner of Canada / Canadian privacy regulators, generative-AI principles: https://www.priv.gc.ca/en/about-the-opc/what-we-do/provincial-and-territorial-collaboration/joint-resolutions-with-provinces-and-territories/res_231005_02/

v2.1 uses the governed AI Copilot only to analyse evidence sufficiency and remediation options. It does not allow the model to declare legal compliance/non-compliance.

## v2.3 governance source-handling rule
The Governance Center does not invent new statutory conclusions. It preserves source title/URL/review date from governed HR Diagnostic controls and gives each reference a review cadence. Internal policy controls retain their policy lineage. A source becoming overdue is an operational signal to re-review the source; it is not itself a finding of legal non-compliance.


## v2.4 regulatory monitoring source-handling rule
v2.4 can register and monitor the governed public URLs above (and other organization-approved HTTPS regulatory sources). Automated monitoring stores a normalized content fingerprint and snapshot metadata. A fingerprint difference is only a **potential source-change signal**. OPSIQO does not infer what legal text changed, whether the change is legally material, whether it applies to the organization, or whether the organization is compliant. Those conclusions require documented human/qualified review.


## v2.6 privacy and AI-assurance references
These sources inform governance patterns only. Applicability depends on jurisdiction, sector, organization facts and the specific processing activity.

- Office of the Privacy Commissioner of Canada, *Privacy in the Workplace*: https://www.priv.gc.ca/en/privacy-topics/employers-and-employees/02_05_d_17/
- Office of the Privacy Commissioner of Canada, *Application of PIPEDA to Employee Records*: https://www.priv.gc.ca/en/privacy-topics/employers-and-employees/02_05_d_18/
- Office of the Privacy Commissioner of Canada, *Mandatory reporting of breaches of security safeguards*: https://www.priv.gc.ca/en/privacy-topics/business-privacy/breaches-and-safeguards/privacy-breaches-at-your-business/gd_pb_201810/
- Office of the Privacy Commissioner of Canada, *Privacy Impact Assessments — Overview*: https://www.priv.gc.ca/en/privacy-topics/federal-government-privacy/privacy-impact-assessments/overview-pia/
- Canadian privacy regulators, *Principles for responsible, trustworthy and privacy-protective generative AI technologies*: https://www.priv.gc.ca/en/privacy-topics/ai-technology-and-innovation/artificial-intelligence/gd_principles_ai/
- Treasury Board of Canada Secretariat, *Algorithmic Impact Assessment tool*: https://www.canada.ca/en/government/system/digital-government/digital-government-innovations/responsible-use-ai/algorithmic-impact-assessment.html
- NIST, *AI Risk Management Framework*: https://www.nist.gov/itl/ai-risk-management-framework

OPSIQO uses these as reference inputs for risk/governance design. The federal PIA/AIA materials are not silently treated as mandatory rules for private Ontario employers.


## v2.7 resilience reference framework
- ISO 22301, Security and resilience — Business continuity management systems — Requirements: https://www.iso.org/standard/75106.html
- ISO 22313, Security and resilience — Business continuity management systems — Guidance: https://www.iso.org/standard/75107.html
- Government of Canada (Department of National Defence), *Understanding Business Continuity Management: Ensuring Resilience in Uncertain Times* (2025): https://www.canada.ca/en/department-national-defence/maple-leaf/defence/2025/05/understanding-business-continuity-management-ensuring-resilience-uncertain-times.html
- Canadian Centre for Occupational Health and Safety, *Emergency Response Planning* (2nd ed., 2025): https://www.ccohs.ca/products/publications/emergency

These references inform operational resilience design only. OPSIQO does not represent that ISO certification, emergency-management legislation, insurer requirements or sector-specific obligations are satisfied. Applicability and external certification remain human/qualified determinations.


## v3.1 Enterprise Integration & Data Exchange — interoperability references
- JSON Schema specification (2020-12): https://json-schema.org/specification
- IETF RFC 7643 — SCIM Core Schema: https://www.rfc-editor.org/rfc/rfc7643
- IETF RFC 7644 — SCIM Protocol: https://www.rfc-editor.org/rfc/rfc7644
- CloudEvents specification/project: https://cloudevents.io/
- OpenTelemetry specification: https://opentelemetry.io/docs/specs/otel/

v3.1 uses these as interoperability/governance references. OPSIQO does not claim standards certification or a complete implementation of every optional feature. The JSON Schema runtime is deliberately identified as a documented bounded subset.

## v3.2 integration-runtime interoperability and security references
v3.2 continues the v3.1 interoperability references for JSON Schema 2020-12, SCIM 2.0 (RFC 7643/7644), CloudEvents and OpenTelemetry. The runtime also follows the existing OPSIQO security rule that network destinations are governed by HTTPS/SFTP protocol restrictions, DNS/public-address validation and production exact-host allow-listing.

The runtime does not claim complete SCIM provisioning coverage, complete JSON Schema implementation, SFTP certification, or OpenTelemetry certification. `opsiqo-json-schema-subset-v1` remains the explicit validation profile. SFTP execution remains a deployment-provider extension and fails closed when that provider is absent.

## v3.3 enterprise identity and provisioning references
- OpenID Foundation, *OpenID Connect Core 1.0*: https://openid.net/specs/openid-connect-core-1_0.html
- Microsoft Learn, *Microsoft identity platform and OpenID Connect protocol*: https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc
- Microsoft Learn, *Single sign-on to applications in Microsoft Entra ID*: https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/what-is-single-sign-on
- Google Identity, *OpenID Connect*: https://developers.google.com/identity/openid-connect/openid-connect
- IETF RFC 7643 — SCIM Core Schema: https://www.rfc-editor.org/rfc/rfc7643
- IETF RFC 7644 — SCIM Protocol: https://www.rfc-editor.org/rfc/rfc7644

v3.3 uses these as federation/provisioning architecture references. OPSIQO does not claim OIDC, SAML or SCIM certification. OIDC/SAML protocol enforcement and assertion/token cryptographic validation remain responsibilities of the configured Firebase Authentication / Identity Platform and enterprise IdP stack. OPSIQO adds governed provider metadata, RBAC/JIT controls, access review, reconciliation and a bounded SCIM provisioning workflow above that authentication layer.

## v3.4 Security Operations / Zero-Trust references
- NIST SP 800-207, *Zero Trust Architecture*: https://csrc.nist.gov/pubs/sp/800/207/final
- NIST SP 800-61 Rev. 3, *Incident Response Recommendations and Considerations for Cybersecurity Risk Management*: https://csrc.nist.gov/pubs/sp/800/61/r3/final
- NIST SP 800-63B, *Digital Identity Guidelines — Authentication and Authenticator Management*: https://pages.nist.gov/800-63-4/sp800-63b.html
- CISA, *Require Multifactor Authentication*: https://www.cisa.gov/audiences/small-and-medium-businesses/secure-your-business/require-multifactor-authentication

These sources inform governance and engineering controls. Their inclusion does not constitute NIST/CISA certification or determine an organization's legal/regulatory obligations.


## v3.5 software supply chain / resilience references
- SLSA, Provenance: https://slsa.dev/spec/v1.2/provenance
- CycloneDX specification: https://cyclonedx.org/specification/overview/
- NIST SP 800-218, Secure Software Development Framework (SSDF) v1.1: https://csrc.nist.gov/pubs/sp/800/218/final
- NIST SP 800-34 Rev. 1, Contingency Planning Guide for Federal Information Systems: https://csrc.nist.gov/pubs/sp/800/34/r1/final

These references inform engineering/governance design. OPSIQO does not claim certification or full standards conformance from their inclusion.
