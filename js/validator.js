(function () {
  "use strict";

  window.EventPass = window.EventPass || {};

  let isScanning = false;

  function recordAttempt(rawCode, activeEventId, result, reason, passId) {
    window.EventPass.Store.addScanRecord({
      passId: passId || "",
      eventId: activeEventId || "",
      rawCode: String(rawCode || "").trim(),
      result: result,
      reason: reason,
    });
  }

  function invalid(message, rawCode, activeEventId, reason, passId) {
    recordAttempt(rawCode, activeEventId, "Invalid", reason || message, passId);
    return { status: "Invalid", message: message };
  }

  function validateAndCheckIn(rawCode, activeEventId) {
    if (isScanning) {
      return { status: "Invalid", message: "A scan is already being checked. Please wait." };
    }
    if (!String(rawCode || "").trim()) {
      return { status: "Invalid", message: "Enter or scan a pass code first." };
    }

    isScanning = true;

    try {
      const qr = window.EventPass.QR.verifyPayload(rawCode);
      if (!qr.ok) {
        return invalid(
          "Invalid or tampered pass signature. Entry denied.",
          rawCode,
          activeEventId,
          qr.reason,
        );
      }

      const pass = window.EventPass.Store.getPassById(qr.parsed.passId);
      if (!pass) {
        return invalid(
          "This pass could not be found. Entry denied.",
          rawCode,
          activeEventId,
          "Pass not found.",
          qr.parsed.passId,
        );
      }
      if (pass.eventId !== activeEventId) {
        return invalid(
          "This pass is for a different event. Entry denied.",
          rawCode,
          activeEventId,
          "Wrong event.",
          pass.passId,
        );
      }
      if (pass.status === "Revoked") {
        return invalid(
          "This pass has been revoked. Entry denied.",
          rawCode,
          activeEventId,
          "Pass revoked.",
          pass.passId,
        );
      }
      if (pass.status === "Used") {
        recordAttempt(
          rawCode,
          activeEventId,
          "Already used",
          "Pass was already checked in.",
          pass.passId,
        );
        const usedTime = pass.usedAt ? new Date(pass.usedAt).toLocaleString() : "an earlier time";
        return {
          status: "Already used",
          message: "This pass was already used at " + usedTime + ". Entry denied.",
          pass: pass,
        };
      }
      if (pass.status !== "Valid") {
        return invalid(
          "This pass is not valid. Entry denied.",
          rawCode,
          activeEventId,
          "Unknown pass status.",
          pass.passId,
        );
      }

      const event = window.EventPass.Store.getEventById(activeEventId);
      if (!event) {
        return invalid(
          "This event could not be found. Entry denied.",
          rawCode,
          activeEventId,
          "Event not found.",
          pass.passId,
        );
      }

      pass.status = "Used";
      pass.usedAt = new Date().toISOString();
      window.EventPass.Store.savePasses(
        window.EventPass.Store.getPasses().map(function (item) {
          return item.passId === pass.passId ? pass : item;
        }),
      );
      window.EventPass.Store.updateEventCounts(activeEventId, {
        checkedInCount: event.checkedInCount + 1,
      });
      recordAttempt(rawCode, activeEventId, "Valid", "Valid pass. Checked in.", pass.passId);

      return {
        status: "Valid",
        message: "Valid pass. Welcome — checked in.",
        pass: pass,
      };
    } finally {
      isScanning = false;
    }
  }

  window.EventPass.Validator = {
    version: "2.0",
    validateAndCheckIn: validateAndCheckIn,
  };
})();
