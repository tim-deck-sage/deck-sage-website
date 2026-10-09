import type {
  CardDataProvider,
  CardDataSourceKind,
} from './cardDataProvider';
import {
  getMockIndexCardDataProvider,
} from './mockIndexCardDataProvider';

export interface CardDataProviderRegistry {
  getActiveProvider(): CardDataProvider;
  getProvider(source: CardDataSourceKind): CardDataProvider;
  setActiveSource(source: CardDataSourceKind): void;
  getActiveSource(): CardDataSourceKind;
  listAvailableSources(): CardDataSourceKind[];
}

type ProviderMap = Partial<Record<CardDataSourceKind, CardDataProvider>>;

class DefaultCardDataProviderRegistry implements CardDataProviderRegistry {
  private providers: ProviderMap;
  private activeSource: CardDataSourceKind;

  constructor() {
    const mockProvider = getMockIndexCardDataProvider();

    this.providers = {
      'mock-index': mockProvider,
    };

    this.activeSource = 'mock-index';
  }

  getActiveProvider(): CardDataProvider {
    return this.getProvider(this.activeSource);
  }

  getProvider(source: CardDataSourceKind): CardDataProvider {
    const provider = this.providers[source];

    if (!provider) {
      throw new Error(
        `Card data provider "${source}" is not registered yet.`,
      );
    }

    return provider;
  }

  setActiveSource(source: CardDataSourceKind): void {
    if (!this.providers[source]) {
      throw new Error(
        `Cannot activate card data provider "${source}" because it is not registered.`,
      );
    }

    this.activeSource = source;
  }

  getActiveSource(): CardDataSourceKind {
    return this.activeSource;
  }

  listAvailableSources(): CardDataSourceKind[] {
    return Object.keys(this.providers) as CardDataSourceKind[];
  }
}

let sharedRegistry: CardDataProviderRegistry | null = null;

export function getCardDataProviderRegistry(): CardDataProviderRegistry {
  if (!sharedRegistry) {
    sharedRegistry = new DefaultCardDataProviderRegistry();
  }

  return sharedRegistry;
}

export function getActiveCardDataProvider(): CardDataProvider {
  return getCardDataProviderRegistry().getActiveProvider();
}

export function getActiveCardDataSource(): CardDataSourceKind {
  return getCardDataProviderRegistry().getActiveSource();
}

export function setActiveCardDataSource(source: CardDataSourceKind): void {
  getCardDataProviderRegistry().setActiveSource(source);
}

export function listAvailableCardDataSources(): CardDataSourceKind[] {
  return getCardDataProviderRegistry().listAvailableSources();
}

/**
 * Future expansion hook:
 * when we add a bundled dataset provider or backend provider,
 * we register it here without changing the rest of the app.
 */
export function isMockIndexProviderActive(): boolean {
  return getActiveCardDataSource() === 'mock-index';
}
