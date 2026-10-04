import * as cheerio from "cheerio";
import fallbackEventData from "@/data/events.json";
import type { EventCard, EventsResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_DURATION_MS = 10 * 60 * 1000;
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
const TAIPEI_PATTERN = /taipei|台北|臺北/i;
const TAIPEI_DISTRICT_PATTERN =
  /(?:zhongzheng|da.?an|songshan|xinyi|zhongshan|wanhua|datong|nangang|neihu|shilin|beitou|wenshan)\s*district|中正區|大安區|松山區|信義區|中山區|萬華區|大同區|南港區|內湖區|士林區|北投區|文山區/i;
const TECH_PATTERN =
  /\b(tech|ai|dev|startup|code|data|web3|hackathon|product|cloud)\b/i;
const fallbackEvents: EventCard[] = fallbackEventData;

type JsonRecord = Record<string, unknown>;

type ParsedEvent = {
  card: EventCard;
  description: string;
};

type EventsCache = {
  expiresAt: number;
  response: EventsResponse;
};

type CacheGlobal = typeof globalThis & {
  __mrMsRightEventsCache?: EventsCache;
};

function asRecord(value: unknown): JsonRecord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
}

function asText(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function firstText(record: JsonRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const text = asText(record[key]);
    if (text) return text;
  }
  return undefined;
}

function nestedRecord(record: JsonRecord, keys: string[]): JsonRecord | null {
  for (const key of keys) {
    const nested = asRecord(record[key]);
    if (nested) return nested;
  }
  return null;
}

function firstNestedText(
  record: JsonRecord,
  parentKeys: string[],
  childKeys: string[],
): string | undefined {
  for (const parentKey of parentKeys) {
    const nested = asRecord(record[parentKey]);
    if (!nested) continue;
    const text = firstText(nested, childKeys);
    if (text) return text;
  }
  return undefined;
}

function normalizeEventUrl(value: string | undefined): string {
  if (!value) return "https://lu.ma/taipei";

  try {
    const parsed = new URL(value, "https://lu.ma");
    if (
      parsed.hostname === "luma.com" ||
      parsed.hostname === "www.luma.com"
    ) {
      return `https://lu.ma${parsed.pathname}${parsed.search}`;
    }
    return parsed.toString();
  } catch {
    return `https://lu.ma/${value.replace(/^\/+/, "")}`;
  }
}

function normalizeImage(value: string | undefined): string {
  if (!value) {
    return "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=85";
  }

  if (value.startsWith("//")) return `https:${value}`;
  return value;
}

function priceIsPaid(value: unknown): boolean {
  if (typeof value === "number") return value > 0;
  if (typeof value !== "string") return false;
  if (/free|complimentary|no cost/i.test(value)) return false;

  const amount = value.match(/(?:^|[^\d])(\d+(?:\.\d{1,2})?)(?:[^\d]|$)/);
  return amount ? Number(amount[1]) > 0 : false;
}

function containsPaidPrice(root: unknown): boolean {
  if (typeof root === "string") {
    return /(?:\$|NT\$|TWD)\s*\d+(?:\.\d{1,2})?|\b\d+(?:\.\d{1,2})?\s*(?:USD|TWD|NTD)\b/i.test(
      root,
    );
  }

  const pending: unknown[] = [root];
  const visited = new WeakSet<object>();
  let inspected = 0;

  while (pending.length > 0 && inspected < 12000) {
    const current = pending.pop();
    inspected += 1;

    if (Array.isArray(current)) {
      for (const item of current) pending.push(item);
      continue;
    }

    const record = asRecord(current);
    if (!record || visited.has(record)) continue;
    visited.add(record);

    for (const [key, value] of Object.entries(record)) {
      if (/price|amount|cost|ticket/i.test(key) && priceIsPaid(value)) {
        return true;
      }
      if (typeof value === "object" && value !== null) {
        pending.push(value);
      }
    }
  }

  return false;
}

function eventIsFree(record: JsonRecord): boolean {
  if (record.is_free === true || record.isFree === true) return true;
  if (record.is_free === false || record.isFree === false) return false;
  if (containsPaidPrice(record)) return false;

  return /\bfree\b|complimentary|no cost/i.test(JSON.stringify(record)) ||
    !/ticket|price|cost|amount/i.test(JSON.stringify(record));
}

