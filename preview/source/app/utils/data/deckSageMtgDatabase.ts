import * as SQLite from 'expo-sqlite';
import { importDatabaseFromAssetAsync } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { requireNativeModule } from 'expo';

export const DECK_SAGE_MTG_DATABASE_NAME = 'deck_sage_mtg.db';
export const DECK_SAGE_MTG_SCHEMA_VERSION = 2;
const DECK_SAGE_MTG_DATABASE_ASSET_ID = require('../../../assets/data/deck_sage_mtg.db');
const DECK_SAGE_MTG_DATABASE_KIND = 'offline_card_lookup';

const HEALTH_CHECK_METADATA_KEY = 'sqlite_health_check';
const HEALTH_CHECK_METADATA_VALUE = 'ok';
const SCHEMA_VERSION_METADATA_KEY = 'schema_version';
const DATABASE_KIND_METADATA_KEY = 'database_kind';
const ExpoSQLite = requireNativeModule<{
  defaultDatabaseDirectory?: string | null;
}>('ExpoSQLite');
let databaseAssetImportPromise: Promise<void> | null = null;
let databaseInstallSource: DeckSageMtgDatabaseInstallSource = 'unknown';

export const DECK_SAGE_MTG_APPROVED_TABLES = [
  'db_metadata',
  'offline_cards',
  'offline_card_aliases',
  'offline_card_search_terms',
  'update_manifest',
] as const;

type MetadataRow = {
  value: string;
};

type UserVersionRow = {
  user_version: number;
};

type TableExistsRow = {
  name: string;
};

type CountRow = {
  count: number;
};

type PageCountRow = {
  page_count: number;
};

type PageSizeRow = {
  page_size: number;
};

export type DeckSageMtgDatabaseHealthCheck = {
  databaseName: string;
  databasePath: string;
  databaseSizeBytes: number;
  installSource: DeckSageMtgDatabaseInstallSource;
  foreignKeysEnabled: boolean;
  journalMode: string;
  metadataRoundTripOk: boolean;
};

export type DeckSageMtgDatabaseInstallSource =
  | 'unknown'
  | 'installed'
  | 'imported';

type DeckSageMtgInstalledDatabaseValidation = {
  valid: boolean;
  reason: string;
};

export type DeckSageMtgTableStatus = {
  tableName: string;
  exists: boolean;
};

export type DeckSageMtgDatabaseSchemaStatus = {
  schemaVersionFromMetadata: string | null;
  userVersion: number;
  tableStatuses: DeckSageMtgTableStatus[];
};

export type DeckSageMtgDatabaseTableCounts = {
  cards: number;
  aliases: number;
  searchTerms: number;
};

export async function openDeckSageMtgDatabase() {
  await ensureDeckSageMtgDatabaseAssetImported();

  return SQLite.openDatabaseAsync(DECK_SAGE_MTG_DATABASE_NAME);
}

async function ensureDeckSageMtgDatabaseAssetImported() {
  if (!databaseAssetImportPromise) {
    databaseAssetImportPromise = ensureDeckSageMtgDatabaseInstalled();
  }

  try {
    await databaseAssetImportPromise;
  } catch (error) {
    databaseAssetImportPromise = null;
    throw error;
  }
}

async function ensureDeckSageMtgDatabaseInstalled() {
  const installedValidation = await validateInstalledDeckSageMtgDatabase();

  if (installedValidation.valid) {
    databaseInstallSource = 'installed';
    console.log('[Deck Sage SQLite] Using installed deck_sage_mtg.db.');
    return;
  }

  console.log(
    `[Deck Sage SQLite] Installed deck_sage_mtg.db unavailable or invalid: ${installedValidation.reason}. Importing bundled DB.`
  );

  await importDatabaseFromAssetAsync(
    DECK_SAGE_MTG_DATABASE_NAME,
    {
      assetId: DECK_SAGE_MTG_DATABASE_ASSET_ID,
      forceOverwrite: false,
    }
  );

  const importedValidation = await validateInstalledDeckSageMtgDatabase();

  if (!importedValidation.valid) {
    databaseInstallSource = 'unknown';
    throw new Error(
      `Bundled deck_sage_mtg.db import did not produce a valid offline database: ${importedValidation.reason}`
    );
  }

  databaseInstallSource = 'imported';
  console.log('[Deck Sage SQLite] Imported bundled deck_sage_mtg.db.');
}

