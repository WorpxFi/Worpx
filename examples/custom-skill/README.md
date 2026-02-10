# Custom Skill Example

A complete example of building a Worpx skill: a price alert monitor that checks token prices against configurable thresholds.

## Structure

```
custom-skill/
├── src/
│   └── index.ts         # Skill implementation
├── tests/
│   └── index.test.ts    # Unit tests
├── skill.json            # Skill manifest
└── README.md
```

## What This Skill Does

- Checks the current price of a specified token
- Compares against a user-defined threshold (above or below)
- Sends a notification if the threshold is crossed
- Tracks price changes over time using skill storage

## Parameters

| Param | Type | Required | Description |
|:------|:-----|:---------|:------------|
| `token` | string | Yes | Token symbol (e.g., ETH, BTC) |
| `threshold` | number | Yes | Price threshold in USD |
| `direction` | string | Yes | `above` or `below` |
| `notifyOnTrigger` | boolean | No | Send notification (default: true) |

## Permissions Required

- `market:read` - Read current token prices
- `storage:read` - Read previous price data
- `storage:write` - Store current price for comparison
- `notify:send` - Send alert notifications

## Test

```bash
npx vitest examples/custom-skill/tests/
```

## Deploy

```bash
npx @worpx/cli skill publish price-alert
```
