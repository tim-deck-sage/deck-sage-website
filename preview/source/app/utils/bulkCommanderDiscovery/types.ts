import type { BulkCard } from '../../types/bulk';

export type CommanderDiscoveryStatus =
  | 'confirmed_standalone'
  | 'not_eligible'
  | 'insufficient_metadata'
  | 'unsupported_configuration';

export type CommanderMetadataIssue =
  | 'missing_type_line'
  | 'missing_oracle_text'
  | 'missing_color_identity'
  | 'missing_oracle_id'
  | 'missing_artwork';

export type UnsupportedCommanderMechanic =
  | 'partner'
  | 'partner_with'
  | 'friends_forever'
  | 'choose_a_background'
  | 'background'
  | 'doctors_companion'
  | 'multiple_commanders';

export type CommanderPrintingSummary = Pick<
  BulkCard,
  'scryfallId' | 'setName' | 'cardVariant' | 'imageUrl'
> & {
  quantity: number;
};

export type DiscoveredCommander = {
  id: string;
  status: 'confirmed_standalone';
  name: string;
  normalizedName: string;
  oracleId?: string;
  scryfallId?: string;
  typeLine: string;
  oracleText: string;
  colorIdentity: string[];
  imageUrl?: string;
  quantity: number;
  printings: CommanderPrintingSummary[];
  metadataIssues: CommanderMetadataIssue[];
  unsupportedMechanics: UnsupportedCommanderMechanic[];
};

export type CommanderDiscoveryDiagnostic = {
  id: string;
  status: Exclude<CommanderDiscoveryStatus, 'confirmed_standalone'>;
  name: string;
  normalizedName: string;
  oracleId?: string;
  scryfallId?: string;
  reason: string;
  metadataIssues: CommanderMetadataIssue[];
  unsupportedMechanics: UnsupportedCommanderMechanic[];
};

export type CommanderDiscoveryResult = {
  commanders: DiscoveredCommander[];
  diagnostics: CommanderDiscoveryDiagnostic[];
  insufficientMetadataCount: number;
  unsupportedConfigurationCount: number;
};
