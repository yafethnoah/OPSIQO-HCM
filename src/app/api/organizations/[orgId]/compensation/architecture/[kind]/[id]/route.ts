import{NextResponse}from'next/server';
import{actorFromRequest}from'@/lib/auth/session';
import{apiErrorResponse}from'@/lib/http/errors';
import{updateArchitectureEntity}from'@/lib/compensation/architecture-lifecycle';

export async function PATCH(request:Request,context:{params:Promise<{orgId:string;kind:string;id:string}>}){
  try{
    const{orgId,kind,id}=await context.params;const actor=await actorFromRequest(request,orgId);
    if(!['jobFamily','jobLevel','salaryBand'].includes(kind))return NextResponse.json({error:'Unsupported architecture kind.',code:'invalid_architecture_kind'},{status:400});
    return NextResponse.json({data:await updateArchitectureEntity(actor,kind as any,id,await request.json())});
  }catch(e){return apiErrorResponse(e);}
}