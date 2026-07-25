import type { Ctx, DomainData, WatchItem } from "./bot.js";
import { inlineButton, inlineKeyboard } from "./toolkit/index.js";

const COINS: Record<string, { name: string; id: number }> = {
  BTC: { name: "Bitcoin", id: 1 },
  ETH: { name: "Ethereum", id: 1027 },
  TON: { name: "Toncoin", id: 11419 },
};

export const now = () => Date.now();

export function data(ctx: Ctx): DomainData {
  if (!ctx.session.domain) {
    ctx.session.domain = {
      profile: { timezone: "UTC", cooldownMinutes: 60 },
      watchlist: [],
    };
  }
  return ctx.session.domain;
}

export function ticker(input: string): string | undefined {
  const value = input.trim().toUpperCase();
  return /^[A-Z0-9]{2,12}$/.test(value) ? value : undefined;
}

export function coinName(symbol: string): string {
  return COINS[symbol]?.name ?? symbol;
}

export function getItem(ctx: Ctx, symbol: string): WatchItem | undefined {
  return data(ctx).watchlist.find((item) => item.ticker === symbol);
}

export function addItem(ctx: Ctx, symbol: string): WatchItem {
  const current = getItem(ctx, symbol);
  if (current) return current;
  const item = { ticker: symbol, name: coinName(symbol), alerts: [] };
  data(ctx).watchlist.push(item);
  return item;
}

export function formatMoney(value: number): string {
  const digits = value >= 1 ? 2 : value >= 0.01 ? 4 : 8;
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: digits })}`;
}

export function backButton() {
  return inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]);
}

export function tickerButtons(prefix: string) {
  return inlineKeyboard([
    [inlineButton("Bitcoin", `${prefix}:BTC`), inlineButton("Ethereum", `${prefix}:ETH`)],
    [inlineButton("Toncoin", `${prefix}:TON`)],
    [inlineButton("Back to menu", "menu:main")],
  ]);
}

export function validTime(value: string): string | undefined {
  const match = /^(?:[01]\d|2[0-3]):[0-5]\d$/.exec(value.trim());
  return match?.[0];
}

export function inQuietHours(profile: DomainData["profile"], at = new Date(now())): boolean {
  if (!profile.quietStart || !profile.quietEnd) return false;
  const current = `${String(at.getUTCHours()).padStart(2, "0")}:${String(at.getUTCMinutes()).padStart(2, "0")}`;
  if (profile.quietStart === profile.quietEnd) return false;
  return profile.quietStart < profile.quietEnd
    ? current >= profile.quietStart && current < profile.quietEnd
    : current >= profile.quietStart || current < profile.quietEnd;
}

interface CmcQuote {
  data?: Record<string, { quote?: { USD?: { price?: number } } }>;
}

/** Fetches CoinMarketCap's symbol endpoint. It is deliberately unavailable until the owner configures the API key. */
export async function priceFor(symbol: string): Promise<number | undefined> {
  const key = typeof process === "undefined" ? undefined : process.env.COINMARKETCAP_API_KEY;
  if (!key) return undefined;
  const response = await fetch(
    `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=${encodeURIComponent(symbol)}&convert=USD`,
    { headers: { "X-CMC_PRO_API_KEY": key, Accept: "application/json" } },
  );
  if (!response.ok) throw new Error("price feed unavailable");
  const body = (await response.json()) as CmcQuote;
  const quote = body.data?.[symbol];
  const first = Array.isArray(quote) ? quote[0] : quote;
  const value = first?.quote?.USD?.price;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function clearFlow(ctx: Ctx): void {
  ctx.session.step = undefined;
  ctx.session.ticker = undefined;
  ctx.session.direction = undefined;
  ctx.session.percentage = undefined;
}
