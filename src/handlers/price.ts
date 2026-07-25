import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { backButton, data, formatMoney, priceFor, ticker } from "../crypto.js";
import { registerMainMenuItem } from "../toolkit/index.js";

// SCAFFOLD — generated from the bot blueprint BEFORE the agent runs.
// Keep a LIVE registration (.command / .callbackQuery / …) so this feature is
// never an empty stub. Replace the reply body with real logic + copy; if you
// change the user-facing text, update tests/specs to match EXACTLY.
// Do NOT rewrite src/bot.ts — buildBot() already auto-loads this module.

registerMainMenuItem({ label: "Check prices", data: "price:show", order: 60 });
const composer = new Composer<Ctx>();

async function showPrice(ctx: Ctx, symbols: string[]) {
  if (symbols.length === 0) return ctx.reply("No coins in your watchlist yet — add one first.", { reply_markup: backButton() });
  try {
    const rows: string[] = [];
    for (const symbol of symbols) {
      const value = await priceFor(symbol);
      if (value === undefined) return ctx.reply("Live prices are not set up yet. Ask the owner to add the CoinMarketCap key.", { reply_markup: backButton() });
      const item = data(ctx).watchlist.find((entry) => entry.ticker === symbol);
      if (item) item.lastPrice = value;
      rows.push(`${symbol}: ${formatMoney(value)}`);
    }
    await ctx.reply(rows.join("\n"), { reply_markup: backButton() });
  } catch {
    await ctx.reply("Couldn't reach the price feed. Try again in a moment.", { reply_markup: backButton() });
  }
}

composer.command("price", async (ctx) => {
  const input = ctx.match?.trim();
  if (input) {
    const symbol = ticker(input);
    if (!symbol) return ctx.reply("That ticker does not look right. Try /price BTC.");
    return showPrice(ctx, [symbol]);
  }
  return showPrice(ctx, data(ctx).watchlist.map((item) => item.ticker));
});

composer.callbackQuery("price:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  await showPrice(ctx, data(ctx).watchlist.map((item) => item.ticker));
});

export default composer;
