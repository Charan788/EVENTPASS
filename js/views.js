(function () {
  "use strict";

  window.EventPass = window.EventPass || {};

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[character];
    });
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date to be confirmed";
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
      date,
    );
  }

  function pageHeading(title, description, action) {
    return `
      <header class="page-heading">
        <div>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(description)}</p>
        </div>
        ${action || ""}
      </header>`;
  }

  function statusPill(status) {
    const className = String(status || "invalid")
      .toLowerCase()
      .replace(/\s/g, "-");
    return `<span class="status-pill status-${escapeHtml(className)}">${escapeHtml(status)}</span>`;
  }

  function eventRow(event, includeActions) {
    const percent =
      event.capacity > 0
        ? Math.min(100, Math.round((event.issuedCount / event.capacity) * 100))
        : 0;
    const actions = includeActions
      ? `<div class="row-actions">
          <button class="text-button" type="button" data-edit-event="${escapeHtml(event.eventId)}">Edit</button>
          <button class="text-button" type="button" data-go="issue-passes" data-event-id="${escapeHtml(event.eventId)}">Issue passes</button>
          <button class="text-button" type="button" data-go="scanner" data-event-id="${escapeHtml(event.eventId)}">Scan</button>
          <button class="text-button" type="button" data-go="dashboard" data-event-id="${escapeHtml(event.eventId)}">Details</button>
        </div>`
      : "";

    return `
      <article class="event-row">
        <div class="event-date"><span>${escapeHtml(new Intl.DateTimeFormat(undefined, { month: "short" }).format(new Date(event.date)))}</span><strong>${escapeHtml(new Intl.DateTimeFormat(undefined, { day: "2-digit" }).format(new Date(event.date)))}</strong></div>
        <div class="event-description">
          <h3>${escapeHtml(event.name)}</h3>
          <p>${escapeHtml(formatDate(event.date))} · ${escapeHtml(event.venue)}</p>
          <div class="capacity-line"><span>${event.issuedCount} of ${event.capacity} passes issued</span><span>${percent}%</span></div>
          <div class="progress" role="progressbar" aria-label="Passes issued" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="width: ${percent}%"></div></div>
        </div>
        <div class="event-checkins"><strong>${event.checkedInCount}</strong><span>checked in</span></div>
        ${actions}
      </article>`;
  }

  function attendeeEventRow(event, contact) {
    const pass = window.EventPass.Store.getPassForAttendeeEvent(event.eventId, contact);
    const remaining = Math.max(0, Number(event.capacity) - Number(event.issuedCount));
    let action;

    if (pass && pass.status !== "Revoked") {
      action = `<button class="text-button" type="button" data-view-pass="${escapeHtml(pass.passId)}">View pass</button>`;
    } else if (remaining > 0) {
      action = `<button class="text-button primary-link" type="button" data-register-event="${escapeHtml(event.eventId)}">${pass ? "Get a replacement" : "Register"}</button>`;
    } else {
      action = '<span class="availability full">Full</span>';
    }

    return `
      <article class="attendee-event-row">
        <div class="event-date"><span>${escapeHtml(new Intl.DateTimeFormat(undefined, { month: "short" }).format(new Date(event.date)))}</span><strong>${escapeHtml(new Intl.DateTimeFormat(undefined, { day: "2-digit" }).format(new Date(event.date)))}</strong></div>
        <div class="event-description">
          <h3>${escapeHtml(event.name)}</h3>
          <p>${escapeHtml(formatDate(event.date))} · ${escapeHtml(event.venue)}</p>
          <span class="availability">${remaining} spots left</span>
        </div>
        <div class="attendee-row-action">${action}</div>
      </article>`;
  }

  function passRow(pass) {
    const event = window.EventPass.Store.getEventById(pass.eventId);
    const eventName = event ? event.name : pass.eventId;
    return `
      <article class="pass-row">
        <div class="pass-row-main">
          <span class="pass-mark" aria-hidden="true">EP</span>
          <div><h3>${escapeHtml(eventName)}</h3><p>${escapeHtml(pass.passId)} · ${escapeHtml(formatDate(event ? event.date : pass.issuedAt))}</p></div>
        </div>
        ${statusPill(pass.status)}
        <button class="text-button" type="button" data-show-pass="${escapeHtml(pass.passId)}">Open pass</button>
      </article>`;
  }

  const Views = {};

  Views.renderHome = function (role) {
    if (role === "attendee") {
      const prefs = window.EventPass.Store.getPrefs();
      const events = window.EventPass.Store.getEvents();
      const passes = window.EventPass.Store.getPassesForAttendee(prefs.attendeeContact);
      const upcomingEvents = events.filter(function (event) {
        return new Date(event.date).getTime() >= Date.now();
      });

      return `
        ${pageHeading(`Hello, ${prefs.attendeeName}`, "Your events and tickets, in one place.", '<a class="button button-secondary" href="#browse-events" data-route="browse-events">Find an event</a>')}
        <section class="section-block">
          <div class="section-heading"><div><h2>My passes</h2><p>${passes.length} ${passes.length === 1 ? "ticket" : "tickets"} saved</p></div><a class="text-button" href="#attendee-pass" data-route="attendee-pass">View all passes</a></div>
          <div class="pass-list">${passes.length ? passes.slice(0, 3).map(passRow).join("") : '<p class="empty-line">You have no passes yet. Browse events and register for one.</p>'}</div>
        </section>
        <section class="section-block">
          <div class="section-heading"><div><h2>Events coming up</h2><p>There are ${upcomingEvents.length} upcoming ${upcomingEvents.length === 1 ? "event" : "events"}.</p></div><a class="text-button" href="#browse-events" data-route="browse-events">Browse events</a></div>
          <div class="attendee-event-list">${
            upcomingEvents
              .slice(0, 4)
              .map(function (event) {
                return attendeeEventRow(event, prefs.attendeeContact);
              })
              .join("") || '<p class="empty-line">No upcoming events are listed right now.</p>'
          }</div>
        </section>`;
    }

    const events = window.EventPass.Store.getEvents();
    const stats = events.reduce(
      function (summary, event) {
        summary.capacity += Number(event.capacity) || 0;
        summary.issued += Number(event.issuedCount) || 0;
        summary.checkedIn += Number(event.checkedInCount) || 0;
        return summary;
      },
      { capacity: 0, issued: 0, checkedIn: 0 },
    );
    const action =
      '<a class="button button-primary" href="#create-event" data-route="create-event">Create event</a>';

    return `
      ${pageHeading("Organizer dashboard", "A quick view of your events and arrivals.", action)}
      <section class="summary-strip" aria-label="Event totals">
        <div><span>Events</span><strong>${events.length}</strong></div>
        <div><span>Passes issued</span><strong>${stats.issued}</strong></div>
        <div><span>Checked in</span><strong>${stats.checkedIn}</strong></div>
        <div><span>Total capacity</span><strong>${stats.capacity}</strong></div>
      </section>
      <section class="section-block">
        <div class="section-heading"><div><h2>Your events</h2><p>Check ticket sales and arrivals.</p></div><a class="text-button" href="#events" data-route="events">All events</a></div>
        <div class="event-list">${
          events.length
            ? events
                .map(function (event) {
                  return eventRow(event, true);
                })
                .join("")
            : '<p class="empty-line">No events yet. Create an event to get started.</p>'
        }</div>
      </section>`;
  };

  Views.renderBrowseEvents = function (attendeeContact) {
    const events = window.EventPass.Store.getEvents()
      .slice()
      .sort(function (left, right) {
        return new Date(left.date) - new Date(right.date);
      });

    return `
      ${pageHeading("Find an event", "Browse the upcoming events and save a pass.")}
      <section class="section-block">
        <div class="attendee-event-list">${
          events.length
            ? events
                .map(function (event) {
                  return attendeeEventRow(event, attendeeContact);
                })
                .join("")
            : '<p class="empty-line">No events are listed yet. Check back later.</p>'
        }</div>
      </section>`;
  };

  Views.renderRegistration = function (eventId, attendeeName, contact) {
    const event = window.EventPass.Store.getEventById(eventId);
    if (!event) {
      return `${pageHeading("Register for an event", "Choose an event from the list.")}<p class="empty-line">This event could not be found.</p><a class="text-button" href="#browse-events" data-route="browse-events">Back to events</a>`;
    }

    const remaining = Math.max(0, Number(event.capacity) - Number(event.issuedCount));
    return `
      ${pageHeading("Register for an event", "Enter your details and we’ll prepare your pass.")}
      <section class="registration-layout">
        <div class="registration-event">
          <p class="eyebrow">SELECTED EVENT</p>
          <h2>${escapeHtml(event.name)}</h2>
          <p>${escapeHtml(formatDate(event.date))}</p>
          <p>${escapeHtml(event.venue)}</p>
          <p>${remaining} spots left</p>
        </div>
        <form id="registerEventForm" class="form-panel" novalidate data-event-id="${escapeHtml(event.eventId)}">
          <div class="form-field"><label for="registerName">Your name</label><input id="registerName" name="attendeeName" value="${escapeHtml(attendeeName)}" autocomplete="name" required><p class="field-error" id="registerNameError" aria-live="polite"></p></div>
          <div class="form-field"><label for="registerEmail">Email address</label><input id="registerEmail" name="contact" type="email" value="${escapeHtml(contact)}" autocomplete="email" required><p class="field-error" id="registerEmailError" aria-live="polite"></p></div>
          <p class="form-note">This demo saves your pass in this browser.</p>
          <div class="form-actions"><button class="button button-primary" type="submit"${remaining ? "" : " disabled"}>${remaining ? "Register and get pass" : "Event is full"}</button><a class="text-button" href="#browse-events" data-route="browse-events">Cancel</a></div>
          <p id="registerError" class="field-error" role="alert"></p>
        </form>
      </section>`;
  };

  Views.renderEventList = function () {
    const events = window.EventPass.Store.getEvents();
    return `
      ${pageHeading("Events", "Manage event details, tickets, and check-in.", '<a class="button button-primary" href="#create-event" data-route="create-event">Create event</a>')}
      <section class="section-block">
        <div class="event-list">${
          events.length
            ? events
                .map(function (event) {
                  return eventRow(event, true);
                })
                .join("")
            : '<div class="empty-state"><h2>No events yet</h2><p>Create an event to start issuing passes.</p><a class="button button-primary" href="#create-event" data-route="create-event">Create event</a></div>'
        }</div>
      </section>`;
  };

  Views.renderEventForm = function (editEventId) {
    const event = editEventId ? window.EventPass.Store.getEventById(editEventId) : null;
    const title = event ? "Edit event" : "Create an event";

    return `
      ${pageHeading(title, "Add the details attendees need.")}
      <form id="eventForm" class="form-panel form-narrow" novalidate data-event-id="${escapeHtml(event ? event.eventId : "")}">
        <div class="form-field"><label for="eventName">Event name</label><input id="eventName" name="name" maxlength="120" value="${escapeHtml(event ? event.name : "")}" required><p class="field-error" id="nameError" aria-live="polite"></p></div>
        <div class="form-field"><label for="eventDate">Date and time</label><input id="eventDate" name="date" type="datetime-local" value="${escapeHtml(event ? event.date : "")}" required><p class="field-error" id="dateError" aria-live="polite"></p></div>
        <div class="form-field"><label for="eventVenue">Venue</label><input id="eventVenue" name="venue" maxlength="160" value="${escapeHtml(event ? event.venue : "")}" required><p class="field-error" id="venueError" aria-live="polite"></p></div>
        <div class="form-field"><label for="eventCapacity">Capacity</label><input id="eventCapacity" name="capacity" type="number" min="1" step="1" value="${escapeHtml(event ? event.capacity : "")}" required><p class="field-error" id="capacityError" aria-live="polite"></p></div>
        <div class="form-actions"><button class="button button-primary" type="submit">Save event</button><a class="text-button" href="#events" data-route="events">Cancel</a></div>
      </form>`;
  };

  Views.renderIssuePasses = function () {
    const events = window.EventPass.Store.getEvents();
    const selectedId = window.EventPass.Store.getPrefs().lastEventId;
    const options = events
      .map(function (event) {
        return `<option value="${escapeHtml(event.eventId)}"${event.eventId === selectedId ? " selected" : ""}>${escapeHtml(event.name)}</option>`;
      })
      .join("");

    return `
      ${pageHeading("Issue passes", "Create a single-use pass for an attendee.")}
      ${
        events.length
          ? `<form id="issuePassForm" class="form-panel form-narrow">
        <div class="form-field"><label for="passEvent">Event</label><select id="passEvent" name="eventId" required>${options}</select></div>
        <div class="form-field"><label for="attendeeName">Attendee name</label><input id="attendeeName" name="attendeeName" maxlength="120" required></div>
        <div class="form-field"><label for="attendeeContact">Email or contact</label><input id="attendeeContact" name="contact" maxlength="160"></div>
        <div class="form-actions"><button class="button button-primary" type="submit">Issue pass</button></div>
        <div id="issueMessage" aria-live="polite"></div>
        <div id="issuedPass" class="issued-pass"></div>
      </form>`
          : '<p class="empty-line">Create an event before issuing passes.</p>'
      }`;
  };

  Views.renderAttendeePass = function (selectedPassId, attendeeContact, role) {
    const organizerView = role === "organizer";
    const passes = organizerView
      ? window.EventPass.Store.getPasses()
      : window.EventPass.Store.getPassesForAttendee(attendeeContact);
    const passList = passes
      .map(function (pass) {
        const event = window.EventPass.Store.getEventById(pass.eventId);
        return `<button class="pass-choice${pass.passId === selectedPassId ? " active" : ""}" type="button" data-show-pass="${escapeHtml(pass.passId)}"><span><strong>${escapeHtml(event ? event.name : pass.eventId)}</strong><small>${escapeHtml(pass.passId)}</small></span>${statusPill(pass.status)}</button>`;
      })
      .join("");

    return `
      ${pageHeading(organizerView ? "Pass details" : "My passes", organizerView ? "Review a pass QR code." : "Show your pass at the entrance. The first valid scan checks you in.", organizerView ? '<a class="text-button" href="#dashboard" data-route="dashboard">Back to dashboard</a>' : '<a class="text-button" href="#browse-events" data-route="browse-events">Find another event</a>')}
      ${passes.length ? `<div class="passes-layout"><section class="pass-list" aria-label="Your passes">${passList}</section><section id="passDetails" class="pass-details">Choose a pass to view its QR code.</section></div>` : '<div class="empty-state"><h2>No passes yet</h2><p>Find an event and register to get your first pass.</p><a class="button button-primary" href="#browse-events" data-route="browse-events">Browse events</a></div>'}`;
  };

  Views.renderScanner = function () {
    const events = window.EventPass.Store.getEvents();
    const selectedId = window.EventPass.Store.getPrefs().lastEventId;
    const options = events
      .map(function (event) {
        return `<option value="${escapeHtml(event.eventId)}"${event.eventId === selectedId ? " selected" : ""}>${escapeHtml(event.name)}</option>`;
      })
      .join("");

    return `
      ${pageHeading("Check in", "Scan a pass or enter its code. Each valid pass works once.")}
      <div class="scanner-layout">
        <section class="scanner-panel">
          <div class="form-field"><label for="scanEvent">Event</label><select id="scanEvent"${events.length ? "" : " disabled"}>${options || '<option value="">No events yet</option>'}</select></div>
          <div class="camera-stage"><video id="cameraPreview" class="camera-preview d-none" playsinline muted></video><div id="cameraPrompt" class="camera-prompt"><span class="camera-symbol" aria-hidden="true">QR</span><p>Hold the attendee’s QR code in front of the camera.</p></div></div>
          <div class="scanner-actions"><button class="button button-primary" id="startCamera" type="button"${events.length ? "" : " disabled"}>Start camera</button><button class="button button-secondary d-none" id="stopCamera" type="button">Stop camera</button></div>
          <p id="cameraMessage" class="form-note" aria-live="polite">Camera access works on HTTPS or localhost. You can also enter the pass code below.</p>
          <details class="manual-entry"><summary>Enter a pass code instead</summary><form id="scanForm" class="pt-3"><div class="form-field"><label for="scanCode">Pass code</label><textarea id="scanCode" rows="3" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="EP1|EVT-1001|PASS-1001|…"></textarea></div><button class="button button-secondary" type="submit">Check pass</button></form></details>
        </section>
        <aside class="scan-side"><h2>Latest scan</h2><div id="scanResult" class="scan-result scan-empty" aria-live="polite" role="status"><strong>Ready</strong><p>Scan or enter a pass code.</p></div><div id="scanHistory" class="scan-history"></div></aside>
      </div>`;
  };

  Views.renderRoleGuard = function (targetRouteLabel) {
    return `
      ${pageHeading("Organizer access", "This page is available in Organizer mode.")}
      <section class="access-message"><h2>Switch to Organizer mode</h2><p>Open ${escapeHtml(targetRouteLabel)} to manage events, passes, or check-in.</p><div class="form-actions"><button class="button button-primary" type="button" data-switch-organizer>Switch to Organizer</button><a class="text-button" href="#attendee-pass" data-route="attendee-pass" data-role="attendee">Back to my passes</a></div></section>`;
  };

  Views.renderDashboard = function (activeEventId, filters) {
    const events = window.EventPass.Store.getEvents();
    const event = window.EventPass.Store.getEventById(activeEventId);
    const stats = window.EventPass.Store.getEventStats(activeEventId);
    const search = String((filters && filters.search) || "");
    const activeStatus = (filters && filters.status) || "All";
    const query = search.trim().toLowerCase();
    const passes = window.EventPass.Store.getPasses(activeEventId).filter(function (pass) {
      const matchesSearch =
        !query ||
        [pass.attendeeName, pass.passId, pass.contact].some(function (value) {
          return String(value || "")
            .toLowerCase()
            .includes(query);
        });
      return matchesSearch && (activeStatus === "All" || pass.status === activeStatus);
    });
    const options = events
      .map(function (item) {
        return `<option value="${escapeHtml(item.eventId)}"${item.eventId === activeEventId ? " selected" : ""}>${escapeHtml(item.name)}</option>`;
      })
      .join("");
    const filtersHtml = ["All", "Valid", "Used", "Revoked"]
      .map(function (status) {
        return `<button class="filter-button${status === activeStatus ? " active" : ""}" type="button" data-status-filter="${status}" aria-pressed="${status === activeStatus}">${status}</button>`;
      })
      .join("");
    const rows = passes
      .map(function (pass) {
        const canRevoke = pass.status === "Valid";
        const canReissue = pass.status === "Valid" || pass.status === "Revoked";
        return `<tr><td><code>${escapeHtml(pass.passId)}</code></td><td>${escapeHtml(pass.attendeeName)}</td><td>${escapeHtml(pass.contact || "—")}</td><td>${statusPill(pass.status)}</td><td>${escapeHtml(pass.usedAt ? formatDate(pass.usedAt) : "—")}</td><td><div class="row-actions"><button class="text-button" type="button" data-revoke-pass="${escapeHtml(pass.passId)}"${canRevoke ? "" : " disabled"}>Revoke</button><button class="text-button" type="button" data-reissue-pass="${escapeHtml(pass.passId)}"${canReissue ? "" : " disabled"}>Reissue</button><button class="text-button" type="button" data-view-pass="${escapeHtml(pass.passId)}">View QR</button></div></td></tr>`;
      })
      .join("");
    const recentScans = window.EventPass.Store.getScans(activeEventId)
      .slice(0, 5)
      .map(function (scan) {
        const pass = window.EventPass.Store.getPassById(scan.passId);
        return `<li><span>${escapeHtml(pass ? pass.attendeeName : scan.passId || "Unknown pass")}</span><span>${escapeHtml(scan.result)}</span><time>${escapeHtml(formatDate(scan.scannedAt))}</time></li>`;
      })
      .join("");

    return `
      ${pageHeading("Check-in dashboard", event ? event.name : "Choose an event to view its attendees.")}
      <div class="dashboard-toolbar"><div class="form-field"><label for="dashboardEvent">Event</label><select id="dashboardEvent"${events.length ? "" : " disabled"}>${options || '<option value="">No events yet</option>'}</select></div><button class="button button-secondary" id="exportCsv" type="button"${event ? "" : " disabled"}>Export CSV</button></div>
      <section class="summary-strip" aria-label="Event summary"><div><span>Capacity</span><strong>${stats.capacity}</strong></div><div><span>Passes issued</span><strong>${stats.issued}</strong><small>${stats.remaining} remaining</small></div><div><span>Members checked in</span><strong>${stats.checkedIn}</strong></div><div><span>Check-in rate</span><strong>${stats.checkInRate}%</strong></div></section>
      <section class="section-block"><div class="section-heading"><div><h2>Attendees</h2><p>${passes.length} ${passes.length === 1 ? "pass" : "passes"} shown</p></div><div class="filter-group" role="group" aria-label="Filter attendees by status">${filtersHtml}</div></div><label class="visually-hidden" for="dashboardSearch">Search attendees</label><input class="search-input" id="dashboardSearch" type="search" placeholder="Search name, pass ID, or contact" value="${escapeHtml(search)}"><div class="table-responsive"><table class="table dashboard-table"><thead><tr><th scope="col">Pass ID</th><th scope="col">Attendee</th><th scope="col">Contact</th><th scope="col">Status</th><th scope="col">Checked in</th><th scope="col">Actions</th></tr></thead><tbody>${rows || '<tr><td class="empty-table" colspan="6">No attendees match your search. <button class="text-button" type="button" data-reset-filters>Clear filters</button></td></tr>'}</tbody></table></div></section>
      <section class="section-block"><div class="section-heading"><div><h2>Recent scans</h2><p>Latest activity at the door.</p></div></div><ul class="recent-scans">${recentScans || '<li class="empty-line">No scans have been recorded for this event.</li>'}</ul></section>`;
  };

  Views.renderAbout = function () {
    return `
      ${pageHeading("About EventPass", "A local demo for event registration and single-use check-in.")}
      <section class="about-copy"><h2>How the pass works</h2><p>Each QR code contains an event ID, pass ID, and a demo signature. The scanner checks the signature and pass status. After a valid check-in, the pass is marked Used; scanning it again shows why entry is denied.</p><h2>Demo limits</h2><p>Events, attendee details, passes, and check-ins are stored in this browser. The checksum and salt are visible in the client-side code, so they are not secure against tampering or sharing. Production ticketing needs server-side signing, authenticated organizer access, and a shared check-in service.</p></section>`;
  };

  window.EventPass.Views = Views;
})();
