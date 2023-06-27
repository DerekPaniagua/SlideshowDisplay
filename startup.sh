#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
cd ~/Repos/slideshowdisplay
sleep 30
git pull &
sleep 5
npm install
npm run start:prod &
sleep 5
xdotool mousemove 0 0
chromium-browser http://localhost:3000 --kiosk