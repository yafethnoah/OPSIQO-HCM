import Script from 'next/script';

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

/**
 * Applies the locally stored locale before interactive client code runs.
 * next/script owns script insertion so React never attempts to execute a raw
 * <script> element during a client render.
 */
export function RuntimeLocaleBootstrap(){
  return (
    <Script
      id="opsiqo-runtime-locale-bootstrap"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{__html:BOOTSTRAP}}
    />
  );
}
