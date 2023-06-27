#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
cd ~/Repos/slideshowdisplay
nmcli d connect wlxa036bcd410ec
echo "Connecting to Wifi..."
sleep 10
git pull &
echo "Updating and running server..."
sleep 5
npm install
npm run start:prod &
echo "Opening Chrome..."
sleep 5
xdotool mousemove 0 0
chromium-browser http://localhost:3000 --kiosk