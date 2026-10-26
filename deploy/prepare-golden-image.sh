#!/bin/bash
# Run right before shutting down to capture the golden image. Removes this Pi's identity
# (Tailscale node, SSH host keys, machine id) so every card flashed from
# the image sets itself up fresh on first boot. See docs/SETUP.md.
set -uo pipefail
. /opt/slideshow/deploy/lib.sh
[ "$(id -u)" -eq 0 ] || die "Run with sudo"

cat <<EOF
This removes this card's Tailscale login, SSH host keys and machine id,
then shuts down. Afterwards, capture the card as the golden image.
Cards rejoin Tailscale on their own if tailscale-authkey.txt holds an OAuth client secret
(see docs/SETUP.md); with a regular auth key, add a new key before booting.
EOF
read -r -p "Continue? [y/N] " answer
[ "$answer" = y ] || [ "$answer" = Y ] || exit 1

log "Signing out of Tailscale..."
tailscale logout 2>/dev/null

log "Removing machine identity..."
rm -f /etc/ssh/ssh_host_*
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
