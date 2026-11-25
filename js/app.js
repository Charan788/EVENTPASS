(function () {
  "use strict";

  window.EventPass = window.EventPass || {};

  const App = {};
  const organizerRoutes = [
    "events",
    "create-event",
    "edit-event",
    "issue-passes",
    "scanner",
    "dashboard",
  ];
  const routeLabels = {
    events: "Events",
    "create-event": "Create event",
    "edit-event": "Edit event",
    "issue-passes": "Issue passes",
    scanner: "Scanner",
    dashboard: "Check-in Dashboard",
  };
  let cameraStream = null;
  let cameraDetector = null;
  let checkingCamera = false;
  let currentRoute = "home";
  let dashboardEventId = "";
  let dashboardFilters = { search: "", status: "All" };
  let requestedPassId = "";

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

  function stopCamera() {
    checkingCamera = false;
    if (cameraStream) {
      cameraStream.getTracks().forEach(function (track) {
        track.stop();
      });
      cameraStream = null;
    }
    const video = document.getElementById("cameraPreview");
    if (video) {
      video.pause();
      video.srcObject = null;
      video.classList.add("d-none");
    }
    const startButton = document.getElementById("startCamera");
    const stopButton = document.getElementById("stopCamera");
    if (startButton) startButton.classList.remove("d-none");
    if (stopButton) stopButton.classList.add("d-none");
  }

  function showQRCode(element, code) {
    if (!element || !window.QRCode) {
      if (element) element.textContent = "QR display is unavailable. Copy the pass code instead.";
      return;
    }

    element.innerHTML = "";
    new window.QRCode(element, {
      text: code,
      width: 180,
      height: 180,
      correctLevel: window.QRCode.CorrectLevel.M,
    });
  }

  function showPass(passId) {
    const pass = window.EventPass.Store.getPassById(passId);
    const target = document.getElementById("passDetails");
    if (!pass || !target) return;

    const event = window.EventPass.Store.getEventById(pass.eventId);
    target.className = "content-card pass-details";
    target.innerHTML =
      '<div class="pass-summary"><div><p class="small text-secondary mb-1">' +
      escapeHtml(pass.passId) +
      '</p><h2 class="h4">' +
      escapeHtml(pass.attendeeName) +
      "</h2>" +
      '<p class="mb-1">' +
      escapeHtml(event ? event.name : pass.eventId) +
      "</p>" +
      '<p class="text-secondary">' +
      escapeHtml(event ? event.date.replace("T", " ") : "") +
      "</p>" +
      '<span class="status-pill status-' +
      escapeHtml(pass.status.toLowerCase()) +
      '">' +
      escapeHtml(pass.status) +
      '</span></div><div id="passQr" class="qr-box" aria-label="Pass QR code"></div></div>' +
      '<p class="small text-secondary mt-3 mb-1">Pass code</p><code class="pass-code">' +
      escapeHtml(pass.code) +
      "</code>";
    showQRCode(document.getElementById("passQr"), pass.code);
  }

  function showIssuedPass(pass) {
    const target = document.getElementById("issuedPass");
    if (!target) return;

    target.className = "issued-pass";
    target.innerHTML =
      '<p class="mb-1"><strong>' +
      escapeHtml(pass.attendeeName) +
      "</strong></p>" +
      '<p class="small text-secondary">' +
      escapeHtml(pass.passId) +
      "</p>" +
      '<div id="issuedPassQr" class="qr-box" aria-label="New pass QR code"></div>' +
      '<code class="pass-code">' +
      escapeHtml(pass.code) +
      "</code>";
    showQRCode(document.getElementById("issuedPassQr"), pass.code);
  }

  function renderScanHistory(eventId) {
    const target = document.getElementById("scanHistory");
    if (!target) return;

    const scans = window.EventPass.Store.getScans(eventId).slice(0, 5);
    if (scans.length === 0) {
      target.innerHTML =
        '<p class="small text-secondary mb-0">No scans recorded for this event yet.</p>';
      return;
    }

    target.innerHTML =
      '<h3 class="h6">Recent scans</h3><ul class="scan-history">' +
      scans
        .map(function (scan) {
          const className =
            scan.result === "Valid"
              ? "status-valid"
              : scan.result === "Already used"
                ? "status-used"
                : "status-invalid";
          return (
            "<li><span>" +
            escapeHtml(scan.passId || "Unknown pass") +
            '</span><span class="status-pill ' +
            className +
            '">' +
            escapeHtml(scan.result) +
            "</span></li>"
          );
        })
        .join("") +
      "</ul>";
  }

  function showScanResult(result) {
    const target = document.getElementById("scanResult");
    if (!target) return;

    const className =
      result.status === "Valid"
        ? "scan-valid"
        : result.status === "Already used"
          ? "scan-used"
          : "scan-invalid";
    target.className = "scan-result " + className;
    target.innerHTML =
      "<strong>" +
      escapeHtml(result.status) +
      '</strong><p class="mb-0">' +
      escapeHtml(result.message) +
      "</p>" +
      (result.pass
        ? '<p class="small mb-0 mt-2">' +
          escapeHtml(result.pass.attendeeName) +
          " · " +
          escapeHtml(result.pass.passId) +
          "</p>"
        : "");
  }

  function checkIn(rawCode) {
    const eventSelect = document.getElementById("scanEvent");
    const eventId = eventSelect ? eventSelect.value : "";
    const result = window.EventPass.Validator.validateAndCheckIn(rawCode, eventId);
    showScanResult(result);
    renderScanHistory(eventId);
    const input = document.getElementById("scanCode");
    if (input) input.value = "";
  }

  function render(route) {
    stopCamera();
    currentRoute = route || "home";
    const activeRoute = currentRoute;
    const views = window.EventPass.Views;
    const target = document.getElementById("screenContent");

    const role = window.EventPass.Store.getPrefs().role;
    if (role === "attendee" && organizerRoutes.indexOf(activeRoute) !== -1) {
      target.innerHTML = views.renderRoleGuard(routeLabels[activeRoute]);
    } else if (activeRoute === "home") target.innerHTML = views.renderHome();
    else if (activeRoute === "events") target.innerHTML = views.renderEventList();
    else if (activeRoute === "create-event") target.innerHTML = views.renderEventForm();
    else if (activeRoute === "edit-event") {
      target.innerHTML = views.renderEventForm(window.EventPass.Store.getPrefs().lastEventId);
    } else if (activeRoute === "issue-passes") target.innerHTML = views.renderIssuePasses();
    else if (activeRoute === "attendee-pass") {
      target.innerHTML = views.renderAttendeePass();
      if (requestedPassId) showPass(requestedPassId);
    } else if (activeRoute === "scanner") target.innerHTML = views.renderScanner();
    else if (activeRoute === "dashboard") {
      const events = window.EventPass.Store.getEvents();
      const savedEventId = window.EventPass.Store.getPrefs().lastEventId;
      if (
        !events.some(function (event) {
          return event.eventId === dashboardEventId;
        })
      ) {
        dashboardEventId = events.some(function (event) {
          return event.eventId === savedEventId;
        })
          ? savedEventId
          : (events[0] && events[0].eventId) || "";
      }
      target.innerHTML = views.renderDashboard(dashboardEventId, dashboardFilters);
    } else if (activeRoute === "about") target.innerHTML = views.renderAbout();
    else target.innerHTML = views.renderHome();

    document.querySelectorAll("[data-route]").forEach(function (link) {
      link.classList.toggle("active", link.getAttribute("data-route") === activeRoute);
    });
    syncRoleButton();

    if (activeRoute === "scanner") {
      const eventSelect = document.getElementById("scanEvent");
      if (eventSelect) renderScanHistory(eventSelect.value);
    }
  }

  function validateEventForm(form) {
    const values = new FormData(form);
    const fields = {
      name: {
        value: String(values.get("name") || "").trim(),
        id: "nameError",
        message: "Enter an event name.",
      },
      date: {
        value: String(values.get("date") || "").trim(),
        id: "dateError",
        message: "Choose a date and time.",
      },
      venue: {
        value: String(values.get("venue") || "").trim(),
        id: "venueError",
        message: "Enter a venue.",
      },
      capacity: {
        value: String(values.get("capacity") || "").trim(),
        id: "capacityError",
        message: "Capacity must be a whole number greater than 0.",
      },
    };
    let valid = true;

    Object.keys(fields).forEach(function (name) {
      const field = fields[name];
      const input = form.elements[name];
      let message = field.value ? "" : field.message;
      if (
        name === "capacity" &&
        field.value &&
        (!Number.isInteger(Number(field.value)) || Number(field.value) < 1)
      ) {
        message = field.message;
      }

      document.getElementById(field.id).textContent = message;
      input.setAttribute("aria-invalid", String(Boolean(message)));
      if (message) valid = false;
    });

    return valid
      ? {
          name: fields.name.value,
          date: fields.date.value,
          venue: fields.venue.value,
          capacity: Number(fields.capacity.value),
        }
      : null;
  }

  async function startCamera() {
    const message = document.getElementById("cameraMessage");
    const video = document.getElementById("cameraPreview");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      message.textContent =
        "This browser cannot open a camera here. Paste the pass code into the field instead.";
      return;
    }
    if (!window.BarcodeDetector) {
      message.textContent =
        "Camera QR reading is not supported by this browser. Paste the pass code instead.";
      return;
    }

    try {
      cameraDetector = new window.BarcodeDetector({ formats: ["qr_code"] });
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      video.srcObject = cameraStream;
      video.classList.remove("d-none");
      await video.play();
      checkingCamera = true;
      document.getElementById("startCamera").classList.add("d-none");
      document.getElementById("stopCamera").classList.remove("d-none");
      message.textContent = "Point the camera at an EventPass QR code.";
      readCameraFrame();
    } catch (error) {
      stopCamera();
      message.textContent =
        "The camera could not be opened. Check browser permission or enter the code manually.";
    }
  }

  async function readCameraFrame() {
    if (!checkingCamera || !cameraDetector) return;

    try {
      const video = document.getElementById("cameraPreview");
      const codes = await cameraDetector.detect(video);
      if (codes.length && codes[0].rawValue) {
        const rawCode = codes[0].rawValue;
        stopCamera();
        checkIn(rawCode);
        document.getElementById("cameraMessage").textContent =
          "Pass scanned. Start the camera again for the next attendee.";
        return;
      }
    } catch (error) {
      document.getElementById("cameraMessage").textContent =
        "Camera reading failed. You can enter the pass code manually.";
      stopCamera();
      return;
    }

    window.requestAnimationFrame(readCameraFrame);
  }

  function attachEvents() {
    document.addEventListener("click", function (event) {
      const routeLink = event.target.closest("[data-route]");
      if (routeLink) {
        event.preventDefault();
        const route = routeLink.getAttribute("data-route");
        const role = routeLink.getAttribute("data-role");
        const eventId = routeLink.getAttribute("data-event-id");
        if (role) window.EventPass.Store.savePrefs({ role: role });
        if (eventId) window.EventPass.Store.savePrefs({ lastEventId: eventId });
        window.location.hash = route;
        render(route);

        const menu = document.getElementById("mobileNav");
        if (menu.classList.contains("show") && window.bootstrap) {
          window.bootstrap.Offcanvas.getOrCreateInstance(menu).hide();
        }
        return;
      }

      const goButton = event.target.closest("[data-go]");
      if (goButton) {
        const route = goButton.getAttribute("data-go");
        const eventId = goButton.getAttribute("data-event-id");
        window.EventPass.Store.savePrefs({ lastEventId: eventId });
        if (route === "dashboard") dashboardEventId = eventId;
        window.location.hash = route;
        render(route);
        return;
      }

      const editButton = event.target.closest("[data-edit-event]");
      if (editButton) {
        window.EventPass.Store.savePrefs({
          lastEventId: editButton.getAttribute("data-edit-event"),
        });
        window.location.hash = "edit-event";
        render("edit-event");
        return;
      }

      const passButton = event.target.closest("[data-show-pass]");
      if (passButton) showPass(passButton.getAttribute("data-show-pass"));

      const resetButton = event.target.closest("[data-reset-demo]");
      if (
        resetButton &&
        window.confirm("Reset all events, passes, and scan history to the sample data?")
      ) {
        window.EventPass.Store.resetDemoData();
        render("home");
        showAlert("Sample data has been reset.", "success");
      }

      if (event.target.closest("[data-switch-organizer]")) {
        window.EventPass.Store.savePrefs({ role: "organizer" });
        render(currentRoute);
      }

      const revokeButton = event.target.closest("[data-revoke-pass]");
      if (revokeButton) {
        const result = window.EventPass.Store.revokePass(
          revokeButton.getAttribute("data-revoke-pass"),
        );
        render("dashboard");
        showAlert(result.ok ? "Pass revoked." : result.error, result.ok ? "success" : "warning");
      }

      const reissueButton = event.target.closest("[data-reissue-pass]");
      if (reissueButton) {
        const result = window.EventPass.Store.reissuePass(
          reissueButton.getAttribute("data-reissue-pass"),
        );
        render("dashboard");
        showAlert(
          result.ok ? "Replacement pass created: " + result.newPass.passId : result.error,
          result.ok ? "success" : "warning",
        );
      }

      const viewPassButton = event.target.closest("[data-view-pass]");
      if (viewPassButton) {
        requestedPassId = viewPassButton.getAttribute("data-view-pass");
        const pass = window.EventPass.Store.getPassById(requestedPassId);
        if (pass) window.EventPass.Store.savePrefs({ lastEventId: pass.eventId });
        window.location.hash = "attendee-pass";
        render("attendee-pass");
      }

      if (event.target.closest("#exportCsv")) exportEventCsv();

      const filterButton = event.target.closest("[data-status-filter]");
      if (filterButton) {
        dashboardFilters.status = filterButton.getAttribute("data-status-filter");
        render("dashboard");
      }

      if (event.target.closest("#startCamera")) startCamera();
      if (event.target.closest("#stopCamera")) stopCamera();
    });

    document.getElementById("roleSwitch").addEventListener("click", function () {
      const nextRole =
        window.EventPass.Store.getPrefs().role === "organizer" ? "attendee" : "organizer";
      window.EventPass.Store.savePrefs({ role: nextRole });
      syncRoleButton();
      if (organizerRoutes.indexOf(currentRoute) !== -1) render(currentRoute);
    });

    document.addEventListener("submit", function (event) {
      if (event.target.id === "eventForm") {
        event.preventDefault();
        const values = validateEventForm(event.target);
        if (!values) return;

        const eventId = event.target.getAttribute("data-event-id");
        if (eventId) values.eventId = eventId;
        window.EventPass.Store.saveEvent(values);
        window.location.hash = "events";
        render("events");
        showAlert(eventId ? "Event details updated." : "Event created.", "success");
      }

      if (event.target.id === "issuePassForm") {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(event.target).entries());
        const result = window.EventPass.Store.issuePass(values);
        const message = document.getElementById("issueMessage");
        if (!result.ok) {
          message.className = "alert alert-warning mt-3";
          message.textContent = result.error;
          return;
        }

        message.className = "alert alert-success mt-3";
        message.textContent = "Pass created for " + result.pass.attendeeName + ".";
        event.target.reset();
        document.getElementById("passEvent").value = values.eventId;
        showIssuedPass(result.pass);
      }

      if (event.target.id === "scanForm") {
        event.preventDefault();
        checkIn(document.getElementById("scanCode").value);
      }
    });

    document.addEventListener("change", function (event) {
      if (event.target.id === "scanEvent") {
        window.EventPass.Store.savePrefs({ lastEventId: event.target.value });
        renderScanHistory(event.target.value);
      }
      if (event.target.id === "dashboardEvent") {
        dashboardEventId = event.target.value;
        window.EventPass.Store.savePrefs({ lastEventId: dashboardEventId });
        render("dashboard");
      }
    });

    document.addEventListener("input", function (event) {
      if (event.target.id !== "dashboardSearch") return;

      dashboardFilters.search = event.target.value;
      const cursor = event.target.selectionStart;
      render("dashboard");
      const searchInput = document.getElementById("dashboardSearch");
      searchInput.focus();
      if (cursor !== null) searchInput.setSelectionRange(cursor, cursor);
    });

    window.addEventListener("hashchange", function () {
      render(window.location.hash.replace(/^#/, "") || "home");
    });

    window.addEventListener("eventpass:storage-error", function (event) {
      const message =
        event.detail && event.detail.message
          ? event.detail.message
          : "Browser storage is unavailable. Changes may not be saved.";
      showAlert(message, "warning");
    });
  }

  function exportEventCsv() {
    if (!dashboardEventId) return;

    const csv = window.EventPass.Store.buildEventCsv(dashboardEventId);
    const file = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    const safeEventId = dashboardEventId.replace(/[^a-zA-Z0-9_-]/g, "-");
    link.href = url;
    link.download = "eventpass-" + safeEventId + ".csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showAlert("CSV exported for " + dashboardEventId + ".", "success");
  }

  App.start = function () {
    attachEvents();
    window.EventPass.Store.initSampleData();
    render(window.location.hash.replace(/^#/, "") || "home");
  };

  window.EventPass.App = App;
  document.addEventListener("DOMContentLoaded", App.start);
})();
