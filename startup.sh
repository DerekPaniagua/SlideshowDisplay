#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
cd ~/Repos/SlideshowDisplay
git pull
npm install
npm run start &
sleep 5
chromium-browser http://localhost:3000 --kiosk