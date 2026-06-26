#!/bin/bash
pkill -f 'server.py'
pkill -f 'uvicorn main:app'
sleep 2
cd /home/vetc/storefront
nohup /home/vetc/storefront/venv/bin/python3 server.py > server.log 2>&1 &
cd /home/vetc/storefront/QLBH-Website
nohup /home/vetc/storefront/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 > web.log 2>&1 &
echo "Services restarted"
