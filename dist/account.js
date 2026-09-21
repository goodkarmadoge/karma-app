// Magic-link sign-in, the reader's first name, and the practice record kept in
// step with the server. Shares its account with the handscroll build: one
// reader, one streak, whichever build they opened.
//
// Signing in is optional and stays optional. The local record is still the whole
// record when nobody is signed in and still what the home screen reads when
// somebody is, so the app opens, counts a session and shows a streak with no
// network at all. Two consequences of that are load-bearing here: supabase-js is
// behind a dynamic import inside start(), so 137 kB never sits in front of the
// painting or the Begin button; and every method works with no client, so a
// failed import quietly stops offering sign-in and changes nothing else.
//
// Implicit flow rather than PKCE on purpose: PKCE keeps its verifier in the
// browser that asked for the link, so a link opened in a mail app's in-app
// browser fails. The fragment never reaches a server and is scrubbed on arrival.
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,APP} from './config.js';
const redirectTo=()=>`${location.origin}${location.pathname}`;
function readable(error){
  if(!error)return null;
  const status=error.status??0,text=String(error.message||'');
  if(status===429||/rate limit|too many/i.test(text))return 'That is a lot of links at once. Wait a minute and try again.';
  if(status===400&&/email/i.test(text))return 'That email address does not look right.';
  if(status>=500)return 'The server is not answering. Try again shortly.';
  return 'Something went wrong sending your link. Try again.';
}
function scrubUrl(){
  if(!location.hash.includes('access_token')&&!location.hash.includes('error'))return;
  history.replaceState(null,'',`${location.pathname}${location.search}`);
}
export function createAccount(){
  let client=null,session=null,profile=null;
  const listeners=new Set();
  const snapshot=()=>({available:Boolean(client),signedIn:Boolean(session),email:session?.user?.email??null,userId:session?.user?.id??null,firstName:profile?.first_name??null});
  const emit=()=>{for(const fn of listeners)fn(snapshot());};
  async function loadProfile(){
    if(!client||!session){profile=null;return;}
    // The profile row is written by a trigger on signup; on the first return the
    // read can land first, and the name arrives with the next auth event.
    const {data,error}=await client.from('profiles').select('first_name').eq('id',session.user.id).maybeSingle();
    profile=error?null:data;
  }
  return {
    get snapshot(){return snapshot();},
    onChange(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
    async start(){
      const {createClient}=await import('./vendor/supabase.module.js');
      client=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{storageKey:'karma.auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit'}});
      client.auth.onAuthStateChange(async(_event,next)=>{
        const changed=next?.user?.id!==session?.user?.id;
        session=next;if(changed)await loadProfile();scrubUrl();emit();
      });
      const {data}=await client.auth.getSession();
      session=data.session??null;await loadProfile();scrubUrl();emit();
      return snapshot();
    },
    async sendLink(email,firstName){
      if(!client)return {ok:false,message:'Sign-in is not reachable right now. Try again later.'};
      const {error}=await client.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:redirectTo(),shouldCreateUser:true,data:{first_name:firstName.trim()}}});
      return {ok:!error,message:readable(error)};
    },
    async signOut(){if(client)await client.auth.signOut();session=null;profile=null;emit();},
    async rename(firstName){
      if(!client||!session)return {ok:false};
      const name=firstName.trim();
      const {error}=await client.from('profiles').update({first_name:name}).eq('id',session.user.id);
      if(error)return {ok:false};
      profile={first_name:name};emit();return {ok:true};
    },
    // Hand the account this device's days, take back the union.
    async sync(localDays){
      if(!client||!session)return null;
      const {data,error}=await client.rpc('merge_practice_days',{p_days:localDays});
      return error?null:data.map(row=>row.day);
    },
    // Failure is silent: the local record already has it, and the next sync pushes it up.
    async recordCompletion(day){
      if(!client||!session)return null;
      const {error}=await client.rpc('record_practice_day',{p_day:day,p_app:APP});
      return error?null:true;
    }
  };
}
