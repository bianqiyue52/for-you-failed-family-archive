import { ASSET_CONFIG } from "./config.js";

const INITIAL_STATUS = {
  confidence: "92%",
  conflict: "LOW",
  condition: "STABLE",
  relation: "PENDING"
};

const ANNOTATED_STATUS = {
  confidence: "RECALCULATING",
  conflict: "DETECTED",
  condition: "ANNOTATED",
  relation: "UNSTABLE"
};

const CONTAMINATED_STATUS = {
  confidence: "43%",
  conflict: "MULTIPLE",
  condition: "CONTAMINATED",
  relation: "MISFILED"
};

const WATER_DAMAGED_STATUS = {
  confidence: "12%",
  conflict: "UNRESOLVED",
  condition: "WATER-DAMAGED",
  relation: "FAILED"
};

const FIELD_RECORDS = {
  phone: {
    label: "CALL RECORD",
    field: "guardian contact",
    result: "unavailable",
    status: "no record",
    notes: ["guardian contact: unavailable", "audio record: cut"]
  },
  register: {
    label: "REGISTRATION FILE",
    field: "relation field",
    result: "correction rejected",
    status: "invalidated",
    notes: ["relation field: correction rejected"]
  },
  tent: {
    label: "REDACTED SHELTER",
    field: "shelter field",
    result: "partially redacted",
    status: "hidden field",
    notes: ["shelter field: partially redacted"]
  },
  gardenia: {
    label: "UNRECORDED SMELL",
    field: "sensory evidence",
    result: "invalid format",
    status: "unfiled",
    notes: ["sensory evidence: invalid format"]
  },
  wateringCan: {
    label: "CARE LABOR GRID",
    field: "duration field",
    result: "continuous pressure required",
    status: "pending measure",
    notes: ["care labor: recorded but unclassified"]
  },
  soil: {
    label: "CARE LABOR GRID",
    field: "care labor",
    result: "recorded but unclassified",
    status: "water-damaged",
    notes: ["care labor: recorded but unclassified"]
  }
};

const WATERING_HINT_RECORD = {
  sequence: "HINT",
  label: "LABOR TOOL",
  field: "input type",
  result: "continuous pressure",
  status: "duration field: required",
  contaminationNote: "INPUT TYPE: CONTINUOUS PRESSURE / DURATION FIELD: REQUIRED"
};

const STAMP_MESSAGES = [
  "INVALID FIELD",
  "CORRECTION REJECTED",
  "NO LEGAL CATEGORY",
  "SOURCE CONFLICT",
  "RECORD INCOMPLETE"
];

const FINAL_REPORT_DELAY_MS = 4200;
const CURRENT_RECORD_MS = 2800;
const ARCHIVE_REJECT_RATE_LIMIT_MS = 1900;

