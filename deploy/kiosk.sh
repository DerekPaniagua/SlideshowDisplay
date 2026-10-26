#!/bin/bash
# Runs inside the labwc session (see deploy/labwc/autostart). Sets up the screen, then keeps
# Chromium open on the display page, restarting it if it ever exits.
. /opt/slideshow/deploy/lib.sh
load_display_env

# Let user services (Raspberry Pi Connect screen sharing) find this session
systemctl --user import-environment WAYLAND_DISPLAY XDG_RUNTIME_DIR 2>/dev/null
dbus-update-activation-environment --systemd WAYLAND_DISPLAY XDG_RUNTIME_DIR 2>/dev/null

configure_output() {
    local output args
    output=${DISPLAY_OUTPUT:-$(wlr-randr | awk '/^[^ ]/ { print $1; exit }')}
    if [ -z "$output" ]; then
        log "No display connected"
        return
    fi
    args=(--output "$output" --transform "${DISPLAY_TRANSFORM:-normal}" --scale "${DISPLAY_SCALE:-1}")
    [ -n "${DISPLAY_MODE:-}" ] && args+=(--mode "$DISPLAY_MODE")
    log "Configuring display: wlr-randr ${args[*]}"
    wlr-randr "${args[@]}" || log "wlr-randr failed; check DISPLAY_* settings in $CONFIG_DIR/display.env"
}

hide_pointer() {
    # The page hides the cursor too, but move it out of the way in case it's drawn before load
    wlrctl pointer move 100000 100000 2>/dev/null
}

CHROMIUM=$(command -v chromium || command -v chromium-browser)
PROFILE_DIR="$XDG_RUNTIME_DIR/slideshow-chromium"   # in RAM: no SD card writes, fresh every launch

CHROMIUM_FLAGS=(
    --kiosk
    --ozone-platform=wayland
    --user-data-dir="$PROFILE_DIR"
    --no-first-run
    --noerrdialogs
    --disable-infobars
    --disable-session-crashed-bubble
    --disable-features=Translate,TranslateUI,MediaRouter
    --password-store=basic
    --disable-pinch
    --overscroll-history-navigation=0
    --check-for-update-interval=31536000
)

configure_output
hide_pointer

while true; do
    log "Waiting for the display server..."
    wait_for_server
    rm -rf "$PROFILE_DIR"
    log "Starting Chromium"
    # shellcheck disable=SC2086  # CHROMIUM_EXTRA_FLAGS is intentionally word-split
    "$CHROMIUM" "${CHROMIUM_FLAGS[@]}" ${CHROMIUM_EXTRA_FLAGS:-} "$SERVER_URL/" &
    chromium_pid=$!
    sleep 5 && hide_pointer
    wait "$chromium_pid"
    log "Chromium exited (code $?), restarting in 5 seconds"
    sleep 5
done
