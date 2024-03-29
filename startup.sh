#!/bin/bash

# Function to check internet connectivity
check_internet() {
    wget -q --spider http://google.com

    if [ $? -eq 0 ]; then
        echo "Internet connection detected."
        return 0
    else
        echo "No internet connection. Retrying in 5 seconds..."
        sleep 5
        check_internet
    fi
}

# Check internet connectivity


export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
cd ~/Repos/slideshowdisplay
echo "Connecting to Wifi..."
nmcli radio wifi off
sleep 5
nmcli radio wifi on
sleep 5
check_internet
git pull &
echo "Updating and running server..."
sleep 5
npm install
npm run start:prod &
echo "Opening Firefox..."
sleep 5
xdotool mousemove 0 0
firefox http://localhost:3000 --kiosk