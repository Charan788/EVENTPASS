# EventPass — Event Ticketing & Anti-Scalping Pass

**Project ID:** PST_PD_008  
**Team:** Sk Ajijul Haque & Anumula Charan Tej  
**Version:** v2.0-core-scanner

EventPass is a small browser demo for event organizers and attendees. Organizers can manage events, issue passes, view sample attendee QR codes, and check attendees in with a QR camera reader or by entering a code.

## Run the demo

Keep the `js` folder next to `index.html`, then open `index.html` in a modern browser. Bootstrap, Bootstrap Icons, qrcodejs, and camera scanning require browser access to their CDNs or APIs. Camera use generally requires HTTPS or localhost and permission from the browser. If camera scanning is unavailable, enter the pass code manually.

## Tech and data

The app uses HTML5, CSS3, Bootstrap 5.3.3, Bootstrap Icons 1.11.3, qrcodejs 1.0.0, and plain JavaScript. It saves events, passes, scan attempts, and preferences in the browser under `eventpass_events`, `eventpass_passes`, `eventpass_scans`, and `eventpass_prefs`. If local storage is unavailable, the current page session uses an in-memory copy and displays a warning.

Older v1 demo pass records are converted to the v2 sample payload format when the app starts. Existing event records are kept.

## Demo limitation

The pass checksum and its salt are visible in the browser code. They only demonstrate the flow and do not provide real security against copying, forgery, or scalping. A production ticket system needs server-side signing and validation.
