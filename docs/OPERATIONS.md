# Running the display remotely

## Connecting

With Tailscale running on your PC or phone, from anywhere:

```bash
ssh <user>@office-display
```

**See the screen:** [connect.raspberrypi.com](https://connect.raspberrypi.com) → the display →
**Screen sharing**. Or take a screenshot: `slideshow screenshot`, then from your PC
`scp <user>@office-display:screenshot.png .`

## The `slideshow` command

| Command | What it does |
|---|---|
| `slideshow status` | Server health, photo count, last sync times, network, temperature, power warnings |
| `slideshow logs [server\|kiosk\|boot] [-f]` | Recent logs (`-f` to follow live) |
| `sudo slideshow update` | Pull the latest code and restart. **Rolls back automatically** if the server doesn't come up healthy |
| `sudo slideshow rollback` | Go back to the version before the last update |
| `slideshow restart` | Restart the web server (the page reloads itself) |
| `slideshow restart-screen` | Restart the screen session (labwc + Chromium) |
| `slideshow screenshot` | Save a screenshot to `~/screenshot.png` |
| `slideshow display` | Connected displays and supported resolutions |
| `slideshow config` | Where the settings files are |

## Making a change

1. Edit on your PC and test locally: `npm install`, then `npm start`, and open
   http://localhost:3000. Requires Node 22+, and `credentials.json` in `app/data/`.
2. Commit and push to `master`.
3. `ssh <user>@office-display sudo slideshow update`

The screen picks up the new version within about 30 seconds. If something's wrong, run
`sudo slideshow rollback`.

## Settings

Settings live in `/boot/firmware/slideshow/` on the SD card (the **bootfs** drive on a PC).
See `README.txt` in that folder. Edit them over SSH with `sudo nano`, then:

- `config.json` (photo timing, calendar hours): `slideshow restart`
- `display.env` (rotation, resolution, alerts, nightly reboot): `slideshow restart-screen`
- `wifi.txt`: `sudo reboot`

## Getting alerted when it's down

1. Create a free check at [healthchecks.io](https://healthchecks.io) with a period of 5 minutes
   and a grace time of 15 minutes. Turn on email alerts.
2. Put its ping URL in `display.env`: `HEARTBEAT_URL=https://hc-ping.com/...`

The Pi pings it every 5 minutes while the server and browser are both running. You get an email
if it reports a problem or goes silent (power off, Wi-Fi down, frozen).

## What keeps it running

- **Web server** runs under systemd and restarts within 3 seconds if it crashes.
- **Chromium** is relaunched by `kiosk.sh` if it exits; **labwc** restarts via console autologin.
- **The page** retries every request, keeps the last good photos and calendar if Google is
  unreachable, and only reloads after checking the server is up.
- **Photos** are cached on the SD card, so the display works with no internet, even after a reboot.
- **Hardware watchdog** reboots the Pi if it freezes completely.
- **Nightly reboot** at 3:30am clears out anything that's gone stale.

## Troubleshooting

| Symptom | Check |
|---|---|
| Can't reach it over Tailscale | Is it powered and on Wi-Fi? Ask your brother to unplug the Pi for 10 seconds. Check the office Wi-Fi password hasn't changed. |
| Logo shows but no photos | `slideshow logs server`: credentials problem or Drive sharing? `slideshow status` shows `images: 0`? |
| Calendar empty | `slideshow logs server`: look for "calendar". Is the calendar still shared with the service account? |
| Black screen / no signal | `slideshow status` (is Chromium running?), `slideshow logs kiosk`, `slideshow display`, then `slideshow restart-screen` |
| Stuttery fades | Step `DISPLAY_MODE` down (see SETUP.md, "Tune 4K performance") |
| Random crashes or reboots | `slideshow status`: a non-zero **Power/throttling** means a bad power supply or overheating |

**Recovery ladder:** `slideshow restart-screen` → `sudo reboot` → your brother power-cycles it →
swap in the spare SD card → flash a new card from the golden image → rebuild from scratch (SETUP.md).

### Instructions for your brother

> If the screen looks wrong: unplug the Raspberry Pi's power for 10 seconds and plug it back in.
> Give it 5 minutes. If it's still wrong, power off, swap the SD card with the spare in the
> labelled envelope, and power back on.

## Optional: read-only SD card

Raspberry Pi OS can make the SD card read-only (`sudo raspi-config` → Performance → Overlay File
System), so a power cut can never corrupt it. The trade-off is that changes (including updates
and the photo cache) are lost on reboot: photos re-download at every boot, and to update you
have to turn the overlay off, reboot, update, turn it on and reboot again. Consider it only if
SD card corruption turns out to be a real problem.
