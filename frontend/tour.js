/**
 * Minimal spotlight-style onboarding tour. No dependencies.
 * Exposes window.ChatbotTour with:
 *   - maybeStartPhase1(): auto-runs once, first time the app screen loads
 *   - maybeStartPhase2(): auto-runs once, first time a project is opened
 *   - replay(): manually re-run from the Help ("?") button
 */
(function () {
  const PHASE1_KEY = "tour_phase1_done";
  const PHASE2_KEY = "tour_phase2_done";

  const PHASE1_STEPS = [
    {
      selector: "#project-form",
      title: "Create an agent",
      text: "Every agent lives in a project. Name yours and hit Create to get started.",
    },
  ];

  const PHASE2_STEPS = [
    {
      selector: "#project-list",
      title: "Switch between agents",
      text: "Click any project here to jump into its chat and settings.",
    },
    {
      selector: "#prompt-form",
      title: "Give it a personality",
      text: "This is the system prompt \u2014 the instructions your agent follows on every turn. Save & Activate wires it into the conversation.",
    },
    {
      selector: "#chat-form",
      title: "Test it live",
      text: "Send a message and watch the agent reply. Everything is saved per project, so reloading keeps your history.",
    },
    {
      selector: "#upload-btn",
      title: "Attach reference files",
      text: "Optional \u2014 upload a file for this project to hold onto.",
    },
  ];

  let overlay, spot, tooltip;
  let steps = [];
  let stepIndex = 0;
  let onFinish = null;

  function buildDom() {
    overlay = document.createElement("div");
    overlay.className = "tour-overlay";

    spot = document.createElement("div");
    spot.className = "tour-spot";

    tooltip = document.createElement("div");
    tooltip.className = "tour-tooltip";

    overlay.appendChild(spot);
    overlay.appendChild(tooltip);
    document.body.appendChild(overlay);
  }

  function teardownDom() {
    window.removeEventListener("resize", positionStep);
    if (overlay) overlay.remove();
    overlay = spot = tooltip = null;
  }

  function positionStep() {
    const step = steps[stepIndex];
    const el = document.querySelector(step.selector);
    if (!el) {
      next();
      return;
    }

    const rect = el.getBoundingClientRect();
    const pad = 8;
    spot.style.top = `${rect.top - pad}px`;
    spot.style.left = `${rect.left - pad}px`;
    spot.style.width = `${rect.width + pad * 2}px`;
    spot.style.height = `${rect.height + pad * 2}px`;

    tooltip.innerHTML = `
      <div class="tour-eyebrow">STEP ${stepIndex + 1} / ${steps.length}</div>
      <h4>${step.title}</h4>
      <p>${step.text}</p>
      <div class="tour-controls">
        <button type="button" class="tour-skip">Skip</button>
        <div class="tour-controls-right">
          ${stepIndex > 0 ? '<button type="button" class="tour-back">Back</button>' : ""}
          <button type="button" class="tour-next">${stepIndex === steps.length - 1 ? "Done" : "Next"}</button>
        </div>
      </div>
    `;

    const ttHeight = 170;
    let top = rect.bottom + 16;
    if (top + ttHeight > window.innerHeight) top = Math.max(16, rect.top - ttHeight - 16);
    let left = Math.min(Math.max(16, rect.left), window.innerWidth - 320);
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;

    tooltip.querySelector(".tour-skip").onclick = finish;
    tooltip.querySelector(".tour-next").onclick = next;
    const backBtn = tooltip.querySelector(".tour-back");
    if (backBtn) backBtn.onclick = back;

    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function next() {
    if (stepIndex >= steps.length - 1) {
      finish();
      return;
    }
    stepIndex += 1;
    positionStep();
  }

  function back() {
    stepIndex = Math.max(0, stepIndex - 1);
    positionStep();
  }

  function finish() {
    teardownDom();
    if (onFinish) onFinish();
    onFinish = null;
  }

  function run(candidateSteps, doneCallback) {
    steps = candidateSteps.filter((s) => document.querySelector(s.selector));
    if (!steps.length) {
      if (doneCallback) doneCallback();
      return;
    }
    stepIndex = 0;
    onFinish = doneCallback || null;
    buildDom();
    positionStep();
    window.addEventListener("resize", positionStep);
  }

  window.ChatbotTour = {
    maybeStartPhase1() {
      if (localStorage.getItem(PHASE1_KEY)) return;
      run(PHASE1_STEPS, () => localStorage.setItem(PHASE1_KEY, "1"));
    },
    maybeStartPhase2() {
      if (localStorage.getItem(PHASE2_KEY)) return;
      run(PHASE2_STEPS, () => localStorage.setItem(PHASE2_KEY, "1"));
    },
    replay() {
      const hasProject = document.querySelector("#project-list li");
      run(hasProject ? PHASE2_STEPS : PHASE1_STEPS, null);
    },
  };
})();
