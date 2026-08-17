import type { MetadataRoute } from 'next';
export default function manifest():MetadataRoute.Manifest{return{
 name:'OPSIQO HCM',short_name:'OPSIQO',description:'Role-aware Human Capital Management workspace',
 start_url:'/home',display:'standalone',background_color:'#f8fafc',theme_color:'#1f3a5f',
 icons:[{src:'/opsiqo-icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}]
}}