async function validateInstalledDeckSageMtgDatabase(): Promise<DeckSageMtgInstalledDatabaseValidation> {
  const databasePath = createDeckSageMtgDatabasePath();
  const fileInfo = await FileSystem.getInfoAsync(toFileUri(databasePath));

  if (!fileInfo.exists) {
    return {
      valid: false,
      reason: `database file is missing at ${databasePath}`,
    };
  }

  if (fileInfo.isDirectory) {
    return {
      valid: false,
      reason: `database path is a directory at ${databasePath}`,
    };
  }

  let db: Awaited<ReturnType<typeof SQLite.openDatabaseAsync>> | null = null;

  try {
    db = await SQLite.openDatabaseAsync(DECK_SAGE_MTG_DATABASE_NAME);

    const [
      userVersionRow,
      schemaVersionRow,
      databaseKindRow,
      cardCountRow,
      aliasCountRow,
      searchTermCountRow,
    ] = await Promise.all([
      db.getFirstAsync<UserVersionRow>('PRAGMA user_version'),
      db.getFirstAsync<MetadataRow>(
        'SELECT value FROM db_metadata WHERE key = $key',
        { $key: SCHEMA_VERSION_METADATA_KEY }
      ),
      db.getFirstAsync<MetadataRow>(
        'SELECT value FROM db_metadata WHERE key = $key',
        { $key: DATABASE_KIND_METADATA_KEY }
      ),
      db.getFirstAsync<CountRow>('SELECT COUNT(*) AS count FROM offline_cards'),
      db.getFirstAsync<CountRow>('SELECT COUNT(*) AS count FROM offline_card_aliases'),
      db.getFirstAsync<CountRow>('SELECT COUNT(*) AS count FROM offline_card_search_terms'),
    ]);

    if ((userVersionRow?.user_version ?? 0) !== DECK_SAGE_MTG_SCHEMA_VERSION) {
      return {
        valid: false,
        reason: `PRAGMA user_version is ${userVersionRow?.user_version ?? 'missing'}, expected ${DECK_SAGE_MTG_SCHEMA_VERSION}`,
      };
    }

    if (schemaVersionRow?.value !== String(DECK_SAGE_MTG_SCHEMA_VERSION)) {
      return {
        valid: false,
        reason: `db_metadata.schema_version is ${schemaVersionRow?.value ?? 'missing'}, expected ${DECK_SAGE_MTG_SCHEMA_VERSION}`,
      };
    }

    if (databaseKindRow?.value !== DECK_SAGE_MTG_DATABASE_KIND) {
      return {
        valid: false,
        reason: `db_metadata.database_kind is ${databaseKindRow?.value ?? 'missing'}, expected ${DECK_SAGE_MTG_DATABASE_KIND}`,
      };
    }

    if ((cardCountRow?.count ?? 0) <= 0) {
      return {
        valid: false,
        reason: 'offline_cards has no rows',
      };
    }

    if ((aliasCountRow?.count ?? 0) <= 0) {
      return {
        valid: false,
        reason: 'offline_card_aliases has no rows',
      };
    }

    if ((searchTermCountRow?.count ?? 0) <= 0) {
      return {
        valid: false,
        reason: 'offline_card_search_terms has no rows',
      };
    }

    return {
      valid: true,
      reason: 'installed database is valid',
    };
  } catch (error) {
    return {
      valid: false,
      reason: formatDatabaseValidationError(error),
    };
  } finally {
    await db?.closeAsync();
  }
}

function toFileUri(path: string) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) {
    return path;
  }

  return `file://${path}`;
}

function createDeckSageMtgDatabasePath() {
  const directory = ExpoSQLite.defaultDatabaseDirectory;

  if (!directory) {
    throw new Error('ExpoSQLite.defaultDatabaseDirectory is unavailable.');
  }

  return `${removeTrailingSlash(directory)}/${removeLeadingSlash(DECK_SAGE_MTG_DATABASE_NAME)}`;
}

