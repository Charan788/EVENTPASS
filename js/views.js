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

  function eventOptions(selectedId) {
    return window.EventPass.Store.getEvents()
      .map(function (event) {
        const selected = event.eventId === selectedId ? " selected" : "";
        return (
          '<option value="' +
          escapeHtml(event.eventId) +
          '"' +
          selected +
          ">" +
          escapeHtml(event.name) +
          "</option>"
        );
      })
      .join("");
  }

  function eventCard(event) {
    const percent =
      event.capacity > 0
        ? Math.min(100, Math.round((event.issuedCount / event.capacity) * 100))
        : 0;
    return (
      '<div class="col-12 col-xl-6"><article class="event-card">' +
      '<div class="d-flex justify-content-between gap-3"><div><p class="small text-secondary mb-1">' +
      escapeHtml(event.eventId) +
      "</p><h3>" +
      escapeHtml(event.name) +
      "</h3></div>" +
      '<span class="badge text-bg-light">' +
      escapeHtml(event.issuedCount) +
      " / " +
      escapeHtml(event.capacity) +
      " issued</span></div>" +
      '<p class="event-meta mb-2"><i class="bi bi-calendar3 me-2"></i>' +
      escapeHtml(formatDate(event.date)) +
      '</p><p class="event-meta">' +
      '<i class="bi bi-geo-alt me-2"></i>' +
      escapeHtml(event.venue) +
      "</p>" +
      '<div class="d-flex justify-content-between small mb-1"><span>Passes issued</span><span>' +
      percent +
      '%</span></div><div class="progress" role="progressbar" aria-label="Passes issued" ' +
      'aria-valuenow="' +
      percent +
      '" aria-valuemin="0" aria-valuemax="100">' +
      '<div class="progress-bar" style="width: ' +
      percent +
      '%"></div></div>' +
      '<p class="small text-secondary mt-2">' +
      escapeHtml(event.checkedInCount) +
      " checked in</p>" +
      '<div class="event-actions"><button class="btn btn-sm btn-outline-secondary" data-edit-event="' +
      escapeHtml(event.eventId) +
      '">Edit</button><button class="btn btn-sm btn-primary" data-go="issue-passes" ' +
      'data-event-id="' +
      escapeHtml(event.eventId) +
      '">Issue passes</button>' +
      '<button class="btn btn-sm btn-outline-primary" data-go="scanner" data-event-id="' +
      escapeHtml(event.eventId) +
      '">Scanner</button><button class="btn btn-sm btn-outline-primary" ' +
      'data-go="dashboard" data-event-id="' +
      escapeHtml(event.eventId) +
      '">Dashboard</button></div>' +
      "</article></div>"
    );
  }

  function pageHeading(title, description, action) {
    return (
      '<div class="page-heading d-flex flex-column flex-md-row justify-content-between ' +
      'align-items-md-end gap-3"><div><h1 class="h2 mb-0">' +
      escapeHtml(title) +
      "</h1><p>" +
      escapeHtml(description) +
      "</p></div>" +
      (action || "") +
      "</div>"
    );
  }

  const Views = {};

  Views.renderHome = function () {
    const events = window.EventPass.Store.getEvents();
    const capacity = events.reduce(function (sum, event) {
      return sum + Number(event.capacity || 0);
    }, 0);
    const passes = window.EventPass.Store.getPasses().length;

    return (
      '<section class="hero mb-4"><p class="text-uppercase small fw-bold mb-2">EventPass v2.0</p>' +
      "<h1>Make every event easier to run.</h1><p>Manage events, create attendee passes, and check people in at the door.</p>" +
      '<a class="btn btn-primary" href="#events" data-route="events">View your events</a></section>' +
      '<section class="mb-4"><h2 class="h4 mb-3">Choose where to start</h2><div class="row g-3">' +
      '<div class="col-12 col-md-6"><a class="role-card" href="#events" data-route="events" data-role="organizer">' +
      '<i class="bi bi-calendar2-check"></i><h3 class="h5 mt-3">Continue as Event Organizer</h3>' +
      '<p class="mb-0 text-secondary">Manage events, issue passes, and scan attendees.</p></a></div>' +
      '<div class="col-12 col-md-6"><a class="role-card" href="#attendee-pass" data-route="attendee-pass" data-role="attendee">' +
      '<i class="bi bi-person-vcard"></i><h3 class="h5 mt-3">View Attendee Pass</h3>' +
      '<p class="mb-0 text-secondary">Open a sample pass and its QR code.</p></a></div></div></section>' +
      '<section aria-label="Event summary"><div class="row g-3">' +
      '<div class="col-12 col-sm-4"><div class="stat-card"><p class="stat-label">Total Events</p>' +
      '<p class="stat-value">' +
      events.length +
      "</p></div></div>" +
      '<div class="col-12 col-sm-4"><div class="stat-card"><p class="stat-label">Total Capacity</p>' +
      '<p class="stat-value">' +
      capacity +
      "</p></div></div>" +
      '<div class="col-12 col-sm-4"><div class="stat-card"><p class="stat-label">Passes Issued</p>' +
      '<p class="stat-value">' +
      passes +
      "</p></div></div></div></section>" +
      '<button class="btn btn-outline-secondary mt-4" type="button" data-reset-demo>Reset Sample Data</button>'
    );
  };

  Views.renderEventList = function () {
    const events = window.EventPass.Store.getEvents();
    const action =
      '<a class="btn btn-primary" href="#create-event" data-route="create-event">' +
      '<i class="bi bi-plus-lg me-1"></i>Create event</a>';
    const heading = pageHeading("Events", "View and manage your event details.", action);

    if (events.length === 0) {
      return (
        heading +
        '<div class="empty-state"><i class="bi bi-calendar-plus"></i>' +
        '<h2 class="h4 mt-3">No events yet</h2><p class="text-secondary">Create an event to get started.</p>' +
        '<a class="btn btn-primary" href="#create-event" data-route="create-event">Create First Event</a></div>'
      );
    }

    return heading + '<div class="row g-3">' + events.map(eventCard).join("") + "</div>";
  };

  Views.renderEventForm = function (editEventId) {
    const event = editEventId ? window.EventPass.Store.getEventById(editEventId) : null;
    const title = event ? "Edit event" : "Create an event";

    return (
      pageHeading(title, "Add the basic details people need to find your event.") +
      '<section class="content-card"><form id="eventForm" novalidate data-event-id="' +
      escapeHtml(event ? event.eventId : "") +
      '"><div class="mb-3"><label class="form-label" ' +
      'for="eventName">Event Name</label><input class="form-control" id="eventName" name="name" ' +
      'required maxlength="120" value="' +
      escapeHtml(event ? event.name : "") +
      '">' +
      '<div class="field-error" id="nameError" aria-live="polite"></div></div>' +
      '<div class="mb-3"><label class="form-label" for="eventDate">Date &amp; Time</label>' +
      '<input class="form-control" id="eventDate" name="date" type="datetime-local" required value="' +
      escapeHtml(event ? event.date : "") +
      '"><div class="field-error" id="dateError" aria-live="polite"></div></div>' +
      '<div class="mb-3"><label class="form-label" for="eventVenue">Venue</label><input class="form-control" ' +
      'id="eventVenue" name="venue" required maxlength="160" value="' +
      escapeHtml(event ? event.venue : "") +
      '"><div class="field-error" id="venueError" aria-live="polite"></div></div>' +
      '<div class="mb-3"><label class="form-label" for="eventCapacity">Capacity</label><input ' +
      'class="form-control" id="eventCapacity" name="capacity" type="number" min="1" step="1" ' +
      'required value="' +
      escapeHtml(event ? event.capacity : "") +
      '">' +
      '<div class="field-error" id="capacityError" aria-live="polite"></div></div>' +
      '<div class="d-flex flex-wrap gap-2"><button class="btn btn-primary" type="submit">Save event</button>' +
      '<a class="btn btn-outline-secondary" href="#events" data-route="events">Cancel</a></div></form></section>'
    );
  };

  Views.renderIssuePasses = function () {
    const events = window.EventPass.Store.getEvents();
    const selectedEventId =
      window.EventPass.Store.getPrefs().lastEventId || (events[0] && events[0].eventId);

    return (
      pageHeading("Issue passes", "Create a single-use pass for an attendee.") +
      '<div class="row g-3"><div class="col-12 col-lg-7"><section class="content-card">' +
      (events.length
        ? '<form id="issuePassForm"><div class="mb-3"><label class="form-label" for="passEvent">Event</label>' +
          '<select class="form-select" id="passEvent" name="eventId" required>' +
          eventOptions(selectedEventId) +
          "</select></div>" +
          '<div class="mb-3"><label class="form-label" for="attendeeName">Attendee name</label>' +
          '<input class="form-control" id="attendeeName" name="attendeeName" required maxlength="120"></div>' +
          '<div class="mb-3"><label class="form-label" for="attendeeContact">Email or contact (optional)</label>' +
          '<input class="form-control" id="attendeeContact" name="contact" maxlength="160"></div>' +
          '<button class="btn btn-primary" type="submit">Create pass</button></form>'
        : '<p class="mb-0">Create an event before issuing passes.</p>') +
      '<div id="issueMessage" class="mt-3" aria-live="polite"></div></section></div>' +
      '<div class="col-12 col-lg-5"><section class="content-card"><h2 class="h5">Issued pass</h2>' +
      '<div id="issuedPass" class="text-secondary">The new pass will appear here.</div></section></div></div>'
    );
  };

  Views.renderAttendeePass = function () {
    const passes = window.EventPass.Store.getPasses();
    const passCards = passes
      .map(function (pass) {
        const event = window.EventPass.Store.getEventById(pass.eventId);
        return (
          '<button type="button" class="pass-choice" data-show-pass="' +
          escapeHtml(pass.passId) +
          '">' +
          "<span><strong>" +
          escapeHtml(pass.attendeeName) +
          "</strong><small>" +
          escapeHtml(event ? event.name : pass.eventId) +
          '</small></span><span class="status-pill status-' +
          escapeHtml(pass.status.toLowerCase().replace(/\s/g, "-")) +
          '">' +
          escapeHtml(pass.status) +
          "</span></button>"
        );
      })
      .join("");

    return (
      pageHeading("Attendee pass", "Choose a sample pass to view its QR code.") +
      '<div class="row g-3"><div class="col-12 col-lg-5"><section class="content-card">' +
      '<h2 class="h5">Sample passes</h2><div class="pass-list">' +
      passCards +
      "</div></section></div>" +
      '<div class="col-12 col-lg-7"><section id="passDetails" class="content-card text-secondary">Select a pass to show its details.</section></div></div>'
    );
  };

  Views.renderScanner = function () {
    const events = window.EventPass.Store.getEvents();
    const selectedEventId =
      window.EventPass.Store.getPrefs().lastEventId || (events[0] && events[0].eventId);

    return (
      pageHeading("Pass scanner", "Choose the event, then scan a pass or enter its code.") +
      '<div class="row g-3"><div class="col-12 col-lg-7"><section class="content-card">' +
      (events.length
        ? '<div class="mb-3"><label class="form-label" for="scanEvent">Active event</label>' +
          '<select class="form-select" id="scanEvent">' +
          eventOptions(selectedEventId) +
          "</select></div>"
        : "<p>Create an event before scanning passes.</p>") +
      '<form id="scanForm"><label class="form-label" for="scanCode">Pass code</label>' +
      '<textarea class="form-control scan-code" id="scanCode" rows="3" placeholder="EP1|EVT-1001|PASS-1001|…" ' +
      'autocomplete="off" spellcheck="false"></textarea><div class="d-flex flex-wrap gap-2 mt-3">' +
      '<button class="btn btn-primary" type="submit">Check in pass</button>' +
      '<button class="btn btn-outline-primary" id="startCamera" type="button">Use camera</button>' +
      '<button class="btn btn-outline-secondary d-none" id="stopCamera" type="button">Stop camera</button></div></form>' +
      '<p id="cameraMessage" class="small text-secondary mt-3 mb-0" aria-live="polite">Camera scanning needs browser permission and a secure connection (HTTPS or localhost).</p>' +
      '<video id="cameraPreview" class="camera-preview d-none" playsinline muted></video></section></div>' +
      '<div class="col-12 col-lg-5"><section class="content-card"><h2 class="h5">Scan result</h2>' +
      '<div id="scanResult" class="scan-result scan-empty" aria-live="polite" role="status">No pass scanned yet.</div>' +
      '<div id="scanHistory" class="mt-3"></div></section></div></div>'
    );
  };

  Views.renderRoleGuard = function (targetRouteLabel) {
    return (
      pageHeading("Organizer mode required", "This page is only available to event organizers.") +
      '<section class="ep-guard-box"><div class="guard-icon"><i class="bi bi-shield-lock"></i></div>' +
      '<h2 class="h4">Switch to Organizer Mode</h2><p>You tried to open ' +
      escapeHtml(targetRouteLabel) +
      ". Switch roles to manage events, passes, and check-in.</p>" +
      '<div class="d-flex flex-wrap gap-2"><button class="btn btn-primary" type="button" ' +
      "data-switch-organizer>Switch to Organizer Mode</button>" +
      '<a class="btn btn-outline-secondary" href="#attendee-pass" data-route="attendee-pass" ' +
      'data-role="attendee">Back to My Pass</a></div></section>'
    );
  };

  Views.renderDashboard = function (activeEventId, filters) {
    const events = window.EventPass.Store.getEvents();
    const selectedEventId = activeEventId || (events[0] && events[0].eventId) || "";
    const stats = window.EventPass.Store.getEventStats(selectedEventId);
    const search = String((filters && filters.search) || "");
    const activeStatus = (filters && filters.status) || "All";
    const searchText = search.trim().toLowerCase();
    const passes = window.EventPass.Store.getPasses(selectedEventId).filter(function (pass) {
      const matchesSearch =
        !searchText ||
        [pass.attendeeName, pass.passId, pass.contact].some(function (value) {
          return String(value || "")
            .toLowerCase()
            .includes(searchText);
        });
      const matchesStatus = activeStatus === "All" || pass.status === activeStatus;
      return matchesSearch && matchesStatus;
    });
    const eventSelect = events
      .map(function (event) {
        return (
          '<option value="' +
          escapeHtml(event.eventId) +
          '"' +
          (event.eventId === selectedEventId ? " selected" : "") +
          ">" +
          escapeHtml(event.name) +
          "</option>"
        );
      })
      .join("");
    const statusFilters = ["All", "Valid", "Used", "Revoked"]
      .map(function (status) {
        const active = status === activeStatus;
        return (
          '<button type="button" class="ep-filter-btn' +
          (active ? " active" : "") +
          '" data-status-filter="' +
          status +
          '" aria-pressed="' +
          active +
          '">' +
          status +
          "</button>"
        );
      })
      .join("");
    const rows = passes
      .map(function (pass) {
        const canRevoke = pass.status === "Valid";
        const canReissue = pass.status === "Valid" || pass.status === "Revoked";
        const checkedInAt = pass.usedAt ? formatDate(pass.usedAt) : "—";
        return (
          "<tr><td><code>" +
          escapeHtml(pass.passId) +
          "</code></td><td>" +
          escapeHtml(pass.attendeeName) +
          "</td><td>" +
          escapeHtml(pass.contact || "—") +
          '</td><td><span class="status-pill status-' +
          escapeHtml(pass.status.toLowerCase()) +
          '">' +
          escapeHtml(pass.status) +
          "</span></td><td>" +
          escapeHtml(checkedInAt) +
          '</td><td><div class="dashboard-actions"><button class="btn btn-sm btn-outline-danger" ' +
          'type="button" data-revoke-pass="' +
          escapeHtml(pass.passId) +
          '"' +
          (canRevoke ? "" : " disabled") +
          '>Revoke</button><button class="btn btn-sm btn-outline-primary" ' +
          'type="button" data-reissue-pass="' +
          escapeHtml(pass.passId) +
          '"' +
          (canReissue ? "" : " disabled") +
          '>Reissue</button><button class="btn btn-sm btn-outline-secondary" ' +
          'type="button" data-view-pass="' +
          escapeHtml(pass.passId) +
          '">View QR</button></div></td></tr>'
        );
      })
      .join("");
    const rateWidth = Math.min(100, Math.max(0, stats.checkInRate));
    const rowsContent =
      rows ||
      '<tr><td class="text-center text-secondary py-4" colspan="6">No passes match these filters.</td></tr>';

    return (
      pageHeading("Check-in Dashboard", "Track passes and attendance for your events.") +
      '<section class="dashboard-toolbar"><div class="dashboard-event-picker"><label for="dashboardEvent" class="form-label">Event</label>' +
      '<select class="form-select" id="dashboardEvent"' +
      (events.length ? "" : " disabled") +
      ">" +
      (eventSelect || '<option value="">No events yet</option>') +
      "</select></div>" +
      '<button class="btn btn-primary" id="exportCsv" type="button"' +
      (selectedEventId ? "" : " disabled") +
      '><i class="bi bi-download me-1"></i>Export CSV</button></section>' +
      '<section class="row g-3 dashboard-kpis" aria-label="Event summary">' +
      '<div class="col-12 col-sm-6 col-xl-3"><article class="ep-kpi-card"><p>Total Capacity</p><strong>' +
      stats.capacity +
      '</strong></article></div><div class="col-12 col-sm-6 col-xl-3"><article class="ep-kpi-card">' +
      "<p>Passes Issued</p><strong>" +
      stats.issued +
      "</strong><span>" +
      stats.remaining +
      " seats remaining</span></article></div>" +
      '<div class="col-12 col-sm-6 col-xl-3"><article class="ep-kpi-card"><p>Checked In</p><strong>' +
      stats.checkedIn +
      "</strong><span>" +
      stats.usedCount +
      " used passes</span></article></div>" +
      '<div class="col-12 col-sm-6 col-xl-3"><article class="ep-kpi-card"><p>Check-In Rate</p><strong>' +
      stats.checkInRate +
      '%</strong><div class="progress" role="progressbar" aria-label="Check-in rate" ' +
      'aria-valuenow="' +
      rateWidth +
      '" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="width: ' +
      rateWidth +
      '%"></div></div></article></div></section>' +
      '<section class="content-card dashboard-table-card"><div class="dashboard-filters"><div class="search-field">' +
      '<label for="dashboardSearch" class="visually-hidden">Search attendee passes</label>' +
      '<i class="bi bi-search" aria-hidden="true"></i><input class="form-control" id="dashboardSearch" ' +
      'type="search" placeholder="Search name, pass ID, or contact" value="' +
      escapeHtml(search) +
      '"></div>' +
      '<div class="ep-filter-group" role="group" aria-label="Filter by pass status">' +
      statusFilters +
      '</div></div><div class="table-responsive"><table class="table align-middle dashboard-table">' +
      '<thead><tr><th scope="col">Pass ID</th><th scope="col">Attendee</th><th scope="col">Contact</th>' +
      '<th scope="col">Status</th><th scope="col">Checked-In Time</th><th scope="col">Actions</th></tr></thead>' +
      "<tbody>" +
      rowsContent +
      "</tbody></table></div></section>"
    );
  };

  Views.renderAbout = function () {
    return (
      pageHeading("About EventPass", "A simple event pass demo for organizers and attendees.") +
      '<div class="row g-3"><div class="col-12 col-lg-7"><section class="content-card">' +
      '<h2 class="h4">How single-use passes work</h2><p>Each pass carries an <code>EP1|…</code> code tied to an event and pass ID. ' +
      "At the door, the scanner checks the code and marks a valid pass as used. A later scan is denied, which demonstrates how a second person using a copied screenshot is caught.</p>" +
      '<h3 class="h5 mt-4">A quick evaluator walkthrough</h3><ol class="demo-steps">' +
      "<li>Open <strong>Events</strong> and choose an event.</li><li>Use <strong>Issue passes</strong> to create a pass and view its QR code.</li>" +
      "<li>Open <strong>Scanner</strong> and scan the code or paste it into the field. Scan it again to see the used-pass result.</li>" +
      "<li>Open the <strong>Check-in Dashboard</strong> to filter passes, reissue a pass, or export the event CSV.</li></ol>" +
      '</section></div><div class="col-12 col-lg-5"><section class="ep-guard-box security-card">' +
      '<h2 class="h4">Demo Security Boundaries</h2><p>This demo stores its data in browser <code>localStorage</code>. The deterministic checksum and its salt are visible in the JavaScript, so a person can copy or recreate a pass.</p>' +
      '<p class="mb-0">Production passes need server-side verification with a private HMAC key or a properly validated JWT, plus authenticated organizer access. This browser demo is for learning and evaluation only.</p>' +
      "</section></div></div>"
    );
  };

  window.EventPass.Views = Views;
})();
