const storageKey = "grid-notes-journal-v1";
const referenceFiles = {
  cars: "data/cars.csv",
  tracks: "data/tracks.csv"
};

const demoSessions = [
  {
    id: crypto.randomUUID(),
    sessionType: "Daily Race",
    eventLabel: "Race B",
    track: "Dragon Trail",
    car: "Mazda RX-VISION GT3 CONCEPT",
    sessionDate: "2026-03-12",
    bestLapInput: "1:41.982",
    startPosition: 7,
    finishPosition: 4,
    drChange: "Up",
    srChange: "Up",
    penalties: 0,
    confidence: 4,
    mistakeNote: "Still overcommitting on the technical change of direction and giving up exit speed.",
    positiveNote: "Stayed composed in traffic and used the draft without overdriving the entry.",
    summary: "Strong recovery drive once the first two laps settled down."
  },
  {
    id: crypto.randomUUID(),
    sessionType: "Time Trial",
    eventLabel: "TT 29",
    track: "Suzuka Circuit",
    car: "McLaren 650S GT3 '15",
    sessionDate: "2026-03-10",
    bestLapInput: "1:59.438",
    startPosition: "",
    finishPosition: "",
    drChange: "Flat",
    srChange: "Flat",
    penalties: 0,
    confidence: 3,
    mistakeNote: "S-curves are still inconsistent because steering input stacks up too early.",
    positiveNote: "Hairpin exit improved when I waited a beat longer before throttle.",
    summary: "Pace is there in sectors two and three, sector one still decides the lap."
  },
  {
    id: crypto.randomUUID(),
    sessionType: "Daily Race",
    eventLabel: "Race C",
    track: "Road Atlanta",
    car: "Porsche 911 RSR (991) '17",
    sessionDate: "2026-03-08",
    bestLapInput: "1:27.515",
    startPosition: 10,
    finishPosition: 11,
    drChange: "Down",
    srChange: "Down",
    penalties: 2,
    confidence: 2,
    mistakeNote: "Lost rhythm after contact and chased the lap instead of resetting.",
    positiveNote: "The final three laps were cleaner once I focused on exits only.",
    summary: "Messy middle stint, useful reminder to stop forcing recovery moves."
  }
];

const form = document.getElementById("logForm");
const sessionCount = document.getElementById("sessionCount");
const bestLap = document.getElementById("bestLap");
const bestLapMeta = document.getElementById("bestLapMeta");
const finishDelta = document.getElementById("finishDelta");
const finishDeltaMeta = document.getElementById("finishDeltaMeta");
const patternList = document.getElementById("patternList");
const sessionTimeline = document.getElementById("sessionTimeline");
const formStatus = document.getElementById("formStatus");
const exportStatus = document.getElementById("exportStatus");
const seedDemoButton = document.getElementById("seedDemo");
const shareButton = document.getElementById("shareJournal");
const downloadButton = document.getElementById("downloadJournal");
const copyButton = document.getElementById("copyJournal");
const importButton = document.getElementById("importJournal");
const importFileInput = document.getElementById("importFile");
const trackSelect = document.getElementById("track");
const carSelect = document.getElementById("car");
const trackMeta = document.getElementById("trackMeta");
const carMeta = document.getElementById("carMeta");
const sessionDateInput = document.getElementById("sessionDate");
const trackDatalist = document.getElementById("trackOptions");
const carDatalist = document.getElementById("carOptions");
const sessionTypeSelect = document.getElementById("sessionType");
const raceDetails = document.getElementById("raceDetails");
const tagButtons = [...document.querySelectorAll(".tag-btn")];

const referenceData = {
  cars: [],
  tracks: [],
  carsByLabel: new Map(),
  tracksByLabel: new Map()
};

function loadSessions() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to read saved sessions", error);
    return [];
  }
}

function saveSessions(sessions) {
  localStorage.setItem(storageKey, JSON.stringify(sessions));
}

