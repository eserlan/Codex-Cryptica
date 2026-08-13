export interface CreaturePackEntry {
  title: string;
  category: string;
  description: string;
  habitat: string;
  behaviour: string;
  threatLevel: string;
  variants: string[];
  hooks: string[];
  combatNotes?: string;
  image?: string;
}

export interface CreaturePack {
  id: string;
  name: string;
  description: string;
  genre: string;
  entries: CreaturePackEntry[];
  parentPackId?: string;
  credits?: string;
}
