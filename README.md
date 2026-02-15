# Bonaken Board

Bug tracker en feedback board voor de Bonaken kaartspel app.

🔗 **Live:** https://bonaken-board.frankvdbrink.nl

---

## Workflow: Bug Notificaties naar Frits

Dit diagram toont de complete flow van bug melding tot status update:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Gebruiker     │────▶│  Bonaken Board   │────▶│   Webhook POST  │
│ (rapporteert    │     │  (VPS Docker)    │     │  (niet-blokkerend)│
│    bug)         │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Telegram App   │◀────│  Frits 🤖        │◀────│   Frits Mac     │
│  (Push notificatie)   │  (Webhook server)│     │  (Tailscale)    │
│                 │     │  Poort 3006      │     │  Poort 3006     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │
        │ Jij ziet bug en fixt 'm
        ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Jij reply't   │────▶│  Frits stuurt    │────▶│   Board API     │
│  "Bezig met fix"│     │  update via API  │     │  (POST comment) │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │   Bug kaartje   │
                                                 │  toont update   │
                                                 │  als comment    │
                                                 └─────────────────┘
```

### Stap-voor-stap

1. **Gebruiker meldt bug**
   - Vult formulier in (titel, beschrijving, optioneel contact)
   - Klikt "Verstuur"
   - Bug verschijnt direct op het board

2. **Webhook wordt gestuurd (alleen voor bugs)**
   - Board stuurt POST naar `http://100.89.162.5:3006/api/notify-frits`
   - Payload: `{ postId, title, type, author, contact, description }`
   - Gebeurt asynchroon - storing heeft geen impact op bug creatie

3. **Frits ontvangt notificatie**
   - Webhook server draait op Mac Mini (Tailscale netwerk)
   - Ontvangt POST van VPS
   - Stuurt Telegram bericht naar jou

4. **Jij werkt de bug af**
   - Krijgt push notificatie op Telegram
   - Klikt link om bug te bekijken
   - Fixt de bug, bouwt nieuwe APK

5. **Jij update het board**
   - Stuurt bericht naar Frits (reply op notificatie)
   - Frits post update via API: `POST /api/posts/{id}/frits-update`
   - Update verschijnt als comment op bug kaartje

### Technische Details

**Componenten:**

| Component | Locatie | Poort | Functie |
|-----------|---------|-------|---------|
| Bonaken Board | VPS (Docker) | 3002 | Web app + API |
| Webhook Handler | Mac Mini | 3006 | Ontvangt notificaties |
| Telegram Bot | Cloud | - | Stuurt push notificaties |
| Tailscale | VPS ↔ Mac | - | Veilige tunnel |

**Environment Variables (VPS):**
```bash
NOTIFY_WEBHOOK_URL=http://100.89.162.5:3006/api/notify-frits
```

**Environment Variables (Mac Mini):**
```bash
TELEGRAM_BOT_TOKEN=<van_botfather>
TELEGRAM_CHAT_ID=<jouw_chat_id>
PORT=3006
```

### API Endpoints

**Bug aanmaken:**
```bash
POST /api/posts
Content-Type: multipart/form-data

Fields:
- type: "bug" | "verzoek"
- title: string (max 200 chars)
- description: string (max 2000 chars)
- author: string (max 50 chars)
- contact: string (optional, email of Telegram)
- screenshot: File (optional, max 10MB)
```

**Frits update plaatsen:**
```bash
POST /api/posts/{id}/frits-update
Content-Type: application/json

Body:
{
  "message": "Bezig met fix / Nieuwe APK beschikbaar!"
}

Response: { id, post_id, message, created_at }
```

**Notificatie status (handmatig markeren):**
```bash
PATCH /api/posts/{id}/notify-status
Response: Post object met notified_frits: 1
```

### Database Schema

**posts tabel:**
```sql
id INTEGER PRIMARY KEY
type TEXT CHECK(type IN ('bug', 'verzoek'))
status TEXT DEFAULT 'open'
title TEXT
description TEXT
author TEXT
screenshot TEXT (nullable)
contact TEXT (nullable)          -- nieuw: email/Telegram voor updates
notified_frits INTEGER DEFAULT 0 -- nieuw: webhook verstuurd?
created_at TEXT
updated_at TEXT
```

**frits_updates tabel:**
```sql
id INTEGER PRIMARY KEY
post_id INTEGER REFERENCES posts(id)
message TEXT
created_at TEXT
```

**comments tabel:**
```sql
id INTEGER PRIMARY KEY
post_id INTEGER REFERENCES posts(id)
author TEXT
body TEXT
created_at TEXT
```

Note: Frits updates worden ook als comments opgeslagen (author = "Frits 🤖")

### DevDash Configuratie

De webhook server is toegevoegd aan DevDash voor eenvoudig beheer:

```json
{
  "id": "bonaken-webhook",
  "name": "Bonaken Webhook",
  "emoji": "🐛",
  "path": "~/clawd/scripts",
  "frontend": null,
  "backend": {
    "port": 3006,
    "startCmd": "node bonaken-webhook.js",
    "logFile": "~/clawd/logs/bonaken-webhook.log"
  }
}
```

### Troubleshooting

**Webhook komt niet aan:**
- Check Tailscale status: `tailscale status` (moet "fritss-mac-mini" tonen)
- Check webhook logs: `tail -f ~/clawd/logs/bonaken-webhook.log`
- Test handmatig: `curl http://100.89.162.5:3006/health`

**Telegram berichten komen niet:**
- Check environment variables: `echo $TELEGRAM_BOT_TOKEN`
- Bot moet gestart zijn via chat met @BotFather
- Chat ID moet correct zijn (test met @userinfobot)

**Bug creatie faalt:**
- Webhook faalt stilletjes - check server logs
- Bug wordt ALTIJD aangemaakt, zelfs als webhook faalt
- Handmatig markeren: `PATCH /api/posts/{id}/notify-status`

---

## Development

### Lokale setup

```bash
npm install
npm run dev
```

Start client + server in watch mode.

### Database

SQLite database wordt automatisch aangemaakt in `data/board.db`.
Migraties gebeuren automatisch bij start.

### Build

```bash
npm run build
npm start
```

Buildt client (Vite) + server (TypeScript), start productie server.

---

## Deployment

VPS heeft `update.sh` script:

```bash
ssh root@85.215.189.34
cd /srv/docker/bonaken-board
./update.sh
```

Dit pulled latest code, bouwt Docker image, en restart container.

---

## Statussen Workflow

```
┌─────────┐    ┌───────────┐    ┌──────────┐    ┌─────────────┐
│  open   │───▶│ opgelost  │───▶│  getest  │───▶│ gearchiveerd │
└─────────┘    └───────────┘    └──────────┘    └─────────────┘
                              (of terug naar getest)
```

- **open** → Bug is gemeld, wacht op fix
- **opgelost** → Fix is geïmplementeerd
- **getest** → Getest en werkt
- **gearchiveerd** → Afgerond (kan terug naar getest)

---

Made with 🃏 by Frank & Frits
