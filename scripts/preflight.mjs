import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const base=process.cwd();
const notes=[];let errors=0;
const fail=m=>{console.error('FAIL:',m);errors++};
const pass=m=>console.log('PASS:',m);
const env={...process.env};
const path=resolve(base,'.env.local');
if(existsSync(path))for(const line of readFileSync(path,'utf8').split(/\r?\n/)){
 const m=line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
 if(m&&!env[m[1]])env[m[1]]=m[2].replace(/^(['"])(.*)\1$/,'$2');
}
const url=env.NEXT_PUBLIC_SUPABASE_URL||'';
const key=env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';
try {const parsed=new URL(url);if(parsed.protocol!=='https:'||!parsed.hostname.endsWith('.supabase.co')||parsed.hostname==='YOUR_PROJECT.supabase.co')fail('Valid HTTPS Supabase project URL is required');else pass('Supabase URL format');}catch{fail('NEXT_PUBLIC_SUPABASE_URL missing or invalid')}
if(!key||/YOUR_|PLACEHOLDER|CHANGE_ME/i.test(key))fail('NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured');
else if(/service_role/i.test(key))fail('Do not use a service_role key in browser environment');
else pass('Public key configured (not validated remotely)');
for(const name of ['supabase/schema.sql','supabase/phase2.sql','supabase/phase5_quotation_uniqueness.sql']){
 if(!existsSync(resolve(base,name)))fail('Missing migration '+name);else pass('Found migration '+name);
}
if(!existsSync(resolve(base,'node_modules/next/package.json')))fail('Dependencies missing: run npm ci or npm install');
else pass('Next.js dependency installed');
notes.push('This preflight does NOT verify remote database migrations, live auth, email, RLS behavior, or a successful Next.js build.');
notes.forEach(n=>console.log('NOTE:',n));
process.exitCode=errors?1:0;
