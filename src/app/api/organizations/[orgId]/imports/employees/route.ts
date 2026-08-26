import{NextResponse}from'next/server';
import{actorFromRequest,requirePermission}from'@/lib/auth/session';
import{apiErrorResponse}from'@/lib/http/errors';
import{commitEmployeeImport,previewEmployeeImport,updateEmployeeImportPreviewRow}from'@/lib/data-import/employee-import';

export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){
  try{
    const{orgId}=await context.params;
    const actor=await actorFromRequest(request,orgId);
    requirePermission(actor,'people.manage');
    const ct=request.headers.get('content-type')||'';
    if(ct.includes('multipart/form-data')){
      const form=await request.formData();
      const file=form.get('file');
      if(!(file instanceof File))throw new Error('Employee CSV/XLSX/PDF file is required.');
      return NextResponse.json({data:await previewEmployeeImport(actor,file)});
    }
    const body=await request.json();
    if(body.action!=='commit'||typeof body.previewId!=='string')throw new Error('Commit requires a server-issued previewId.');
    return NextResponse.json({data:await commitEmployeeImport(actor,body.previewId)});
  }catch(e){return apiErrorResponse(e)}
}

export async function PATCH(request:Request,context:{params:Promise<{orgId:string}>}){
  try{
    const{orgId}=await context.params;
    const actor=await actorFromRequest(request,orgId);
    requirePermission(actor,'people.manage');
    const body=await request.json();
    if(typeof body.previewId!=='string'||!Number.isInteger(body.rowNumber)||!body.corrections||typeof body.corrections!=='object'){
      throw new Error('Preview correction requires previewId, rowNumber and corrections.');
    }
    return NextResponse.json({data:await updateEmployeeImportPreviewRow(actor,body.previewId,body.rowNumber,body.corrections)});
  }catch(e){return apiErrorResponse(e)}
}