function parseEventRecord(
  value: JsonRecord,
  defaultCity: string | undefined,
): ParsedEvent | null {
  const record = asRecord(value.event) ?? value;
  const title = firstText(record, ["name", "title", "event_name"]);
  if (!title) return null;

  const start =
    firstText(record, ["start_at", "startAt", "start", "start_time", "date"]) ??
    firstNestedText(record, ["event"], ["start_at", "startAt", "start"]);
  if (!start) return null;

  const venueRecord = nestedRecord(record, [
    "geo_address_info",
    "geoAddressInfo",
    "venue",
    "location",
  ]);
  const venue =
    (venueRecord && firstText(venueRecord, ["name", "address", "full_address"])) ??
    firstText(record, ["venue_name", "venue", "address", "location_name"]) ??
    defaultCity ??
    "Unknown";
  const city =
    (venueRecord && firstText(venueRecord, ["city", "city_name"])) ??
    firstText(record, ["city", "city_name"]) ??
    defaultCity ??
    "Unknown";
  const normalizedCity = TAIPEI_DISTRICT_PATTERN.test(city)
    ? "Taipei"
    : city;

  const hosts = record.hosts;
  const firstHost = Array.isArray(hosts) ? asRecord(hosts[0]) : null;
  const organizer =
    (firstHost && firstText(firstHost, ["name", "title"])) ??
    firstText(record, ["organizer", "host_name", "organizer_name"]) ??
    "Organizer";
  const rawUrl = firstText(record, [
    "url",
    "event_url",
    "eventUrl",
    "url_slug",
    "slug",
  ]);
  const url = normalizeEventUrl(rawUrl);
  const id =
    firstText(record, ["api_id", "id", "event_id", "eventId"]) ??
    url;
  const image =
    firstText(record, [
      "cover_url",
      "coverUrl",
      "image_url",
      "imageUrl",
      "cover",
      "image",
    ]) ??
    firstNestedText(record, ["cover", "image"], ["url", "src"]);
  const description =
    firstText(record, ["description", "about", "summary", "subtitle"]) ?? "";

  return {
    card: {
      id,
      title,
      start,
      venue,
      city: normalizedCity,
      image: normalizeImage(image),
      url,
      organizer,
      free: eventIsFree(record),
    },
    description,
  };
}

function walkEventJson(
  root: unknown,
  defaultCity: string | undefined,
): ParsedEvent[] {
  const parsed: ParsedEvent[] = [];
  const pending: unknown[] = [root];
  const visited = new WeakSet<object>();
  let inspected = 0;

  while (pending.length > 0 && inspected < 25000) {
    const current = pending.pop();
    inspected += 1;

    if (Array.isArray(current)) {
      for (const item of current) pending.push(item);
      continue;
    }

    const record = asRecord(current);
    if (!record || visited.has(record)) continue;
    visited.add(record);

    if (
      ("api_id" in record ||
        "cover_url" in record ||
        "geo_address_info" in record ||
        "event" in record) &&
      ("name" in record || "title" in record || "event" in record)
    ) {
      const event = parseEventRecord(record, defaultCity);
      if (event) parsed.push(event);
    }

    for (const value of Object.values(record)) {
      if (typeof value === "object" && value !== null) {
        pending.push(value);
      }
    }
  }

  return parsed;
}

function parseHtml(
  html: string,
  sourceUrl: string,
  defaultCity: string | undefined,
): ParsedEvent[] {
  const $ = cheerio.load(html);
  const scriptText = $('script#__NEXT_DATA__').first().text();

  if (scriptText) {
    try {
      const parsed = walkEventJson(
        JSON.parse(scriptText) as unknown,
        defaultCity,
      );
      if (parsed.length > 0) return parsed;
    } catch (error) {
      console.warn("[Mr-Ms-RightEvent] Could not parse Luma Next data.", error);
    }
  }

  const pageImage =
    $('meta[property="og:image"]').attr("content") ??
    $('meta[name="twitter:image"]').attr("content");
  const pageDescription =
    $('meta[property="og:description"]').attr("content") ??
    $('meta[name="description"]').attr("content") ??
    "";
  const parsed: ParsedEvent[] = [];
  const usedUrls = new Set<string>();

  $("a[href]").each((index, element) => {
    const anchor = $(element);
    const href = anchor.attr("href");
    const title = anchor.text().replace(/\s+/g, " ").trim();
    if (!href || title.length < 8) return;

    let eventUrl: URL;
    try {
      eventUrl = new URL(href, sourceUrl);
    } catch {
      return;
    }

    if (
      !/lu\.ma$/i.test(eventUrl.hostname) &&
      !/luma\.com$/i.test(eventUrl.hostname)
    ) {
      return;
    }
    if (/\/(taipei|discover|tech|explore)\/?$/i.test(eventUrl.pathname)) {
      return;
    }
    if (usedUrls.has(eventUrl.toString())) return;
    usedUrls.add(eventUrl.toString());

    const cardElement = anchor.closest("article, li, [data-event-id]");
    const cardText = cardElement.text().replace(/\s+/g, " ").trim();
    const image =
      cardElement.find("img").first().attr("src") ??
      cardElement.find("img").first().attr("data-src") ??
      pageImage;
    const dateText = cardText.match(
      /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)?\.?\s*\w{3,9}\s+\d{1,2}(?:,\s*\d{4})?(?:\s+\d{1,2}:\d{2}\s*(?:AM|PM)?)?/i,
    )?.[0];
    const start =
      dateText && !Number.isNaN(new Date(dateText).getTime())
        ? new Date(dateText).toISOString()
        : new Date(Date.now() + (index + 1) * 86400000).toISOString();
    const card: EventCard = {
      id: eventUrl.pathname.replace(/^\/+|\/+$/g, "") || eventUrl.toString(),
      title,
      start,
      venue: defaultCity ?? "Unknown",
      city: defaultCity ?? "Unknown",
      image: normalizeImage(image),
      url: normalizeEventUrl(eventUrl.toString()),
      organizer: "Organizer",
      free: !containsPaidPrice(cardText),
    };

    parsed.push({ card, description: `${cardText} ${pageDescription}` });
  });

  return parsed;
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": "en-US,en;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    },
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`Luma returned HTTP ${response.status} for ${url}`);
  }

  return response.text();
}

