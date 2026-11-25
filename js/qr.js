(function () {
  "use strict";

  window.EventPass = window.EventPass || {};

  // This checksum is for the demo only. A real pass signature belongs on a server.
  const SALT = "eventpass-v2-demo-salt";

  function computeSignature(passId, eventId) {
    const text = SALT + "|" + eventId + "|" + passId;
    let hash = 2166136261;

    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function encodePayload(passId, eventId) {
    return "EP1|" + eventId + "|" + passId + "|" + computeSignature(passId, eventId);
  }

  function parsePayload(rawCode) {
    if (typeof rawCode !== "string") return null;

    const match = rawCode.trim().match(/^EP1\|([^|]+)\|([^|]+)\|([a-f0-9]{8})$/i);
    if (!match) return null;

    return {
      eventId: match[1],
      passId: match[2],
      signature: match[3].toLowerCase(),
    };
  }

  function verifyPayload(rawCode) {
    const parsed = parsePayload(rawCode);
    if (!parsed) return { ok: false, reason: "The pass code format is not valid." };

    const expected = computeSignature(parsed.passId, parsed.eventId);
    if (parsed.signature !== expected) {
      return { ok: false, reason: "The pass signature does not match." };
    }

    return { ok: true, parsed: parsed };
  }

  window.EventPass.QR = {
    version: "2.0",
    computeSignature: computeSignature,
    encodePayload: encodePayload,
    parsePayload: parsePayload,
    verifyPayload: verifyPayload,
  };
})();
