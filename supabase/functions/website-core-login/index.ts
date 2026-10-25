// @ts-nocheck -- staged Deno Edge function; never deployed by build.
import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {createLoginHandler} from './policy.mjs';
const url=Deno.env.get('SUPABASE_URL')!;
const service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const publishable=Deno.env.get('CORE_PUBLISHABLE_KEY')!;
const origin=Deno.env.get('CORE_SITE_ORIGIN')!;
if(origin!=='https://deck-sage.com')throw Error('Review the exact Core origin before deployment');
const rpc=async(name,args)=>{const result=await service.rpc(name,args);if(result.error)throw Error('LOGIN_UNAVAILABLE');return result.data;};
Deno.serve(createLoginHandler({origin,
 resolveEmail:name=>rpc('ds_core_login_email',{p_username:name}),
 consume:(key,limit)=>rpc('ds_core_login_attempt',{p_key_hash:key,p_limit:limit}),
 hash:async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),byte=>byte.toString(16).padStart(2,'0')).join(''),
 authenticate:(email,password,captchaToken)=>createClient(url,publishable,{auth:{persistSession:false,autoRefreshToken:false}}).auth.signInWithPassword({email,password,options:{captchaToken}}),
}));
