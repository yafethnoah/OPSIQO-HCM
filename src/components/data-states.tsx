export function LoadingState({ label='Loading verified data…' }: { label?: string }) {
  return <div className="loadingState" role="status" aria-live="polite"><span className="loadingPulse"/><span>{label}</span></div>;
}

export function EmptyState({ title, detail }: { title:string; detail?:string }) {
  return <div className="emptyState"><div><strong>{title}</strong>{detail&&<div className="muted">{detail}</div>}</div></div>;
}

export function EvidenceState({ status, coverage, detail }:{status:'sufficient'|'partial'|'insufficient'|'not_evaluated';coverage:number;detail:string}){
  const cls=status;
  const label=status==='sufficient'?'Sufficient evidence':status==='partial'?'Partial evidence':status==='insufficient'?'Insufficient evidence':'Not evaluated';
  return <div className={`evidenceState ${cls}`}><span className="evidenceDot"/><div><strong>{label} · {Math.max(0,Math.min(100,Math.round(coverage)))}% coverage</strong><small>{detail}</small></div></div>;
}
