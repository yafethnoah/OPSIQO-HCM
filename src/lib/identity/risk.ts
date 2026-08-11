export function identityReadiness(input:{activeProviders:number;untestedActiveProviders:number;pendingAccessApprovals:number;pendingProvisioningApprovals:number;overdueAccessReviews:number;orphanIdentityAccounts:number;inactiveMembershipActiveAccounts:number;privilegedSessionsObserved:number;privilegedSessionsWithoutMfa:number}){
 let score=input.activeProviders?100:60;
 score-=Math.min(30,input.untestedActiveProviders*15);
 score-=Math.min(20,input.pendingAccessApprovals*4);
 score-=Math.min(15,input.pendingProvisioningApprovals*3);
 score-=Math.min(20,input.overdueAccessReviews*8);
 score-=Math.min(20,input.orphanIdentityAccounts*4);
 score-=Math.min(25,input.inactiveMembershipActiveAccounts*8);
 if(input.privilegedSessionsObserved)score-=Math.min(25,Math.round(input.privilegedSessionsWithoutMfa/input.privilegedSessionsObserved*25));
 score=Math.max(0,Math.min(100,Math.round(score)));
 const level=score>=85?'resilient':score>=70?'controlled':score>=50?'developing':'fragile';
 return{score,level} as const;
}
