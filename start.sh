#!/bin/bash

(cd ./kiosk-ui; npm install; npm i baseline-browser-mapping@latest -D; npm run dev) & (cd ./back-end; source run.sh)