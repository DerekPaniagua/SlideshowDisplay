# Setting up the display and the golden image

This builds a working display from scratch, then saves it as a **golden image**: a file you can
flash to any SD card to get a ready-to-go display in minutes.

The setup script (`deploy/provision.sh`) is the real source of truth. The golden image is just a
saved result of running it. If the image is ever lost, follow Part 1 again to rebuild it.

## What you need

- Raspberry Pi 5 and its **official 27W USB-C power supply**. Weak supplies are a top cause of
  random crashes. `slideshow status` shows a warning if power is low.
- A good SD card, 32 GB or more (A2 / "high endurance" types last longer).
- The Google service account key: `credentials.json`.
- A free [Tailscale](https://tailscale.com) account, with Tailscale installed on your PC and phone.
- A VNC viewer on your PC for remote screen viewing, e.g. [TigerVNC](https://tigervnc.org).

## Part 1: Build and test a display

### 1. Flash Raspberry Pi OS

In **Raspberry Pi Imager**, choose **Raspberry Pi 5**, then **Raspberry Pi OS (other)** →
**Raspberry Pi OS Lite (64-bit)**. When asked about OS customisation, choose **Edit settings**:

- Hostname: `office-display`
- Username and password: your choice (you'll SSH in with these)
- Wireless LAN: your **home** Wi-Fi (the office network gets added later)
- Locale: the office's time zone
- Services tab: **Enable SSH**

### 2. Run the setup script

Boot the Pi, wait a minute or two, then from your PC:

```bash
ssh <user>@office-display.local
sudo apt-get update && sudo apt-get install -y git
sudo git clone https://github.com/DerekPaniagua/SlideshowDisplay.git /opt/slideshow
sudo bash /opt/slideshow/deploy/provision.sh
```

The first run takes 10–20 minutes. It's safe to run again if anything fails partway.

### 3. Add settings and credentials

From your PC (PowerShell, in this repo folder):

```powershell
scp app\data\credentials.json <user>@office-display.local:
```

Then on the Pi:

```bash
sudo mv ~/credentials.json /boot/firmware/slideshow/
sudo nano /boot/firmware/slideshow/wifi.txt        # add the office Wi-Fi:  Office WiFi = password
```

Join Tailscale: in the [Tailscale admin console](https://login.tailscale.com/admin/settings/keys),
**Generate auth key**, turn on **Reusable** and **Pre-approved**, then:

```bash
echo 'tskey-auth-...' | sudo tee /boot/firmware/slideshow/tailscale-authkey.txt
sudo reboot
```

After it boots, open the Tailscale admin console → **Machines** → `office-display` → **⋯** →
**Disable key expiry**, so it never drops off your network.

### 4. Try remote screen viewing

Screen sharing (VNC) is set up automatically. Follow "Seeing the screen" in
[OPERATIONS.md](OPERATIONS.md) to check you can see the display from your PC.

### 5. Test checklist

Do this at home on the test Pi, then once more on the office Pi with the real TV:

- [ ] Screen is portrait and the right way up (change `DISPLAY_TRANSFORM` in `display.env` if not)
- [ ] Photos rotate and the calendar shows this week's events
- [ ] `slideshow status` shows everything OK, including **Power/throttling: OK**
- [ ] With your phone on cellular (off your home network): `ssh <user>@office-display` works over Tailscale
- [ ] VNC over the SSH tunnel shows the display, the right way up
- [ ] Unplug the network cable / turn off Wi-Fi: photos and calendar keep showing
- [ ] Pull the power and plug it back in: display comes back on its own
- [ ] `sudo slideshow update` reports "Already up to date"

### 6. Tune 4K performance (on the Pi 5 with the real TV)

Watch a few photo fades. If they stutter, step down in `display.env`, running
`slideshow restart-screen` after each change:

1. `DISPLAY_MODE=3840x2160@30Hz`: half the work, and plenty for a slideshow
2. `DISPLAY_MODE=1920x1080@60Hz` and `DISPLAY_SCALE=1`: a quarter of the work; the TV upscales

`slideshow display` lists the modes the TV supports. The layout adapts to any resolution.

## Part 2: Capture the golden image

The goal is a file you can flash, pop into a Pi and forget about. The only thing that would stop
that is Tailscale: normal auth keys expire within 90 days. So first give the card a credential
that never expires.

### 1. A permanent Tailscale credential (one time)

In the [Tailscale admin console](https://login.tailscale.com/admin) (menu names may differ slightly):

1. **Access controls**: add a tag owner to the policy file, inside the top-level `{ }`, and save:
   ```json
   "tagOwners": {
       "tag:display": ["autogroup:admin"]
   },
   ```
   (If `tagOwners` already exists, just add the `"tag:display"` line to it.)
2. **Settings → OAuth clients → Generate OAuth client**. Give it write access to **Auth Keys**
   with the tag `tag:display`, generate it, and copy the **client secret** (`tskey-client-...`).
   It's shown once, so save it in your password manager.
3. On the Pi, put it on the card:
   ```bash
   echo 'tskey-client-...' | sudo tee /boot/firmware/slideshow/tailscale-authkey.txt
   ```

Machines that join with it are tagged `tag:display` and never hit key expiry. The secret stays on
the card (and in the image), so keep the image private. If it ever leaks, delete the OAuth client
in the admin console and make a new one.

### 2. Prepare the card

On the finished, tested display:
   ```bash
   sudo bash /opt/slideshow/deploy/prepare-golden-image.sh
   ```
   This signs the card out of Tailscale, removes its SSH keys and machine ID (each
   flashed card makes its own), then shuts down. Cached photos are kept, so a new card shows photos
   right away, even offline. Wait for the green light to stop blinking before removing the card.

### 3. Copy the card to a file

Use either of these:
   - **Windows:** put the card in a reader, open [Win32 Disk Imager](https://sourceforge.net/projects/win32diskimager/),
     choose a file name like `office-display-2026-10-26.img`, and click **Read**.
   - **Other Pi:** put the card in a USB reader on the other Pi and run
     `sudo dd if=/dev/sda of=office-display.img bs=4M status=progress` (check the device with `lsblk` first).

### 4. Shrink it

Optional, but it turns a 32 GB file into a few GB. In WSL (copying into WSL first is much faster):
```bash
sudo apt install -y parted
cp /mnt/c/path/to/office-display-2026-10-26.img ~/
cd ~
wget https://raw.githubusercontent.com/Drewsif/PiShrink/master/pishrink.sh
sudo bash pishrink.sh -z office-display-2026-10-26.img
cp office-display-2026-10-26.img.gz /mnt/c/path/to/
```
The shrunk image grows back to fill the card on first boot.

### 5. Keep two copies

One on your PC and one in cloud storage (Google Drive, OneDrive, ...).

## Part 3: Flash a card from the golden image

1. Raspberry Pi Imager → **Choose OS** → **Use Custom** → pick the `.img` / `.img.gz`.
   When asked about OS customisation, choose **No** (the image is already configured).
2. Put it in the Pi and power on. That's it: the display comes up with the cached photos, then
   joins Wi-Fi and Tailscale by itself.
3. When convenient, bring the code up to date (the image may be months old):
   ```bash
   ssh <user>@office-display
   sudo slideshow update
   ```
   In Tailscale it may appear as `office-display-1` if the old machine is still listed; delete the
   old entry in the admin console.

Only if the office Wi-Fi password has changed since the image was made: before ejecting the card,
open its **bootfs** drive in Explorer → `slideshow` → `wifi.txt` and update it.

### The spare card

Flash a second card (Part 3), boot it once at home to check it works, then leave it in a labelled
envelope at the office. If the display ever won't come back, your brother can swap cards and you
can fix the broken one at home. It may be out of date when used; run `sudo slideshow update`.

## Refreshing the golden image

You don't need to recapture the image for code changes, since `slideshow update` handles those.
Recapture it only after big system changes (OS upgrade, new packages), or about once a year.