export function createStatusSystem({ currentRecordLayer, statusLayer, logLayer, reportLayer, state }) {
  const notes = [];
  const stampLayer = getStampLayer();
  let waterDamageLogged = false;
  let currentRecordTimeout = 0;
  let wateringHintShown = false;
  let logOpen = false;
  let lastArchiveRejectAt = 0;

  logLayer.addEventListener("click", onLogLayerClick);
  updateDamageStage();
  renderStatus(INITIAL_STATUS);
  renderLog();

  function recordInteraction(key, options = {}) {
    const record = FIELD_RECORDS[key];
    state.archiveDamageLevel += 1;
    if (key in state.objectAccessCounts) {
      state.objectAccessCounts[key] += 1;
    }

    addNotesForKey(key);

    if (options.waterDamaged) {
      waterDamageLogged = true;
    }

    const entry = pushLogEntry(key, record);
    updateDamageStage();
    addStamp(options.x, options.y);
    renderStatus(getCurrentStatus());
    renderCurrentRecord(entry);
    renderLog();
  }

  function recordAccessGate(choice, options = {}) {
    state.archiveDamageLevel += 1;
    addNotes(["source conflict detected"]);
    const entry = pushLogEntry("access", {
      label: "ACCESS REQUEST",
      field: "relation",
      result: `${choice.toUpperCase()} unstable`,
      status: "admitted with conflict",
      notes: ["source conflict detected"]
    });
    updateDamageStage();
    addStamp(options.x, options.y, "SOURCE CONFLICT");
    renderStatus(getCurrentStatus());
    renderCurrentRecord(entry);
    renderLog();
  }

  function recordGateClosure(options = {}) {
    state.archiveDamageLevel += 1;
    addNotes(["closure failed", "opened with conflict"]);
    const entry = pushLogEntry("accessProtocol", {
      label: "ACCESS PROTOCOL",
      field: "closure / relation",
      result: "closure failed",
      status: "opened with conflict",
      currentResult: "opened with conflict",
      notes: ["opened with conflict"]
    });
    updateDamageStage();
    addStamp(options.x, options.y, "CLOSURE INVALID");
    renderStatus(getCurrentStatus());
    renderCurrentRecord(entry);
    renderLog();
  }

  function showWateringHint(x, y) {
    if (wateringHintShown) return;
    wateringHintShown = true;
    renderCurrentRecord(WATERING_HINT_RECORD);
  }

  function recordLaborIncomplete({ durationMs = 0, x, y } = {}) {
    const seconds = Math.max(0, durationMs / 1000).toFixed(1);
    const entry = pushLogEntry("wateringCan", {
      label: "CARE LABOR GRID",
      field: "duration field",
      result: "LABOR RECORD INCOMPLETE",
      status: `duration insufficient (${seconds}s)`,
      notes: ["duration insufficient"]
    });
    addNotes(["duration insufficient"]);
    addStamp(x, y, "RECORD INCOMPLETE");
    renderStatus(getCurrentStatus());
    renderCurrentRecord(entry);
    renderLog();
  }

  function showFinalReport() {
    waterDamageLogged = true;
    addNotesForKey("soil");
    updateDamageStage();
    addStamp(window.innerWidth * 0.5, window.innerHeight * 0.45, "RECORD INCOMPLETE", true);
    renderStatus(WATER_DAMAGED_STATUS);
    reportLayer.innerHTML = `
      <section class="archive-report" aria-label="Final archive report">
        <h2>FINAL ARCHIVE REPORT</h2>
        <p>Case ID: 2012-09-01</p>
        <p>Verified guardian voice: missing</p>
        <p>Grandparent contact: cut</p>
        <p>Care labor: recorded but unclassified</p>
        <p>Smell evidence: invalid</p>
        <p>Home status: overwritten</p>
        <p>Relation field: failed</p>
        ${renderAccessSummary()}
        <p class="report-failure">Record cannot be completed.</p>
      </section>
    `;
    reportLayer.classList.add("visible");
    return FINAL_REPORT_DELAY_MS;
  }

  function pushLogEntry(key, record) {
    const entry = {
      sequence: state.archiveLog.length + 1,
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      key,
      label: record?.label ?? key.toUpperCase(),
      field: record?.field ?? "unresolved field",
      result: record?.result ?? "unclassified",
      status: record?.status ?? "pending",
      currentResult: record?.currentResult,
      contaminationNote: record?.notes?.[0] ?? "source conflict"
    };
    state.archiveLog.push(entry);
    return entry;
  }

  function getCurrentStatus() {
    if (waterDamageLogged) return WATER_DAMAGED_STATUS;
    if (state.archiveDamageLevel >= 3) return CONTAMINATED_STATUS;
    if (state.archiveDamageLevel >= 1) return ANNOTATED_STATUS;
    return INITIAL_STATUS;
  }

  function addNotesForKey(key) {
    addNotes(FIELD_RECORDS[key]?.notes ?? []);
  }

  function addNotes(nextNotes) {
    nextNotes.forEach((note) => {
      if (!notes.includes(note)) {
        notes.unshift(note);
      }
    });
    notes.splice(4);
  }

  function renderStatus(status) {
    const noteMarkup = notes
      .map((note) => `<li>${note}</li>`)
      .join("");

    statusLayer.innerHTML = `
      <section class="archive-status" data-condition="${status.condition}" aria-label="Archive classification status">
        <p><span>CLASSIFICATION CONFIDENCE:</span> ${status.confidence}</p>
        <p><span>SOURCE CONFLICT:</span> ${status.conflict}</p>
        <p><span>ARCHIVE CONDITION:</span> ${status.condition}</p>
        <p><span>RELATION FIELD:</span> ${status.relation}</p>
        <ol class="archive-status-notes">${noteMarkup}</ol>
      </section>
    `;
  }

  function renderCurrentRecord(entry) {
    window.clearTimeout(currentRecordTimeout);
    const entryLabel = entry.key === "access"
      ? "ACCESS REQUEST"
      : entry.key === "accessProtocol"
        ? "ACCESS PROTOCOL"
        : entry.sequence === "HINT"
          ? "CURRENT RECORD"
          : `ENTRY ${padEntry(entry.sequence)}`;
    currentRecordLayer.innerHTML = `
      <section class="current-record" aria-label="Current archive record">
        <strong>${entryLabel}</strong>
        <p>FILE: ${entry.label}</p>
          <p>FIELD: ${entry.field}</p>
          <p>RESULT: ${entry.currentResult ?? entry.result}</p>
          <p>STATUS: ${entry.status}</p>
      </section>
    `;
    currentRecordLayer.classList.add("visible");
    currentRecordTimeout = window.setTimeout(() => {
      currentRecordLayer.classList.remove("visible");
    }, CURRENT_RECORD_MS);
  }

  function renderLog() {
    const entryCount = state.archiveLog.length;
    const entries = getCompactLogEntries()
      .map((entry) => `
        <article class="archive-log-entry">
          <strong>${entry.sequenceLabel} / ${entry.label}${entry.count > 1 ? ` x${entry.count}` : ""}</strong>
          <p>FIELD: ${entry.field}</p>
          <p>RESULT: ${entry.result}</p>
        </article>
      `)
      .join("");

    logLayer.dataset.open = logOpen ? "true" : "false";
    logLayer.innerHTML = `
      <button class="archive-log-tab" type="button" data-log-toggle>
        ARCHIVE LOG / ${entryCount} ${entryCount === 1 ? "ENTRY" : "ENTRIES"}
      </button>
      <section class="archive-log-panel" aria-label="Archive log" ${logOpen ? "" : "hidden"}>
        <div class="archive-log-heading">
          <h2>ARCHIVE LOG</h2>
          <button class="archive-log-close" type="button" data-log-close>CLOSE FILE</button>
        </div>
        <div class="archive-log-scroll">
          ${entries || "<p class=\"archive-log-empty\">NO ENTRIES FILED</p>"}
        </div>
      </section>
    `;
  }

  function onLogLayerClick(event) {
    if (event.target.closest("[data-log-toggle]")) {
      logOpen = !logOpen;
      renderLog();
      return;
    }

    if (event.target.closest("[data-log-close]")) {
      logOpen = false;
      renderLog();
    }
  }

  function getCompactLogEntries() {
    const compactEntries = [];
    state.archiveLog.slice().reverse().forEach((entry) => {
      const previous = compactEntries[compactEntries.length - 1];
      const sameAsPrevious = previous &&
        previous.label === entry.label &&
        previous.field === entry.field &&
        previous.result === entry.result;

      if (sameAsPrevious) {
        previous.count += 1;
        previous.sequenceLabel = `ENTRY ${padEntry(entry.sequence)}-${padEntry(previous.latestSequence)}`;
        return;
      }

      compactEntries.push({
        ...entry,
        count: 1,
        latestSequence: entry.sequence,
        sequenceLabel: `ENTRY ${padEntry(entry.sequence)}`
      });
    });

    return compactEntries;
  }

  function renderAccessSummary() {
    const summaryCounts = getSummaryCounts();
    const mostAccessed = getMostAccessed(summaryCounts);
    const unresolvedFields = getUnresolvedFieldCount();
    const repeatedAccessCount = Object.values(summaryCounts).filter((count) => count > 1).length;

    return `
      <div class="report-summary">
        <p>ACCESS SUMMARY:</p>
        <p>CALL RECORD: ${summaryCounts.phone}</p>
        <p>REGISTRATION FILE: ${summaryCounts.register}</p>
        <p>REDACTED SHELTER: ${summaryCounts.tent}</p>
        <p>UNRECORDED SMELL: ${summaryCounts.gardenia}</p>
        <p>CARE LABOR GRID: ${summaryCounts.careLabor}</p>
        <p>MOST ACCESSED FILE: ${mostAccessed}</p>
        <p>UNRESOLVED FIELDS: ${unresolvedFields}</p>
        <p>REPEATED ACCESS COUNT: ${repeatedAccessCount}</p>
      </div>
    `;
  }

  function getSummaryCounts() {
    return {
      phone: state.objectAccessCounts.phone,
      register: state.objectAccessCounts.register,
      tent: state.objectAccessCounts.tent,
      gardenia: state.objectAccessCounts.gardenia,
      careLabor: state.objectAccessCounts.wateringCan + state.objectAccessCounts.soil
    };
  }

  function getMostAccessed(summaryCounts) {
    const labels = {
      phone: "CALL RECORD",
      register: "REGISTRATION FILE",
      tent: "REDACTED SHELTER",
      gardenia: "UNRECORDED SMELL",
      careLabor: "CARE LABOR GRID"
    };
    const [key, count] = Object.entries(summaryCounts).sort((a, b) => b[1] - a[1])[0];
    return count > 0 ? labels[key] : "UNRESOLVED";
  }

  function getUnresolvedFieldCount() {
    return state.archiveLog.filter((entry) => (
      entry.status.includes("un") ||
      entry.result.includes("un") ||
      entry.status.includes("invalid") ||
      entry.result.includes("rejected") ||
      entry.result.includes("INCOMPLETE")
    )).length;
  }

  function updateDamageStage() {
    const stage = getDamageStage();
    statusLayer.dataset.damageStage = stage;
    stampLayer.dataset.damageStage = stage;
    currentRecordLayer.dataset.damageStage = stage;
    logLayer.dataset.damageStage = stage;
    document.documentElement.dataset.archiveDamage = stage;
  }

  function getDamageStage() {
    if (waterDamageLogged) return "water";
    if (state.archiveDamageLevel >= 3) return "crossed";
    if (state.archiveDamageLevel >= 1) return "marked";
    return "stable";
  }

  function addStamp(x, y, forcedMessage, isFinal = false) {
    const stamp = document.createElement("div");
    const stage = getDamageStage();
    const message = forcedMessage ?? STAMP_MESSAGES[state.archiveDamageLevel % STAMP_MESSAGES.length];
    const fallbackX = window.innerWidth * (0.28 + Math.random() * 0.46);
    const fallbackY = window.innerHeight * (0.28 + Math.random() * 0.36);
    stamp.className = `archive-stamp ${isFinal ? "final-stamp" : ""}`;
    stamp.textContent = message;
    stamp.style.left = `${clamp((x ?? fallbackX) - 58 + randomBetween(-24, 24), 8, window.innerWidth - 140)}px`;
    stamp.style.top = `${clamp((y ?? fallbackY) - 22 + randomBetween(-18, 18), 8, window.innerHeight - 72)}px`;
    stamp.style.setProperty("--stamp-tilt", `${randomBetween(-9, 7)}deg`);
    stamp.style.setProperty("--stamp-offset", `${randomBetween(-4, 5)}px`);
    stamp.dataset.damageStage = stage;
    stampLayer.append(stamp);
    maybePlayArchiveReject(message, isFinal);

    if (state.archiveDamageLevel >= 3 || waterDamageLogged) {
      addCorrectionLine(stamp);
    }

    while (stampLayer.children.length > 18) {
      stampLayer.firstElementChild?.remove();
    }
  }

  function addCorrectionLine(anchor) {
    const mark = document.createElement("div");
    mark.className = "archive-correction-line";
    mark.style.left = anchor.style.left;
    mark.style.top = `calc(${anchor.style.top} + ${randomBetween(18, 38)}px)`;
    mark.style.width = `${randomBetween(78, 160)}px`;
    mark.style.setProperty("--line-tilt", `${randomBetween(-10, 8)}deg`);
    stampLayer.append(mark);
  }

  function maybePlayArchiveReject(message, isFinal) {
    const important = isFinal ||
      message === "CORRECTION REJECTED" ||
      message === "INVALID FIELD" ||
      message === "RECORD INCOMPLETE";

    if (!important) return;

    const now = performance.now();
    if (!isFinal && now - lastArchiveRejectAt < ARCHIVE_REJECT_RATE_LIMIT_MS) return;
    lastArchiveRejectAt = now;

    const audio = new Audio(ASSET_CONFIG.audio.archiveReject);
    audio.volume = 0.13;
    audio.play().catch(() => {});
  }

  return {
    recordAccessGate,
    recordGateClosure,
    recordInteraction,
    recordLaborIncomplete,
    showFinalReport,
    showWateringHint
  };
}

function getStampLayer() {
  const existingLayer = document.querySelector("#archive-stamp-layer");
  if (existingLayer) return existingLayer;

  const layer = document.createElement("div");
  layer.id = "archive-stamp-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.append(layer);
  return layer;
}

function padEntry(sequence) {
  return String(sequence).padStart(3, "0");
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
