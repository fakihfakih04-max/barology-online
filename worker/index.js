const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Content-Type": "application/json; charset=utf-8"
};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:corsHeaders});
const enc=new TextEncoder();
const b64u=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
const unb64u=s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
async function hmac(secret,data){const k=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return b64u(await crypto.subtle.sign("HMAC",k,enc.encode(data)))}
async function hashPassword(password,salt){const key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:enc.encode(salt),iterations:210000,hash:"SHA-256"},key,256);return b64u(bits)}
async function tokenFor(user,env){const payload=b64u(enc.encode(JSON.stringify({sub:user.id,email:user.email,exp:Math.floor(Date.now()/1000)+60*60*24*7})));const sig=await hmac(env.JWT_SECRET,payload);return payload+"."+sig}
async function auth(req,env){const header=req.headers.get("Authorization")||"";const token=header.startsWith("Bearer ")?header.slice(7):"";const [payload,sig]=token.split(".");if(!payload||!sig)throw new Error("Please sign in.");if(await hmac(env.JWT_SECRET,payload)!==sig)throw new Error("Invalid session.");const data=JSON.parse(new TextDecoder().decode(unb64u(payload)));if(data.exp<Date.now()/1000)throw new Error("Session expired. Sign in again.");return data}
async function handle(req,env){
 if(req.method==="OPTIONS")return new Response(null,{headers:corsHeaders});
 const url=new URL(req.url),path=url.pathname;
 if(path==="/health")return json({ok:true,service:"BAROLOGY API"});
 if(path==="/auth/setup"&&req.method==="POST"){
  const body=await req.json();if(!env.SETUP_SECRET||body.setupSecret!==env.SETUP_SECRET)return json({error:"Invalid setup secret."},403);
  const email=String(body.email||"").trim().toLowerCase(),password=String(body.password||"");
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||password.length<12)return json({error:"Use a valid email and a password of at least 12 characters."},400);
  const exists=await env.DB.prepare("SELECT id FROM users LIMIT 1").first();if(exists)return json({error:"Initial account already created. Ask an administrator to add users."},409);
  const id=crypto.randomUUID(),salt=b64u(crypto.getRandomValues(new Uint8Array(16))),hash=await hashPassword(password,salt);
  await env.DB.prepare("INSERT INTO users(id,email,salt,password_hash,role,created_at) VALUES(?,?,?,?,?,?)").bind(id,email,salt,hash,"admin",new Date().toISOString()).run();
  await env.DB.prepare("INSERT INTO workspace(id,payload,version,updated_at,updated_by) VALUES('main','{}',1,?,?)").bind(new Date().toISOString(),id).run();
  return json({ok:true,message:"Admin account created. Sign in now."},201);
 }
 if(path==="/auth/login"&&req.method==="POST"){
  const body=await req.json(),email=String(body.email||"").trim().toLowerCase(),password=String(body.password||"");
  const user=await env.DB.prepare("SELECT id,email,salt,password_hash,role FROM users WHERE email=?").bind(email).first();
  if(!user)return json({error:"Email or password is incorrect."},401);
  const candidate=await hashPassword(password,user.salt);if(candidate!==user.password_hash)return json({error:"Email or password is incorrect."},401);
  return json({token:await tokenFor(user,env),user:{id:user.id,email:user.email,role:user.role}});
 }
 if(path==="/api/workspace"&&(req.method==="GET"||req.method==="PUT")){
  let user;try{user=await auth(req,env)}catch(e){return json({error:e.message},401)}
  if(req.method==="GET"){
   const row=await env.DB.prepare("SELECT payload,version,updated_at FROM workspace WHERE id='main'").first();
   return json({payload:row?JSON.parse(row.payload):{},version:row?.version||0,updatedAt:row?.updated_at||null});
  }
  const body=await req.json(),payload=body.payload;
  if(!payload||typeof payload!=="object"||Array.isArray(payload))return json({error:"Invalid workspace payload."},400);
  const current=await env.DB.prepare("SELECT version FROM workspace WHERE id='main'").first();
  const version=current?.version||0;
  if(Number(body.version)!==version)return json({error:"SYNC_CONFLICT: another device saved newer data. Reload before saving."},409);
  const next=version+1,now=new Date().toISOString();
  await env.DB.prepare("UPDATE workspace SET payload=?,version=?,updated_at=?,updated_by=? WHERE id='main' AND version=?").bind(JSON.stringify(payload),next,now,user.sub,version).run();
  return json({ok:true,version:next,updatedAt:now});
 }
 return json({error:"Not found."},404);
}
export default {async fetch(req,env){try{return await handle(req,env)}catch(e){return json({error:"Server error: "+e.message},500)}}};
