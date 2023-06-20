#!/bin/bash
git pull
npm install
npm run start &
sleep 10
firefox-esr --kiosk http://localhost:3000