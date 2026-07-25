import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { addItem, backButton, tickerButtons } from "../crypto.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

// SCAFFOLD — generated from the bot blueprint BEFORE the agent runs.
// Keep a LIVE registration (.command / .callbackQuery / …) so this feature is
// never an empty stub. Replace the reply body with real logic + copy; if you
// change the user-facing text, update tests/specs to match EXACTLY.
// Do NOT rewrite src/bot.ts — buildBot() already auto-loads this module.
// Menu: wire this into /start via registerMainMenuItem({ label: "Add Percent Alert", data: "alert:percent" }) if the toolkit exposes it.

registerMainMenuItem({ label: "Add percent alert", data: "alert:percent", order: 30 });
const composer = new Composer<Ctx>();

composer.callbackQuery("alert:percent", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("Choose the coin for your percentage alert.", { reply_markup: tickerButtons("percent:coin") });
});

composer.callbackQuery(/^percent:coin:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.ticker = ctx.match[1];
  ctx.session.step = "percent_value";
  await ctx.editMessageText("Send the percentage change, such as 5.", { reply_markup: backButton() });
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "percent_value") return next();
  const value = Number(ctx.message.text.replace(/[%,\s]/g, ""));
  if (!Number.isFinite(value) || value <= 0 || value > 1000) return ctx.reply("Send a percentage between 0 and 1000.");
  ctx.session.percentage = value;
  await ctx.reply("Choose the comparison window.", {
    reply_markup: inlineKeyboard([[inlineButton("1 hour", "percent:window:60"), inlineButton("24 hours", "percent:window:1440")], [inlineButton("Back to menu", "menu:main")]]),
  });
});

composer.callbackQuery(/^percent:window:(60|1440)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const symbol = ctx.session.ticker;
  const value = ctx.session.percentage;
  if (!symbol || !value) return ctx.editMessageText("That alert setup expired. Start again from the menu.", { reply_markup: backButton() });
  const minutes = Number(ctx.match[1]);
  addItem(ctx, symbol).alerts.push({ id: `percent:${symbol}:${value}:${minutes}`, kind: "percent", value, windowMinutes: minutes, armed: true });
  ctx.session.step = undefined;
  await ctx.editMessageText(`Alert set: ${symbol} moves ${value}% in ${minutes === 60 ? "1 hour" : "24 hours"}.`, { reply_markup: backButton() });
});

export default composer;
