import type { Role } from './security';

export type IdentityLifecycle='draft'|'in_review'|'approved'|'active'|'paused'|'retired';
export type IdentityProtocol='oidc'|'saml';
export type IdentityVendor='microsoft_entra'|'google_workspace'|'generic';
export type IdentityRiskLevel='low'|'medium'|'high'|'critical';

export interface IdentityProviderProfile{
  id:string;code:string;name:string;vendor:IdentityVendor;protocol:IdentityProtocol;firebaseProviderId:string;
  issuerUrl?:string;metadataUrl?:string;deploymentConfigRef:string;allowedEmailDomains:string[];
  jitMode:'disabled'|'employee_only'|'request_only';mfaRequired:boolean;managedDeviceClaimRequired:boolean;
  status:IdentityLifecycle;createdBy:string;createdAt:string;updatedAt:string;submittedBy?:string;submittedAt?:string;approvedBy?:string;approvedAt?:string;
  lastTestAt?:string;lastTestStatus?:'passed'|'failed';lastTestFingerprint?:string;lastTestMessage?:string;
  directHrMutationProhibited:true;
}
export interface IdentityProviderTest{
  id:string;providerId:string;protocol:IdentityProtocol;status:'passed'|'failed';fingerprint?:string;issuer?:string;testedBy:string;testedAt:string;message:string;
}
export interface IdentityRoleMapping{
  id:string;code:string;providerId:string;claimType:'email_domain'|'group';claimValue:string;role:Role;autoJitEligible:boolean;
  status:IdentityLifecycle;createdBy:string;createdAt:string;updatedAt:string;submittedBy?:string;submittedAt?:string;approvedBy?:string;approvedAt?:string;
}
export interface IdentityAccount{
  id:string;providerId:string;externalSubject:string;externalSubjectHash:string;emailHash:string;emailDomain:string;workerId?:string;membershipUid?:string;
  active:boolean;groups:string[];firstSeenAt:string;lastSeenAt:string;lastMfaVerified?:boolean;lastDeviceCompliant?:boolean;
}
export interface IdentityAccessRequest{
  id:string;source:'jit'|'manual'|'access_review'|'deprovision';changeType:'grant_membership'|'change_role'|'disable_membership'|'reactivate_membership';
  targetUid:string;workerId:string;requestedRole?:Role;currentRole?:Role;reason:string;status:'draft'|'in_review'|'approved'|'executed'|'rejected';
  createdBy:string;createdAt:string;updatedAt:string;submittedBy?:string;submittedAt?:string;approvedBy?:string;approvedAt?:string;executedBy?:string;executedAt?:string;rejectionNote?:string;
}
export interface IdentityAccessReviewCampaign{
  id:string;code:string;name:string;scope:'all'|'privileged';dueDate:string;status:'draft'|'in_review'|'approved'|'active'|'completed'|'closed';
  createdBy:string;createdAt:string;updatedAt:string;submittedBy?:string;submittedAt?:string;approvedBy?:string;approvedAt?:string;launchedAt?:string;closedAt?:string;
}
export interface IdentityAccessReviewItem{
  id:string;campaignId:string;membershipUid:string;workerId?:string;role:Role;decision:'pending'|'retain'|'revoke'|'escalate';rationale?:string;
  reviewedBy?:string;reviewedAt?:string;accessRequestId?:string;
}
export interface IdentityProvisioningRequest{
  id:string;workerId:string;profileId:string;action:'create'|'update'|'disable';rationale:string;status:'draft'|'in_review'|'approved'|'executed'|'rejected';
  createdBy:string;createdAt:string;updatedAt:string;submittedBy?:string;submittedAt?:string;approvedBy?:string;approvedAt?:string;executedBy?:string;executedAt?:string;integrationRunId?:string;rejectionNote?:string;
}
export interface IdentityReconciliationSnapshot{
  id:string;capturedAt:string;capturedBy:string;activeMemberships:number;activeIdentityAccounts:number;unlinkedMemberships:number;orphanIdentityAccounts:number;inactiveMembershipActiveAccounts:number;readinessScore:number;level:'fragile'|'developing'|'controlled'|'resilient';
}
export interface IdentitySessionEvidence{
  id:string;uidHash:string;role:Role;provider:string;mfaVerified:boolean;deviceCompliant?:boolean;observedAt:string;
}
export interface IdentityDashboard{
  providers:IdentityProviderProfile[];providerTests:IdentityProviderTest[];mappings:IdentityRoleMapping[];accounts:Omit<IdentityAccount,'externalSubject'>[];
  accessRequests:IdentityAccessRequest[];accessReviews:IdentityAccessReviewCampaign[];reviewItems:IdentityAccessReviewItem[];provisioningRequests:IdentityProvisioningRequest[];reconciliations:IdentityReconciliationSnapshot[];
  metrics:{activeProviders:number;untestedActiveProviders:number;activeMappings:number;pendingAccessApprovals:number;pendingProvisioningApprovals:number;overdueAccessReviews:number;orphanIdentityAccounts:number;inactiveMembershipActiveAccounts:number;privilegedSessionsObserved:number;privilegedSessionsWithoutMfa:number;readinessScore:number;readinessLevel:'fragile'|'developing'|'controlled'|'resilient'};
  operatingNotice:string;generatedAt:string;
}
