export type ScryfallCardData = {
  id?: string;
  oracle_id?: string;
  name: string;

  image_url?: string;
  art_crop_url?: string;

  mana_cost?: string;
  cmc?: number;

  type_line?: string;
  oracle_text?: string;

  colors?: string[];
  color_identity?: string[];

  power?: string;
  toughness?: string;

  keywords?: string[];

  set_name?: string;
  rarity?: string;

  prices?: {
    usd?: string;
    usd_foil?: string;
  };
};

export type ScryfallBestPrintingData = {
  name: string;
  scryfallId?: string;
  imageUrl?: string;
  largeImageUrl?: string;
  pngImageUrl?: string;
  artCropUrl?: string;
  selectedReason: string;
  rankingReason: string;
  setName?: string;
  setType?: string;
  setCode?: string;
  collectorNumber?: string;
  promoTypes?: string[];
  frameEffects?: string[];
  finishes?: string[];
  borderColor?: string;
  fullArt?: boolean;
  layout?: string;
};

export type ResolvedCardResult = {
  resolvedName: string | null;
  cardData: ScryfallCardData | null;
};

export type ScryfallFailureReason =
  | 'none'
  | 'not_found'
  | 'rate_limited'
  | 'http_error'
  | 'network_error'
  | 'timeout'
  | 'unknown';

type FetchScryfallResult =
  | { ok: true; data: any }
  | {
      ok: false;
      status: number | null;
      reason: Exclude<ScryfallFailureReason, 'none' | 'unknown'>;
      retryAfterMs?: number;
    };

const SCRYFALL_MIN_INTERVAL_MS = 1250;
const SCRYFALL_MAX_RETRIES = 2;
const SCRYFALL_RETRY_BASE_DELAY_MS = 1200;
const SCRYFALL_429_COOLDOWN_MS = 8000;
const SCRYFALL_FETCH_TIMEOUT_MS = 7000;
const SCRYFALL_REQUEST_HEADERS = {
  'User-Agent': 'Deck Sage/1.0',
  Accept: 'application/json',
};

const responseCache = new Map<string, ScryfallCardData | null>();
const failureReasonCache = new Map<string, ScryfallFailureReason>();
const inFlightRequests = new Map<string, Promise<ScryfallCardData | null>>();
const bestPrintingResponseCache = new Map<string, ScryfallBestPrintingData | null>();
const bestPrintingFailureReasonCache = new Map<string, ScryfallFailureReason>();
const bestPrintingInFlightRequests = new Map<
  string,
  Promise<ScryfallBestPrintingData | null>
>();

let queueTail: Promise<void> = Promise.resolve();
let lastRequestStartedAt = 0;
let globalCooldownUntil = 0;
let lastFailureReason: ScryfallFailureReason = 'none';

export function getLastScryfallFailureReason(): ScryfallFailureReason {
  return lastFailureReason;
}

export function getReadableScryfallFailureMessage(reason: ScryfallFailureReason): string {
  switch (reason) {
    case 'not_found':
      return 'No matching Magic card was found.';
    case 'rate_limited':
      return 'Scryfall is receiving too many requests. Try again in a moment.';
    case 'http_error':
      return 'Scryfall could not complete the request.';
    case 'network_error':
      return 'Deck Sage could not reach Scryfall. Check your connection and try again.';
    case 'timeout':
      return 'The card lookup took too long. Try again in a moment.';
    case 'unknown':
      return 'The card lookup failed for an unknown reason.';
    case 'none':
    default:
      return '';
  }
}

export async function fetchCardByName(cardName: string): Promise<ScryfallCardData | null> {
  const baseName = normalizeCardNameInput(cardName);
  if (!baseName) {
    lastFailureReason = 'not_found';
    return null;
  }

  lastFailureReason = 'none';

  const attempts = generateRescueAttempts(baseName);

  for (const attemptName of attempts) {
    const cacheKey = attemptName.toLowerCase();

    if (responseCache.has(cacheKey)) {
      const cached = responseCache.get(cacheKey);
      if (cached) {
        lastFailureReason = 'none';
        return cached;
      }

      lastFailureReason = failureReasonCache.get(cacheKey) || 'not_found';
      continue;
    }

    const existingRequest = inFlightRequests.get(cacheKey);
    if (existingRequest) {
      const result = await existingRequest;
      if (result) {
        lastFailureReason = 'none';
        return result;
      }

      lastFailureReason = failureReasonCache.get(cacheKey) || 'unknown';
      continue;
    }

    const requestPromise = enqueueScryfallLookup(attemptName, cacheKey);
    inFlightRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      if (result) {
        lastFailureReason = 'none';
        return result;
      }

      lastFailureReason = failureReasonCache.get(cacheKey) || 'unknown';
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  }

  if (lastFailureReason === 'none') {
    lastFailureReason = 'not_found';
  }

  return null;
}

