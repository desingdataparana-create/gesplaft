// Cifrado del respaldo en el navegador: PBKDF2-SHA256 (600 000 iteraciones) + AES-256-GCM.
// Formato del archivo: {formato:'gesplaft-respaldo-cifrado',version:1,kdf,iteraciones,sal,iv,datos} con valores en base64.
const ITERATIONS=600000;
const b64=(bytes:Uint8Array)=>{let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s)};
export async function encryptBackup(plain:string,password:string){
 const enc=new TextEncoder(),salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const base=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);
 const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt']);
 const data=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(plain)));
 return JSON.stringify({formato:'gesplaft-respaldo-cifrado',version:1,kdf:'PBKDF2-SHA256',iteraciones:ITERATIONS,sal:b64(salt),iv:b64(iv),datos:b64(data)});
}
