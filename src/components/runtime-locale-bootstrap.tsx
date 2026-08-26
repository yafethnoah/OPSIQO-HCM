const BOOTSTRAP = String.raw`(()=>{try{
  const raw=window.localStorage.getItem('opsiqo.runtimeLocale');
  if(!raw)return;
  const value=String(raw).toLowerCase();
  const locale=value.startsWith('fr')?'fr':value.startsWith('es')?'es':value.startsWith('ar')?'ar':value.startsWith('en')?'en':'en';
  const root=document.documentElement;
  root.lang=locale;
  root.dir=locale==='ar'?'rtl':'ltr';
  root.dataset.opsiqoLocale=locale;
  root.dataset.opsiqoLocaleSource='bootstrap';
}catch{}})();`;

export function RuntimeLocaleBootstrap(){
  return <script id="opsiqo-runtime-locale-bootstrap" dangerouslySetInnerHTML={{__html:BOOTSTRAP}} />;
}