export async function fetchCardByScryfallId(
  scryfallId: string
): Promise<ScryfallCardData | null> {
  const cleanedId = scryfallId.trim();

  if (!cleanedId) {
    lastFailureReason = 'not_found';
    return null;
  }

  lastFailureReason = 'none';

  const cacheKey = `id:${cleanedId.toLowerCase()}`;

  if (responseCache.has(cacheKey)) {
    const cached = responseCache.get(cacheKey);

    if (cached) {
      lastFailureReason = 'none';
      return cached;
    }

    lastFailureReason = failureReasonCache.get(cacheKey) || 'not_found';
    return null;
  }

  const existingRequest = inFlightRequests.get(cacheKey);

  if (existingRequest) {
    const result = await existingRequest;

    if (result) {
      lastFailureReason = 'none';
      return result;
    }

    lastFailureReason = failureReasonCache.get(cacheKey) || 'unknown';
    return null;
  }

  const requestPromise = enqueueScryfallIdLookup(cleanedId, cacheKey);
  inFlightRequests.set(cacheKey, requestPromise);

  try {
    const result = await requestPromise;

    if (result) {
      lastFailureReason = 'none';
      return result;
    }

    lastFailureReason = failureReasonCache.get(cacheKey) || 'unknown';
    return null;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

export async function fetchCardByOracleId(
  oracleId: string
): Promise<ScryfallCardData | null> {
  const cleanedId = oracleId.trim();

  if (!cleanedId) {
    lastFailureReason = 'not_found';
    return null;
  }

  lastFailureReason = 'none';

  const cacheKey = `oracle:${cleanedId.toLowerCase()}`;

  if (responseCache.has(cacheKey)) {
    const cached = responseCache.get(cacheKey);

    if (cached) {
      lastFailureReason = 'none';
      return cached;
    }

    lastFailureReason = failureReasonCache.get(cacheKey) || 'not_found';
    return null;
  }

  const existingRequest = inFlightRequests.get(cacheKey);

  if (existingRequest) {
    const result = await existingRequest;

    if (result) {
      lastFailureReason = 'none';
      return result;
    }

    lastFailureReason = failureReasonCache.get(cacheKey) || 'unknown';
    return null;
  }

  const requestPromise = enqueueScryfallOracleLookup(cleanedId, cacheKey);
  inFlightRequests.set(cacheKey, requestPromise);

  try {
    const result = await requestPromise;

    if (result) {
      lastFailureReason = 'none';
      return result;
    }

    lastFailureReason = failureReasonCache.get(cacheKey) || 'unknown';
    return null;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

export async function fetchBestCommanderPrintingByName(
  cardName: string
): Promise<ScryfallBestPrintingData | null> {
  return fetchBestCardPrintingByName(cardName);
}

export async function fetchBestCardPrintingByName(
  cardName: string
): Promise<ScryfallBestPrintingData | null> {
  const baseName = normalizeCardNameInput(cardName);
  if (!baseName) {
    lastFailureReason = 'not_found';
    return null;
  }

  lastFailureReason = 'none';

  const attempts = generateRescueAttempts(baseName);

  for (const attemptName of attempts) {
    const cacheKey = attemptName.toLowerCase();

    if (bestPrintingResponseCache.has(cacheKey)) {
      const cached = bestPrintingResponseCache.get(cacheKey);
      if (cached) {
        lastFailureReason = 'none';
        return cached;
      }

      lastFailureReason = bestPrintingFailureReasonCache.get(cacheKey) || 'not_found';
      continue;
    }

    const existingRequest = bestPrintingInFlightRequests.get(cacheKey);
    if (existingRequest) {
      const result = await existingRequest;
      if (result) {
        lastFailureReason = 'none';
        return result;
      }

      lastFailureReason = bestPrintingFailureReasonCache.get(cacheKey) || 'unknown';
      continue;
    }

    const requestPromise = enqueueBestPrintingLookup(attemptName, cacheKey);
    bestPrintingInFlightRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      if (result) {
        lastFailureReason = 'none';
        return result;
      }

      lastFailureReason = bestPrintingFailureReasonCache.get(cacheKey) || 'unknown';
    } finally {
      bestPrintingInFlightRequests.delete(cacheKey);
    }
  }

  if (lastFailureReason === 'none') {
    lastFailureReason = 'not_found';
  }

  return null;
}

export async function resolveCardNameWithScryfall(
  detectedText: string
): Promise<ResolvedCardResult> {
  const cardData = await fetchCardByName(detectedText);

  return {
    resolvedName: cardData?.name ?? null,
    cardData,
  };
}

async function enqueueScryfallLookup(
  cleanedName: string,
  cacheKey: string
): Promise<ScryfallCardData | null> {
  const scheduledTask = queueTail
    .then(async () => {
      const result = await fetchFromScryfallWithRetry(cleanedName);

      if (result.ok === false) {
        responseCache.set(cacheKey, null);
        failureReasonCache.set(cacheKey, result.reason);
        lastFailureReason = result.reason;
        return null;
      }

      const mapped = mapScryfallCardData(result.data);
      responseCache.set(cacheKey, mapped);
      failureReasonCache.delete(cacheKey);
      lastFailureReason = 'none';
      return mapped;
    })
    .catch((error) => {
      console.log('[mtgCardApi] Scryfall lookup failed unexpectedly', error);
      responseCache.set(cacheKey, null);
      failureReasonCache.set(cacheKey, 'unknown');
      lastFailureReason = 'unknown';
      return null;
    });

  queueTail = scheduledTask.then(() => undefined, () => undefined);
  return scheduledTask;
}

async function enqueueScryfallIdLookup(
  scryfallId: string,
  cacheKey: string
): Promise<ScryfallCardData | null> {
  const scheduledTask = queueTail
    .then(async () => {
      const result = await fetchScryfallUrlWithRetry(
        `https://api.scryfall.com/cards/${encodeURIComponent(scryfallId)}`
      );

      if (result.ok === false) {
        responseCache.set(cacheKey, null);
        failureReasonCache.set(cacheKey, result.reason);
        lastFailureReason = result.reason;
        return null;
      }

      const mapped = mapScryfallCardData(result.data);
      responseCache.set(cacheKey, mapped);
      failureReasonCache.delete(cacheKey);
      lastFailureReason = 'none';
      return mapped;
    })
    .catch((error) => {
      console.log('[mtgCardApi] Scryfall id lookup failed unexpectedly', error);
      responseCache.set(cacheKey, null);
      failureReasonCache.set(cacheKey, 'unknown');
      lastFailureReason = 'unknown';
      return null;
    });

  queueTail = scheduledTask.then(() => undefined, () => undefined);
  return scheduledTask;
}

async function enqueueScryfallOracleLookup(
  oracleId: string,
  cacheKey: string
): Promise<ScryfallCardData | null> {
  const scheduledTask = queueTail
    .then(async () => {
      const params = new URLSearchParams({
        q: `oracleid:${oracleId}`,
        unique: 'prints',
        order: 'released',
        dir: 'desc',
      });
      const result = await fetchScryfallUrlWithRetry(
        `https://api.scryfall.com/cards/search?${params.toString()}`
      );

      if (result.ok === false) {
        responseCache.set(cacheKey, null);
        failureReasonCache.set(cacheKey, result.reason);
        lastFailureReason = result.reason;
        return null;
      }

      const card = Array.isArray(result.data?.data) ? result.data.data[0] : null;

      if (!card) {
        responseCache.set(cacheKey, null);
        failureReasonCache.set(cacheKey, 'not_found');
        lastFailureReason = 'not_found';
        return null;
      }

      const mapped = mapScryfallCardData(card);
      responseCache.set(cacheKey, mapped);
      failureReasonCache.delete(cacheKey);
      lastFailureReason = 'none';
      return mapped;
    })
    .catch((error) => {
      console.log('[mtgCardApi] Scryfall oracle lookup failed unexpectedly', error);
      responseCache.set(cacheKey, null);
      failureReasonCache.set(cacheKey, 'unknown');
      lastFailureReason = 'unknown';
      return null;
    });

  queueTail = scheduledTask.then(() => undefined, () => undefined);
  return scheduledTask;
}

async function enqueueBestPrintingLookup(
  cleanedName: string,
  cacheKey: string
): Promise<ScryfallBestPrintingData | null> {
  const scheduledTask = queueTail
    .then(async () => {
      const result = await fetchCardPrintingsFromScryfall(cleanedName);

      if (result.ok === false) {
        bestPrintingResponseCache.set(cacheKey, null);
        bestPrintingFailureReasonCache.set(cacheKey, result.reason);
        lastFailureReason = result.reason;
        return null;
      }

      const selected = selectBestPrinting(result.data);
      if (!selected) {
        bestPrintingResponseCache.set(cacheKey, null);
        bestPrintingFailureReasonCache.set(cacheKey, 'not_found');
        lastFailureReason = 'not_found';
        return null;
      }

      bestPrintingResponseCache.set(cacheKey, selected);
      bestPrintingFailureReasonCache.delete(cacheKey);
      lastFailureReason = 'none';

      if (isDevRuntime()) {
        console.log('[mtgCardApi] selected best printing', {
          input: cleanedName,
          name: selected.name,
          setName: selected.setName,
          collectorNumber: selected.collectorNumber,
          reason: selected.selectedReason,
        });
      }

      return selected;
    })
    .catch((error) => {
      console.log('[mtgCardApi] Scryfall printing lookup failed unexpectedly', error);
      bestPrintingResponseCache.set(cacheKey, null);
      bestPrintingFailureReasonCache.set(cacheKey, 'unknown');
      lastFailureReason = 'unknown';
      return null;
    });

  queueTail = scheduledTask.then(() => undefined, () => undefined);
  return scheduledTask;
}

async function waitForScryfallSlot(): Promise<void> {
  const now = Date.now();

  if (now < globalCooldownUntil) {
    await delay(globalCooldownUntil - now);
  }

  const elapsed = Date.now() - lastRequestStartedAt;
  const waitMs = Math.max(0, SCRYFALL_MIN_INTERVAL_MS - elapsed);

  if (waitMs > 0) {
    await delay(waitMs);
  }

  lastRequestStartedAt = Date.now();
}

async function fetchFromScryfallWithRetry(cleanedName: string): Promise<FetchScryfallResult> {
  const encodedName = encodeURIComponent(cleanedName);

  return fetchScryfallUrlWithRetry(
    `https://api.scryfall.com/cards/named?fuzzy=${encodedName}`
  );
}

async function fetchCardPrintingsFromScryfall(
  cleanedName: string
): Promise<FetchScryfallResult> {
  const searchUrl = buildExactPrintingsSearchUrl(cleanedName);
  const cards: any[] = [];
  let nextUrl: string | null = searchUrl;

  while (nextUrl) {
    const result = await fetchScryfallUrlWithRetry(nextUrl);

    if (result.ok === false) {
      return result;
    }

    if (Array.isArray(result.data?.data)) {
      cards.push(...result.data.data);
    }

    nextUrl = result.data?.has_more && result.data?.next_page ? result.data.next_page : null;
  }

  if (cards.length === 0) {
    return { ok: false, status: 404, reason: 'not_found' };
  }

  return { ok: true, data: cards };
}

async function fetchScryfallUrlWithRetry(url: string): Promise<FetchScryfallResult> {
  for (let attempt = 0; attempt <= SCRYFALL_MAX_RETRIES; attempt++) {
    await waitForScryfallSlot();

    const result = await fetchScryfallUrlOnce(url);

    if (result.ok === true || result.reason === 'not_found') {
      return result;
    }

    if (attempt >= SCRYFALL_MAX_RETRIES) {
      return result;
    }

    let backoffMs = SCRYFALL_RETRY_BASE_DELAY_MS * (attempt + 1);

    if (result.reason === 'rate_limited') {
      const retryAfterMs = result.retryAfterMs ?? 0;
      backoffMs = Math.max(backoffMs, retryAfterMs, SCRYFALL_429_COOLDOWN_MS);
      globalCooldownUntil = Date.now() + backoffMs;
    }

    await delay(backoffMs);
  }

  return { ok: false, status: null, reason: 'network_error' };
}

async function fetchScryfallUrlOnce(url: string): Promise<FetchScryfallResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SCRYFALL_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: SCRYFALL_REQUEST_HEADERS,
      signal: controller.signal,
    });

    if (response.ok) {
      return { ok: true, data: await response.json() };
    }

    if (response.status === 404) {
      return { ok: false, status: 404, reason: 'not_found' };
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');

      return {
        ok: false,
        status: 429,
        reason: 'rate_limited',
        retryAfterMs: parseRetryAfterToMs(retryAfter),
      };
    }

    return { ok: false, status: response.status, reason: 'http_error' };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return { ok: false, status: null, reason: 'timeout' };
    }

    return { ok: false, status: null, reason: 'network_error' };
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildExactPrintingsSearchUrl(cardName: string): string {
  const escapedName = cardName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const query = `!"${escapedName}" game:paper include:extras`;
  const params = new URLSearchParams({
    q: query,
    unique: 'prints',
    order: 'released',
    dir: 'desc',
  });

  return `https://api.scryfall.com/cards/search?${params.toString()}`;
}

