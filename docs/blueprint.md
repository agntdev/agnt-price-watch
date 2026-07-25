# Crypto Tracker Bot — Bot specification

**Archetype:** custom

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

A personal Telegram bot that lets users track crypto prices and receive alerts. Users manage a private watchlist, set threshold and percentage alerts, request on-demand prices, schedule morning summaries, and define quiet hours. The bot checks CoinMarketCap every minute and reports aggregated usage and top alerts to the owner.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- Individual Telegram users interested in crypto price tracking
- The bot owner who receives usage and top-alert summaries

## Success criteria

- Users can add and manage watchlist items with alerts
- Users receive accurate price alerts based on set thresholds and percentage changes
- Owner receives periodic usage and top-alert summaries
- System handles price feed failures and retries without user disruption

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open the main menu and explain features
- **/price** (command, actor: user, command: /price) — Request on-demand price for a single ticker or show watchlist prices
  - inputs: ticker symbol (optional)
  - outputs: price information
- **Manage Watchlist** (button, actor: user, callback: watchlist:manage) — Open watchlist management interface
  - inputs: ticker symbol (when adding 'Other')
  - outputs: watchlist interface
- **Add Threshold Alert** (button, actor: user, callback: alert:threshold) — Set up a price threshold alert
  - inputs: ticker symbol, direction (>= or <=), value
  - outputs: confirmation of alert
- **Add Percent Alert** (button, actor: user, callback: alert:percent) — Set up a percentage change alert
  - inputs: ticker symbol, percentage, time window
  - outputs: confirmation of alert
- **Set Morning Summary** (button, actor: user, callback: summary:set) — Configure optional morning summary
  - inputs: local time
  - outputs: confirmation of summary time
- **Set Quiet Hours** (button, actor: user, callback: quiet:hours) — Define quiet hours for notifications
  - inputs: start time, end time
  - outputs: confirmation of quiet hours

## Flows

### Onboarding
_Trigger:_ /start

1. Display welcome message
2. Explain features
3. Prompt to add first ticker

_Data touched:_ User profile

### Manage Watchlist
_Trigger:_ watchlist:manage

1. Display seeded tickers (Bitcoin, Ethereum, Toncoin, Other)
2. Handle 'Other' selection with text input
3. Show watchlist items with management buttons

_Data touched:_ Watchlist entry

### Add Threshold Alert
_Trigger:_ alert:threshold

1. Select ticker
2. Choose direction (>= or <=)
3. Enter threshold value
4. Confirm alert

_Data touched:_ Watchlist entry

### Add Percent Alert
_Trigger:_ alert:percent

1. Select ticker
2. Enter percentage
3. Select time window
4. Confirm alert

_Data touched:_ Watchlist entry

### Morning Summary
_Trigger:_ summary:set

1. Prompt for local time
2. Set summary time
3. Confirm schedule

_Data touched:_ User profile

### Quiet Hours
_Trigger:_ quiet:hours

1. Prompt for start time
2. Prompt for end time
3. Set quiet hours
4. Confirm schedule

_Data touched:_ User profile

### Price Request
_Trigger:_ /price

1. Check if ticker provided
2. Fetch price from CoinMarketCap
3. Display price information

_Data touched:_ Watchlist entry

### Alert Check
_Trigger:_ minute_poll

1. Check all watchlist items
2. Evaluate alert conditions
3. Send alerts if triggered
4. Update cooldown state

_Data touched:_ Watchlist entry, System metrics

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User profile** _(retention: persistent)_ — User-specific preferences and settings
  - fields: chat id, time zone, quiet hours, morning summary time, cooldown length, preferences
- **Watchlist entry** _(retention: persistent)_ — Crypto ticker and alert rules
  - fields: ticker symbol, friendly name, last known price, active alerts (thresholds, percent-change rules), cooldown state, last alert timestamp
- **System metrics** _(retention: persistent)_ — Aggregated usage and alert data
  - fields: total users, per-ticker alert counts, top-fired alerts

## Integrations

- **Telegram** (required) — Bot API messaging
- **CoinMarketCap** (required) — Price data feed
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Send on-demand usage and top-alert summaries to owner's Telegram account
- Configure polling frequency (default 1 minute)
- Set retry policy for price feed failures
- Define report frequency (default weekly)

## Notifications

- Price alerts to users
- Morning summaries to users
- Usage and top-alert summaries to owner
- Error notifications for price feed failures (to owner)

## Permissions & privacy

- User data is private and not shared
- Owner only sees aggregated metrics and top alerts
- No personal user data is stored beyond preferences

## Edge cases

- Unknown or typoed ticker symbols
- Price feed failures and retries
- Alert conditions that clear and re-trigger after cooldown
- Users changing time zones or preferences during alert processing

## Required tests

- Verify alert triggering and cooldown behavior
- Test morning summary delivery at scheduled time
- Validate quiet hours suppression of notifications
- Confirm error handling for price feed failures

## Assumptions

- Polling frequency is 1 minute as requested
- Seeded watchlist includes Bitcoin, Ethereum, Toncoin, and 'Other'
- Cooldown period is 1 hour by default
- Percent-alert window is 1 hour by default
- Time zone is inferred from Telegram or asked once
- Owner reports are sent weekly and on-demand
