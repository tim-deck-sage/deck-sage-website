export const POLICY_VERSION='web-2026-10-09-v1';
export const USERNAME_PATTERN=/^[a-z0-9_]{3,24}$/;
export function normalizeUsername(username){
 const normalized=username.trim().toLowerCase();
 if(!USERNAME_PATTERN.test(normalized))throw Error('Username must be 3–24 letters, numbers, or underscores.');
 return normalized;
}
export function consentInput(username,terms,privacy){
 const normalized=normalizeUsername(username);
 if(terms!==true||privacy!==true)throw Error('Please affirm Terms and Privacy to finish account setup.');
 return {p_username:normalized,p_version:POLICY_VERSION,p_terms:true,p_privacy:true};
}
