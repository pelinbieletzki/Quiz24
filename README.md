# Quiz24 - Live Quiz App

Eine Echtzeit-Quiz-Anwendung mit Next.js und Supabase.

## Features

- 🔐 Benutzer-Authentifizierung (Email/Passwort)
- 📝 Quiz erstellen mit beliebig vielen Fragen
- 🎮 Live-Spiele mit Freunden
- 📊 Echtzeit-Punktestand
- 📱 Responsive Design

## Tech Stack

- **Frontend:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Datenbank:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Hosting:** Vercel

## Deployment auf Vercel

### 1. Supabase Setup

1. Gehe zu [supabase.com](https://supabase.com) und erstelle ein Projekt
2. Führe das SQL-Schema aus (`supabase/schema.sql`) im SQL Editor
3. Notiere dir die **Project URL** und den **anon key** (Settings → API)

### 2. GitHub Repository

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/DEIN-USERNAME/quiz24.git
git push -u origin main
```

### 3. Vercel Deployment

1. Gehe zu [vercel.com](https://vercel.com)
2. Klicke auf "Add New Project"
3. Importiere dein GitHub Repository
4. Füge diese Environment Variables hinzu:
   - `NEXT_PUBLIC_SUPABASE_URL` = Deine Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Dein Supabase anon key
5. Klicke auf "Deploy"

Fertig! Deine App ist jetzt live.

## Lokale Entwicklung

```bash
npm install
npm run dev
```

Erstelle eine `.env.local` Datei:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

## Spielanleitung

### Als Quiz-Ersteller:
1. Registrieren/Einloggen
2. Quiz erstellen mit Fragen und Antworten
3. Quiz starten → Code wird angezeigt
4. Code an Mitspieler teilen
5. "Spiel starten" wenn alle da sind

### Als Spieler:
1. quiz24.vercel.app/join besuchen
2. Code eingeben
3. Nickname wählen
4. Warten auf Start
5. Fragen beantworten - schneller = mehr Punkte!

## Lizenz

MIT
