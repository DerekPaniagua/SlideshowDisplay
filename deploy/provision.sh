#!/bin/bash
# Turns a fresh Raspberry Pi OS Lite (64-bit) install into the office display. Safe to re-run.
#
#   sudo bash /opt/slideshow/deploy/provision.sh            full setup (packages, Node, Tailscale, ...)
#   sudo bash /opt/slideshow/deploy/provision.sh --system   only reinstall services/config (used by updates)
#
# See docs/SETUP.md for the whole process.
set -euo pipefail
. /opt/slideshow/deploy/lib.sh

[ "$(id -u)" -eq 0 ] || die "Run with sudo"
[ -f "$APP_DIR/deploy/provision.sh" ] || die "Clone the repo to $APP_DIR first (see docs/SETUP.md)"

if [ -z "${KIOSK_USER:-}" ]; then
    KIOSK_USER=${SUDO_USER:-}
    [ -n "$KIOSK_USER" ] && [ "$KIOSK_USER" != root ] || die "Run as your normal user with sudo, not as root"
fi
KIOSK_HOME=$(getent passwd "$KIOSK_USER" | cut -d: -f6)

NODE_MAJOR=24

install_packages() {
    log "Updating Raspberry Pi OS (this takes a while the first time)..."
    export DEBIAN_FRONTEND=noninteractive
    apt-get update
    apt-get -y full-upgrade

    local browser=chromium
    apt-cache show chromium >/dev/null 2>&1 || browser=chromium-browser

    log "Installing display packages..."
    apt-get install -y --no-install-recommends \
        git curl jq ca-certificates \
        labwc wlr-randr wlrctl grim \
        "$browser" fonts-liberation fonts-dejavu-core \
        rpi-connect

    if ! node -v 2>/dev/null | grep -q "^v$NODE_MAJOR\."; then
        log "Installing Node.js $NODE_MAJOR..."
        curl -fsSL "https://deb.nodesource.com/setup_$NODE_MAJOR.x" | bash -
        apt-get install -y nodejs
    fi

    if ! command -v tailscale >/dev/null; then
        log "Installing Tailscale..."
        curl -fsSL https://tailscale.com/install.sh | sh
    fi
    systemctl enable --now tailscaled
}

install_app() {
    log "Installing the display app..."
    echo "KIOSK_USER=$KIOSK_USER" > /etc/default/slideshow
    chown -R "$KIOSK_USER:" "$APP_DIR"
    mkdir -p "$CACHE_DIR" "$STATE_DIR"
    chown "$KIOSK_USER:" "$CACHE_DIR"
    (cd "$APP_DIR" && as_user npm ci --omit=dev --no-audit --no-fund)

    # Settings on the boot partition; never overwrite ones you've edited
    mkdir -p "$CONFIG_DIR"
    local file
    for file in "$APP_DIR"/deploy/boot/*; do
        [ -e "$CONFIG_DIR/$(basename "$file")" ] || cp "$file" "$CONFIG_DIR/"
    done
    if [ -f "$APP_DIR/app/data/credentials.json" ] && [ ! -f "$CONFIG_DIR/credentials.json" ]; then
        cp "$APP_DIR/app/data/credentials.json" "$CONFIG_DIR/credentials.json"
    fi
    [ -f "$CONFIG_DIR/credentials.json" ] || log "NOTE: copy your Google credentials.json to $CONFIG_DIR/"
}

install_system_files() {
    log "Installing services..."
    local unit
    for unit in "$APP_DIR"/deploy/systemd/*; do
        sed "s/@USER@/$KIOSK_USER/g" "$unit" > "/etc/systemd/system/$(basename "$unit")"
    done

    # Reboot automatically if the Pi ever locks up hard
    mkdir -p /etc/systemd/system.conf.d
    printf '[Manager]\nRuntimeWatchdogSec=15\nRebootWatchdogSec=2min\n' > /etc/systemd/system.conf.d/slideshow-watchdog.conf

    # Keep logs across reboots so crashes can be diagnosed remotely, but cap their size
    mkdir -p /etc/systemd/journald.conf.d
    printf '[Journal]\nStorage=persistent\nSystemMaxUse=100M\n' > /etc/systemd/journald.conf.d/slideshow.conf

    systemctl daemon-reload
    systemctl daemon-reexec
    systemctl enable slideshow.service slideshow-boot.service slideshow-heartbeat.timer slideshow-reboot.timer

    printf '#!/bin/sh\nexec bash %s/deploy/slideshow.sh "$@"\n' "$APP_DIR" > /usr/local/bin/slideshow
    chmod 755 /usr/local/bin/slideshow
}

install_kiosk_session() {
    log "Setting up the screen session..."
    # Log in automatically on the console, which starts labwc + Chromium (see .bash_profile)
    command -v raspi-config >/dev/null && raspi-config nonint do_boot_behaviour B2

    local profile="$KIOSK_HOME/.bash_profile"
    touch "$profile"
    sed -i '/# >>> slideshow kiosk >>>/,/# <<< slideshow kiosk <<</d' "$profile"
    cat >> "$profile" <<EOF
# >>> slideshow kiosk >>>
[ -f ~/.profile ] && . ~/.profile
if [ -z "\${WAYLAND_DISPLAY:-}" ] && [ "\$(tty)" = /dev/tty1 ]; then
    export WLR_LIBINPUT_NO_DEVICES=1   # start even with no keyboard/mouse plugged in
    exec systemd-cat --identifier=labwc labwc -C $APP_DIR/deploy/labwc
fi
# <<< slideshow kiosk <<<
EOF
    chown "$KIOSK_USER:" "$profile"

    # Lets Raspberry Pi Connect run as this user
    loginctl enable-linger "$KIOSK_USER"
}

if [ "${1:-}" = "--system" ]; then
    install_system_files
    exit 0
fi

install_packages
install_app
install_system_files
install_kiosk_session

systemctl restart slideshow
systemctl start slideshow-boot slideshow-heartbeat.timer slideshow-reboot.timer || true

cat <<EOF

Done! Next steps:
  1. Put credentials.json (and optionally wifi.txt, tailscale-authkey.txt) in $CONFIG_DIR
  2. Reboot:                     sudo reboot
  3. Sign in to Pi Connect:      rpi-connect signin
  4. Check everything:           slideshow status
EOF
