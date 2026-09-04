"use client";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { activeOrgId, apiFetch, ApiRequestError } from "@/lib/http/client";

type Interview={id:string;applicationId:string;interviewType:string;scheduledAt:string;status:string};
type Question={id:string;type:string;competency:string;question:string;probes:string[];expectedEvidence:string[];anchors:{rating:1|3|5;description:string}[];standardized:boolean;source:string};
type Kit={id:string;interviewId:string;version:number;status:"draft"|"locked";generationMode:string;questions:Question[];decisionBoundary:string};
type PanelSummary={scorecardCount:number;averageRating?:number;recommendationCounts:Record<string,number>;varianceWarning:boolean;ratingSpread?:number;decisionBoundary:string};

export function InterviewIntelligencePanel({interviews,preferredInterviewId,onChanged}:{interviews:Interview[];preferredInterviewId?:string;onChanged:()=>Promise<void>|void}){
 const [interviewId,setInterviewId]=useState("");
 const [kit,setKit]=useState<Kit|null>(null);
 const [summary,setSummary]=useState<PanelSummary|null>(null);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState(false);
 const [legacyMissing,setLegacyMissing]=useState(false);
 const appliedPreferred=useRef("");
 const interview=useMemo(()=>interviews.find(i=>i.id===interviewId),[interviews,interviewId]);

 useEffect(()=>{
   if(preferredInterviewId&&preferredInterviewId!==appliedPreferred.current&&interviews.some(i=>i.id===preferredInterviewId)){
     appliedPreferred.current=preferredInterviewId;
     setInterviewId(preferredInterviewId);
     setNotice("Newly scheduled interview selected. Loading its structured interview kit…");
     return;
   }
   if(interviewId&&!interviews.some(i=>i.id===interviewId))setInterviewId("");
   if(!interviewId&&!preferredInterviewId&&interviews.length)setInterviewId(interviews[0]!.id);
 },[interviews,preferredInterviewId,interviewId]);

 async function loadKit(id:string){
   if(!id){setKit(null);setSummary(null);setLegacyMissing(false);return;}
   setError("");setLegacyMissing(false);
   try{
     const r=await apiFetch<{data:{kit:Kit;panelSummary:PanelSummary}}>(`/api/organizations/${activeOrgId()}/recruiting/interviews/${id}/kit`);
     setKit(r.data.kit);setSummary(r.data.panelSummary);
   }catch(e){
     setKit(null);setSummary(null);
     if(e instanceof ApiRequestError&&e.code==="interview_kit_not_found"){
       setLegacyMissing(true);
       setError("");
     }else setError(e instanceof Error?e.message:"Unable to load interview kit.");
   }
 }
 useEffect(()=>{void loadKit(interviewId)},[interviewId]);

 async function kitAction(action:"generate"|"lock"|"regenerate"){
   if(!interviewId)return;setBusy(true);setError("");setNotice("");
   try{
     await apiFetch(`/api/organizations/${activeOrgId()}/recruiting/interviews/${interviewId}/kit`,{method:"PATCH",body:JSON.stringify({action})});
     setLegacyMissing(false);
     setNotice(action==="lock"?"Interview kit locked for consistent use.":action==="generate"?"Structured interview kit generated for this legacy interview and is ready for human review.":"Interview kit regenerated for human review.");
     await loadKit(interviewId);await onChanged();
   }catch(e){setError(e instanceof Error?e.message:"Interview kit update failed.");}finally{setBusy(false)}
 }
 async function submitScore(e:FormEvent<HTMLFormElement>){
   e.preventDefault();if(!interviewId||!kit)return;const f=new FormData(e.currentTarget);
   const ratings=kit.questions.filter(q=>q.type!=="candidate_questions").map(q=>({criterion:q.competency,rating:Number(f.get(`rating_${q.id}`)||3),evidence:String(f.get(`evidence_${q.id}`)||"")||undefined}));
   setBusy(true);setError("");setNotice("");
   try{await apiFetch(`/api/organizations/${activeOrgId()}/recruiting/interviews/${interviewId}/scorecards`,{method:"POST",body:JSON.stringify({recommendation:f.get("recommendation"),ratings,overallComment:f.get("overallComment")||undefined})});setNotice("Immutable evidence-based scorecard submitted. OPSIQO has not made an employment decision.");e.currentTarget.reset();await loadKit(interviewId);await onChanged();}catch(e){setError(e instanceof Error?e.message:"Unable to submit scorecard.");}finally{setBusy(false)}
 }
 return <section className="card stack">
   <div className="toolbar"><div><h2 className="sectionTitle">AI structured interview intelligence</h2><div className="muted">Automatically generated interview kit · standardized core questions · candidate-specific evidence probes · anchored scoring</div></div><span className="badge">Human governed</span></div>
   {error&&<div className="error" role="alert">{error}</div>}{notice&&<div className="success" role="status">{notice}</div>}
   <label className="field"><span>Interview</span><select className="input" value={interviewId} onChange={e=>{setInterviewId(e.target.value);setNotice("")}} disabled={!interviews.length}><option value="">{interviews.length?"Select interview":"No interviews available"}</option>{interviews.map(i=><option key={i.id} value={i.id}>{i.interviewType} · {new Date(i.scheduledAt).toLocaleString()}</option>)}</select></label>
   {interview&&!kit&&!legacyMissing&&<div className="notice">Loading structured interview kit…</div>}
   {legacyMissing&&<div className="notice stack" role="status"><div><strong>Legacy interview — structured kit not yet available.</strong></div><div>This interview predates the current interview-intelligence workflow or its kit is missing. Generate a draft from the requisition and reviewed ATS evidence, then review and lock it before use.</div><button type="button" className="button" disabled={busy} onClick={()=>void kitAction("generate")}>{busy?"Generating…":"Generate structured interview kit"}</button></div>}
   {kit&&<>
     <div className="grid4"><Metric label="Kit version" value={String(kit.version)}/><Metric label="Questions" value={String(kit.questions.length)}/><Metric label="Status" value={kit.status}/><Metric label="Generation" value={kit.generationMode==="governed_ai"?"Governed AI":"Deterministic"}/></div>
     {kit.generationMode!=="governed_ai"&&<div className="notice" role="status">Governed Recruiting AI was unavailable or not approved, so OPSIQO generated the interview kit deterministically from the requisition and reviewed ATS evidence. You may continue after human review and locking.</div>}
     <div className="notice">{kit.decisionBoundary}</div>
     <div className="row wrap"><button type="button" className="button secondary" disabled={busy||kit.status==="locked"} onClick={()=>void kitAction("regenerate")}>Regenerate draft</button><button type="button" className="button" disabled={busy||kit.status==="locked"} onClick={()=>void kitAction("lock")}>{kit.status==="locked"?"Interview kit locked":"Review & lock core questions"}</button></div>
     <form className="stack" onSubmit={submitScore}>
       {kit.questions.map((q,index)=><article className="card insetCard stack" key={q.id}>
         <div className="toolbar"><strong>{index+1}. {q.question}</strong><span className="badge">{q.standardized?"Standardized":"Candidate-specific"} · {q.type}</span></div>
         <div className="muted"><strong>Competency:</strong> {q.competency}</div>
         {!!q.probes.length&&<div><strong>Follow-up probes</strong><ul>{q.probes.map(p=><li key={p}>{p}</li>)}</ul></div>}
         {!!q.expectedEvidence.length&&<div><strong>Evidence expected</strong><ul>{q.expectedEvidence.map(p=><li key={p}>{p}</li>)}</ul></div>}
         {q.type!=="candidate_questions"&&<><div className="grid3">{q.anchors.map(a=><div className="notice" key={a.rating}><strong>{a.rating}/5</strong><div>{a.description}</div></div>)}</div><div className="scoreRow"><label>Rating<input className="input" name={`rating_${q.id}`} type="number" min="1" max="5" defaultValue="3" required/></label><input className="input" name={`evidence_${q.id}`} aria-label={`${q.competency} evidence`} placeholder="Interview evidence / observation" required minLength={3}/></div></>}
       </article>)}
       <label className="field"><span>Interviewer recommendation</span><select className="input" name="recommendation" defaultValue="yes"><option value="strong_yes">strong yes</option><option value="yes">yes</option><option value="mixed">mixed</option><option value="no">no</option><option value="strong_no">strong no</option></select></label>
       <label className="field"><span>Overall evidence summary</span><textarea className="input" name="overallComment" rows={3} placeholder="Summarize job-related evidence only. Do not record protected-characteristic reasoning."/></label>
       <button className="button" disabled={busy||!kit||kit.status!=="locked"}>Submit immutable scorecard</button>
     </form>
     {summary&&<div className="stack"><h3>Panel consistency</h3><div className="grid3"><Metric label="Submitted scorecards" value={String(summary.scorecardCount)}/><Metric label="Average rating" value={summary.averageRating==null?"Not assessed":String(summary.averageRating)}/><Metric label="Rating spread" value={summary.ratingSpread==null?"Not assessed":String(summary.ratingSpread)}/></div>{summary.scorecardCount>0&&<div className="notice"><strong>Recommendation distribution</strong><div>{Object.entries(summary.recommendationCounts).map(([key,value])=>`${key.replaceAll("_"," ")}: ${value}`).join(" · ")||"Not assessed"}</div></div>}{summary.varianceWarning&&<div className="notice">Panel variance warning: interviewer average ratings differ substantially. Review evidence together before any employment decision.</div>}<div className="muted">{summary.decisionBoundary}</div></div>}
   </>}
 </section>
}
function Metric({label,value}:{label:string;value:string}){return <div className="metric"><div className="metricLabel">{label}</div><div className="metricValue">{value}</div></div>}
