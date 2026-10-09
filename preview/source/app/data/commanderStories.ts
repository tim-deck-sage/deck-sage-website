import { atraxaStory } from './stories/atraxa';
import { avacynStory } from './stories/avacyn';
import { edgarStory } from './stories/edgar';
import { krenkoStory } from './stories/krenko';
import { lathrilStory } from './stories/lathril';

export type CommanderStory = {
  id: string;
  name: string;
  image: any;
  story: string;
};

export const commanderStories: CommanderStory[] = [
  atraxaStory,
  krenkoStory,
  avacynStory,
  edgarStory,
  lathrilStory,
];
