import type { DomainData, WatchItem } from "./bot.js";
import { formatMoney, inQuietHours, now, priceFor } from "./crypto.js";

export interface Notification {
  text: string;
  ticker: string;
}

/**
 * Evaluates one user's persisted watchlist. The caller supplies delivery so a
 * blocked Telegram chat cannot interrupt checks for any other user.
 */
export async function pollWatchlist(
  state: DomainData,
  deliver: (notification: Notification) => Promise<void>,
  clock = now,
): Promise<{ alerts: number; feedFailed: boolean }> {
  let alerts = 0;
  try {
    for (const item of state.watchlist) {
      const price = await priceFor(item.ticker);
      if (price === undefined) return { alerts, feedFailed: true };
      const previous = item.lastPrice;
      item.lastPrice = price;
      for (const rule of item.alerts) {
        const at = clock();
        if (rule.kind === "threshold") {
          const hit = rule.direction === ">=" ? price >= rule.value : price <= rule.value;
          if (!hit) {
            rule.armed = true;
            continue;
          }
          if (!rule.armed || (rule.lastTriggeredAt && at - rule.lastTriggeredAt < state.profile.cooldownMinutes * 60_000)) continue;
          if (!inQuietHours(state.profile)) {
            await deliver({ ticker: item.ticker, text: `${item.ticker} is ${rule.direction} ${formatMoney(rule.value)}: ${formatMoney(price)}.` });
          }
          rule.armed = false;
          rule.lastTriggeredAt = at;
          alerts++;
          continue;
        }
        if (rule.baseline === undefined || rule.baselineAt === undefined || at - rule.baselineAt > (rule.windowMinutes ?? 60) * 60_000) {
          rule.baseline = previous ?? price;
          rule.baselineAt = at;
          continue;
        }
        const change = Math.abs(((price - rule.baseline) / rule.baseline) * 100);
        if (change < rule.value) {
          rule.armed = true;
          continue;
        }
        if (!rule.armed || (rule.lastTriggeredAt && at - rule.lastTriggeredAt < state.profile.cooldownMinutes * 60_000)) continue;
        if (!inQuietHours(state.profile)) {
          await deliver({ ticker: item.ticker, text: `${item.ticker} moved ${change.toFixed(2)}%: ${formatMoney(price)}.` });
        }
        rule.armed = false;
        rule.lastTriggeredAt = at;
        alerts++;
      }
    }
    return { alerts, feedFailed: false };
  } catch {
    return { alerts, feedFailed: true };
  }
}

export function summaryDue(state: DomainData, at = new Date(now())): boolean {
  if (!state.profile.summaryTime || inQuietHours(state.profile, at)) return false;
  const local = `${String(at.getUTCHours()).padStart(2, "0")}:${String(at.getUTCMinutes()).padStart(2, "0")}`;
  return local === state.profile.summaryTime;
}

export function renderSummary(items: WatchItem[]): string {
  if (items.length === 0) return "Your morning summary has no coins yet — add one to your watchlist.";
  const prices = items.filter((item) => item.lastPrice !== undefined);
  return prices.length === 0
    ? "Your morning summary is ready, but prices are not available right now."
    : `Morning prices:\n${prices.map((item) => `${item.ticker}: ${formatMoney(item.lastPrice!)}`).join("\n")}`;
}
