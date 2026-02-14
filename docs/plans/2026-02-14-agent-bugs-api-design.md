# Agent Bugs API Design

## Context

Coding agents (Claude Code, Codex) need a simple way to fetch open bugs from the Bonaken Board so they can autonomously fix them and create PRs. The API should be consumable with a single curl call.

## Endpoint

```
GET /api/agent/bugs
```

No parameters. Returns all posts where `type = 'bug'` and `status = 'open'`, ordered oldest first. Each bug includes its full comment thread and an absolute screenshot URL when present.

## Response Format

```json
{
  "bugs": [
    {
      "id": 4,
      "title": "Kaarten overlappen bij scherm kleiner dan 768px",
      "description": "Als ik het venster kleiner maak...",
      "author": "Frank",
      "screenshot": "https://bonaken-board.example.com/uploads/171234-abc123.png",
      "created_at": "2026-02-14T10:30:00",
      "comments": [
        {
          "author": "Systeem",
          "body": "Status gewijzigd naar Opgelost door Jan",
          "created_at": "2026-02-14T11:00:00"
        }
      ]
    }
  ],
  "count": 1
}
```

### Field decisions

- `screenshot` — full URL (not filename) so agents can fetch directly
- `status` and `type` omitted — always `open` and `bug` by definition
- `count` at top level for convenience
- Comments inlined as flat array, ordered chronologically

## Implementation Scope

- New route file: `server/src/routes/agent.ts` with single GET handler
- Mounted at `/api/agent` in `server/src/index.ts`
- One SQL query: select open bugs with LEFT JOIN on comments
- No new middleware, no auth, no database changes

## Design Decisions

- **Read-only** — agents don't update bug status; that's managed manually after PR review
- **No pagination** — open bug count should always be manageable
- **Oldest first** — agents tackle the oldest bugs first
- **No auth** — consistent with the rest of the API (no auth exists)
