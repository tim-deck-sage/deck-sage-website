export const MAX_ARTWORK_BYTES=4*1024*1024;
export const MAX_AUDIO_BYTES=6*1024*1024;
export const SESSION_MS=15*60*1000;
export const CATEGORIES=new Set(['fan-favorites','dragon-commanders','tribal-leaders','villains','celestial']);

export function cleanLine(value,max){return String(value||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);}
export function cleanBody(value,max=20000){return String(value||'').replace(/\u0000/g,'').replace(/\r\n?/g,'\n').trim().slice(0,max);}
export function constantTimeEqual(left,right){const a=String(left||''),b=String(right||'');let mismatch=a.length^b.length;for(let index=0;index<Math.max(a.length,b.length);index++)mismatch|=(a.charCodeAt(index)||0)^(b.charCodeAt(index)||0);return mismatch===0;}
export function validPinConfiguration(value){return /^\d{4}$/.test(String(value||''));}
export function imageKind(bytes){
 if(bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return {mime:'image/jpeg',extension:'jpg'};
 if(bytes.length>=8&&[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((value,index)=>bytes[index]===value))return {mime:'image/png',extension:'png'};
 if(bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return {mime:'image/webp',extension:'webp'};
 return null;
}
export function audioKind(bytes){
 if(bytes.length>=3&&String.fromCharCode(...bytes.slice(0,3))==='ID3')return {mime:'audio/mpeg',extension:'mp3'};
 if(bytes.length>=2&&bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0)return {mime:'audio/mpeg',extension:'mp3'};
 if(bytes.length>=12&&String.fromCharCode(...bytes.slice(4,8))==='ftyp')return {mime:'audio/mp4',extension:'m4a'};
 if(bytes.length>=4&&String.fromCharCode(...bytes.slice(0,4))==='OggS')return {mime:'audio/ogg',extension:'ogg'};
 if(bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WAVE')return {mime:'audio/wav',extension:'wav'};
 return null;
}
export function validateFields(input){
 const kind=input.kind==='lore'||input.kind==='song'?input.kind:null,title=cleanLine(input.title,120),commanderName=cleanLine(input.commanderName,120)||null,body=cleanBody(input.body),categories=[...new Set(Array.isArray(input.categories)?input.categories.filter(value=>CATEGORIES.has(value)):[])];
 if(!kind)return {error:'Choose Lore or Song.'};
 if(!title)return {error:'Add a title.'};
 if(kind==='lore'&&body.length<20)return {error:'Lore text must be at least 20 characters.'};
 if(kind==='song'&&!categories.length)categories.push('fan-favorites');
 return {value:{kind,title,commanderName,body:kind==='lore'?body:null,categories:kind==='song'?categories:[]}};
}
