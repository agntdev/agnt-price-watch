import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { addItem, backButton, tickerButtons } from "../crypto.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

// SCAFFOLD — generated from the bot blueprint BEFORE the agent runs.
// Keep a LIVE registration (.command / .callbackQuery / …) so this feature is
// never an empty stub. Replace the reply body with real logic + copy; if you
// change the user-facing text, update tests/specs to match EXACTLY.
// Do NOT rewrite src/bot.ts — buildBot() already auto-loads this module.
// Menu: wire this into /start via registerMainMenuItem({ label: "Add Threshold Alert", data: "alert:threshold" }) if the toolkit exposes it.

registerMainMenuItem({ label: "Add price alert", data: "alert:threshold", order: 20 });
const composer = new Composer<Ctx>();

composer.callbackQuery("alert:threshold", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("Choose the coin for your price alert.", { reply_markup: tickerButtons("threshold:coin") });
});

composer.callbackQuery(/^threshold:coin:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.ticker = ctx.match[1];
  await ctx.editMessageText("Choose when to alert you.", {
    reply_markup: inlineKeyboard([[inlineButton("Price rises to", "threshold:dir:up"), inlineButton("Price falls to", "threshold:dir:down")], [inlineButton("Back to menu", "menu:main")]]),
  });
});

composer.callbackQuery(/^threshold:dir:(up|down)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.direction = ctx.match[1] === "up" ? ">=" : "<=";
  ctx.session.step = "threshold_value";
  await ctx.editMessageText("Send the target price in USD, such as 65000.", { reply_markup: backButton() });
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "threshold_value") return next();
  const value = Number(ctx.message.text.replace(/[$,\s]/g, ""));
  if (!Number.isFinite(value) || value <= 0) return ctx.reply("Send a positive USD price, such as 65000.");
  const symbol = ctx.session.ticker;
  const direction = ctx.session.direction;
  if (!symbol || !direction) return next();
  const item = addItem(ctx, symbol);
  item.alerts.push({ id: `threshold:${symbol}:${value}:${direction}`, kind: "threshold", direction, value, armed: true });
  ctx.session.step = undefined;
  await ctx.reply(`Alert set: ${symbol} ${direction} $${value.toLocaleString("en-US")}.`, { reply_markup: backButton() });
});

export default composer;
