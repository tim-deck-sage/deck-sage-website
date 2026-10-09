export type NewsTag =
  | 'Commander'
  | 'Arena'
  | 'Competitive'
  | 'Collectors'
  | 'Finance'
  | 'New Set'
  | 'Rules'
  | 'Community'
  | 'Products'
  | 'MTGO';

export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  whyItMatters: string;
  tags: NewsTag[];
  imageUrl: string | null;
  articleUrl: string;
  publishedAt: string;
  source: string;
};
