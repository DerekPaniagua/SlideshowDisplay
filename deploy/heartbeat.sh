#!/bin/bash
# Pings HEARTBEAT_URL (e.g. a free healthchecks.io check) every 5 minutes while the display
# is healthy. If the pings stop, or we report a failure, the monitor emails you.
. /opt/slideshow/deploy/lib.sh
load_display_env
[ -n "${HEARTBEAT_URL:-}" ] || exit 0

problem=""
server_healthy || problem="display server is not responding"
pgrep -x chromium >/dev/null || pgrep -f chromium-browser >/dev/null || problem="${problem:+$problem; }browser is not running"

if [ -z "$problem" ]; then
    curl -fsS -m 10 --retry 3 -o /dev/null "$HEARTBEAT_URL"
else
    curl -fsS -m 10 --retry 3 -o /dev/null --data-raw "$problem" "$HEARTBEAT_URL/fail"
fi
