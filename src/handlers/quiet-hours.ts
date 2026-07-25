import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { backButton, data, validTime } from "../crypto.js";
import { registerMainMenuItem } from "../toolkit/index.js";

// SCAFFOLD — generated from the bot blueprint BEFORE the agent runs.
// Keep a LIVE registration (.command / .callbackQuery / …) so this feature is
// never an empty stub. Replace the reply body with real logic + copy; if you
// change the user-facing text, update tests/specs to match EXACTLY.
// Do NOT rewrite src/bot.ts — buildBot() already auto-loads this module.
// Menu: wire this into /start via registerMainMenuItem({ label: "Set Quiet Hours", data: "quiet:hours" }) if the toolkit exposes it.

registerMainMenuItem({ label: "Set quiet hours", data: "quiet:hours", order: 50 });
const composer = new Composer<Ctx>();

composer.callbackQuery("quiet:hours", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "quiet_start";
  await ctx.editMessageText("Send when quiet hours start in 24-hour time, such as 22:00.", { reply_markup: backButton() });
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "quiet_start") return next();
  const time = validTime(ctx.message.text);
  if (!time) return ctx.reply("Send a time like 22:00.");
  data(ctx).profile.quietStart = time;
  ctx.session.step = "quiet_end";
  await ctx.reply("Now send when quiet hours end, such as 07:00.");
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "quiet_end") return next();
  const time = validTime(ctx.message.text);
  if (!time) return ctx.reply("Send a time like 07:00.");
  const profile = data(ctx).profile;
  if (time === profile.quietStart) return ctx.reply("Choose a different end time so notifications are not muted all day.");
  profile.quietEnd = time;
  ctx.session.step = undefined;
  await ctx.reply(`Quiet hours are set from ${profile.quietStart} to ${time} ${profile.timezone}.`, { reply_markup: backButton() });
});

export default composer;
