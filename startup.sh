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
cd ~/Repos/SlideshowDisplay
echo "Connecting to Wifi..."
check_internet
echo "Updating and running server..."
git pull
npm install
npm run start:prod &
echo "Opening Browser..."
sleep 5
chromium http://localhost:3000 --kiosk &