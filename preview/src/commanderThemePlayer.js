import {themeSongs} from '../source/app/data/themeSongsData';

const initialState={currentSongId:null,isPlaying:false,isLoading:false,loadingSongId:null,isShuffleMode:false,error:''};
let state={...initialState},audio=null,operation=0,isAdvancing=false,catalog=[...themeSongs];
const listeners=new Set();

const emit=()=>listeners.forEach(listener=>listener());
const update=patch=>{state={...state,...patch};emit();};
const currentSong=()=>catalog.find(song=>song.id===state.currentSongId)||null;

function ensureAudio(){
 if(audio)return audio;
 audio=new Audio();
 audio.preload='metadata';
 audio.addEventListener('playing',()=>update({isPlaying:true,isLoading:false,loadingSongId:null,error:''}));
 audio.addEventListener('pause',()=>{if(state.currentSongId)update({isPlaying:false});});
 audio.addEventListener('ended',()=>{update({isPlaying:false});if(state.isShuffleMode)void commanderThemePlayer.playNext();});
 audio.addEventListener('error',()=>{if(state.currentSongId)update({isPlaying:false,isLoading:false,loadingSongId:null,error:`${currentSong()?.songTitle||'This track'} could not be played.`});});
 return audio;
}

async function start(song,{shuffle=false}={}){
 if(state.isLoading||!song?.audioFile)return false;
 const player=ensureAudio(),token=++operation;
 update({currentSongId:song.id,isPlaying:false,isLoading:true,loadingSongId:song.id,isShuffleMode:shuffle,error:''});
 try{
  if(player.src!==new URL(song.audioFile,location.href).href){player.src=song.audioFile;player.load();}
  await player.play();
  if(token===operation)update({isPlaying:true,isLoading:false,loadingSongId:null});
  return token===operation;
 }catch{
  if(token===operation)update({isPlaying:false,isLoading:false,loadingSongId:null,error:`${song.songTitle} could not be played.`});
  return false;
 }
}

export const commanderThemePlayer={
 getSnapshot:()=>state,
 setCatalog(songs){catalog=Array.isArray(songs)&&songs.length?songs:[...themeSongs];if(state.currentSongId&&!catalog.some(song=>song.id===state.currentSongId))void this.stop();},
 subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
 async playSong(song,options){return start(song,options);},
 async pause(){if(!audio||!state.currentSongId)return false;audio.pause();update({isPlaying:false});return true;},
 async resume(){if(!audio||!state.currentSongId||state.isLoading)return false;update({isLoading:true,loadingSongId:state.currentSongId,error:''});try{await audio.play();update({isPlaying:true,isLoading:false,loadingSongId:null});return true;}catch{update({isPlaying:false,isLoading:false,loadingSongId:null,error:`${currentSong()?.songTitle||'This track'} could not be played.`});return false;}},
 async toggleSong(song){if(state.isLoading)return false;if(state.currentSongId===song.id)return state.isPlaying?this.pause():this.resume();return start(song,{shuffle:false});},
 async shuffleAll(){if(state.isLoading||!catalog.length)return false;const candidates=catalog.length>1?catalog.filter(song=>song.id!==state.currentSongId):catalog;return start(candidates[Math.floor(Math.random()*candidates.length)]||catalog[0],{shuffle:true});},
 async playNext(){if(isAdvancing||!catalog.length)return false;isAdvancing=true;try{const candidates=catalog.length>1?catalog.filter(song=>song.id!==state.currentSongId):catalog;return await start(candidates[Math.floor(Math.random()*candidates.length)]||catalog[0],{shuffle:true});}finally{isAdvancing=false;}},
 async stop(){operation++;state={...initialState};emit();if(audio){audio.pause();audio.currentTime=0;audio.removeAttribute('src');audio.load();}return true;},
 clearError(){if(state.error)update({error:''});},
};