function selectBestPrinting(cards: any[]): ScryfallBestPrintingData | null {
  const ranked = cards
    .map((card, index) => ({
      card,
      index,
      score: scorePrinting(card),
      imageUrl: getFullCardImageUrl(card),
    }))
    .filter((entry) => entry.imageUrl);

  if (!ranked.length) return null;

  ranked.sort((a, b) => {
    if (b.score.score !== a.score.score) return b.score.score - a.score.score;

    const dateCompare = compareReleasedAt(b.card?.released_at, a.card?.released_at);
    if (dateCompare !== 0) return dateCompare;

    return a.index - b.index;
  });

  const selected = ranked[0];
  return mapBestPrintingData(selected.card, selected.score.reasons);
}

function scorePrinting(card: any): { score: number; reasons: string[] } {
  const promoTypes = toLowerStringArray(card?.promo_types);
  const frameEffects = toLowerStringArray(card?.frame_effects);
  const finishes = toLowerStringArray(card?.finishes);
  const setName = String(card?.set_name || '').toLowerCase();
  const setType = String(card?.set_type || '').toLowerCase();
  const setCode = String(card?.set || '').toLowerCase();
  const frame = String(card?.frame || '').toLowerCase();
  const borderColor = String(card?.border_color || '').toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  if (
    borderColor === 'borderless' ||
    promoTypes.includes('borderless') ||
    frameEffects.includes('borderless')
  ) {
    score += 10000;
    reasons.push('borderless');
  }

  if (promoTypes.includes('anime')) {
    score += 9000;
    reasons.push('anime');
  }

  if (card?.full_art === true) {
    score += 8000;
    reasons.push('full art');
  }

  if (frameEffects.includes('showcase') || promoTypes.includes('showcase')) {
    score += 7000;
    reasons.push('showcase');
  }

  if (
    promoTypes.includes('secretlair') ||
    promoTypes.includes('secret lair') ||
    setCode === 'sld' ||
    setCode === 'slx' ||
    setType.includes('secret') ||
    setName.includes('secret lair')
  ) {
    score += 6000;
    reasons.push('secret lair');
  }

  if (frameEffects.includes('extendedart') || promoTypes.includes('extendedart')) {
    score += 5000;
    reasons.push('extended art');
  }

  if (frameEffects.includes('inverted')) {
    score += 4000;
    reasons.push('inverted frame');
  }

  if (isRetroFrame(frame, frameEffects, promoTypes)) {
    score += 3000;
    reasons.push('retro frame');
  }

  if (finishes.includes('etched')) {
    score += 2200;
    reasons.push('etched');
  } else if (finishes.includes('foil')) {
    score += 2000;
    reasons.push('foil available');
  }

  if (isAlternateArt(card, promoTypes, frameEffects)) {
    score += 1000;
    reasons.push('alternate art');
  }

  score += imageQualityScore(card);

  if (!reasons.length) {
    reasons.push('regular printing');
  }

  return { score, reasons };
}

