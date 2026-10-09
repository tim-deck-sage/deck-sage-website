import {STORAGE_KEY,baseState,validateState} from '../model';

// Synchronous persistence boundary used by the preview; never transmits collections.
export function createBrowserWorkspace(storage){
 return Object.freeze({kind:'browser-local',capabilities:{authenticated:false,cloudSync:false},
  load(){try{const text=storage.getItem(STORAGE_KEY);return text?validateState(JSON.parse(text)):baseState();}catch{return baseState();}},
  save(state){const validated=validateState(state);storage.setItem(STORAGE_KEY,JSON.stringify(validated));},
 });
}
