import React from 'react';

// Display copy only. Never pass these words back to scoring or card retrieval.
const counsel={
 balance:{eyebrow:'THE FOUNDATIONS OF YOUR SPELLBOOK',title:'Deck Balance',description:'Come, let us weigh the foundations. Lands, answers, and engines each have their work to do. These counts and targets will show where your plan stands firm, and where it needs tending.'},
 power:{eyebrow:'A MEASURE, NOT A PROPHECY',title:'Sage Rating',description:'A powerful spell is only part of the tale. Let us consider how your cards work together, then read the evidence behind this estimate. No number can promise the outcome of a game.'},
 strategy:{eyebrow:'FROM THE FIRST LAND TO THE FINAL SPELL',title:'Strategy',description:'Every spellbook asks to be piloted with care. Follow the plan your cards support, watch for the moments that matter, and keep a little wisdom in reserve.'}
};
export function AnalysisIntro({tab}){const copy=counsel[tab];return copy?<header className="analysis-editorial-intro"><span className="eyebrow">{copy.eyebrow}</span><h2>{copy.title}</h2><p>{copy.description}</p></header>:null;}