function journalFileName() {
  const date = new Date().toISOString().split("T")[0];
  return `grid-notes-export-${date}.json`;
}

function getExportJson() {
  return JSON.stringify(loadSessions(), null, 2);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[char];
  });
}

function populateSelect(select, options) {
  select.innerHTML = options
    .map((option) => {
      const safeOption = escapeHtml(option);
      return `<option value="${safeOption}">${safeOption}</option>`;
    })
    .join("");
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current);
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  if (current || row.length) {
    row.push(current);
    if (row.some((cell) => cell !== "")) rows.push(row);
  }

  if (!rows.length) return [];

  const [header, ...body] = rows;
  return body.map((cells) =>
    header.reduce((entry, key, index) => {
      entry[key] = (cells[index] || "").trim();
      return entry;
    }, {})
  );
}

function buildCarLabel(entry) {
  return [entry.Make, entry.Model].filter(Boolean).join(" ").trim();
}

function buildTrackLabel(entry) {
  return entry.Layout ? `${entry.Track} - ${entry.Layout}` : entry.Track;
}

function renderReferenceMeta(input, metaElement, lookupMap, formatter, emptyText) {
  const value = input.value.trim();
  if (!value) {
    metaElement.textContent = emptyText;
    return;
  }

  const match = lookupMap.get(value);
  metaElement.textContent = match ? formatter(match) : "Custom entry. Reference details unavailable.";
}

function handleReferenceInput() {
  renderReferenceMeta(
    trackSelect,
    trackMeta,
    referenceData.tracksByLabel,
    (entry) =>
      `${entry.Country} • ${entry["Track Length"]} • ${entry["Number of Corners"]} corners`,
    `Search ${referenceData.tracks.length || 0} GT7 track layouts`
  );

  renderReferenceMeta(
    carSelect,
    carMeta,
    referenceData.carsByLabel,
    (entry) =>
      `${entry.Drivetrain} • ${entry["Max Power"]} • ${entry.Weight}`,
    `Search ${referenceData.cars.length || 0} GT7 cars`
  );
}

async function loadReferenceData() {
  try {
    const [carsResponse, tracksResponse] = await Promise.all([
      fetch(referenceFiles.cars),
      fetch(referenceFiles.tracks)
    ]);

    if (!carsResponse.ok || !tracksResponse.ok) {
      throw new Error("Reference CSV files could not be loaded.");
    }

    const [carsCsv, tracksCsv] = await Promise.all([
      carsResponse.text(),
      tracksResponse.text()
    ]);

    referenceData.cars = parseCsv(carsCsv)
      .map((entry) => ({
        ...entry,
        label: buildCarLabel(entry)
      }))
      .filter((entry) => entry.label);

    referenceData.tracks = parseCsv(tracksCsv)
      .map((entry) => ({
        ...entry,
        label: buildTrackLabel(entry)
      }))
      .filter((entry) => entry.label);

    referenceData.cars.forEach((entry) => referenceData.carsByLabel.set(entry.label, entry));
    referenceData.tracks.forEach((entry) => referenceData.tracksByLabel.set(entry.label, entry));

    populateSelect(
      carDatalist,
      [...new Set(referenceData.cars.map((entry) => entry.label))].sort((a, b) =>
        a.localeCompare(b)
      )
    );
    populateSelect(
      trackDatalist,
      [...new Set(referenceData.tracks.map((entry) => entry.label))].sort((a, b) =>
        a.localeCompare(b)
      )
    );

    trackMeta.textContent = `Search ${referenceData.tracks.length} GT7 track layouts`;
    carMeta.textContent = `Search ${referenceData.cars.length} GT7 cars`;
  } catch (error) {
    console.error("Failed to load reference data", error);
    trackMeta.textContent = "Track reference data failed to load. Manual entry still works.";
    carMeta.textContent = "Car reference data failed to load. Manual entry still works.";
  }
}

