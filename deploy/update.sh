#!/bin/bash
# Updates the display to the latest code (or a given git ref), and rolls back automatically if
# the server doesn't come back healthy. Run through `sudo slideshow update [ref]`.
set -uo pipefail
. /opt/slideshow/deploy/lib.sh
[ "$(id -u)" -eq 0 ] || die "Run with sudo: sudo slideshow update"
cd "$APP_DIR" || die "$APP_DIR not found"
mkdir -p "$STATE_DIR"

# The checkout belongs to the kiosk user; git refuses to work on it as root
g() {
    as_user git -C "$APP_DIR" "$@"
}

changed() {  # changed <from> <to> <paths...>
    ! g diff --quiet "$1" "$2" -- "${@:3}"
}

wait_healthy() {
    local i
    for i in $(seq 1 60); do
        server_healthy && return 0
        sleep 1
    done
    return 1
}

# Move the checkout from one commit to another and restart whatever needs it
deploy() {
    local from=$1 to=$2
    g reset --hard --quiet "$to" || return 1
    if changed "$from" "$to" package.json package-lock.json; then
        log "Dependencies changed, installing..."
        as_user npm ci --omit=dev --no-audit --no-fund || return 1
    fi
    if changed "$from" "$to" deploy/systemd deploy/provision.sh; then
        log "System files changed, reinstalling..."
        bash "$APP_DIR/deploy/provision.sh" --system || return 1
    fi
    systemctl restart slideshow
    wait_healthy || return 1
    if changed "$from" "$to" deploy/kiosk.sh deploy/labwc deploy/lib.sh; then
        log "Kiosk files changed, restarting the screen session..."
        systemctl restart getty@tty1
    fi
}

ref=${1:-origin/master}
g fetch --quiet origin || die "git fetch failed (no internet?)"
previous=$(g rev-parse HEAD)
target=$(g rev-parse --verify --quiet "$ref^{commit}") || die "Unknown git ref '$ref'"

if [ "$previous" = "$target" ]; then
    log "Already up to date ($(g log -1 --format='%h %s'))"
    exit 0
fi

log "Updating $(g log -1 --format='%h' "$previous") -> $(g log -1 --format='%h %s' "$target")"
if deploy "$previous" "$target"; then
    echo "$previous" > "$STATE_DIR/previous-commit"
    log "Update complete. The screen reloads itself within a minute."
else
    log "Update FAILED, rolling back to $(g log -1 --format='%h' "$previous")..."
    deploy "$target" "$previous" && log "Rolled back; the display is running the previous version." \
        || log "Rollback also failed! Check: slideshow logs server"
    exit 1
fi