function mapBestPrintingData(card: any, reasons: string[]): ScryfallBestPrintingData {
  const imageUris = getCardImageUris(card);
  const imageUrl = imageUris?.large || imageUris?.png || imageUris?.normal;
  const rankingReason = reasons.join(', ');

  return {
    name: card?.name,
    scryfallId: card?.id,
    imageUrl,
    largeImageUrl: imageUris?.large,
    pngImageUrl: imageUris?.png,
    artCropUrl: imageUris?.art_crop,
    selectedReason: rankingReason,
    rankingReason,
    setName: card?.set_name,
    setType: card?.set_type,
    setCode: card?.set,
    collectorNumber: card?.collector_number,
    promoTypes: card?.promo_types,
    frameEffects: card?.frame_effects,
    finishes: card?.finishes,
    borderColor: card?.border_color,
    fullArt: card?.full_art,
    layout: card?.layout,
  };
}

function getCardImageUris(card: any): any | null {
  return card?.image_uris || card?.card_faces?.find((face: any) => face?.image_uris)?.image_uris || null;
}

function getFullCardImageUrl(card: any): string | undefined {
  const imageUris = getCardImageUris(card);
  return imageUris?.large || imageUris?.png || imageUris?.normal;
}

function imageQualityScore(card: any): number {
  const imageUris = getCardImageUris(card);
  if (imageUris?.large) return 30;
  if (imageUris?.png) return 20;
  if (imageUris?.normal) return 10;
  return 0;
}