function lapTimeToMs(value) {
  if (!value) return Number.POSITIVE_INFINITY;
  const trimmed = value.trim();
  const match = trimmed.match(/^(?:(\d+):)?(\d{1,2})\.(\d{1,3})$/);
  if (!match) return Number.POSITIVE_INFINITY;

  const [, minutes = "0", seconds, millis] = match;
  return Number(minutes) * 60000 + Number(seconds) * 1000 + Number(millis.padEnd(3, "0"));
}

function formatDelta(delta) {
  if (Number.isNaN(delta)) return "--";
  const prefix = delta > 0 ? "+" : "";
  return `${prefix}${delta.toFixed(1)}`;
}

function createPatternCards(sessions) {
  if (!sessions.length) {
    patternList.innerHTML = `
      <div class="pattern-empty">
        Add a few sessions and this panel will start calling out repeat tracks, average gains from
        qualifying, and whether penalties or confidence dips are showing up together.
      </div>
    `;
    return;
  }

  const cards = [];
  const dailyRaces = sessions.filter((entry) => entry.sessionType === "Daily Race");
  const timeTrials = sessions.filter((entry) => entry.sessionType === "Time Trial");
  const trackCounts = sessions.reduce((map, entry) => {
    map[entry.track] = (map[entry.track] || 0) + 1;
    return map;
  }, {});
  const mostVisitedTrack = Object.entries(trackCounts).sort((a, b) => b[1] - a[1])[0];

  if (mostVisitedTrack) {
    cards.push({
      title: `${mostVisitedTrack[0]} keeps showing up`,
      body: `You have ${mostVisitedTrack[1]} logged session${mostVisitedTrack[1] > 1 ? "s" : ""} here. That makes it your best candidate for corner-by-corner notes and repeat-pattern analysis.`
    });
  }

  if (dailyRaces.length) {
    const deltas = dailyRaces
      .filter((entry) => Number(entry.startPosition) && Number(entry.finishPosition))
      .map((entry) => Number(entry.startPosition) - Number(entry.finishPosition));

    if (deltas.length) {
      const averageDelta = deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
      const trend =
        averageDelta > 0
          ? "You usually finish ahead of where you start, which points to racecraft and composure being assets."
          : "You are usually giving spots back, which suggests the journal should focus on starts, incidents, and pace drop-off.";
      cards.push({
        title: `Average race delta: ${formatDelta(averageDelta)} places`,
        body: trend
      });
    }

    const penaltyHeavy = dailyRaces.filter((entry) => Number(entry.penalties) > 0).length;
    if (penaltyHeavy) {
      cards.push({
        title: `${penaltyHeavy} race${penaltyHeavy > 1 ? "s" : ""} included penalties`,
        body: "Worth tagging whether those came from overdriving, contact, or track-limit mistakes so future analysis can separate aggression from execution."
      });
    }
  }

  if (timeTrials.length) {
    const bestEntry = [...timeTrials].sort(
      (a, b) => lapTimeToMs(a.bestLapInput) - lapTimeToMs(b.bestLapInput)
    )[0];

    if (bestEntry && bestEntry.bestLapInput) {
      cards.push({
        title: `Fastest time trial is ${bestEntry.bestLapInput}`,
        body: `${bestEntry.track} in the ${bestEntry.car}. If you log sector-specific notes here, this becomes a strong benchmark combo for future coaching prompts.`
      });
    }
  }

  const lowConfidence = sessions.filter((entry) => Number(entry.confidence) <= 2).length;
  if (lowConfidence) {
    cards.push({
      title: `${lowConfidence} session${lowConfidence > 1 ? "s" : ""} felt low-confidence`,
      body: "That is useful data, not bad data. Confidence trends often reveal whether mistakes start before the incident itself, especially on familiar tracks."
    });
  }

  patternList.innerHTML = cards
    .slice(0, 4)
    .map(
      (card) => `
        <article class="pattern-card">
          <strong>${escapeHtml(card.title)}</strong>
          <p>${escapeHtml(card.body)}</p>
        </article>
      `
    )
    .join("");
}

