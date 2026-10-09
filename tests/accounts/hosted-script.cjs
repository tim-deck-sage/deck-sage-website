const {PGlite}=require('@electric-sql/pglite'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
(async()=>{
 const db=new PGlite();
 await db.exec("create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;");
 await db.exec(fs.readFileSync(path.join(__dirname,'../../supabase/migrations/20261009153100_free_accounts.sql'),'utf8'));
 const result=await db.exec(fs.readFileSync(path.join(__dirname,'hosted-rollback.sql'),'utf8'));
 const users=await db.query('select count(*)::int as count from auth.users');assert.equal(users.rows[0].count,0);
 const workspaces=await db.query('select count(*)::int as count from ds_workspaces');assert.equal(workspaces.rows[0].count,0);
 assert.ok(result.some(r=>r.rows?.some(x=>x.result?.startsWith('PASS:'))));
 console.log('PASS local rehearsal: hosted transaction test script and rollback leave zero fixture users/workspaces. No hosted execution.');await db.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