function isRetroFrame(
  frame: string,
  frameEffects: string[],
  promoTypes: string[]
): boolean {
  return (
    frame === '1993' ||
    frame === '1997' ||
    frame === '2003' ||
    frameEffects.includes('retro') ||
    promoTypes.includes('retro')
  );
}

function isAlternateArt(
  card: any,
  promoTypes: string[],
  frameEffects: string[]
): boolean {
  return (
    card?.variation === true ||
    card?.promo === true ||
    promoTypes.includes('boosterfun') ||
    promoTypes.includes('stamped') ||
    promoTypes.includes('textured') ||
    frameEffects.length > 0
  );
}

function toLowerStringArray(value: any): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).toLowerCase());
}

function compareReleasedAt(left?: string, right?: string): number {
  const leftTime = left ? Date.parse(left) : 0;
  const rightTime = right ? Date.parse(right) : 0;

  if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0;
  if (Number.isNaN(leftTime)) return -1;
  if (Number.isNaN(rightTime)) return 1;

  return leftTime - rightTime;
}

function isDevRuntime(): boolean {
  return Boolean((globalThis as any).__DEV__);
}

function generateRescueAttempts(name: string): string[] {
  const attempts = new Set<string>();

  attempts.add(name);
  attempts.add(name.replace(/\s+/g, ' '));

  const parts = name.split(' ');
  if (parts.length > 1 && parts[0].length <= 2) {
    attempts.add(parts.slice(1).join(' '));
  }

  attempts.add(name.replace(/(.)\1+/g, '$1'));
  attempts.add(name.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, ''));

  return Array.from(attempts).filter(Boolean);
}

