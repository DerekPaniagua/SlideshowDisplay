# SlideshowDisplay

The office display: a week view of a Google Calendar above a slideshow of photos from Google
Drive, running full-screen on a Raspberry Pi 5 in 4K portrait.

- **[docs/SETUP.md](docs/SETUP.md)**: build a display, capture and flash the golden image
- **[docs/OPERATIONS.md](docs/OPERATIONS.md)**: remote access, updates, settings, troubleshooting

## How it works

```
Google Drive ──sync every minute──▶ Node server ──▶ resized, cached .webp photos (on SD card)
Google Calendar ◀──on request────── (app/app.js)  ◀── Chromium kiosk page (app/html/index.html)
```

- The server downloads new photos once, resizes them to exactly the size they're shown at, and
  serves them from disk, so the display keeps working without internet.
- The page cross-fades photos on the GPU and only refreshes the calendar data, never the whole page,
  unless the server has been updated.

## Layout

| Path | What |
|---|---|
| `app/app.js` | Express server and API endpoints |
| `app/slideshow.js` | Google Drive sync, resize and cache |
| `app/calendar.js` | Google Calendar events, with last-good fallback |
| `app/config.js`, `app/data/config.json` | Default settings, merged with the overrides on the Pi |
| `app/html`, `app/public` | The display page (`/`) and the graphs page (`/graphs`) |
| `deploy/provision.sh` | Sets up a fresh Raspberry Pi OS Lite as the display |
| `deploy/slideshow.sh` | The `slideshow` management command |
| `deploy/update.sh` | Update with automatic rollback |
| `deploy/kiosk.sh`, `deploy/labwc/` | Screen session: display settings, Chromium kept running |
| `deploy/boot/` | Settings templates copied to the SD card's boot partition |
| `deploy/systemd/` | Services: server, boot config, heartbeat, nightly reboot |

## Local development

Requires Node 22+. Put the Google service account key at `app/data/credentials.json`, then:

```bash
npm install
npm start          # http://localhost:3000, restarts on changes
npm run start:local  # same, but photos come from app/dev-images/ instead of Google Drive
```

To preview the 4K portrait layout, open the page in a 1080×1920 browser window (device toolbar in Chrome DevTools).
