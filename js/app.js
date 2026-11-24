(function () {
  "use strict";

  window.EventPass = window.EventPass || {};

  const App = {};
  let activeRoute = "home";
  const placeholders = {
    "issue-passes": ["Issue passes", "v2.0", "Create and manage attendee passes for an event."],
    "attendee-pass": ["Attendee pass", "v2.0", "View an attendee's event pass."],
    scanner: ["Pass scanner", "v2.0", "Check attendee passes at the event entrance."],
    dashboard: ["Event dashboard", "v2.0", "Review pass and check-in activity."],
    about: ["About EventPass", "v3.0", "Learn more about the EventPass project."]
  };

  function showAlert(message, kind) {
    const banner = document.getElementById("alertBanner");
    banner.className = "alert alert-" + (kind || "success");
    banner.textContent = message;
    banner.classList.remove("d-none");
  }

  function syncRoleButton() {
    const button = document.getElementById("roleSwitch");
    const isAttendee = window.EventPass.Store.getPrefs().role === "attendee";
    button.textContent = isAttendee ? "Attendee" : "Event Organizer";
    button.setAttribute("aria-pressed", String(isAttendee));
  }

  function render(route) {
    activeRoute = route || "home";
    const views = window.EventPass.Views;
    const target = document.getElementById("screenContent");
    if (activeRoute === "home") target.innerHTML = views.renderHome();
    else if (activeRoute === "events") target.innerHTML = views.renderEventList();
    else if (activeRoute === "create-event") target.innerHTML = views.renderEventForm();
    else if (activeRoute === "edit-event") target.innerHTML = views.renderEventForm(window.EventPass.Store.getPrefs().lastEventId);
    else if (placeholders[activeRoute]) target.innerHTML = views.renderPlaceholder.apply(null, placeholders[activeRoute]);
    else target.innerHTML = views.renderHome();

    document.querySelectorAll("[data-route]").forEach(function (link) {
      link.classList.toggle("active", link.getAttribute("data-route") === activeRoute);
    });
    syncRoleButton();
  }

  function validateForm(form) {
    const values = new FormData(form);
    const fields = {
      name: { value: String(values.get("name") || "").trim(), error: "nameError", message: "Enter an event name." },
      date: { value: String(values.get("date") || "").trim(), error: "dateError", message: "Choose a date and time." },
      venue: { value: String(values.get("venue") || "").trim(), error: "venueError", message: "Enter a venue." },
      capacity: { value: String(values.get("capacity") || "").trim(), error: "capacityError", message: "Capacity must be greater than 0 to create this event." }
    };
    let isValid = true;
    Object.keys(fields).forEach(function (name) {
      const field = fields[name];
      const input = form.elements[name];
      let message = "";
      if (!field.value) message = field.message;
      else if (name === "capacity" && (!Number.isInteger(Number(field.value)) || Number(field.value) <= 0)) message = field.message;
      document.getElementById(field.error).textContent = message;
      input.setAttribute("aria-invalid", String(Boolean(message)));
      if (message) isValid = false;
    });
    return isValid ? {
      name: fields.name.value,
      date: fields.date.value,
      venue: fields.venue.value,
      capacity: Number(fields.capacity.value)
    } : null;
  }

  function attachEvents() {
    document.addEventListener("click", function (event) {
      const routeLink = event.target.closest("[data-route]");
      if (routeLink) {
        event.preventDefault();
        const role = routeLink.getAttribute("data-role");
        if (role) window.EventPass.Store.savePrefs({ role: role });
        const eventId = routeLink.getAttribute("data-event-id");
        if (eventId) window.EventPass.Store.savePrefs({ lastEventId: eventId });
        const route = routeLink.getAttribute("data-route");
        window.location.hash = route;
        render(route);
        const menu = document.getElementById("mobileNav");
        if (menu.classList.contains("show") && window.bootstrap) window.bootstrap.Offcanvas.getOrCreateInstance(menu).hide();
        return;
      }

      const editButton = event.target.closest("[data-edit-event]");
      if (editButton) {
        window.EventPass.Store.savePrefs({ lastEventId: editButton.getAttribute("data-edit-event") });
        window.location.hash = "edit-event";
        render("edit-event");
        return;
      }

      const resetButton = event.target.closest("[data-reset-demo]");
      if (resetButton && window.confirm("Reset all demo events and passes to the original sample data?")) {
        window.EventPass.Store.resetDemoData();
        render("home");
        showAlert("Sample data has been reset.", "success");
      }
    });

    document.getElementById("roleSwitch").addEventListener("click", function () {
      const nextRole = window.EventPass.Store.getPrefs().role === "organizer" ? "attendee" : "organizer";
      window.EventPass.Store.savePrefs({ role: nextRole });
      syncRoleButton();
    });

    document.addEventListener("submit", function (event) {
      if (event.target.id !== "eventForm") return;
      event.preventDefault();
      const values = validateForm(event.target);
      if (!values) return;
      const eventId = event.target.getAttribute("data-event-id");
      if (eventId) values.eventId = eventId;
      window.EventPass.Store.saveEvent(values);
      render("events");
      showAlert(eventId ? "Event details updated." : "Event created.", "success");
    });

    window.addEventListener("hashchange", function () {
      const route = window.location.hash.replace(/^#/, "") || "home";
      render(route);
    });

    window.addEventListener("eventpass:storage-error", function (event) {
      showAlert(event.detail && event.detail.message ? event.detail.message : "Browser storage is unavailable. Changes may not be saved.", "warning");
    });
  }

  App.start = function () {
    window.EventPass.Store.initSampleData();
    attachEvents();
    const route = window.location.hash.replace(/^#/, "") || "home";
    render(route);
  };

  window.EventPass.App = App;
  document.addEventListener("DOMContentLoaded", App.start);
}());
