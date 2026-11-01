export function analyticsEvent(name,parameters){try{return globalThis.DeckSageAnalytics?.track(name,parameters)||false;}catch{return false;}}
