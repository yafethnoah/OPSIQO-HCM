# OPSIQO HCM Release Status

Current release candidate: **v3.3 Enterprise Identity, SSO & Provisioning Hub**.

Source/integration validation covers governed OIDC/SAML provider profiles, enterprise sign-in/JIT boundaries, role mapping, access requests/reviews, identity reconciliation, session assurance, SCIM create provisioning through the v3.2 integration runtime, identity RBAC, server-only identity collections, Lifecycle/Enterprise/AI aggregate integration, production readiness controls and integrated UAT source coverage.

Dependency-aware production promotion remains blocked until a trusted `package-lock.json` is generated/reviewed and the complete CI acceptance sequence passes. v3.3 does not claim full OIDC/SAML/SCIM certification and does not authorize identity automation to determine employment status or grant privileged access automatically.
