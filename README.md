# CyberOps 10.0 — Complete Career Learning RPG

CyberOps is a browser-based IT and cybersecurity career RPG. Create a character, explore the office, speak with employees, complete career missions, practice in simulated terminals, investigate fictional enterprise incidents, and progress through six learning paths.

## Start playing
- **Windows:** extract the ZIP and double-click `run_windows.bat`.
- **Linux/macOS:** run `python3 -m http.server 8000` in this folder, then open `http://localhost:8000`.
- **Controls:** WASD/arrow keys to move, E to interact, N for the field journal, Esc to close/back out.
- **Career Hub:** use the Academy, Practical Network Lab, Enterprise Operations Console, and missions to progress.

## Six learning paths
1. Network Engineer
2. SOC Analyst
3. Ethical Hacker
4. Web Security Specialist
5. Linux & Command Line
6. Digital Forensics & Incident Response

The Academy contains 48 lessons and 12 challenges. Learning progress, XP, completed missions, simulated lab state, and field records are stored locally in your browser.

## What's included in this build
- Character creation and explorable office campus with NPC conversations and workstation routines.
- Six career paths, staged lessons, hints, objectives, quizzes and progression.
- Simulated command lab and connected fictional enterprise with services, tickets, logs and change records.
- Practical Network Lab with topology, diagnosis, DNS recovery, verification and local incident-report export.
- Career hub, XP/ranks, achievements, local save state, mission outcomes and field-record export.
- A* NPC route planning, collision checks, workstation/seat assignment and procedural work poses.
- Windows and Linux/macOS launch helpers and Node.js regression tests.

## Important visual and test scope
The office uses an isometric-style diamond floor and obstacle-aware NPC navigation, but **this build is not a complete mathematical isometric world-coordinate conversion**: legacy room geometry, object placement, and some movement/collision assumptions still use screen-space coordinates. It should not be described as a fully converted isometric game. The automated regression tests pass, but a full manual graphical play-through has not been verified in this environment. Phaser 3 is loaded from a CDN, so the office scene needs an internet connection; the other game systems are client-side.

## Safety and learning note
All terminal commands, network targets, services, and security findings are simulated against fictional local game data. The game does not execute host shell commands or scan real systems. It is a learning prototype, not a production security scanner, certification, or proof of professional proficiency. Only test real systems when you own them or have explicit authorization.

## Tests
From this folder, run each test with Node.js, for example `node tests/practical-lab.test.cjs`. The release suite can be run with:

```bash
for f in tests/*.test.cjs; do node "$f" || exit 1; done
```

---


## Start
- Windows: double-click `run_windows.bat` (or open `index.html` in a modern browser).
- Create or continue a character, then select **Enter Learning Academy** from the Career Hub.
- Academy progress is stored in this browser's local storage.

## Tests
Run `node tests/academy.test.cjs` and all other `tests/*.test.cjs` files with Node.js. See `TEST_REPORT_8.0.md`.

## Important safety note
Academy terminal commands are simulated in the browser. They do not run shell commands or contact external targets. All target names and IPs in the Academy are fictional documentation examples. This game does not provide a certification or prove real-world proficiency.


## Features

- Networking and cybersecurity career paths
- Career-specific mission scenarios, objectives, progressive hints and debriefings
- Real-world command syntax simulation for Windows, Linux, Cisco IOS-style networking, log investigation, hashing, and authorized lab discovery
- State-aware command output connected to fictional devices, DNS/service availability, simulated switch interfaces, VLANs, and mission-specific networks
- Modular command interpreter boundary designed for possible future isolated lab adapters; no host shell execution or real scans
- Interactive network topology and security investigation workflow
- Persistent simulated device inventory spanning user, edge, server, and security network segments
- Dependency-aware service health and verification checks
- Connected DNS outage scenario with evidence logs, diagnosis, remediation, and ticket closure gates
- Device state controls, ticket lifecycle commands, and operational audit records
- XP, ranks, skills, achievements, and local progress saving
- Searchable cybersecurity/networking knowledge base
- Operation: Glass Harbor storyline panel that reflects career mission progress
- Post-mission incident decisions that affect future campaign context
- Persistent team relationship values for Dana, Alex, Zero and Nadia
- NPC dialogue that reacts to accumulated team trust
- One-time decision recording per mission to prevent relationship farming
- Field record export includes campaign decisions and team relationships
- Defensive office scene/physics recovery when returning to the browser tab
- Large explorable office campus with reception, NOC, SOC, server room, research lab, training room, and break area
- Player movement, animated characters, NPC interactions, and separate mission/workspace UI
- Responsive browser UI
- Distinct Network Operations, SOC Analyst and Ethical Hacker visual themes
- Six selectable player character identities with distinct sprite appearances and role profiles
- Terminal keyboard focus fix: letters, WASD characters, spaces and punctuation can be typed normally
- Scenario-first mission briefings that guide investigation without immediately revealing the solution