async function fetchFeed(url: string): Promise<ParsedEvent[]> {
  const html = await fetchHtml(url);
  const pathname = new URL(url).pathname.replace(/\/+$/, "");
  const defaultCity =
    pathname.toLowerCase() === "/taipei" ? "Taipei" : undefined;
  return parseHtml(html, url, defaultCity);
}

function selectTaipeiEvents(events: ParsedEvent[]): EventCard[] {
  const unique = new Map<string, ParsedEvent>();

  for (const event of events) {
    const { card } = event;
    const inTaipei = TAIPEI_PATTERN.test(`${card.city} ${card.venue}`);
    if (!inTaipei || !card.free) continue;

    const key = card.id || card.url;
    if (!unique.has(key)) unique.set(key, event);
  }

  const allFreeTaipei = [...unique.values()];
  const techEvents = allFreeTaipei.filter((event) =>
    TECH_PATTERN.test(`${event.card.title} ${event.description}`),
  );
  const selected =
    techEvents.length >= 10
      ? techEvents
      : [...techEvents, ...allFreeTaipei.filter((event) => !techEvents.includes(event))];

  return selected.slice(0, 10).map(({ card }) => card);
}

async function getEvents(): Promise<EventsResponse> {
  const feeds: string[] = [];
  let initialEvents: ParsedEvent[] = [];

  try {
    initialEvents = await fetchFeed("https://lu.ma/taipei");
    feeds.push("https://lu.ma/taipei");
  } catch (error) {
    console.warn("[Mr-Ms-RightEvent] lu.ma/taipei failed; trying luma.com.", error);
    try {
      initialEvents = await fetchFeed("https://luma.com/taipei");
      feeds.push("https://luma.com/taipei");
    } catch (fallbackError) {
      console.warn("[Mr-Ms-RightEvent] luma.com/taipei also failed.", fallbackError);
    }
  }

  let combined = [...initialEvents];
  if (selectTaipeiEvents(combined).length < 10) {
    const additionalFeeds = [
      "https://lu.ma/discover",
      "https://lu.ma/tech",
    ];
    for (const url of additionalFeeds) {
      try {
        const feedEvents = await fetchFeed(url);
        feeds.push(url);
        combined = [...combined, ...feedEvents];
        if (selectTaipeiEvents(combined).length >= 10) break;
      } catch (error) {
        console.warn(`[Mr-Ms-RightEvent] Could not scrape ${url}.`, error);
      }
    }
  }

  const liveEvents = selectTaipeiEvents(combined);
  if (liveEvents.length >= 10) {
    return { source: "live", events: liveEvents };
  }

  console.warn(
    `[Mr-Ms-RightEvent] Only ${liveEvents.length} matching Luma events were found from ${feeds.length} feed(s); using fallback data.`,
  );
  return { source: "fallback", events: fallbackEvents.slice(0, 10) };
}

export async function GET(): Promise<Response> {
  const cache = globalThis as CacheGlobal;
  const now = Date.now();

  if (cache.__mrMsRightEventsCache && cache.__mrMsRightEventsCache.expiresAt > now) {
    return Response.json(cache.__mrMsRightEventsCache.response);
  }

  try {
    const response = await getEvents();
    cache.__mrMsRightEventsCache = {
      expiresAt: now + CACHE_DURATION_MS,
      response,
    };
    return Response.json(response);
  } catch (error) {
    console.warn("[Mr-Ms-RightEvent] Luma scraping failed; using fallback.", error);
    const response: EventsResponse = {
      source: "fallback",
      events: fallbackEvents.slice(0, 10),
    };
    cache.__mrMsRightEventsCache = {
      expiresAt: now + CACHE_DURATION_MS,
      response,
    };
    return Response.json(response);
  }
}