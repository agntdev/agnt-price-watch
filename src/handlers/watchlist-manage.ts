import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { addItem, backButton, data, getItem, ticker } from "../crypto.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

// SCAFFOLD — generated from the bot blueprint BEFORE the agent runs.
// Keep a LIVE registration (.command / .callbackQuery / …) so this feature is
// never an empty stub. Replace the reply body with real logic + copy; if you
// change the user-facing text, update tests/specs to match EXACTLY.
// Do NOT rewrite src/bot.ts — buildBot() already auto-loads this module.
// Menu: wire this into /start via registerMainMenuItem({ label: "Manage Watchlist", data: "watchlist:manage" }) if the toolkit exposes it.

registerMainMenuItem({ label: "Manage watchlist", data: "watchlist:manage", order: 10 });
const composer = new Composer<Ctx>();

function picker() {
  return inlineKeyboard([
    [inlineButton("Bitcoin", "watchlist:add:BTC"), inlineButton("Ethereum", "watchlist:add:ETH")],
    [inlineButton("Toncoin", "watchlist:add:TON"), inlineButton("Other", "watchlist:other")],
    [inlineButton("Back to menu", "menu:main")],
  ]);
}

function list(ctx: Ctx): string {
  const items = data(ctx).watchlist;
  return items.length === 0
    ? "No coins in your watchlist yet — choose one below."
    : `Your watchlist:\n${items.map((item) => `• ${item.name} (${item.ticker})`).join("\n")}`;
}

composer.callbackQuery("watchlist:manage", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(list(ctx), { reply_markup: picker() });
});

composer.callbackQuery(/^watchlist:add:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const symbol = ctx.match[1];
  const existed = Boolean(getItem(ctx, symbol));
  addItem(ctx, symbol);
  await ctx.editMessageText(existed ? `${symbol} is already on your watchlist.` : `Added ${symbol} to your watchlist.`, {
    reply_markup: inlineKeyboard([[inlineButton("Manage watchlist", "watchlist:manage")], [inlineButton("Back to menu", "menu:main")]]),
  });
});

composer.callbackQuery("watchlist:other", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "watchlist_other";
  await ctx.editMessageText("Send the ticker symbol to add, such as SOL.", { reply_markup: backButton() });
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "watchlist_other") return next();
  const symbol = ticker(ctx.message.text);
  if (!symbol) return ctx.reply("That ticker does not look right. Send 2–12 letters or numbers.");
  addItem(ctx, symbol);
  ctx.session.step = undefined;
  await ctx.reply(`Added ${symbol} to your watchlist.`, { reply_markup: backButton() });
});

export default composer;
