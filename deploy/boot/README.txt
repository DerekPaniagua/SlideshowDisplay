OFFICE DISPLAY SETTINGS
=======================

These files configure the display. You can edit them from any computer by putting
the SD card in a card reader (this is the "bootfs" drive), or over SSH with
`sudo nano /boot/firmware/slideshow/<file>`.

credentials.json        Google service account key (Drive photos + Calendar). Required.

config.json             Slideshow and calendar settings. Only include what you want to change:
                          slideshow_duration      ms each photo shows (10000 = 10 seconds)
                          transition_duration     ms of the fade between photos
                          drive_sync_interval     ms between checks for new photos
                          calendar_id             calendar to show (blank = first one shared)
                          calendar_update_duration ms between calendar refreshes
                          day_start / day_end     hours shown, e.g. "06:00:00" / "18:00:00"
                          hidden_days             days to hide, 0 = Sunday ... 6 = Saturday
                          image_width/height      photo size in pixels (2160 x 1920 for 4K)
                        Apply with: slideshow restart

display.env             Screen rotation/resolution, uptime alert URL, nightly reboot time.
                        Apply with: slideshow restart-screen (or reboot)

wifi.txt                Wi-Fi networks, one "name = password" per line. Applied on reboot.

tailscale-authkey.txt   (Optional) Create this with a Tailscale auth key in it to join the
                        Pi to your Tailscale network on next boot. Deleted once used.
