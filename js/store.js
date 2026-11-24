(function () {
  "use strict";

  window.EventPass = window.EventPass || {};

  const Store = {};
  const memory = {};
  const keys = {
    events: "eventpass_events",
    passes: "eventpass_passes",
    scans: "eventpass_scans",
    prefs: "eventpass_prefs"
  };

  function showStorageWarning() {
    try {
      window.dispatchEvent(new CustomEvent("eventpass:storage-error", {
        detail: { message: "Browser storage is unavailable. Your changes will last only until this page is closed." }
      }));
    } catch (error) {
      // The in-memory copy still keeps the demo usable in older browsers.
    }
  }

  function read(key, fallback) {
    try {
      const saved = window.localStorage.getItem(key);
      if (saved !== null) {
        memory[key] = saved;
        return JSON.parse(saved);
      }
    } catch (error) {
      showStorageWarning();
    }

    if (Object.prototype.hasOwnProperty.call(memory, key)) {
      try {
        return JSON.parse(memory[key]);
      } catch (error) {
        return fallback;
      }
    }
    return fallback;
  }

  function write(key, value) {
    const saved = JSON.stringify(value);
    memory[key] = saved;
    try {
      window.localStorage.setItem(key, saved);
    } catch (error) {
      showStorageWarning();
    }
  }

  function makeSampleData() {
    const now = new Date().toISOString();
    const earlier = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const events = [
      { eventId: "EVT-1001", name: "TechSummit Bengaluru 2026", date: "2026-12-12T09:30", venue: "BIEC Hall 2, Bengaluru", capacity: 50, issuedCount: 4, checkedInCount: 1, createdAt: now },
      { eventId: "EVT-1002", name: "Startup Demo Night", date: "2026-12-18T18:00", venue: "Koramangala Innovation Hub", capacity: 25, issuedCount: 2, checkedInCount: 1, createdAt: now }
    ];
    const passes = [
      { passId: "PASS-2001", eventId: "EVT-1001", attendeeName: "Aarav Sharma", contact: "aarav@example.com", code: "EP-EVT1001-2001", signature: "demo-signature-2001", status: "valid", issuedAt: now, usedAt: null },
      { passId: "PASS-2002", eventId: "EVT-1001", attendeeName: "Meera Nair", contact: "meera@example.com", code: "EP-EVT1001-2002", signature: "demo-signature-2002", status: "valid", issuedAt: now, usedAt: null },
      { passId: "PASS-2003", eventId: "EVT-1001", attendeeName: "Kabir Rao", contact: "kabir@example.com", code: "EP-EVT1001-2003", signature: "demo-signature-2003", status: "used", issuedAt: now, usedAt: earlier },
      { passId: "PASS-2004", eventId: "EVT-1001", attendeeName: "Diya Iyer", contact: "diya@example.com", code: "EP-EVT1001-2004", signature: "demo-signature-2004", status: "revoked", issuedAt: now, usedAt: null },
      { passId: "PASS-2005", eventId: "EVT-1002", attendeeName: "Ishaan Das", contact: "ishaan@example.com", code: "EP-EVT1002-2005", signature: "demo-signature-2005", status: "valid", issuedAt: now, usedAt: null },
      { passId: "PASS-2006", eventId: "EVT-1002", attendeeName: "Sara Khan", contact: "sara@example.com", code: "EP-EVT1002-2006", signature: "demo-signature-2006", status: "used", issuedAt: now, usedAt: earlier }
    ];
    const scans = [
      { scanId: "SCAN-3001", passId: "PASS-2003", eventId: "EVT-1001", rawCode: "EP-EVT1001-2003", result: "accepted", reason: "Pass checked in", scannedAt: earlier },
      { scanId: "SCAN-3002", passId: "PASS-2006", eventId: "EVT-1002", rawCode: "EP-EVT1002-2006", result: "accepted", reason: "Pass checked in", scannedAt: earlier }
    ];
    return { events: events, passes: passes, scans: scans };
  }

  Store.initSampleData = function (force) {
    const currentEvents = read(keys.events, []);
    if (!force && currentEvents.length > 0) return;

    const sample = makeSampleData();
    write(keys.events, sample.events);
    write(keys.passes, sample.passes);
    write(keys.scans, sample.scans);
    if (force || read(keys.prefs, null) === null) {
      write(keys.prefs, { role: "organizer", lastEventId: "EVT-1001", sortOrder: "newest" });
    }
  };

  Store.resetDemoData = function () {
    Store.initSampleData(true);
  };

  Store.getEvents = function () { return read(keys.events, []); };
  Store.getEventById = function (eventId) {
    return Store.getEvents().find(function (event) { return event.eventId === eventId; }) || null;
  };
  Store.saveEvent = function (eventPayload) {
    const events = Store.getEvents();
    const payload = {
      name: String(eventPayload.name || "").trim(),
      date: eventPayload.date,
      venue: String(eventPayload.venue || "").trim(),
      capacity: Number(eventPayload.capacity)
    };
    if (eventPayload.eventId) {
      const index = events.findIndex(function (event) { return event.eventId === eventPayload.eventId; });
      if (index < 0) return null;
      events[index] = Object.assign({}, events[index], payload);
      write(keys.events, events);
      return events[index];
    }

    const highestNumber = events.reduce(function (highest, event) {
      const match = String(event.eventId).match(/^EVT-(\d+)$/);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 1000);
    const savedEvent = Object.assign({
      eventId: "EVT-" + String(highestNumber + 1).padStart(4, "0"),
      issuedCount: 0,
      checkedInCount: 0,
      createdAt: new Date().toISOString()
    }, payload);
    events.push(savedEvent);
    write(keys.events, events);
    return savedEvent;
  };
  Store.getPasses = function (eventId) {
    const passes = read(keys.passes, []);
    return eventId ? passes.filter(function (pass) { return pass.eventId === eventId; }) : passes;
  };
  Store.getScans = function (eventId) {
    const scans = read(keys.scans, []);
    return eventId ? scans.filter(function (scan) { return scan.eventId === eventId; }) : scans;
  };
  Store.getPrefs = function () {
    return read(keys.prefs, { role: "organizer", lastEventId: "", sortOrder: "newest" });
  };
  Store.savePrefs = function (partialPrefs) {
    const prefs = Object.assign({}, Store.getPrefs(), partialPrefs);
    write(keys.prefs, prefs);
    return prefs;
  };

  window.EventPass.Store = Store;
}());
