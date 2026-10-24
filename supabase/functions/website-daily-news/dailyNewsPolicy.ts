export const DAILY_NEWS_SCHEDULE_UTC='06:15';
export const MAX_SCHEDULER_BODY_BYTES=256;

export const utcDispatchDate=(now=new Date())=>now.toISOString().slice(0,10);

export const hasAttemptForDispatchDate=(rows:unknown)=>Array.isArray(rows)&&rows.length>0;

export async function claimDailyAttempt(dispatchDate:string,dependencies:{findAttempts:(date:string)=>Promise<unknown>;begin:(date:string)=>Promise<string|null>}){
 const attempts=await dependencies.findAttempts(dispatchDate);
 if(hasAttemptForDispatchDate(attempts))return {claimed:false as const,reason:'A refresh attempt already exists for this UTC day.'};
 const runId=await dependencies.begin(dispatchDate);
 return runId?{claimed:true as const,runId}:{claimed:false as const,reason:'A concurrent refresh already claimed this UTC day.'};
}

async function constantTimeEqual(left:string,right:string){
 const encoder=new TextEncoder();
 const [leftHash,rightHash]=await Promise.all([
  crypto.subtle.digest('SHA-256',encoder.encode(left)),
  crypto.subtle.digest('SHA-256',encoder.encode(right)),
 ]);
 const leftBytes=new Uint8Array(leftHash),rightBytes=new Uint8Array(rightHash);
 let difference=0;
 for(let index=0;index<leftBytes.length;index++)difference|=leftBytes[index]^rightBytes[index];
 return difference===0;
}

export async function validSchedulerEnvelope(request:Request,expectedSecret:string){
 if(new TextEncoder().encode(expectedSecret).byteLength<32)return false;
 const authorization=request.headers.get('authorization')||'';
 const match=/^Bearer ([^\s]+)$/.exec(authorization);
 if(!match||!await constantTimeEqual(match[1],expectedSecret))return false;
 if(request.headers.get('origin'))return false;
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))return false;
 const declared=Number(request.headers.get('content-length')||0);
 if(Number.isFinite(declared)&&declared>MAX_SCHEDULER_BODY_BYTES)return false;
 const bytes=new TextEncoder().encode(await request.text());
 if(bytes.byteLength>MAX_SCHEDULER_BODY_BYTES)return false;
 try{const body=JSON.parse(new TextDecoder().decode(bytes));return body&&typeof body==='object'&&!Array.isArray(body)&&Object.keys(body).length===1&&body.source==='database-cron';}catch{return false;}
}
