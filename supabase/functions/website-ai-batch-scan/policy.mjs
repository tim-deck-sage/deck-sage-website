export function gatewayAvailability(enabled,apiKey){
 if(enabled!=='true')return {status:503,error:'AI Scan is disabled.'};
 if(!apiKey)return {status:503,error:'AI Scan is not configured.'};
 return null;
}
