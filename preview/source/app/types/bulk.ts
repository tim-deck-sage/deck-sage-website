// app/app/types/bulk.ts

import type { CloudSyncMetadata } from './cloudSync';

export type BulkCard = {
  name: string;
  quantity: number;

  oracleId?: string;
  scryfallId?: string;
  imageUrl?: string;
  imageUri?: string;

  manaCost?: string;
  cmc?: number;

  colors?: string[];
  colorIdentity?: string[];
  typeLine?: string;
  oracleText?: string;

  power?: string;
  toughness?: string;
  keywords?: string[];

  setName?: string;
  rarity?: string;
  cardVariant?: 'Normal' | 'Foil' | 'Full Art';
} & CloudSyncMetadata;

export type BulkCollection = BulkCard[];
