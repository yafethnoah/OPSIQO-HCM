'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/http/client';
import { EmployeeProfile } from '@/components/employee-profile';

type Actor={workerId?:string;role:string};
export function SelfServicePanel(){const[actor,setActor]=useState<Actor|null>(null);const[error,setError]=useState('');useEffect(()=>{apiFetch<{actor:Actor}>('/api/me').then(r=>setActor(r.actor)).catch(e=>setError(e.message));},[]);if(error)return <div className="error">{error}</div>;if(!actor)return <div className="card muted">Loading your HR profile…</div>;if(!actor.workerId)return <div className="card notice">Your organization membership is active, but it is not linked to a worker record yet. Ask HR to link the membership to your employee record.</div>;return <EmployeeProfile workerId={actor.workerId}/>;}