function updateSummaryStats(sessions) {
  sessionCount.textContent = String(sessions.length);

  const bestTimeTrial = [...sessions]
    .filter((entry) => entry.sessionType === "Time Trial" && entry.bestLapInput)
    .sort((a, b) => lapTimeToMs(a.bestLapInput) - lapTimeToMs(b.bestLapInput))[0];

  if (bestTimeTrial) {
    bestLap.textContent = bestTimeTrial.bestLapInput;
    bestLapMeta.textContent = `${bestTimeTrial.track} • ${bestTimeTrial.car}`;
  } else {
    bestLap.textContent = "--";
    bestLapMeta.textContent = "Log a time trial to populate this";
  }

  const dailyRaces = sessions.filter(
    (entry) =>
      entry.sessionType === "Daily Race" &&
      Number(entry.startPosition) &&
      Number(entry.finishPosition)
  );

  if (dailyRaces.length) {
    const averageDelta =
      dailyRaces.reduce(
        (sum, entry) => sum + (Number(entry.startPosition) - Number(entry.finishPosition)),
        0
      ) / dailyRaces.length;
    finishDelta.textContent = formatDelta(averageDelta);
    finishDeltaMeta.textContent =
      averageDelta > 0
        ? "Positive means you finish ahead of grid spot"
        : "Negative means you tend to lose spots";
  } else {
    finishDelta.textContent = "--";
    finishDeltaMeta.textContent = "Needs Daily Race entries";
  }
}

function renderTimeline(sessions) {
  if (!sessions.length) {
    sessionTimeline.innerHTML = `
      <div class="timeline-empty">
        No sessions saved yet. The goal for v1 is simple: make it easy enough to jot down one honest
        recap after each race so future analysis has something real to work with.
      </div>
    `;
    return;
  }

  sessionTimeline.innerHTML = sessions
    .map(
      (entry) => {
        const eventLabel = entry.eventLabel
          ? `<span class="timeline-chip">${escapeHtml(entry.eventLabel)}</span>`
          : "";

        return `
        <article class="timeline-card">
          <div class="timeline-header">
            <div>
              <div class="timeline-title-row">
                <strong class="timeline-title">${escapeHtml(entry.track)}</strong>
                <span class="timeline-chip">${escapeHtml(entry.sessionType)}</span>
                ${eventLabel}
              </div>
              <p class="timeline-meta">${escapeHtml(entry.sessionDate)} • ${escapeHtml(entry.car)}</p>
            </div>
            <div class="timeline-chip">Confidence ${escapeHtml(entry.confidence)}/5</div>
          </div>
          <div class="timeline-meta-grid">
            <span>Best lap<strong>${escapeHtml(entry.bestLapInput || "--")}</strong></span>
            <span>Start<strong>${escapeHtml(entry.startPosition || "--")}</strong></span>
            <span>Finish<strong>${escapeHtml(entry.finishPosition || "--")}</strong></span>
            <span>Penalties<strong>${escapeHtml(entry.penalties || 0)}</strong></span>
            <span>DR<strong>${escapeHtml(normalizeRatingDirection(entry.drChange))}</strong></span>
            <span>SR<strong>${escapeHtml(normalizeRatingDirection(entry.srChange))}</strong></span>
          </div>
          <p class="timeline-note"><strong>Cost time:</strong> ${escapeHtml(entry.mistakeNote || "No note logged.")}</p>
          <p class="timeline-note"><strong>Felt good:</strong> ${escapeHtml(entry.positiveNote || "No note logged.")}</p>
          <p class="timeline-note"><strong>Recap:</strong> ${escapeHtml(entry.summary || "No summary logged.")}</p>
        </article>
      `;
      }
    )
    .join("");
}

