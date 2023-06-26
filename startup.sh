#!/bin/bash
cd ~/Repos/SlideshowDisplay
git pull
npm install
npm run start &
sleep 5
chromium-browser http://localhost:3000 --kiosk