import type { ImageSourcePropType } from 'react-native';

export type ThemeSongCategory =
  | 'fan-favorites'
  | 'dragon-commanders'
  | 'tribal-leaders'
  | 'villains'
  | 'celestial';

export type ThemeSong = {
  id: string;
  commanderName: string;
  songTitle: string;
  audioFile: any | null;
  artwork: ImageSourcePropType;
  categories: ThemeSongCategory[];
};

export const themeSongs: ThemeSong[] = [
  {
    id: 'atraxa',
    commanderName: "Atraxa, Praetors' Voice",
    songTitle: 'Wrath of Perfection',
    audioFile: require('../../assets/audio/AtraxaPraetor.mp3'),
    artwork: require('../../assets/images/commanders/Atraxa.png'),
    categories: ['fan-favorites', 'villains'],
  },
  {
    id: 'azusa',
    commanderName: 'Azusa, Lost but Seeking',
    songTitle: 'Endless Lands',
    audioFile: require('../../assets/audio/AzusaLostButSeeking.mp3'),
    artwork: require('../../assets/images/Styles/Forest.png'),
    categories: ['fan-favorites', 'tribal-leaders'],
  },
  {
    id: 'giada',
    commanderName: 'Giada, Font of Hope',
    songTitle: 'Light of the Host',
    audioFile: require('../../assets/audio/GiadaFontOfHope.mp3'),
    artwork: require('../../assets/images/commanders/Avacyn.png'),
    categories: ['fan-favorites', 'celestial'],
  },
  {
    id: 'kaalia',
    commanderName: 'Kaalia of the Vast',
    songTitle: 'Angels Descend',
    audioFile: require('../../assets/audio/KaaliaOfTheVast.mp3'),
    artwork: require('../../assets/images/commanders/Fight.png'),
    categories: ['fan-favorites', 'dragon-commanders', 'celestial'],
  },
  {
    id: 'sephiroth',
    commanderName: 'Sephiroth',
    songTitle: 'One-Winged Ruin',
    audioFile: require('../../assets/audio/Sephiroth.mp3'),
    artwork: require('../../assets/images/commanders/Edgar.png'),
    categories: ['fan-favorites', 'villains'],
  },
  {
    id: 'ur-dragon',
    commanderName: 'The Ur-Dragon',
    songTitle: 'Skyfire Dominion',
    audioFile: require('../../assets/audio/UrDragon.mp3'),
    artwork: require('../../assets/images/commanders/Sliver.png'),
    categories: ['fan-favorites', 'dragon-commanders', 'tribal-leaders'],
  },
];
