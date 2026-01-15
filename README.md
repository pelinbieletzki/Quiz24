# Quiz24 - Live Quiz App

Eine Echtzeit-Quiz-Anwendung im Check24 Design mit Next.js und Supabase.

## Features

- 🔐 Benutzer-Authentifizierung (Email/Passwort)
- 📝 Quiz erstellen mit verschiedenen Fragetypen
  - Multiple Choice (4 Antworten)
  - Wahr/Falsch
- 🎮 Live-Spiele mit Freunden via Code
- 📊 Echtzeit-Punktestand
- 👤 Profil-Verwaltung (Passwort ändern, Account löschen)
- 📱 Responsive Design

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Datenbank:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Hosting:** Vercel

## Deployment auf Vercel

### 1. Supabase Setup

1. Erstelle ein Projekt auf [supabase.com](https://supabase.com)
2. Führe das SQL-Schema aus: `supabase/schema.sql` im SQL Editor
3. Notiere dir:
   - Project URL
   - anon public key
   - service_role key (für Account-Löschung)

### 2. Vercel Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/pelinbieletzki/Quiz24&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY)

Oder manuell:

1. Importiere das Repository auf [vercel.com](https://vercel.com)
2. Füge diese Environment Variables hinzu:

| Variable | Beschreibung |
|----------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Deine Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |

3. Deploy!

## Lokale Entwicklung

```bash
# Dependencies installieren
npm install

# Environment Variables kopieren
cp .env.example .env.local
# Dann die Werte in .env.local eintragen

# Development Server starten
npm run dev
```

## Spielanleitung

### Als Quiz-Ersteller:
1. Registrieren/Einloggen
2. Quiz erstellen mit Fragen
3. Quiz starten → Code wird angezeigt
4. Code an Mitspieler teilen
5. "Spiel starten" wenn alle da sind

### Als Spieler:
1. /join besuchen
2. Code eingeben
3. Nickname wählen
4. Warten auf Start
5. Fragen beantworten - schneller = mehr Punkte!

## Lizenz

MIT
