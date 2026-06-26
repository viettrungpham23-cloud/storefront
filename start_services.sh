#!/bin/bash
sudo systemctl daemon-reload
sudo systemctl enable storefront-admin storefront-app
sudo systemctl start storefront-admin storefront-app
sudo systemctl status storefront-admin storefront-app --no-pager
