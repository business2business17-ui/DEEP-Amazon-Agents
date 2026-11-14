---
name: amazon-weekly-digest
description: "Produce a structured weekly Amazon performance digest for one brand or a whole portfolio: blended KPIs (spend, ad sales, total sales, TACoS, ACoS, net margin, ad dependency) with WoW/MoM deltas, top ASIN movers, anomaly flags, an inventory watch (days-of-cover + restock ETAs), a rank watch, actions taken last week, and three next-week priorities — plus an optional Slack-ready parent-message + threaded-reply version. Use whenever the user wants a weekly report, EOD/weekly summary, pod update, brand performance recap, or asks 'how did we do this week'. Plain language, no console jargon; never invent numbers — scope to whatever data is supplied and note gaps."
---

# Amazon Weekly Digest


## ▶ Before you run (pre-flight)

- **This skill is for:** an internal week-in-review for the team/pod.
- **You get back:** blended KPIs with WoW/MoM deltas, top ASIN movers, anomaly flags, inventory + rank watch, next-week priorities, and an optional Slack-ready version.
- **Pull this first:** current + prior *ad reports* and *Business Report* (or a prior diagnosis workbook). Optional: inventory days-of-cover and a rank export.
- **Wrong tool?** Need a polished client-facing one-pager → **amazon-exec-summary**.
- **Optional companions:** a rank tracker (e.g. Helium 10 Keyword Tracker).

Scope to whatever data is supplied and flag gaps — never invent numbers.

An internal/pod-facing weekly recap that fuses paid, organic, inventory, and rank into one readable narrative with a KPI table on top. Designed to be posted to a Slack channel (parent summary + threaded per-brand detail) or saved as a doc.

This skill consumes either raw reports or the outputs of `amazon-tacos-diagnosis`, `amazon-search-term-optimizer`, and `amazon-budget-bid-reallocation`. If those outputs are present, cite their headline numbers rather than recomputing.

## Inputs

- Current-week and prior-week ad + Business reports (or the diagnosis workbook).
- Inventory days-of-cover / restock ETAs (for the inventory watch).
- Optional: rank tracker export (key-term rank movement), SQPR, prior week's digest (for "actions taken" continuity), an anomaly log.
- Brand list / portfolio structure and per-brand targets (TACoS, margin).

## Output format

Produce a document (Markdown by default; docx if the user asks for a Word file). Use THIS exact structure:

```
# [Brand or Portfolio] — Weekly Digest — Week of [date range]

## Portfolio at a glance
| Metric | This wk | Last wk | WoW | Last mo (same wk) | MoM | vs Target |
| Spend / Ad Sales / Total Sales / TACoS / ACoS / Net Margin / Ad Dependency |

## [Per brand] — repeat per brand
- KPI line (same metrics, WoW/MoM, RAG vs target)
- Top movers: 2-3 ASINs up, 2-3 down, each with the one-line reason
- Anomalies flagged this week (from the anomaly log / >2σ deviations)
- Actions taken last week (from prior digest / bulk uploads applied)
- Next-week priorities (exactly 3, specific and owned)
- Path to target: current vs target (ACoS/TACoS), and the single lever expected to close the most gap next week

## Inventory watch
- SKUs with < 21 days cover, days remaining, restock ETA, ad action (throttle / hold)

## Rank watch
- Key terms with notable rank movement (up/down), and whether paid or organic drove it

## Pacing
- Any brand on track to over/under-spend its monthly budget (MTD pace projection)
```

**Numbers:** currency 2dp, percentages 1dp, deltas signed. RAG stated in words (On target / Watch / Off target), not color-only.

**Slack version (if requested or if the user's workflow posts to a pod channel):** also output two blocks — a **parent message** (portfolio headline + the single most important item) and a **threaded reply** (per-brand detail). Keep the parent tight enough to scan on mobile.

## Method

0. **Confirm targets first.** Pull each brand's target ACoS/TACoS/margin from project context; if missing, ask once (tappable options where supported) or note "no target set" and skip the RAG/path-to-target for that brand. Don't block the digest.
1. Assemble metrics for both periods; compute WoW and MoM (same week prior month). Pull net margin and ad dependency where inputs allow.
2. Rank ASIN movers by absolute Δ total sales; attach a one-line reason from the diagnosis (traffic / CVR / Buy Box / price / stock).
3. List anomalies (from the log, or any metric > 2σ off its trailing baseline if you have the history).
4. Carry forward "actions taken" from the prior digest and any applied bulk changes.
5. Write exactly three next-week priorities per brand — each specific, each with an owner surface (Paid / Organic / Retail / Ops).
6. Fill the inventory and rank watches; add the pacing projection.
7. Deliver via `present_files` (doc) and print the Slack blocks inline if requested.

## When to Ask Questions

Ask only if the reporting period (which week) is ambiguous and can't be inferred. Otherwise scope to the data provided and clearly note any section you couldn't fill (e.g., "Rank watch: no tracker data supplied").

## Anti-flaw rules

- Never invent a number or a reason — if the driver isn't in the data, say "reason not determined."
- Keep it plain-language; this is read by people, not the ad console.
- Exactly three priorities per brand — force prioritisation, don't dump a backlog.
- Every priority names an owner surface.

## Changelog

**v2** — Added target confirmation (Method step 0) and a per-brand "path to target" line (current vs target + the top gap-closing lever).

**v1** — Initial release. Fixed digest template, WoW/MoM KPI table, movers with reasons, inventory + rank + pacing watches, three-priority rule, optional Slack parent+thread output.
