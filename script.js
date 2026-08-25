(()  =>  {





const API_BASE = "https://mental-health-score-ipp4.onrender.com";

const form = document.getElementById("wellnessForm");
const submitBtn = document.getElementById("submitBtn");
const formError = document.getElementById("formError");

const overlay = document.getElementById("resultOverlay");
const closeResult = document.getElementById("closeResult");
const tryAgainBtn = document.getElementById("tryAgainBtn");

const gaugeFill = document.getElementById("gaugeFill");
const scoreValue = document.getElementById("scoreValue");
const resultZoneLabel = document.getElementById("resultZoneLabel");
const resultNote = document.getElementById("resultNote");

const GAUGE_LENGTH = 283; // approx path length of the semicircle arc

// Assumes the model's predicted score sits on a 0-10 scale
const ZONES = [
  { max: 3.5,  label: "At risk",   color: "var(--danger)", note: "The habits you shared point to real strain. Consider talking to someone you trust or a counselor." },
  { max: 5.5,  label: "Strained",  color: "var(--warn)",   note: "There's some imbalance here. Small changes to sleep or screen time could help." },
  { max: 7.5,  label: "Balanced",  color: "var(--primary)",note: "This is a model estimate based on the habits you shared — not a clinical assessment." },
  { max: 10.01,label: "Thriving",  color: "var(--ok)",     note: "Your habits look well-balanced. Keep it up." },
];

function zoneFor(score) {
  return ZONES.find(z => score <= z.max) || ZONES[ZONES.length - 1];
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.classList.toggle("loading", isLoading);
  submitBtn.querySelector(".submit-btn__label").textContent = isLoading
    ? "Checking..."
    : "Check my balance";
}

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function clearError() {
  formError.hidden = true;
  formError.textContent = "";
}

function buildPayload(fd) {
  return {
    age: Number(fd.get("age")),
    gender: fd.get("gender"),
    country: fd.get("country").trim(),
    academic_level: fd.get("academic_level"),
    most_used_platform: fd.get("most_used_platform"),
    purpose_of_use: fd.get("purpose_of_use"),
    avg_daily_usage_hours: Number(fd.get("avg_daily_usage_hours")),
    daily_unlocks: Number(fd.get("daily_unlocks")),
    study_hours: Number(fd.get("study_hours")),
    physical_activity_hours: Number(fd.get("physical_activity_hours")),
    sleep_hours_per_night: Number(fd.get("sleep_hours_per_night")),
    stress_level: fd.get("stress_level"),
  };
}

function showResult(score) {
  const zone = zoneFor(score);
  const clamped = Math.max(0, Math.min(10, score));
  const offset = GAUGE_LENGTH - (clamped / 10) * GAUGE_LENGTH;

  scoreValue.textContent = score.toFixed(2);
  resultZoneLabel.textContent = zone.label;
  resultNote.textContent = zone.note;
  gaugeFill.style.stroke = zone.color;

  // reset then animate on next frame
  gaugeFill.style.transition = "none";
  gaugeFill.style.strokeDashoffset = GAUGE_LENGTH;
  requestAnimationFrame(() => {
    gaugeFill.style.transition = "";
    gaugeFill.style.strokeDashoffset = offset;
  });

  overlay.hidden = false;
}

function hideResult() {
  overlay.hidden = true;
}

async function handleSubmit(e) {
  e.preventDefault();
  clearError();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const payload = buildPayload(new FormData(form));
  setLoading(true);

  try {
    const response = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let detail = `Request failed (${response.status})`;
      try {
        const errBody = await response.json();
        if (errBody?.detail) {
          detail = Array.isArray(errBody.detail)
            ? errBody.detail.map(d => d.msg || JSON.stringify(d)).join(", ")
            : String(errBody.detail);
        }
      } catch (_) { /* body wasn't JSON, keep default message */ }
      throw new Error(detail);
    }

    const data = await response.json();
    if (typeof data.predicted_mental_health_score !== "number") {
      throw new Error("Unexpected response shape from server.");
    }
    showResult(data.predicted_mental_health_score);
  } catch (err) {
    if (err instanceof TypeError) {
      showError(`Couldn't reach the server at ${API_BASE}. Is the FastAPI backend running?`);
    } else {
      showError(err.message || "Something went wrong. Please try again.");
    }
  } finally {
    setLoading(false);
  }
}

form.addEventListener("submit", handleSubmit);
closeResult.addEventListener("click", hideResult);
tryAgainBtn.addEventListener("click", hideResult);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) hideResult();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !overlay.hidden) hideResult();
 });
})();
