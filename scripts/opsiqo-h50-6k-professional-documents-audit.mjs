import fs from 'node:fs';

const checks=[
  ['professional document engine','src/lib/documents/professional-document.ts',['DocumentBrandProfile','buildBrandedDocumentHtml','buildWordCompatibleDocument','professionalDocumentMissingFields','To be completed by HR']],
  ['professional fillable PDF','src/lib/documents/fillable-pdf.ts',['/AcroForm','/FT /Tx','/NeedAppearances true','slice(0,60)','brand.primaryColor','brand.accentColor']],
  ['structured HR field editor','src/components/separation-task-workspace.tsx',['Required HR input','HR enters the verified information here','Download branded Word','Download branded fillable PDF','Print / Save professional PDF','Confirm completed document']],
  ['professional offboarding corpus','src/lib/separation/task-workspace.ts',['Final HR clearance and sign-off','Knowledge transfer and handover plan','Benefits and pension transition record','Records retention review','documentHasCompleteFields']],
  ['brand domain','src/domain/platform-settings.ts',['documentCompanyName','documentLogoUrl','documentPrimaryColor','documentAccentColor','documentFooter']],
  ['brand service','src/lib/platform-settings/service.ts',['documentCompanyName','documentLogoUrl','documentPrimaryColor','documentAccentColor','documentFooter']],
  ['brand settings UI','src/components/settings-workspace.tsx',['Document brand & letterhead','Company logo URL','Document primary color','Document accent color']],
  ['release identity','src/lib/release/identity.ts',["H50.6K","H50.6J","H50.6I"]],
  ['tests','tests/h50-6k-professional-documents.test.ts',['H50.6K professional branded documents']],
];

let failures=0;
for(const [label,file,markers] of checks){
  const text=fs.readFileSync(file,'utf8');
  const missing=markers.filter(marker=>!text.includes(marker));
  if(missing.length){console.log(`FAIL ${label}: ${missing.join(', ')}`);failures++;}
  else console.log(`PASS ${label}`);
}

const editor=fs.readFileSync('src/components/separation-task-workspace.tsx','utf8');
if(editor.includes('new Firebase')||editor.includes('firebase/firestore')){
  console.log('FAIL document editor bypasses authoritative APIs');
  failures++;
}
if(!failures)console.log('H50.6K PROFESSIONAL DOCUMENTS AUDIT: PASS');
else{console.log(`H50.6K PROFESSIONAL DOCUMENTS AUDIT: FAIL (${failures})`);process.exit(1);}
