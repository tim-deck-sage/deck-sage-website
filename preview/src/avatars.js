// Original app IDs avatar1 … avatar19 map to the existing website IDs 1 … 19.
// Keep this closed list: a saved profile must never supply an arbitrary image URL.
export const AVATAR_NUMBERS=Object.freeze(Array.from({length:19},(_,i)=>i+1));
export function normalizeAvatarNumber(value){
 const number=Number(value);
 return Number.isInteger(number)&&AVATAR_NUMBERS.includes(number)?number:1;
}
export function avatarImagePath(value){return '/avatars/avatar'+normalizeAvatarNumber(value)+'.webp';}
