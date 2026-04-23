#!/bin/bash

(cd ./kiosk-ui; npm run dev) & (cd ./back-end; source run.sh)