function parseRetryAfterToMs(value: string | null): number {
  if (!value) return 0;

  const seconds = Number(value);
  if (!Number.isNaN(seconds)) return Math.max(0, seconds * 1000);

  const date = Date.parse(value);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());

  return 0;
}

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function normalizeCardNameInput(input: string): string {
  return input
    .replace(/[’`]/g, "'")
    .replace(/[^A-Za-z0-9',:\- ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapScryfallCardData(data: any): ScryfallCardData {
  return {
    id: data.id,
    oracle_id: data.oracle_id,
    name: data.name,

    image_url:
      data?.image_uris?.normal ||
      data?.card_faces?.[0]?.image_uris?.normal,

    art_crop_url:
      data?.image_uris?.art_crop ||
      data?.card_faces?.[0]?.image_uris?.art_crop,

    mana_cost: data.mana_cost || data?.card_faces?.[0]?.mana_cost,
    cmc: data.cmc,

    type_line: data.type_line,
    oracle_text:
      data.oracle_text ||
      data?.card_faces?.map((f: any) => f.oracle_text).filter(Boolean).join('\n'),

    colors: data.colors || data?.card_faces?.[0]?.colors,
    color_identity: data.color_identity,

    power: data.power || data?.card_faces?.[0]?.power,
    toughness: data.toughness || data?.card_faces?.[0]?.toughness,

    keywords: data.keywords,

    set_name: data.set_name,
    rarity: data.rarity,

    prices: {
      usd: data?.prices?.usd ?? undefined,
      usd_foil: data?.prices?.usd_foil ?? undefined,
    },
  };
}