function renderAll() {
  const sessions = loadSessions().sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));
  updateSummaryStats(sessions);
  createPatternCards(sessions);
  renderTimeline(sessions);
}

function normalizeNumber(value) {
  return value === "" ? "" : Number(value);
}

function normalizeRatingDirection(value) {
  if (value === "Up" || value === "Down" || value === "Flat") return value;
  if (typeof value === "number") {
    if (value > 0) return "Up";
    if (value < 0) return "Down";
  }
  return "Flat";
}

function saveFormEntry(event) {
  event.preventDefault();
  const formData = new FormData(form);

  const entry = {
    id: crypto.randomUUID(),
    sessionType: formData.get("sessionType"),
    eventLabel: String(formData.get("eventLabel") || "").trim(),
    track: formData.get("track"),
    car: formData.get("car"),
    sessionDate: formData.get("sessionDate"),
    bestLapInput: String(formData.get("bestLapInput") || "").trim(),
    startPosition: normalizeNumber(formData.get("startPosition")),
    finishPosition: normalizeNumber(formData.get("finishPosition")),
    drChange: normalizeRatingDirection(formData.get("drChange")),
    srChange: normalizeRatingDirection(formData.get("srChange")),
    penalties: normalizeNumber(formData.get("penalties")) || 0,
    confidence: Number(formData.get("confidence")),
    mistakeNote: String(formData.get("mistakeNote") || "").trim(),
    positiveNote: String(formData.get("positiveNote") || "").trim(),
    summary: String(formData.get("summary") || "").trim()
  };

  if (entry.sessionType !== "Daily Race") {
    entry.startPosition = "";
    entry.finishPosition = "";
    entry.drChange = "Flat";
    entry.srChange = "Flat";
    entry.penalties = 0;
  }

  if (!entry.sessionDate) {
    formStatus.textContent = "Add a date so sessions sort correctly.";
    return;
  }

  if (!entry.track || !entry.car) {
    formStatus.textContent = "Track and car are required.";
    return;
  }

  const sessions = loadSessions();
  sessions.push(entry);
  saveSessions(sessions);
  form.reset();
  sessionDateInput.value = new Date().toISOString().split("T")[0];
  form.querySelector("#confidence").value = "3";
  sessionTypeSelect.value = "Daily Race";
  syncSessionTypeUI();
  handleReferenceInput();
  formStatus.textContent = "Session saved. Good enough beats trying to remember it later.";
  renderAll();
}

function seedDemoData() {
  const existing = loadSessions();
  if (existing.length) {
    formStatus.textContent = "Demo data skipped because sessions already exist.";
    return;
  }

  saveSessions(demoSessions);
  formStatus.textContent = "Demo sessions loaded.";
  renderAll();
}

async function copyJournal() {
  const sessions = loadSessions();
  if (!sessions.length) {
    exportStatus.textContent = "Nothing to export yet.";
    return;
  }

  const json = getExportJson();

  try {
    await navigator.clipboard.writeText(json);
    exportStatus.textContent = "Journal JSON copied to clipboard.";
  } catch (error) {
    console.error("Clipboard failed", error);
    exportStatus.textContent = "Clipboard is blocked in this browser.";
  }
}

function downloadJournal() {
  const sessions = loadSessions();
  if (!sessions.length) {
    exportStatus.textContent = "Nothing to export yet.";
    return;
  }

  const blob = new Blob([getExportJson()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = journalFileName();
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  exportStatus.textContent = "JSON file download started.";
}

async function shareJournal() {
  const sessions = loadSessions();
  if (!sessions.length) {
    exportStatus.textContent = "Nothing to export yet.";
    return;
  }

  const json = getExportJson();
  const file = new File([json], journalFileName(), { type: "application/json" });

  try {
    if (navigator.share) {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Grid Notes export",
          text: "Gran Turismo 7 journal export",
          files: [file]
        });
        exportStatus.textContent = "Share sheet opened.";
        return;
      }

      await navigator.share({
        title: "Grid Notes export",
        text: json
      });
      exportStatus.textContent = "Share sheet opened.";
      return;
    }
  } catch (error) {
    console.error("Native share failed", error);
  }

  downloadJournal();
}

