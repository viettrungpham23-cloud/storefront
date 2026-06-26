#!/bin/bash
cd ~/storefront/QLBH-Website
pkill -f 'uvicorn main:app'
sleep 2
nohup /home/vetc/storefront/venv/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &

cd ~/storefront
pkill -f 'server.py'
sleep 2
export HOST=0.0.0.0
export PORT=8810
nohup /home/vetc/storefront/venv/bin/python3 server.py > server.log 2>&1 &
sleep 2
