import { createClient } from 'npm:@supabase/supabase-js@2.111.0';
import { appHTML } from './bundle.ts';
import { createHandler } from './handler.mjs';
const url=Deno.env.get('SUPABASE_URL')||'';
let key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
try { key=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||key } catch {}
const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(createHandler({admin,appHTML}));
