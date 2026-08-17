# OPSIQO HCM 8.5 V7.9 — Enterprise Self-Service Improvement

## Employee Portal 2.0

The employee portal now acts as a daily HR front door rather than a collection of module links. It keeps the existing worker-linked identity boundary and adds quick access to commonly requested HR services.

Standard service blueprints included in the project:

- Personal information change
- Employment letter / verification
- Benefits support or change
- Payroll or pay question
- Expense / reimbursement request
- Schedule change request
- Remote / hybrid work request
- Equipment or system access request
- Training / learning support
- Career development support
- Workplace concern
- General HR support

These blueprints create **service catalog definitions**, not direct HR master-data changes. Authoritative employee, payroll, financial, access and employment changes continue through their governed processes.

## Manager Self-Service

The manager workspace is now designed around the manager's actual work queue. It uses the existing server-side reporting-line scope and SuperApp evidence to surface:

- direct reports and availability;
- leave approvals;
- submitted timesheets;
- performance reviews awaiting the manager;
- overdue team learning;
- team compliance signals;
- prioritized attention items;
- recruiting, onboarding, learning, compensation and HR-support links when permitted.

Managers do not receive HR-administrator permissions merely by opening the portal.

## Standard service catalog bootstrap

`POST /api/organizations/{orgId}/service/catalog/bootstrap`

requires `service.manage`. It checks existing catalog codes and creates only missing standard services through the existing audited `saveCatalogItem()` service.

## Automation Designer 2.0

Workflow definitions now support:

```ts
conditions?: WorkflowCondition[]
conditionMode?: 'all' | 'any'
```

Allowed condition fields are restricted to:

- `entityType`
- `entityId`
- `payload.<safe.path>`

Supported operators:

- `eq`
- `neq`
- `contains`
- `in`
- `exists`
- `gt`
- `gte`
- `lt`
- `lte`

The domain-event dispatcher evaluates these conditions before starting a workflow. This allows precise automation such as high-priority service escalations without introducing arbitrary expression execution.

The UI offers reviewed step templates:

- HR review → manager approval → notification
- Manager approval → notification
- Automated notification only

Human task and approval steps remain owned by the configured role. Notification-only steps continue to be eligible for the existing automation engine.
