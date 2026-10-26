#!/bin/bash
# `slideshow` command for managing the display over SSH. Installed by provision.sh.
. /opt/slideshow/deploy/lib.sh

usage() {
    cat <<EOF
Usage: slideshow <command>

  status              Health of the server, screen, network and Pi hardware
  logs [server|kiosk|boot|all] [-f]
                      Show recent logs (-f to follow)
  update [ref]        Update to the latest code (sudo), rolls back automatically on failure
  rollback            Go back to the version before the last update (sudo)
  restart             Restart the web server (the page reloads itself)
  restart-screen      Restart the screen session (labwc + Chromium)
  screenshot [file]   Save a screenshot of the screen (default: ~/screenshot.png)
  display             Show connected displays and supported modes
  config              Show where the settings files are
EOF
}

need_root() {
    [ "$(id -u)" -eq 0 ] || exec sudo bash "$0" "$@"
}

cmd=${1:-help}
shift || true

case "$cmd" in
    status)
        echo "== Server"
        if server_healthy; then
            curl -fs "$SERVER_URL/health" | jq .
        else
            echo "NOT RESPONDING"
        fi
        systemctl --no-pager --lines=0 status slideshow | head -n 3
        echo
        echo "== Screen"
        if pgrep -x chromium >/dev/null || pgrep -f chromium-browser >/dev/null; then echo "Chromium running"; else echo "Chromium NOT running"; fi
        echo
        echo "== Code"
        as_user git -C "$APP_DIR" log -1 --format='%h %s (%cr)'
        echo
        echo "== Network"
        nmcli -t -f NAME,DEVICE connection show --active 2>/dev/null
        command -v tailscale >/dev/null && tailscale status --self --peers=false 2>/dev/null
        echo
        echo "== Hardware"
        echo "Uptime: $(uptime -p)"
        if command -v vcgencmd >/dev/null; then
            echo "Temperature: $(vcgencmd measure_temp | cut -d= -f2)"
            throttled=$(vcgencmd get_throttled | cut -d= -f2)
            if [ "$throttled" = "0x0" ]; then
                echo "Power/throttling: OK"
            else
                echo "Power/throttling: $throttled (non-zero means under-voltage or overheating: check the power supply)"
            fi
        fi
        df -h / | tail -n 1 | awk '{ print "Disk: " $3 " used of " $2 " (" $5 ")" }'
        free -h | awk '/^Mem:/ { print "Memory: " $3 " used of " $2 }'
        ;;
    logs)
        target=${1:-all}
        shift || true
        case "$target" in
            server) ids=(-t slideshow) ;;
            kiosk) ids=(-t kiosk -t labwc) ;;
            boot) ids=(-t slideshow-boot) ;;
            all) ids=(-t slideshow -t slideshow-boot -t kiosk -t labwc) ;;
            *) set -- "$target" "$@"; ids=(-t slideshow -t slideshow-boot -t kiosk -t labwc) ;;
        esac
        exec journalctl --no-pager -n 200 "${ids[@]}" "$@"
        ;;
    update)
        need_root update "$@"
        # Run a copy: update.sh may replace itself mid-run
        tmp=$(mktemp)
        cp "$APP_DIR/deploy/update.sh" "$tmp"
        bash "$tmp" "$@"
        status=$?
        rm -f "$tmp"
        exit $status
        ;;
    rollback)
        need_root rollback
        previous=$(cat "$STATE_DIR/previous-commit" 2>/dev/null) || die "No previous version recorded"
        exec bash "$0" update "$previous"
        ;;
    restart)
        need_root restart
        systemctl restart slideshow && log "Server restarted"
        ;;
    restart-screen)
        need_root restart-screen
        systemctl restart getty@tty1 && log "Screen session restarted"
        ;;
    screenshot)
        file=${1:-$HOME/screenshot.png}
        env $(wayland_env) grim "$file" && log "Saved $file (copy it with: scp $(hostname):$file .)"
        ;;
    display)
        env $(wayland_env) wlr-randr
        ;;
    config)
        cat <<EOF
Settings live on the SD card's boot partition (editable from Windows/Mac, or here with sudo nano):
  $CONFIG_DIR/config.json        slideshow/calendar settings (restart to apply)
  $CONFIG_DIR/display.env        screen rotation/resolution, heartbeat, nightly reboot (restart-screen)
  $CONFIG_DIR/wifi.txt           Wi-Fi networks (reboot to apply)
  $CONFIG_DIR/credentials.json   Google service account key
See $CONFIG_DIR/README.txt for details.
EOF
        ;;
    help|-h|--help)
        usage
        ;;
    *)
        usage
        exit 1
        ;;
esac
