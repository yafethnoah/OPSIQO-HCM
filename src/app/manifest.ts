import type { MetadataRoute } from 'next';
export default function manifest():MetadataRoute.Manifest{return{
 name:'OPSIQO ONE',short_name:'OPSIQO',description:'Human + AI Operating System with governed HR operations, workforce intelligence and privacy-safe PWA support',
 start_url:'/home',display:'standalone',background_color:'#f8fafc',theme_color:'#1f3a5f',
 icons:[{src:'/opsiqo-icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}],shortcuts:[{name:'My Work',short_name:'My Work',url:'/my-work'},{name:'Daily Brief',short_name:'Brief',url:'/daily-brief'},{name:'Ask OPSIQO',short_name:'Ask',url:'/home'}]
}}
