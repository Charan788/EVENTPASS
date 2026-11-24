# EventPass — Event Ticketing & Anti-Scalping Pass

**Project ID:** PST_PD_008  
**Team:** Sk Ajijul Haque & Anumula Charan Tej  
**Version:** v1.0-foundation  
**Status:** Foundation and event management demo

EventPass is a small web demo for event organizers and attendees. This first version provides sample event data, event listing and event creation. Pass issuing, scanning and dashboards are shown as planned screens.

## Tech stack

- HTML5 and CSS3
- Vanilla JavaScript (no bundler)
- Bootstrap 5.3.3
- Browser `localStorage`

## Run it

Open `index.html` in a modern browser. The sample events and passes are stored in that browser, so the demo does not need a server or a database.

## Data model

The app uses four local storage keys:

- `eventpass_events` stores event details and pass/check-in counts.
- `eventpass_passes` stores sample pass and attendee details.
- `eventpass_scans` stores sample scan results.
- `eventpass_prefs` stores the selected role and last selected event.

If browser storage is unavailable, the app keeps working with an in-memory copy for the current page session and shows a warning.

## Demo note

QR passes use simplified client-side rules on sample data for demo purposes. This is not a production ticketing, identity, payment, or anti-scalping system.
