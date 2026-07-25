import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { backButton, data, validTime } from "../crypto.js";
import { registerMainMenuItem } from "../toolkit/index.js";

// SCAFFOLD — generated from the bot blueprint BEFORE the agent runs.
// Keep a LIVE registration (.command / .callbackQuery / …) so this feature is
// never an empty stub. Replace the reply body with real logic + copy; if you
// change the user-facing text, update tests/specs to match EXACTLY.
// Do NOT rewrite src/bot.ts — buildBot() already auto-loads this module.
// Menu: wire this into /start via registerMainMenuItem({ label: "Set Morning Summary", data: "summary:set" }) if the toolkit exposes it.

registerMainMenuItem({ label: "Set morning summary", data: "summary:set", order: 40 });
const composer = new Composer<Ctx>();

composer.callbackQuery("summary:set", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "summary_time";
  await ctx.editMessageText("Send your morning summary time in 24-hour format, such as 08:00.", { reply_markup: backButton() });
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "summary_time") return next();
  const time = validTime(ctx.message.text);
  if (!time) return ctx.reply("Send a time like 08:00.");
  data(ctx).profile.summaryTime = time;
  ctx.session.step = undefined;
  await ctx.reply(`Your morning summary is set for ${time} ${data(ctx).profile.timezone}.`, { reply_markup: backButton() });
});

export default composer;
