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

### 2. Copy the display onto a small card

Imaging a big card makes a file as big as the card, so copy the system onto a small spare card
first (8–16 GB is plenty; it only needs to hold about 6 GB). This also leaves the working display
card untouched. With the spare card in a USB reader on the Pi:

```bash
lsblk                                  # the reader is usually sda; check its size
sudo apt install -y tmux
curl -fsSL https://raw.githubusercontent.com/geerlingguy/rpi-clone/master/install | sudo bash
tmux new -s clone
sudo rpi-clone sda
```

Answer yes to its prompts. It takes a while; tmux keeps it running if your SSH session drops
(reconnect, then `tmux attach -t clone`). If it gets cut off anyway, run it again: it only copies
what's missing. To check the copy is complete:

```bash
sudo mkdir -p /mnt/clone
mountpoint -q /mnt/clone || sudo mount /dev/sda2 /mnt/clone
df -h / /mnt/clone                     # "Used" should be about the same on both
sudo rsync -aHAXxn --delete --itemize-changes / /mnt/clone/ | wc -l    # a few dozen at most
sudo umount /mnt/clone
```

### 3. Prepare the small card

Power off, put the small card in the Pi's own slot, and boot from it. This also proves the copy
works. Then:

```bash
sudo slideshow update
sudo bash /opt/slideshow/deploy/prepare-golden-image.sh
```

The script signs the card out of Tailscale, deletes its Tailscale key and resets its machine ID
(each flashed card makes its own), then shuts down. Cached photos are kept, so a new card shows
photos right away, even offline. Wait for the green light to stop blinking before removing the
card, and **don't boot it again** before imaging it: booting gives it an identity again.

### 4. Copy the card to a file

- **Windows:** put the card in a reader (click **Cancel** if Windows offers to format it), open
  [Win32 Disk Imager](https://sourceforge.net/projects/win32diskimager/) (right-click → **Run as
  administrator** if it won't open), choose a file name like `office-display-2026-10-26.img`, and
  click **Read**.
- **On a Pi:** put the card in a USB reader on a Pi booted from another card, check it's `sda` with
  `lsblk`, then in tmux:
  `sudo dd if=/dev/sda bs=4M status=progress | gzip -1 > ~/office-display.img.gz`.
  Copy it to your PC with `scp <user>@office-display.local:office-display.img.gz .` and delete it
  from the Pi.

If you had to image a big card instead, [PiShrink](https://github.com/Drewsif/PiShrink) can shrink
the file afterwards (in WSL, with the image copied into the WSL home folder first).

### 5. Keep two copies

One on your PC and one in cloud storage (Google Drive, OneDrive, ...). Keep both private: the image
contains the Tailscale secret and the Google credentials. Label the small card as the spare (see
below).

## Part 3: Flash a card from the golden image

1. Raspberry Pi Imager (Windows or Mac) → **Choose OS** → **Use Custom** → pick the `.img` /
   `.img.gz`. When asked about OS customisation, choose **No** (the image is already configured).
   Afterwards a Mac may say the disk "is not readable": click **Eject**, never **Initialize**.
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

The small card from Part 2 is a ready spare; or flash one (Part 3) and boot it once at home to
check it works. Leave it in a labelled envelope at the office. If the display ever won't come back, your brother can swap cards and you
can fix the broken one at home. It may be out of date when used; run `sudo slideshow update`.

## Refreshing the golden image

You don't need to recapture the image for code changes, since `slideshow update` handles those.
Recapture it only after big system changes (OS upgrade, new packages), or about once a year.
Image a card that's been through `prepare-golden-image.sh` and not booted since, or every card
flashed from it shares one Tailscale identity.
