(function () {
  "use strict";

  window.EventPass = window.EventPass || {};

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date to be confirmed";
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  function eventCard(event) {
    const percent = event.capacity > 0 ? Math.min(100, Math.round(event.issuedCount / event.capacity * 100)) : 0;
    return '<div class="col-12 col-xl-6"><article class="event-card">' +
      '<div class="d-flex justify-content-between gap-3"><div><p class="small text-secondary mb-1">' + escapeHtml(event.eventId) + '</p><h3>' + escapeHtml(event.name) + '</h3></div>' +
      '<span class="badge text-bg-light align-self-start">' + escapeHtml(event.issuedCount) + ' / ' + escapeHtml(event.capacity) + ' issued</span></div>' +
      '<p class="event-meta mb-2"><i class="bi bi-calendar3 me-2"></i>' + escapeHtml(formatDate(event.date)) + '</p>' +
      '<p class="event-meta"><i class="bi bi-geo-alt me-2"></i>' + escapeHtml(event.venue) + '</p>' +
      '<div class="d-flex justify-content-between small mb-1"><span>Passes issued</span><span>' + percent + '%</span></div>' +
      '<div class="progress" role="progressbar" aria-label="Passes issued" aria-valuenow="' + percent + '" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="width: ' + percent + '%"></div></div>' +
      '<p class="small text-secondary mt-2 mb-0">' + escapeHtml(event.checkedInCount) + ' checked in</p>' +
      '<div class="event-actions"><button class="btn btn-sm btn-outline-secondary" data-edit-event="' + escapeHtml(event.eventId) + '">Edit</button>' +
      '<button class="btn btn-sm btn-primary" data-go="issue-passes" data-event-id="' + escapeHtml(event.eventId) + '">Issue passes</button>' +
      '<button class="btn btn-sm btn-outline-primary" data-go="scanner" data-event-id="' + escapeHtml(event.eventId) + '">Scanner</button>' +
      '<button class="btn btn-sm btn-outline-primary" data-go="dashboard" data-event-id="' + escapeHtml(event.eventId) + '">Dashboard</button></div>' +
      '</article></div>';
  }

  const Views = {};

  Views.renderHome = function () {
    const events = window.EventPass.Store.getEvents();
    const capacity = events.reduce(function (sum, event) { return sum + Number(event.capacity || 0); }, 0);
    const issued = events.reduce(function (sum, event) { return sum + Number(event.issuedCount || 0); }, 0);
    return '<section class="hero mb-4"><p class="text-uppercase small fw-bold mb-2">Your event workspace</p><h1>Make every event easier to run.</h1><p>Keep the essentials in one place: event details, attendee passes and check-in plans.</p><a class="btn btn-primary" href="#events" data-route="events">View your events</a></section>' +
      '<section aria-labelledby="quickStartTitle" class="mb-4"><h2 id="quickStartTitle" class="h4 mb-3">Choose where to start</h2><div class="row g-3">' +
      '<div class="col-12 col-md-6"><a class="role-card" href="#events" data-route="events"><i class="bi bi-calendar2-check"></i><h3 class="h5 mt-3">Continue as Event Organizer</h3><p class="mb-0 text-secondary">Manage events and prepare attendee passes.</p></a></div>' +
      '<div class="col-12 col-md-6"><a class="role-card" href="#attendee-pass" data-role="attendee" data-route="attendee-pass"><i class="bi bi-person-vcard"></i><h3 class="h5 mt-3">View Attendee Pass</h3><p class="mb-0 text-secondary">See the attendee view planned for a future version.</p></a></div></div></section>' +
      '<section aria-label="Event summary"><div class="row g-3"><div class="col-12 col-sm-4"><div class="stat-card"><p class="stat-label">Total Events</p><p class="stat-value">' + events.length + '</p></div></div>' +
      '<div class="col-12 col-sm-4"><div class="stat-card"><p class="stat-label">Total Capacity</p><p class="stat-value">' + capacity + '</p></div></div>' +
      '<div class="col-12 col-sm-4"><div class="stat-card"><p class="stat-label">Total Passes Issued</p><p class="stat-value">' + issued + '</p></div></div></div></section>' +
      '<div class="mt-4"><button class="btn btn-outline-secondary" type="button" data-reset-demo>Reset Sample Data</button></div>';
  };

  Views.renderEventList = function () {
    const events = window.EventPass.Store.getEvents();
    let content = '<div class="page-heading d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-3"><div><h1 class="h2 mb-0">Events</h1><p>View and manage your event details.</p></div><a class="btn btn-primary" href="#create-event" data-route="create-event"><i class="bi bi-plus-lg me-1"></i>Create event</a></div>';
    if (events.length === 0) {
      return content + '<div class="empty-state"><i class="bi bi-calendar-plus"></i><h2 class="h4 mt-3">No events yet</h2><p class="text-secondary">Create an event to get started.</p><a class="btn btn-primary" href="#create-event" data-route="create-event">Create First Event</a></div>';
    }
    return content + '<div class="row g-3">' + events.map(eventCard).join("") + '</div>';
  };

  Views.renderEventForm = function (editEventId) {
    const event = editEventId ? window.EventPass.Store.getEventById(editEventId) : null;
    const heading = event ? "Edit event" : "Create an event";
    return '<div class="page-heading"><h1 class="h2">' + heading + '</h1><p>Add the basic details people need to find your event.</p></div>' +
      '<section class="content-card"><form id="eventForm" novalidate data-event-id="' + escapeHtml(event ? event.eventId : "") + '">' +
      '<div class="mb-3"><label class="form-label" for="eventName">Event Name</label><input class="form-control" id="eventName" name="name" required maxlength="120" value="' + escapeHtml(event ? event.name : "") + '"><div class="field-error" id="nameError" aria-live="polite"></div></div>' +
      '<div class="mb-3"><label class="form-label" for="eventDate">Date &amp; Time</label><input class="form-control" id="eventDate" name="date" type="datetime-local" required value="' + escapeHtml(event ? event.date : "") + '"><div class="field-error" id="dateError" aria-live="polite"></div></div>' +
      '<div class="mb-3"><label class="form-label" for="eventVenue">Venue</label><input class="form-control" id="eventVenue" name="venue" required maxlength="160" value="' + escapeHtml(event ? event.venue : "") + '"><div class="field-error" id="venueError" aria-live="polite"></div></div>' +
      '<div class="mb-3"><label class="form-label" for="eventCapacity">Capacity</label><input class="form-control" id="eventCapacity" name="capacity" type="number" min="1" step="1" required value="' + escapeHtml(event ? event.capacity : "") + '"><div class="field-error" id="capacityError" aria-live="polite"></div></div>' +
      '<div class="d-flex flex-wrap gap-2"><button class="btn btn-primary" type="submit">Save event</button><a class="btn btn-outline-secondary" href="#events" data-route="events">Cancel</a></div></form></section>';
  };

  Views.renderPlaceholder = function (title, targetVersion, description) {
    return '<div class="page-heading"><h1 class="h2">' + escapeHtml(title) + '</h1><p>' + escapeHtml(description) + '</p></div>' +
      '<section class="content-card"><span class="badge text-bg-light">Planned for ' + escapeHtml(targetVersion) + '</span><h2 class="h4 mt-3">This screen is coming later</h2><p class="text-secondary">This foundation version focuses on event setup and management.</p><a href="#events" data-route="events" class="btn btn-primary">Back to events</a></section>';
  };

  window.EventPass.Views = Views;
}());