function syncSessionTypeUI() {
  const isRace = sessionTypeSelect.value === "Daily Race";
  raceDetails.hidden = !isRace;
  if (!isRace) {
    raceDetails.removeAttribute("open");
  } else {
    raceDetails.setAttribute("open", "");
  }
}

function appendTagToField(targetId, tag) {
  const field = document.getElementById(targetId);
  if (!field) return;

  const current = field.value.trim();
  field.value = current ? `${current}; ${tag}` : tag;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.focus();
}

function normalizeImportedEntry(entry, index) {
  if (!entry || typeof entry !== "object") {
    throw new Error(`Entry ${index + 1} is not an object.`);
  }

  if (!entry.sessionType || !entry.track || !entry.car || !entry.sessionDate) {
    throw new Error(`Entry ${index + 1} is missing required fields.`);
  }

  return {
    id: typeof entry.id === "string" && entry.id ? entry.id : crypto.randomUUID(),
    sessionType: String(entry.sessionType),
    eventLabel: String(entry.eventLabel || "").trim(),
    track: String(entry.track),
    car: String(entry.car),
    sessionDate: String(entry.sessionDate),
    bestLapInput: String(entry.bestLapInput || "").trim(),
    startPosition: entry.startPosition === "" ? "" : Number(entry.startPosition || ""),
    finishPosition: entry.finishPosition === "" ? "" : Number(entry.finishPosition || ""),
    drChange: normalizeRatingDirection(entry.drChange),
    srChange: normalizeRatingDirection(entry.srChange),
    penalties: entry.penalties === "" ? 0 : Number(entry.penalties || 0),
    confidence: Number(entry.confidence || 3),
    mistakeNote: String(entry.mistakeNote || "").trim(),
    positiveNote: String(entry.positiveNote || "").trim(),
    summary: String(entry.summary || "").trim()
  };
}

function handleImportFile(event) {
  const [file] = event.target.files || [];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || "[]"));
      if (!Array.isArray(parsed)) {
        throw new Error("Import file must contain a JSON array.");
      }

      const importedSessions = parsed.map((entry, index) => normalizeImportedEntry(entry, index));
      saveSessions(importedSessions);
      renderAll();
      exportStatus.textContent = `Imported ${importedSessions.length} session${importedSessions.length === 1 ? "" : "s"}.`;
    } catch (error) {
      console.error("Import failed", error);
      exportStatus.textContent = error instanceof Error ? error.message : "Import failed.";
    } finally {
      importFileInput.value = "";
    }
  };
  reader.readAsText(file);
}

function initialize() {
  sessionDateInput.value = new Date().toISOString().split("T")[0];
  form.addEventListener("submit", saveFormEntry);
  seedDemoButton.addEventListener("click", seedDemoData);
  shareButton.addEventListener("click", shareJournal);
  downloadButton.addEventListener("click", downloadJournal);
  copyButton.addEventListener("click", copyJournal);
  importButton.addEventListener("click", () => importFileInput.click());
  importFileInput.addEventListener("change", handleImportFile);
  trackSelect.addEventListener("input", handleReferenceInput);
  carSelect.addEventListener("input", handleReferenceInput);
  sessionTypeSelect.addEventListener("change", syncSessionTypeUI);
  tagButtons.forEach((button) => {
    button.addEventListener("click", () =>
      appendTagToField(button.dataset.target, button.dataset.tag)
    );
  });
  loadReferenceData().then(handleReferenceInput);
  syncSessionTypeUI();
  renderAll();
}

initialize();
