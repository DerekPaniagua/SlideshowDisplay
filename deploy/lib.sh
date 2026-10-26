# Shared settings and helpers for the deploy scripts. Source this, don't run it.

APP_DIR=/opt/slideshow
CONFIG_DIR=/boot/firmware/slideshow     # FAT boot partition: editable from Windows/Mac
CACHE_DIR=/var/lib/slideshow            # downloaded/resized images
STATE_DIR=/var/lib/slideshow-state      # update history, applied boot config
SERVER_URL=http://localhost:3000

# KIOSK_USER is written here by provision.sh
[ -f /etc/default/slideshow ] && . /etc/default/slideshow

log() {
    echo "[$(date '+%H:%M:%S')] $*"
}

trim() {
    local value=$1
    value=${value#"${value%%[![:space:]]*}"}
    value=${value%"${value##*[![:space:]]}"}
    printf '%s' "$value"
}

die() {
    echo "ERROR: $*" >&2
    exit 1
}

# Run a command as the kiosk user (when we're root)
as_user() {
    if [ "$(id -u)" -eq 0 ]; then
        sudo -u "$KIOSK_USER" -H "$@"
    else
        "$@"
    fi
}

server_healthy() {
    curl -fs -m 5 -o /dev/null "$SERVER_URL/health"
}

wait_for_server() {
    until server_healthy; do sleep 2; done
}

# Load KEY=value settings from display.env on the boot partition. Tolerates Windows line
# endings and quotes, and only accepts our own keys so the file can't change PATH etc.
load_display_env() {
    local file="$CONFIG_DIR/display.env" line key value
    [ -f "$file" ] || return 0
    while IFS= read -r line || [ -n "$line" ]; do
        line=${line%$'\r'}
        line=${line#$'\xef\xbb\xbf'}
        [[ $line =~ ^[[:space:]]*((DISPLAY|CHROMIUM|HEARTBEAT|NIGHTLY)_[A-Z0-9_]*)[[:space:]]*=[[:space:]]*(.*)$ ]] || continue
        key=${BASH_REMATCH[1]}
        value=$(trim "${BASH_REMATCH[3]}")
        [[ $value =~ ^\"(.*)\"$ || $value =~ ^\'(.*)\'$ ]] && value=${BASH_REMATCH[1]}
        printf -v "$key" '%s' "$value"
        export "${key?}"
    done < "$file"
}

# The kiosk user's Wayland session, for screenshots and display changes over SSH
wayland_env() {
    local uid runtime socket
    uid=$(id -u "$KIOSK_USER")
    runtime=/run/user/$uid
    socket=$(find "$runtime" -maxdepth 1 -name 'wayland-*' ! -name '*.lock' -printf '%f\n' 2>/dev/null | head -n1)
    [ -n "$socket" ] || die "The display session isn't running (no Wayland socket in $runtime)"
    echo "XDG_RUNTIME_DIR=$runtime WAYLAND_DISPLAY=$socket"
}
