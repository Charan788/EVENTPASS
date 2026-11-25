(function () {
  "use strict";

  window.EventPass = window.EventPass || {};

  const Store = {};
  const memory = {};
  const keys = {
    events: "eventpass_events",
    passes: "eventpass_passes",
    scans: "eventpass_scans",
    prefs: "eventpass_prefs",
  };

  function showStorageWarning() {
    try {
      window.dispatchEvent(
        new CustomEvent("eventpass:storage-error", {
          detail: {
            message:
              "Browser storage is unavailable. Your changes will last only until this page is closed.",
          },
        }),
      );
    } catch (error) {
      // The in-memory copy still lets the demo work for this page session.
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

  function makePass(passId, eventId, attendeeName, contact, status, issuedAt, usedAt) {
    const code = window.EventPass.QR.encodePayload(passId, eventId);
    const parsed = window.EventPass.QR.parsePayload(code);

    return {
      passId: passId,
      eventId: eventId,
      attendeeName: attendeeName,
      contact: contact,
      code: code,
      signature: parsed.signature,
      status: status,
      issuedAt: issuedAt,
      usedAt: usedAt || null,
    };
  }

  function makeSampleData() {
    const now = new Date().toISOString();
    const earlier = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const events = [
      {
        eventId: "EVT-1001",
        name: "TechSummit Bengaluru 2026",
        date: "2026-12-12T09:30",
        venue: "BIEC Hall 2, Bengaluru",
        capacity: 50,
        issuedCount: 4,
        checkedInCount: 1,
        createdAt: now,
      },
      {
        eventId: "EVT-1002",
        name: "Startup Demo Night",
        date: "2026-12-18T18:00",
        venue: "Koramangala Innovation Hub",
        capacity: 25,
        issuedCount: 2,
        checkedInCount: 1,
        createdAt: now,
      },
    ];
    const passes = [
      makePass("PASS-1001", "EVT-1001", "Aarav Sharma", "aarav@example.com", "Valid", now),
      makePass("PASS-1002", "EVT-1001", "Meera Nair", "meera@example.com", "Valid", now),
      makePass("PASS-1003", "EVT-1001", "Kabir Rao", "kabir@example.com", "Used", now, earlier),
      makePass("PASS-1004", "EVT-1001", "Diya Iyer", "diya@example.com", "Revoked", now),
      makePass("PASS-1005", "EVT-1002", "Ishaan Das", "ishaan@example.com", "Valid", now),
      makePass("PASS-1006", "EVT-1002", "Sara Khan", "sara@example.com", "Used", now, earlier),
    ];
    const scans = [
      {
        scanId: "SCAN-3001",
        passId: "PASS-1003",
        eventId: "EVT-1001",
        rawCode: passes[2].code,
        result: "Valid",
        reason: "Sample check-in",
        scannedAt: earlier,
      },
      {
        scanId: "SCAN-3002",
        passId: "PASS-1006",
        eventId: "EVT-1002",
        rawCode: passes[5].code,
        result: "Valid",
        reason: "Sample check-in",
        scannedAt: earlier,
      },
    ];

    return { events: events, passes: passes, scans: scans };
  }

  Store.initSampleData = function (force) {
    const existingEvents = Store.getEvents();
    if (!force && existingEvents.length > 0) {
      migrateOldPasses();
      return;
    }

    const sample = makeSampleData();
    write(keys.events, sample.events);
    write(keys.passes, sample.passes);
    write(keys.scans, sample.scans);

    if (force || read(keys.prefs, null) === null) {
      write(keys.prefs, {
        role: "organizer",
        lastEventId: "EVT-1001",
        sortOrder: "newest",
      });
    }
  };

  function migrateOldPasses() {
    const passes = Store.getPasses();
    let changed = false;

    passes.forEach(function (pass) {
      const oldStatus = String(pass.status || "").toLowerCase();
      if (oldStatus === "valid" || oldStatus === "used" || oldStatus === "revoked") {
        pass.status = oldStatus.charAt(0).toUpperCase() + oldStatus.slice(1);
        changed = true;
      }

      if (!String(pass.code || "").startsWith("EP1|")) {
        pass.code = window.EventPass.QR.encodePayload(pass.passId, pass.eventId);
        pass.signature = window.EventPass.QR.parsePayload(pass.code).signature;
        changed = true;
      }
    });

    if (changed) Store.savePasses(passes);
  }

  Store.resetDemoData = function () {
    Store.initSampleData(true);
  };

  Store.getEvents = function () {
    return read(keys.events, []);
  };

  Store.getEventById = function (eventId) {
    return (
      Store.getEvents().find(function (event) {
        return event.eventId === eventId;
      }) || null
    );
  };

  Store.saveEvent = function (eventPayload) {
    const events = Store.getEvents();
    const details = {
      name: String(eventPayload.name || "").trim(),
      date: eventPayload.date,
      venue: String(eventPayload.venue || "").trim(),
      capacity: Number(eventPayload.capacity),
    };

    if (eventPayload.eventId) {
      const index = events.findIndex(function (event) {
        return event.eventId === eventPayload.eventId;
      });
      if (index === -1) return null;

      events[index] = Object.assign({}, events[index], details);
      write(keys.events, events);
      return events[index];
    }

    const lastNumber = events.reduce(function (highest, event) {
      const match = String(event.eventId).match(/^EVT-(\d+)$/);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 1000);
    const newEvent = Object.assign(
      {
        eventId: "EVT-" + String(lastNumber + 1).padStart(4, "0"),
        issuedCount: 0,
        checkedInCount: 0,
        createdAt: new Date().toISOString(),
      },
      details,
    );

    events.push(newEvent);
    write(keys.events, events);
    return newEvent;
  };

  Store.issuePass = function (details) {
    const event = Store.getEventById(details.eventId);
    const attendeeName = String(details.attendeeName || "").trim();

    if (!attendeeName) {
      return { ok: false, error: "Enter the attendee's name." };
    }
    if (!event) {
      return { ok: false, error: "Choose an event that exists." };
    }
    if (event.issuedCount >= event.capacity) {
      return { ok: false, error: "This event has reached its pass capacity." };
    }

    const passes = Store.getPasses();
    const lastNumber = passes.reduce(function (highest, pass) {
      const match = String(pass.passId).match(/^PASS-(\d+)$/);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 1000);
    const passId = "PASS-" + String(lastNumber + 1).padStart(4, "0");
    const pass = makePass(
      passId,
      event.eventId,
      attendeeName,
      String(details.contact || "").trim(),
      "Valid",
      new Date().toISOString(),
    );

    passes.unshift(pass);
    write(keys.passes, passes);
    Store.updateEventCounts(event.eventId, { issuedCount: event.issuedCount + 1 });

    return { ok: true, pass: pass };
  };

  Store.getPasses = function (eventId) {
    const passes = read(keys.passes, []);
    return eventId
      ? passes.filter(function (pass) {
          return pass.eventId === eventId;
        })
      : passes;
  };

  Store.getPassById = function (passId) {
    return (
      Store.getPasses().find(function (pass) {
        return pass.passId === passId;
      }) || null
    );
  };

  Store.updateEventCounts = function (eventId, counts) {
    const events = Store.getEvents();
    const event = events.find(function (item) {
      return item.eventId === eventId;
    });
    if (!event) return null;

    if (Number.isInteger(counts.issuedCount)) event.issuedCount = counts.issuedCount;
    if (Number.isInteger(counts.checkedInCount)) event.checkedInCount = counts.checkedInCount;
    write(keys.events, events);
    return event;
  };

  Store.savePasses = function (passes) {
    write(keys.passes, passes);
    return passes;
  };

  Store.getScans = function (eventId) {
    const scans = read(keys.scans, []);
    return eventId
      ? scans.filter(function (scan) {
          return scan.eventId === eventId;
        })
      : scans;
  };

  Store.addScanRecord = function (record) {
    const scans = Store.getScans();
    const newRecord = Object.assign(
      {
        scanId: "SCAN-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        scannedAt: new Date().toISOString(),
      },
      record,
    );

    scans.unshift(newRecord);
    write(keys.scans, scans);
    return newRecord;
  };

  Store.getPrefs = function () {
    return read(keys.prefs, {
      role: "organizer",
      lastEventId: "",
      sortOrder: "newest",
    });
  };

  Store.savePrefs = function (partialPrefs) {
    const prefs = Object.assign({}, Store.getPrefs(), partialPrefs);
    write(keys.prefs, prefs);
    return prefs;
  };

  window.EventPass.Store = Store;
})();
