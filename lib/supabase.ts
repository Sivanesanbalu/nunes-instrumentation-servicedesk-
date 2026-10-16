import {createClient,SupabaseClient} from '@supabase/supabase-js';
let cached:SupabaseClient|null=null;
export function db(){if(cached)return cached;const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY first');cached=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true}});return cached}
