const SITE_ORIGIN='https://deck-sage.com';
const corsHeaders={
 'Access-Control-Allow-Origin':SITE_ORIGIN,
 'Access-Control-Allow-Headers':'content-type',
 'Access-Control-Allow-Methods':'POST, OPTIONS',
 'Access-Control-Max-Age':'86400',
 'Vary':'Origin',
};
const retired={
 code:'SCANNER_RETIRED',
 error:'This photo-scanning endpoint has been retired. Refresh Deck Sage to use the on-device scanner. Your photo was not processed.',
};

function respond(status,body,{cors=false,extra={}}={}){
 return new Response(JSON.stringify(body),{status,headers:{
  ...(cors?corsHeaders:{Vary:'Origin'}),
  'Content-Type':'application/json',
  'Cache-Control':'no-store',
  ...extra,
 }});
}

// No body parsing, environment access, logging, database work, or outbound requests.
// Retirement is unconditional, including for clients with a cached endpoint/config.
export function handleRetiredScan(req){
 const origin=req.headers.get('origin')||'';
 if(origin!==SITE_ORIGIN)return respond(403,{error:'Origin not allowed.'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders});
 if(req.method!=='POST')return respond(405,{error:'Use POST.'},{cors:true,extra:{Allow:'POST, OPTIONS'}});
 return respond(410,retired,{cors:true});
}