## Requirements

- A modern desktop browser (Chrome, Edge, Firefox, or similar)
- Internet connection to load Phaser 3 from its CDN in `index.html`
- Python 3 recommended for running the local web server

## Try the connected enterprise incident

Open the Enterprise Operations Console from the personnel dashboard and enter these commands one at a time:

```text
scenario start INC-105
ticket INC-105
network
logs
diagnose intranet
verify intranet
service start dns
verify intranet
resolve INC-105
history
```

The scenario intentionally takes the simulated DNS service offline. The player must investigate the logs, restore DNS, verify the intranet and only then resolve the ticket. All changes remain inside the fictional local game profile.

## Run on Windows

1. Extract the entire ZIP file to a normal folder (for example, Desktop\CyberOps).
2. Install Python 3 if it is not already installed.
3. Double-click `run_windows.bat`.
4. Open `http://localhost:8000` in your browser.
5. Keep the terminal window open while playing. Close it when finished.

If the batch file does not work, open Command Prompt in this folder and run:

```bat
py -m http.server 8000
```

Then visit `http://localhost:8000`.

## Run on Linux/macOS

From this folder, run:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Controls in the explorable office

- **WASD / Arrow keys:** move
- **E:** talk to nearby NPCs / interact
- **Esc:** close dialogue or return from an interaction

## Notes

- Save data is stored locally in the browser using `localStorage`; there is no account or backend.
- The game is a learning prototype, not a production security scanner. Never use the simulated commands as evidence of real-world security status.

## Career learning path

Each path has a staged sequence of fictional, browser-only scenarios:

- **Networking / NOC:** IP addressing, subnet/gateway troubleshooting, DNS, interface state and routing diagnosis.
- **Cybersecurity / SOC:** alert triage, authentication anomaly investigation, data-transfer analysis, false-positive handling and threat classification.
- **Ethical hacker / security research:** authorized-lab OSINT, simulated scanning, hash-analysis exercises and exploit-path reasoning against fictional targets.

The terminal is a deliberately simulated training shell. Commands affect only the current mission state; they are not passed to the host operating system and do not scan real systems. Practice only on systems you own or are explicitly authorized to test outside this game.

## Troubleshooting after a mission

The office scene now uses a defensive resume routine when returning from mission screens. If the browser has cached old files, stop the local server, restart `run_windows.bat`, then use Ctrl+F5 in the browser. Keep the Command Prompt window open while playing.

## CyberOps Ultimate update

This build adds a guided learning-roadmap panel and professional practice notes to the personnel dashboard. The office-entry transition now waits for the visible game container to lay out, refreshes Phaser scaling, and performs a second defensive scene/physics/input recovery pass to reduce the office-freeze issue after returning from mission screens.

This remains a local educational simulation. The terminal and targets are fictional; it does not execute shell commands or scan real systems. The learning roadmap is a progression guide, not a claim of real certification.


## Career Edition update

Choose a character during setup, then select Network Engineer, SOC Analyst, or Ethical Hacker. Each career applies a distinct UI palette and character selection is reflected in the office sprite. Missions now start with a scenario, role, investigation approach and safe-scope reminder. Use the Hint button when stuck; hints are intended to progress from conceptual guidance to more specific help. The terminal temporarily disables Phaser keyboard handling while its input is focused so normal text entry is not intercepted by movement controls.


