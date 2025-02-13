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
cd ~/Repos/SlideshowDisplay
echo "Connecting to Wifi..."
check_internet
echo "Updating server..."
git pull
npm install
echo "Running Servier and Opening Browser..."
(sleep 10 ; firefox http://localhost:3000 --kiosk) &
npm run start:prod