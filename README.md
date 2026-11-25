# EventPass — Event Ticketing & Anti-Scalping Pass

**Project ID:** PST_PD_008  
**Team members:** Sk Ajijul Haque and Anumula Charan Tej  
**Version:** v4.0-core-scanner

EventPass is a browser-based event ticketing demo with two separate workspaces. Attendees can browse events, register, and show their own pass. Organizers can create events, track attendance, issue or replace passes, and scan QR codes at the door.

## Tech stack

- HTML5 and CSS3
- Vanilla JavaScript (ES6+), with no bundler or backend
- Bootstrap 5.3.3 and Bootstrap Icons 1.11.3
- qrcodejs 1.0.0
- Browser `localStorage`, with an in-memory fallback for the current page session

## File structure

```text
EventPass/
├── .gitignore
├── README.md
├── index.html
├── styles.css
└── js/
    ├── store.js
    ├── qr.js
    ├── validator.js
    ├── views.js
    └── app.js
```

The JavaScript files attach their modules to `window.EventPass` and load in the order shown in `index.html`.

## Feature walkthrough

### v1.0 — Event management

View sample events, create an event, update its details, and check capacity and pass totals.

### v2.0 — Signed demo QR and door scanner

Issue attendee passes with an `EP1|...` payload. View the generated QR code, then check in using camera scanning when the browser supports it or by entering the pass code. A valid pass changes to Used after check-in.

### v3.0 — Dashboard polish

Organizer and attendee modes have separate home screens and navigation. Choose an event and review capacity, issued passes, remaining seats, check-ins, and check-in rate. Search attendees and filter by pass status. Revoke an unused pass, reissue a replacement, view a pass QR, or download the event's pass list as CSV. Each issued or replacement pass receives a new, unique pass ID and QR payload. Organizer-only pages require Organizer mode.

### About and demo guide

The About page includes a short evaluator walkthrough and explains what the browser-only security model can and cannot do.

### v4.0 — Attendee registration and organizer scanner

Attendee mode has its own event list, registration form, and pass view. Registration checks the event capacity and avoids issuing a second pass to the same email for the same event. Organizer mode has a separate event console, attendee dashboard, and scanner with camera and manual-code entry. Each new or replacement pass gets a fresh ID and QR payload. The organizer dashboard shows issued passes, remaining capacity, check-ins, recent scans, and attendee status.

## Run locally

Keep the `js` directory beside `index.html`. Open `index.html` in a modern browser, or serve the folder from localhost. The Bootstrap styles, icons, and QR generator load from CDNs, so an internet connection is needed. Camera use requires browser support, permission, and a secure context such as HTTPS or localhost. Opening the file directly may block camera access; manual code entry remains available.

The app stores events, passes, scans, and preferences under `eventpass_events`, `eventpass_passes`, `eventpass_scans`, and `eventpass_prefs`. If browser storage is blocked or full, the app keeps data in memory until the page is closed and displays a warning.

## Demo security boundaries

This is an educational client-side demo. Its deterministic pass checksum and salt are visible in the JavaScript, and local storage can be edited by the browser user. A single-use check-in demonstrates rejecting a second scan after the first check-in, but cannot prevent someone from copying a pass or deciding who uses it first. Production ticketing needs a trusted server, private-key signing such as HMAC or carefully validated JWTs, authenticated organizer permissions, and server-side single-use check-in records.
