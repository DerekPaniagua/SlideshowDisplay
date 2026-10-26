#!/bin/bash
# Runs as root on every boot (slideshow-boot.service). Applies settings dropped onto the
# boot partition, and gives a freshly flashed golden image its own identity.
. /opt/slideshow/deploy/lib.sh
load_display_env
mkdir -p "$STATE_DIR"

# A golden image ships without SSH host keys; every flashed card makes its own
ensure_ssh_host_keys() {
    if ! ls /etc/ssh/ssh_host_*_key >/dev/null 2>&1; then
        log "Generating SSH host keys"
        ssh-keygen -A
        systemctl restart ssh 2>/dev/null
    fi
}

# wifi.txt: one "network name = password" per line. Only re-applied when the file changes.
apply_wifi() {
    local file="$CONFIG_DIR/wifi.txt" hash line ssid psk
    [ -f "$file" ] || return 0
    hash=$(sha256sum "$file" | cut -d' ' -f1)
    [ "$hash" = "$(cat "$STATE_DIR/wifi.sha256" 2>/dev/null)" ] && return 0

    while IFS= read -r line || [ -n "$line" ]; do
        line=${line%$'\r'}
        line=${line#$'\xef\xbb\xbf'}
        [[ $line =~ ^[[:space:]]*(#|$) ]] && continue
        [[ $line == *=* ]] || continue
        ssid=$(trim "${line%%=*}")
        psk=$(trim "${line#*=}")
        [ -n "$ssid" ] || continue
        log "Saving Wi-Fi network '$ssid'"
        nmcli connection delete id "slideshow-$ssid" >/dev/null 2>&1
        nmcli connection add type wifi con-name "slideshow-$ssid" ifname '*' ssid "$ssid" \
            wifi-sec.key-mgmt wpa-psk wifi-sec.psk "$psk" connection.autoconnect yes >/dev/null \
            || log "Failed to add Wi-Fi network '$ssid'"
    done < "$file"
    echo "$hash" > "$STATE_DIR/wifi.sha256"
}

# NIGHTLY_REBOOT=HH:MM in display.env (blank disables)
apply_reboot_time() {
    local dropin=/run/systemd/system/slideshow-reboot.timer.d
    if [ -z "${NIGHTLY_REBOOT:-}" ]; then
        systemctl stop slideshow-reboot.timer
        return
    fi
    if ! [[ $NIGHTLY_REBOOT =~ ^[0-2]?[0-9]:[0-5][0-9]$ ]]; then
        log "Ignoring invalid NIGHTLY_REBOOT '$NIGHTLY_REBOOT' (use HH:MM)"
        return
    fi
    mkdir -p "$dropin"
    printf '[Timer]\nOnCalendar=\nOnCalendar=*-*-* %s:00\n' "$NIGHTLY_REBOOT" > "$dropin/time.conf"
    systemctl daemon-reload
    systemctl restart slideshow-reboot.timer
}

# tailscale-authkey.txt: joins this Pi to your tailnet when it isn't already joined.
#  - OAuth client secret (tskey-client-...): never expires, so it stays on the card and any card
#    flashed from the golden image joins by itself. Joins as tag:display (no key expiry).
#  - Regular auth key (tskey-auth-...): expires within 90 days, so it's deleted once used.
join_tailscale() {
    local file="$CONFIG_DIR/tailscale-authkey.txt" key state attempt
    local args=(--hostname="$(hostname)" --timeout=60s)
    command -v tailscale >/dev/null || return 0
    [ -f "$file" ] || return 0
    key=$(tr -d '\r\n[:space:]' < "$file")
    [ -n "$key" ] || return 0

    state=$(tailscale status --json 2>/dev/null | jq -r '.BackendState // empty')
    if [ "$state" = Running ] || [ "$state" = Stopped ]; then
        return 0
    fi

    if [[ $key == tskey-client-* ]]; then
        args+=(--auth-key="$key?ephemeral=false&preauthorized=true" --advertise-tags=tag:display)
    else
        args+=(--auth-key="$key" --ssh)
    fi

    for attempt in $(seq 1 30); do
        if tailscale up "${args[@]}"; then
            log "Joined Tailscale as $(hostname)"
            [[ $key == tskey-client-* ]] || rm -f "$file"
            return 0
        fi
        log "Tailscale join failed (attempt $attempt), retrying in 30 seconds"
        sleep 30
    done
}

ensure_ssh_host_keys
apply_wifi
apply_reboot_time
join_tailscale
exit 0
