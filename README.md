# CyberOps Simulator

An interactive, browser-based career simulation game for **networking** and **cybersecurity**.

Build a character, choose a career path, and work through realistic assignments at a fictional technology company — configuring networks, troubleshooting outages, triaging security alerts, and writing professional vulnerability findings. Every host, log, IP address, and target is fictional and simulated in the browser.

> **This is an educational simulation.** No real networks are scanned, no real traffic is generated, and nothing leaves your machine. All commands run against local, fictional data.

---

## Features

- **Two career paths** — Networking (Engineer, Troubleshooter, NOC) and Cybersecurity (Blue Team, Red Team, Penetration Tester)
- **6 fully playable missions** — 3 networking, 3 cybersecurity, each with real objectives, evaluation, and debriefings
- **Interactive terminal** — 14 simulated commands that read from the live mission state (`ipconfig`, `ping`, `nslookup`, `scan`, `inspect`, `logs`, `alerts`, and more)
- **Interactive network topology** — inspect devices, edit addressing, toggle interfaces, watch links change state
- **Security investigation workflow** — alert queue, event logs, host enumeration, analysis submission, containment
- **Full progression system** — XP, 5 ranks, 5 skill categories, 6 achievements, mission ratings
- **Local save system** — progress persists across reloads via `localStorage`; no account, no backend
- **Knowledge base** — 12 searchable concept notes covering the material used in missions
- **Responsive design** — playable on desktop, tablet, and mobile browsers

---

## Play it

### Option 1 — Open directly

Download or clone the repo and open `index.html` in any modern browser.

### Option 2 — Serve locally (recommended)

Serving over `http://localhost` guarantees `localStorage` works reliably across all browsers.

```bash
cd cyberops-simulator
python3 -m http.server 8000
