# Bonaken Board

Bug & feature request board for the Bonaken card game.

## Tech Stack
- **Frontend:** React 18 + Vite + TypeScript + CSS Modules
- **Backend:** Node.js + Express + TypeScript
- **Database:** SQLite via better-sqlite3
- **File uploads:** multer (images stored in `data/uploads/`)
- **Deploy:** Docker + docker-compose + nginx reverse proxy

## Development
- `npm run dev` — starts both client (port 5174) and server (port 3002)
- `npm run build` — builds client + server for production
- `npm start` — runs production server

## Dutch UI
All user-facing text is in Dutch. Status flow: Open → Opgelost → Getest → Gearchiveerd.

## Styling
Victorian gaming club aesthetic matching bonaken. Uses Cinzel (headings) and Crimson Pro (body) fonts.
CSS variables from bonaken's design system.

## Screenshots
Posts can have one optional screenshot attached (JPEG, PNG, GIF, WebP, max 5 MB).
Files are stored in `data/uploads/` and served at `/uploads/`. Files are cleaned up on removal or post deletion.

## Agent API
`GET /api/agent/bugs` — returns all open bugs with full detail (title, description, screenshot URL, comments) for consumption by coding agents. No auth required.

## Frontend Design
Use the frontend-design skill for all UI components.
