#!/bin/bash
# Run right before shutting down to capture the golden image. Removes this Pi's identity
# (Tailscale node, machine id) so every card flashed from the image sets itself up fresh on
# first boot. SSH host keys are kept: without them SSH doesn't start on the first boot.
# See docs/SETUP.md.
set -uo pipefail
. /opt/slideshow/deploy/lib.sh
[ "$(id -u)" -eq 0 ] || die "Run with sudo"

cat <<EOF
This removes this card's Tailscale login and machine id,
then shuts down. Afterwards, capture the card as the golden image.
Cards rejoin Tailscale on their own if tailscale-authkey.txt holds an OAuth client secret
(see docs/SETUP.md); with a regular auth key, add a new key before booting.
EOF
read -r -p "Continue? [y/N] " answer
[ "$answer" = y ] || [ "$answer" = Y ] || exit 1

log "Signing out of Tailscale..."
tailscale logout 2>/dev/null
# Logging out keeps the machine key, which every flashed card would then share
systemctl stop tailscaled 2>/dev/null
rm -f /var/lib/tailscale/tailscaled.state

log "Removing machine identity..."
truncate -s 0 /etc/machine-id
[ -L /var/lib/dbus/machine-id ] || rm -f /var/lib/dbus/machine-id
rm -f "$STATE_DIR/wifi.sha256"    # re-apply wifi.txt on first boot

log "Cleaning up..."
apt-get clean
journalctl --rotate >/dev/null 2>&1
journalctl --vacuum-time=1s >/dev/null 2>&1
rm -f /root/.bash_history "$(getent passwd "$KIOSK_USER" | cut -d: -f6)/.bash_history"

log "Shutting down. When the green light stops blinking, remove the card and image it."
sleep 3
poweroff
