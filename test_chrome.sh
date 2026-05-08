#!/bin/bash
google-chrome --remote-debugging-port=9222 --headless=new --user-data-dir=$HOME/.chrome-debug &
sleep 5
ss -tulpn | grep :9222
