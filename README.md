# dartslive-scorer

Web-based darts scoring app for the **DARTSLIVE Home dlb0003** dartboard via Web Bluetooth.

---

## Project phases

| Phase | File | Status |
|-------|------|--------|
| 1 — BLE discovery | `ble-scanner.html` | ✅ Ready |
| 2 — Segment byte map | `ble.js` | ⏳ After Phase 1 |
| 3 — Scoring app | `darts-scorer.html` + `scorer.js` | ⏳ After Phase 2 |

---

## Phase 1 — Running the BLE scanner

### Requirements

- **Chrome or Chromium** on desktop (Windows/Mac/Linux) or **Android Chrome**.  
  iOS, Safari, and Firefox do not support Web Bluetooth.
- The page must be served from `localhost` or `https://` — `file://` URLs block Web Bluetooth.
- Bluetooth must be enabled and Chrome must have OS-level Bluetooth permission  
  (macOS: System Settings → Privacy & Security → Bluetooth → enable for Chrome).

### Start the server

```bash
cd /path/to/dartslive-scorer
python3 -m http.server 8080
```

Open: **http://localhost:8080/ble-scanner.html**

### Connecting

1. Power on the DARTSLIVE board (it usually starts advertising immediately).
2. Click **Scan & Connect**.  
   The picker filters for names starting with `DARTSLIVE`, `DL-HOME`, `DL`, or `PHOENIX`.  
   If your board doesn't appear, tick **"Show all BLE devices"** and try again.
3. Select your board in the Chrome device picker and click Pair.
4. The scanner enumerates every GATT service and characteristic, then subscribes to all
   notifiable characteristics automatically.
5. Throw darts — each hit appears as a row in the Notification Log.

### Reading the log

| Column | What it tells you |
|--------|-------------------|
| **Service UUID** | Which GATT service sent the notification |
| **Char UUID** | Which characteristic — this is the one to hard-code in Phase 2 |
| **Hex bytes** | Raw payload, big-endian byte order |
| **ASCII** | Bytes rendered as text; printable characters show as-is, others as `.` |
| **Decimal** | Each byte as a decimal integer |
| **Segment guess** | Best-effort decode of each byte against the known map (see below) |

Throw at least one dart per segment you care about and note:
- Which characteristic fires (should be the same one every time)
- Which byte(s) change per hit
- What values correspond to known segments (use a double or triple to confirm)

Export the full log with **Export JSON** to keep it for Phase 2 analysis.

---

## Alternative: nRF Connect

Install **nRF Connect for Mobile** (Google Play / App Store).

1. Scan → find your board.
2. Connect → tap the board → **Expand all services**.
3. Each service and characteristic is listed with its UUID and properties.
4. Tap the down-arrow (subscribe) icon on each `NOTIFY` characteristic.
5. Throw a dart — the raw hex value appears next to the characteristic.

This gives you the UUIDs without a laptop. Cross-reference with the BLE scanner output.

---

## Confirmed BLE protocol (dlb0003, verified 2026-05-17)

### Connection

| Field | Value |
|-------|-------|
| Service UUID | `6e400001-b5a3-f393-e0a9-e50e24dcca9e` (Nordic UART) |
| Characteristic UUID | `6e40fff6-b5a3-f393-e0a9-e50e24dcca9e` |
| Direction | Board → app, notify |

### Payload format

Every dart hit sends exactly **5 bytes**:

```
[0xA2, 0x03, SEGMENT_BYTE, 0x00, 0x04]
  ^     ^     ^             ^     ^
  │     │     │             │     └─ frame end (constant)
  │     │     │             └─ reserved (constant 0)
  │     │     └─ dart segment (see map below)
  │     └─ message type (constant 0x03 = dart hit)
  └─ packet header (constant 0xA2)
```

Example captures:

| Threw | Hex payload | Seg byte |
|-------|-------------|----------|
| T20   | `A2 03 50 00 04` | 0x50 = 80 |
| D20   | `A2 03 3C 00 04` | 0x3C = 60 |
| Bull  | `A2 03 51 00 04` | 0x51 = 81 |
| DBull | `A2 03 52 00 04` | 0x52 = 82 |

### Segment byte map (fully confirmed)

```
Byte range    Zone             Formula
0x00          Miss/bounce-out  —
0x01–0x14     Single (1–20)    byte = number
0x15–0x28     Single (1–20)    byte = number + 20  (outer ring)
0x29–0x3c     Double (1–20)    byte = number + 40
0x3d–0x50     Triple (1–20)    byte = number + 60
0x51          Bull outer       25 pts
0x52          Bull inner       50 pts (double bull)
```

---

## File structure (full project)

```
dartslive-scorer/
├── ble-scanner.html   Phase 1 — standalone BLE discovery tool
├── darts-scorer.html  Phase 3 — main scoring app
├── scorer.js          Phase 3 — game logic (01 + Cricket)
├── ble.js             Phase 2/3 — BLE driver + segment decoder
├── style.css          Shared styles
└── README.md
```

---

## Running the network server (shared leaderboard)

The app includes a small Express server so leaderboard history is shared across all
devices on your network and persists on disk instead of in browser localStorage.

### One-time setup (on the always-on PC at 192.168.1.199)

```bash
git clone https://github.com/drfletcher2k/dartslive-scorer.git
cd dartslive-scorer
npm install
npm start
```

Open from **any device on the network**: `http://192.168.1.199:3180`

History is saved to `data/history.json` on that PC and is never committed to git.

### Keeping the server running

To survive reboots, add a startup task (Windows Task Scheduler) or use PM2:

```bash
npm install -g pm2
pm2 start server.js --name dartslive
pm2 save
pm2 startup   # follow the printed command to enable on boot
```

---

## Serving for tablet use (legacy — no shared leaderboard)

```bash
# Find your LAN IP
ipconfig getifaddr en0   # macOS
ip -4 addr show          # Linux

# Serve with binding to all interfaces
python3 -m http.server 8080 --bind 0.0.0.0
```

Open `http://<your-lan-ip>:8080/index.html` in Chrome on the tablet.
Web Bluetooth works over LAN when the origin is a private IP (no HTTPS required for `192.168.x.x`).