function removeTrailingSlash(path: string) {
  return path.replace(/\/*$/, '');
}

function removeLeadingSlash(path: string) {
  return path.replace(/^\/+/, '');
}

function formatDatabaseValidationError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export const createDeckSageMtgSchemaSql = `
  CREATE TABLE IF NOT EXISTS db_metadata (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS offline_cards (
    oracle_id TEXT PRIMARY KEY NOT NULL,
    scryfall_id TEXT,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    mana_cost TEXT,
    cmc REAL,
    type_line TEXT,
    colors_json TEXT,
    color_identity_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS offline_card_aliases (
    alias_id INTEGER PRIMARY KEY AUTOINCREMENT,
    oracle_id TEXT NOT NULL,
    alias TEXT NOT NULL,
    normalized_alias TEXT NOT NULL,
    source TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (oracle_id) REFERENCES offline_cards(oracle_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS offline_card_search_terms (
    term_id INTEGER PRIMARY KEY AUTOINCREMENT,
    oracle_id TEXT NOT NULL,
    term TEXT NOT NULL,
    term_type TEXT NOT NULL,
    weight REAL NOT NULL DEFAULT 1,
    source TEXT NOT NULL DEFAULT 'build',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (oracle_id) REFERENCES offline_cards(oracle_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS update_manifest (
    version TEXT PRIMARY KEY NOT NULL,
    data_version TEXT,
    source TEXT NOT NULL,
    source_updated_at TEXT,
    download_url TEXT,
    sha256 TEXT,
    size_bytes INTEGER,
    strategy TEXT NOT NULL DEFAULT 'full_replacement',
    status TEXT NOT NULL DEFAULT 'installed',
    installed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_offline_cards_normalized_name
    ON offline_cards(normalized_name);
  CREATE INDEX IF NOT EXISTS idx_offline_card_aliases_normalized_alias
    ON offline_card_aliases(normalized_alias);
  CREATE INDEX IF NOT EXISTS idx_offline_card_search_terms_term
    ON offline_card_search_terms(term);
`;

export async function initializeDeckSageMtgDatabase() {
  const db = await openDeckSageMtgDatabase();

  await db.execAsync(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = DELETE;
    PRAGMA user_version = ${DECK_SAGE_MTG_SCHEMA_VERSION};
  `);
  await db.execAsync(createDeckSageMtgSchemaSql);
  await db.runAsync(
    `
      INSERT INTO db_metadata (key, value, updated_at)
      VALUES ($key, $value, $updatedAt)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `,
    {
      $key: SCHEMA_VERSION_METADATA_KEY,
      $value: String(DECK_SAGE_MTG_SCHEMA_VERSION),
      $updatedAt: new Date().toISOString(),
    }
  );

  return db;
}

export async function runDeckSageMtgDatabaseHealthCheck(): Promise<DeckSageMtgDatabaseHealthCheck> {
  const db = await initializeDeckSageMtgDatabase();

  try {
    const now = new Date().toISOString();

    await db.runAsync(
      `
        INSERT INTO db_metadata (key, value, updated_at)
        VALUES ($key, $value, $updatedAt)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `,
      {
        $key: HEALTH_CHECK_METADATA_KEY,
        $value: HEALTH_CHECK_METADATA_VALUE,
        $updatedAt: now,
      }
    );

    const row = await db.getFirstAsync<MetadataRow>(
      'SELECT value FROM db_metadata WHERE key = $key',
      { $key: HEALTH_CHECK_METADATA_KEY }
    );
    const foreignKeys = await db.getFirstAsync<{ foreign_keys: number }>(
      'PRAGMA foreign_keys'
    );
    const journalMode = await db.getFirstAsync<{ journal_mode: string }>(
      'PRAGMA journal_mode'
    );
    const pageCount = await db.getFirstAsync<PageCountRow>('PRAGMA page_count');
    const pageSize = await db.getFirstAsync<PageSizeRow>('PRAGMA page_size');

    return {
      databaseName: DECK_SAGE_MTG_DATABASE_NAME,
      databasePath: db.databasePath,
      databaseSizeBytes: (pageCount?.page_count ?? 0) * (pageSize?.page_size ?? 0),
      installSource: databaseInstallSource,
      foreignKeysEnabled: foreignKeys?.foreign_keys === 1,
      journalMode: journalMode?.journal_mode || 'unknown',
      metadataRoundTripOk: row?.value === HEALTH_CHECK_METADATA_VALUE,
    };
  } finally {
    await db.closeAsync();
  }
}

export async function getDeckSageMtgDatabaseSchemaStatus(): Promise<DeckSageMtgDatabaseSchemaStatus> {
  const db = await initializeDeckSageMtgDatabase();

  try {
    const metadataRow = await db.getFirstAsync<MetadataRow>(
      'SELECT value FROM db_metadata WHERE key = $key',
      { $key: SCHEMA_VERSION_METADATA_KEY }
    );
    const userVersionRow = await db.getFirstAsync<UserVersionRow>(
      'PRAGMA user_version'
    );
    const tableStatuses = await Promise.all(
      DECK_SAGE_MTG_APPROVED_TABLES.map(async (tableName) => {
        const row = await db.getFirstAsync<TableExistsRow>(
          `
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name = $tableName
            LIMIT 1
          `,
          { $tableName: tableName }
        );

        return {
          tableName,
          exists: row?.name === tableName,
        };
      })
    );

    return {
      schemaVersionFromMetadata: metadataRow?.value || null,
      userVersion: userVersionRow?.user_version ?? 0,
      tableStatuses,
    };
  } finally {
    await db.closeAsync();
  }
}

export async function getDeckSageMtgDatabaseTableCounts(): Promise<DeckSageMtgDatabaseTableCounts> {
  const db = await initializeDeckSageMtgDatabase();

  try {
    const [cards, aliases, searchTerms] = await Promise.all([
      db.getFirstAsync<CountRow>('SELECT COUNT(*) AS count FROM offline_cards'),
      db.getFirstAsync<CountRow>('SELECT COUNT(*) AS count FROM offline_card_aliases'),
      db.getFirstAsync<CountRow>('SELECT COUNT(*) AS count FROM offline_card_search_terms'),
    ]);

    return {
      cards: cards?.count ?? 0,
      aliases: aliases?.count ?? 0,
      searchTerms: searchTerms?.count ?? 0,
    };
  } finally {
    await db.closeAsync();
  }
}
