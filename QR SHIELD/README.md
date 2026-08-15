# QR Shield

QR Shield is an installable web app that scans QR codes and helps users decide whether the scanned content is safe or unsafe before opening it.

## Features

- Camera-based QR scanning
- Upload QR image and scan
- Manual URL / QR text checking
- Safe or unsafe result report
- UPI payment QR detection
- Trusted company, social, gaming, government, and payment domain checks
- Short-link and suspicious-domain blocking
- Scan history with QR image preview
- View scanned QR image with decoded content
- Installable PWA with QR Shield icon
- Works on mobile browsers after deployment over HTTPS

## Safety Logic

QR Shield marks trusted and recognized QR content as safe, including:

- UPI payment QR codes with known handles
- Government domains
- WhatsApp, Facebook, Instagram, and Meta links
- Trusted brands like Samsung, HP, TCL, Google, Microsoft, Amazon, Apple, LG, Sony, Dell, Lenovo, Xiaomi, OnePlus, Oppo, Vivo, Realme, Philips, Bosch, Whirlpool, TP-Link, and Tuya
- Gaming and platform domains like Steam, Epic Games, PlayStation, Xbox, Nintendo, Garena, Roblox, and Discord
- Wi-Fi or hotspot QR codes

QR Shield marks suspicious content as unsafe, including:

- Unknown domains
- Short links like bit.ly, tinyurl, and t.co
- Fake brand domains
- Non-HTTPS links
- IP-address links
- Risky or misleading QR content

## Install App

After deployment, open the live HTTPS URL on Android Chrome or Samsung Internet.

Then use:

- Download app button inside QR Shield
- Browser menu → Add to Home screen
- Browser menu → Install app

The installed app uses the QR Shield logo and opens like a scanner shortcut.

## Deploy On Render

Create a new Static Site on Render.

Use these settings:

```text
Root Directory: QR SHIELD
Build Command: npm install && npm run build
Publish Directory: dist
