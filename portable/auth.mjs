import {scrypt as callback,randomBytes,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(callback);
export const tokenHash=v=>createHash('sha256').update(v).digest('hex');
export async function hashPassword(v){if(typeof v!=='string'||v.length<12||v.length>256)throw Error('Usá una contraseña de 12 a 256 caracteres.');const salt=randomBytes(16).toString('hex');return `${salt}:${Buffer.from(await scrypt(v,salt,64)).toString('hex')}`;}
const dummy=await hashPassword('Fictional-not-usable-password');
export async function verifyPassword(v,encoded){if(typeof v!=='string'||v.length>256)return false;const [salt,h]=(encoded||dummy).split(':'),actual=Buffer.from(await scrypt(v,salt,64)),expected=Buffer.from(h,'hex');return !!encoded&&actual.length===expected.length&&timingSafeEqual(actual,expected);}
