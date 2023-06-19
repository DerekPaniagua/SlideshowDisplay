#!/bin/bash

git pull

npm install

npm run start:prod &

sleep 10

