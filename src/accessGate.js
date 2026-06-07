const GATE_ASSETS = {
  folder: "/assets/images/gate/gate_folder_base.png",
  anchorA: "/assets/images/gate/gate_anchor_patch_b.png",
  anchorB: "/assets/images/gate/gate_anchor_classified_c.png",
  anchorC: "/assets/images/gate/gate_anchor_evidence_a.png",
  loop: "/assets/images/gate/gate_drag_loop.png"
};

const ANCHOR_POINTS = {
  a: { x: 26, y: 52 },
  b: { x: 52, y: 38 },
  c: { x: 74, y: 48 }
};

const CLOSURE_STATES = [
  {
    key: "sealed",
    activeAnchor: "c",
    wrappedAnchors: ["a", "b", "c"],
    loopRest: { x: 58, y: 74 },
    pullDirection: { x: 0.92, y: 0.38 },
    threshold: 118
  },
  {
    key: "anchor-c-released",
    activeAnchor: "b",
    wrappedAnchors: ["a", "b"],
    loopRest: { x: 67, y: 75 },
    pullDirection: { x: -0.16, y: 0.98 },
    threshold: 120
  },
  {
    key: "anchor-b-released",
    activeAnchor: "a",
    wrappedAnchors: ["a"],
    loopRest: { x: 42, y: 76 },
    pullDirection: { x: -0.88, y: 0.48 },
    threshold: 112
  },
  {
    key: "closure-failed",
    activeAnchor: null,
    wrappedAnchors: [],
    loopRest: { x: 23, y: 70 },
    pullDirection: { x: -1, y: 0 },
    threshold: 0
  }
];

const RELEASE_MESSAGES = {
  c: "EVIDENCE ANCHOR RELEASED<br>SOURCE FIELD UNSTABLE",
  b: "CLASSIFICATION TAG RELEASED<br>RELATION FIELD SPLITTING",
  a: "CLOSURE INVALID<br>FILE CANNOT REMAIN SEALED"
};

const FINAL_LINES = [
  "RELATION FILE: UNSTABLE",
  "OPENING DAMAGED RECORD",
  "ACCESS ADMITTED WITH CONFLICT"
];

export function createAccessGate({ gateLayer, state, status, audio }) {
  const drag = {
    active: false,
    pointerId: null,
    releasing: false,
    startX: 0,
    startY: 0,
    rawX: 0,
    rawY: 0
  };
  let closureState = 0;
  let machine;
  let ropePath;
  let ropeShadowPath;
  let loopHandle;
  let resizeObserver;

  function initAccessGate() {
    state.archiveGateOpen = false;
    document.documentElement.dataset.accessGate = "closed";
    renderGate();
    wireGate();
    requestAnimationFrame(() => {
      setLoopToRest();
      renderClosurePath();
    });
  }

  function renderGate() {
    gateLayer.classList.remove("dismissed");
    delete gateLayer.dataset.gatePhase;
    gateLayer.innerHTML = `
      <section class="access-gate-machine" data-gate-machine data-closure-state="0" aria-label="Failed archive access gate">
        <img class="gate-folder-base" src="${GATE_ASSETS.folder}" alt="" draggable="false" />
        <svg class="gate-rope-svg" data-rope-svg aria-hidden="true">
          <path class="gate-rope-path gate-rope-shadow" data-rope-shadow></path>
          <path class="gate-rope-path" data-rope-path></path>
        </svg>
        <svg class="gate-release-slip-svg" data-release-slip-svg aria-hidden="true">
          <path class="gate-release-slip-shadow" data-release-slip-shadow></path>
          <path class="gate-release-slip" data-release-slip></path>
        </svg>
        <img
          class="gate-anchor gate-anchor-a"
          data-gate-anchor="a"
          src="${GATE_ASSETS.anchorA}"
          alt=""
          draggable="false"
          style="--x: ${ANCHOR_POINTS.a.x}%; --y: ${ANCHOR_POINTS.a.y}%"
        />
        <img
          class="gate-anchor gate-anchor-b"
          data-gate-anchor="b"
          src="${GATE_ASSETS.anchorB}"
          alt=""
          draggable="false"
          style="--x: ${ANCHOR_POINTS.b.x}%; --y: ${ANCHOR_POINTS.b.y}%"
        />
        <img
          class="gate-anchor gate-anchor-c"
          data-gate-anchor="c"
          src="${GATE_ASSETS.anchorC}"
          alt=""
          draggable="false"
          style="--x: ${ANCHOR_POINTS.c.x}%; --y: ${ANCHOR_POINTS.c.y}%"
        />
        <img
          class="gate-drag-loop"
          data-drag-loop
          src="${GATE_ASSETS.loop}"
          alt="Archive pull loop"
          draggable="false"
          style="--loop-x: ${CLOSURE_STATES[0].loopRest.x}%; --loop-y: ${CLOSURE_STATES[0].loopRest.y}%"
        />
        <p
          class="gate-loop-hint"
          data-loop-hint
          style="--hint-x: ${CLOSURE_STATES[0].loopRest.x + 1}%; --hint-y: ${CLOSURE_STATES[0].loopRest.y + 12}%"
        >PULL TO UNSEAL</p>
        <div class="gate-consequence gate-evidence-mark" aria-hidden="true">
          <span></span>
          <span></span>
        </div>
        <div class="gate-local-trace gate-local-trace-c" aria-hidden="true">
          <span></span>
          <span></span>
        </div>
        <div class="gate-local-trace gate-local-trace-b" aria-hidden="true">
          <span></span>
          <span></span>
        </div>
        <div class="gate-local-trace gate-local-trace-a" aria-hidden="true">
          <span></span>
          <span></span>
        </div>
        <svg class="gate-consequence gate-split-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M 29 36 L 41 38 M 31 42 L 45 42 M 53 37 L 65 36 M 55 43 L 70 45 M 38 58 L 50 56 M 59 62 L 73 60"></path>
          <path d="M 35 25 C 36 31 35 35 37 40 M 42 66 C 40 72 43 77 41 83 M 66 28 C 64 35 67 41 65 47"></path>
          <path d="M 28 51 L 34 49 L 37 52 M 46 50 L 51 53 L 57 51 M 63 54 L 71 56 M 48 72 L 55 70"></path>
        </svg>
        <div class="gate-field-labels" aria-hidden="true">
          <span>FIELD 01 / CHILD</span>
          <span>FIELD 02 / PARENT</span>
          <span>FIELD 03 / GRANDPARENT</span>
          <span>FIELD 04 / UNRESOLVED</span>
        </div>
        <div class="gate-consequence gate-failure-marks" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="gate-release-message" data-gate-message aria-live="polite"></div>
        <div class="gate-frame-system" data-gate-frame-system aria-hidden="true">
          <svg class="gate-frame-division-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path class="gate-frame-line gate-frame-line-v1" d="M 31 8 L 34 33 L 30 58 L 35 92"></path>
            <path class="gate-frame-line gate-frame-line-v2" d="M 56 6 L 59 30 L 55 61 L 61 91"></path>
            <path class="gate-frame-line gate-frame-line-h1" d="M 4 42 L 25 40 L 51 44 L 91 41"></path>
            <path class="gate-frame-line gate-frame-line-h2" d="M 9 64 L 35 62 L 57 66 L 88 63"></path>
            <path class="gate-frame-line gate-frame-line-break" d="M 42 22 L 51 25 M 64 51 L 74 49 M 21 77 L 31 79"></path>
          </svg>
          <article class="gate-misfile-frame gate-frame-child">
            <strong>FRAME 01 / CHILD</strong>
            <p>AGENCY FIELD: LIMITED</p>
            <p>DECISION SOURCE: EXTERNAL</p>
            <i></i>
          </article>
          <article class="gate-misfile-frame gate-frame-parent">
            <strong>FRAME 02 / PARENT</strong>
            <p>JUSTIFICATION FIELD: FOR YOUR OWN GOOD</p>
            <p>CHILD TESTIMONY: MISSING</p>
            <i></i>
          </article>
          <article class="gate-misfile-frame gate-frame-grandparent">
            <strong>FRAME 03 / GRANDPARENT</strong>
            <p>LEGAL CATEGORY: NON-GUARDIAN</p>
            <p>CARE RECORD: UNCLASSIFIED</p>
            <i></i>
          </article>
          <article class="gate-misfile-frame gate-frame-unresolved">
            <strong>FRAME 04 / UNRESOLVED</strong>
            <p>CATEGORY ACCEPTED</p>
            <p>ERROR: CANNOT BE STORED</p>
            <i></i>
          </article>
        </div>
      </section>
      <div class="gate-frame-residual-traces" data-frame-residual-traces aria-hidden="true">
        <span class="gate-residual-label">FIELD 04 / UNRESOLVED</span>
        <span class="gate-residual-edge"></span>
        <span class="gate-residual-correction"></span>
      </div>
    `;
  }

  function wireGate() {
    machine = gateLayer.querySelector("[data-gate-machine]");
    ropePath = gateLayer.querySelector("[data-rope-path]");
    ropeShadowPath = gateLayer.querySelector("[data-rope-shadow]");
    loopHandle = gateLayer.querySelector("[data-drag-loop]");

    loopHandle.addEventListener("pointerdown", onLoopPointerDown);
    loopHandle.addEventListener("pointermove", onLoopPointerMove);
    loopHandle.addEventListener("pointerup", onLoopPointerEnd);
    loopHandle.addEventListener("pointercancel", onLoopPointerEnd);
    loopHandle.addEventListener("lostpointercapture", onLoopPointerEnd);
    machine.addEventListener("pointerdown", onMachinePointerDown);
    gateLayer.addEventListener("pointermove", onLoopPointerMove);
    gateLayer.addEventListener("pointerup", onLoopPointerEnd);
    gateLayer.addEventListener("pointercancel", onLoopPointerEnd);

    machine.querySelectorAll("img").forEach((image) => {
      image.addEventListener("load", renderClosurePath, { once: true });
    });

    resizeObserver = new ResizeObserver(() => {
      setLoopToRest();
      renderClosurePath();
    });
    resizeObserver.observe(machine);
    window.addEventListener("resize", () => {
      setLoopToRest();
      renderClosurePath();
    });
  }

  function onLoopPointerDown(event) {
    if (drag.releasing || closureState >= 3) return;
    event.stopPropagation?.();
    audio?.startGateNoise?.();

    const rect = machine.getBoundingClientRect();
    const loopPoint = getCurrentLoopPoint(rect);
    drag.active = true;
    drag.pointerId = event.pointerId;
    drag.startX = loopPoint.x;
    drag.startY = loopPoint.y;
    drag.rawX = loopPoint.x;
    drag.rawY = loopPoint.y;
    machine.dataset.dragStarted = "true";
    loopHandle.dataset.dragging = "true";

    try {
      loopHandle.setPointerCapture?.(event.pointerId);
    } catch {
      // Some synthetic or embedded pointer sources cannot be captured.
    }

    setLoopFromPointer(event.clientX, event.clientY);
  }

  function onMachinePointerDown(event) {
    if (event.target.closest?.("[data-drag-loop]")) return;
    if (!isNearLoop(event.clientX, event.clientY)) return;
    onLoopPointerDown(event);
  }

  function onLoopPointerMove(event) {
    if (!drag.active || drag.releasing || event.pointerId !== drag.pointerId) return;
    setLoopFromPointer(event.clientX, event.clientY);
    maybeReleaseCurrentAnchor();
  }

  function onLoopPointerEnd(event) {
    if (drag.pointerId !== null && event.pointerId !== drag.pointerId) return;
    if (drag.releasing) return;
    if (!drag.active) return;

    drag.active = false;
    drag.pointerId = null;
    loopHandle.dataset.dragging = "false";

    const beforeState = closureState;
    maybeReleaseCurrentAnchor();
    if (closureState !== beforeState || drag.releasing) return;

    animateLoopToRest();
  }

  function setLoopFromPointer(clientX, clientY) {
    const rect = machine.getBoundingClientRect();
    const stateConfig = CLOSURE_STATES[closureState];
    const rest = percentPoint(stateConfig.loopRest, rect);
    const raw = {
      x: clamp(clientX - rect.left, rect.width * 0.1, rect.width * 0.9),
      y: clamp(clientY - rect.top, rect.height * 0.14, rect.height * 0.9)
    };
    drag.rawX = raw.x;
    drag.rawY = raw.y;
    const resisted = {
      x: rest.x + (raw.x - rest.x) * 0.72,
      y: rest.y + (raw.y - rest.y) * 0.72
    };
    setLoopCss(resisted, rect);
    renderClosurePath(resisted);
  }

  function isNearLoop(clientX, clientY) {
    const loopRect = loopHandle.getBoundingClientRect();
    const centerX = loopRect.left + loopRect.width / 2;
    const centerY = loopRect.top + loopRect.height / 2;
    const radius = Math.max(76, loopRect.width * 0.82);
    return Math.hypot(clientX - centerX, clientY - centerY) <= radius;
  }

  function maybeReleaseCurrentAnchor() {
    const rect = machine.getBoundingClientRect();
    const stateConfig = CLOSURE_STATES[closureState];
    const rest = percentPoint(stateConfig.loopRest, rect);
    const current = {
      x: drag.rawX,
      y: drag.rawY
    };
    const vector = {
      x: current.x - rest.x,
      y: current.y - rest.y
    };
    const distance = Math.hypot(vector.x, vector.y);
    const directionScore = normalizedDot(vector, stateConfig.pullDirection);

    if (distance > stateConfig.threshold && directionScore > -0.35) {
      releaseCurrentAnchor();
    } else if (distance > stateConfig.threshold + 18) {
      releaseCurrentAnchor();
    }
  }

  function releaseCurrentAnchor() {
    if (drag.releasing || closureState >= 3) return;

    const releasedAnchor = CLOSURE_STATES[closureState].activeAnchor;
    drag.releasing = true;
    drag.active = false;
    drag.pointerId = null;
    loopHandle.dataset.dragging = "false";
    machine.dataset.releasingAnchor = releasedAnchor;
    machine.dataset.releaseTension = "true";
    machine.dataset.releaseSlip = "true";
    gateLayer.querySelector(`[data-gate-anchor='${releasedAnchor}']`).dataset.releasePulse = "true";
    renderReleaseSlip(releasedAnchor);
    showGateMessage(RELEASE_MESSAGES[releasedAnchor]);
    playReleaseSound(releasedAnchor);

    window.setTimeout(() => {
      gateLayer.querySelectorAll("[data-gate-anchor]").forEach((anchor) => {
        anchor.dataset.releasePulse = "false";
      });

      closureState += 1;
      machine.dataset.closureState = `${closureState}`;
      machine.dataset.releasingAnchor = "";
      machine.dataset.releaseTension = "false";
      machine.dataset.releaseSlip = "false";
      machine.dataset[`${releasedAnchor}Released`] = "true";

      if (closureState >= 3) {
        showFinalFailure();
        return;
      }

      animateLoopToRest({
        duration: 520,
        overshoot: releasedAnchor === "c" ? 12 : releasedAnchor === "b" ? -9 : 0,
        onComplete: () => {
          drag.releasing = false;
        }
      });
    }, 460);
  }

  function showFinalFailure() {
    drag.releasing = true;
    animateLoopToRest({
      duration: 580,
      overshoot: -18,
      onComplete: () => {
        renderClosurePath();
        showGateMessage(FINAL_LINES.join("<br>"));
        status?.recordGateClosure?.({
          x: window.innerWidth * 0.5,
          y: window.innerHeight * 0.32
        });
        playFinalSound();
        window.setTimeout(() => {
          beginFrameMisfiling();
        }, 1300);
      }
    });
  }

  function beginFrameMisfiling() {
    gateLayer.dataset.gatePhase = "frame-build";
    machine.dataset.gatePhase = "frame-build";
    window.setTimeout(() => {
      gateLayer.dataset.gatePhase = "frame-conflict";
      machine.dataset.gatePhase = "frame-conflict";
    }, 680);
    window.setTimeout(() => {
      gateLayer.dataset.gatePhase = "frame-reveal";
      machine.dataset.gatePhase = "frame-reveal";
    }, 2450);
    window.setTimeout(() => {
      state.archiveGateOpen = true;
      gateLayer.dataset.gatePhase = "frame-open";
      machine.dataset.gatePhase = "frame-open";
      document.documentElement.dataset.accessGate = "open";
      audio?.stopGateNoise?.();
      drag.releasing = false;
    }, 3500);
  }

  function animateLoopToRest(options = {}) {
    const duration = options.duration ?? 360;
    const rect = machine.getBoundingClientRect();
    const from = getCurrentLoopPoint(rect);
    const rest = percentPoint(CLOSURE_STATES[closureState].loopRest, rect);
    const to = {
      x: rest.x + (options.overshoot ?? 0),
      y: rest.y
    };
    const startedAt = performance.now();

    function frame(now) {
      const progress = clamp((now - startedAt) / duration, 0, 1);
      const eased = easeOutBack(progress);
      const point = {
        x: from.x + (to.x - from.x) * eased,
        y: from.y + (to.y - from.y) * eased
      };

      if (progress >= 1 && options.overshoot) {
        const settle = {
          x: rest.x + (to.x - rest.x) * Math.max(0, 1 - (progress - 0.8) / 0.2),
          y: rest.y
        };
        setLoopCss(settle, rect);
        renderClosurePath(settle);
      } else {
        setLoopCss(point, rect);
        renderClosurePath(point);
      }

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        setLoopCss(rest, rect);
        renderClosurePath(rest);
        options.onComplete?.();
      }
    }

    requestAnimationFrame(frame);
  }

  function renderClosurePath(loopPointOverride) {
    if (!machine || !ropePath) return;

    const rect = machine.getBoundingClientRect();
    const route = getStateRoute(rect, loopPointOverride);
    const ropePoints = sampleRoute(route, 8);
    const d = pointsToPath(ropePoints);
    machine.querySelector("[data-rope-svg]").setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
    ropePath.setAttribute("d", d);
    ropeShadowPath.setAttribute("d", d);
    updateAnchorTension(loopPointOverride);
  }

  function renderReleaseSlip(anchorKey) {
    const slip = gateLayer.querySelector("[data-release-slip]");
    const slipShadow = gateLayer.querySelector("[data-release-slip-shadow]");
    const slipSvg = gateLayer.querySelector("[data-release-slip-svg]");
    const rect = machine.getBoundingClientRect();
    const wrap = getAnchorWrap(anchorKey, rect);
    const pull = {
      c: { x: 44, y: 22 },
      b: { x: -18, y: 46 },
      a: { x: -42, y: 26 }
    }[anchorKey];
    const anchorRoute = anchorKey === "b"
      ? wrap
      : [wrap[1], wrap[2], wrap[3]];
    const route = [
      ...anchorRoute,
      offsetPoint(anchorRoute[anchorRoute.length - 1], pull.x, pull.y)
    ];
    const points = sampleRoute(route, 5);
    const d = pointsToPath(points);
    slipSvg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
    slip.setAttribute("d", d);
    slipShadow.setAttribute("d", d);
  }

  function getStateRoute(rect, loopPointOverride) {
    const stateConfig = CLOSURE_STATES[closureState];
    const route = [{ ...percentPoint({ x: 17, y: 61 }, rect), kind: "root" }];
    const wrapMap = {
      a: getAnchorWrap("a", rect),
      b: getAnchorWrap("b", rect),
      c: getAnchorWrap("c", rect)
    };

    stateConfig.wrappedAnchors.forEach((anchorKey) => {
      route.push(...wrapMap[anchorKey]);
    });

    if (closureState >= 3) {
      route.push({ ...percentPoint({ x: 28, y: 67 }, rect), kind: "loose" });
    }

    route.push(getLoopConnection(rect, loopPointOverride));
    return route;
  }

  function getAnchorWrap(key, rect) {
    const metrics = getAnchorMetrics(key, rect);
    const { center, width: w, height: h } = metrics;

    if (key === "a") {
      return [
        { ...offsetPoint(center, -w * 0.6, h * 0.24), kind: "a-entry" },
        { ...offsetPoint(center, -w * 0.18, h * 0.52), kind: "a-lower" },
        { ...offsetPoint(center, w * 0.38, h * 0.34), kind: "a-side" },
        { ...offsetPoint(center, w * 0.54, -h * 0.08), kind: "a-exit" }
      ];
    }

    if (key === "b") {
      return [
        { ...offsetPoint(center, -w * 0.56, h * 0.12), kind: "b-entry" },
        { ...offsetPoint(center, -w * 0.08, -h * 0.5), kind: "b-side" },
        { ...offsetPoint(center, w * 0.54, h * 0.08), kind: "b-exit" }
      ];
    }

    return [
      { ...offsetPoint(center, -w * 0.58, -h * 0.08), kind: "c-entry" },
      { ...offsetPoint(center, -w * 0.08, h * 0.48), kind: "c-lower" },
      { ...offsetPoint(center, w * 0.42, h * 0.34), kind: "c-side" },
      { ...offsetPoint(center, w * 0.58, h * 0.12), kind: "c-exit" }
    ];
  }

  function sampleRoute(route, pointsPerSegment) {
    const points = [];

    route.forEach((point, index) => {
      if (index === route.length - 1) {
        points.push(point);
        return;
      }

      const next = route[index + 1];
      const distance = Math.hypot(next.x - point.x, next.y - point.y);
      const steps = clamp(Math.round(distance / 13), 4, pointsPerSegment);

      for (let step = 0; step < steps; step += 1) {
        const t = step / steps;
        const base = lerpPoint(point, next, t);
        const normal = segmentNormal(point, next);
        const uneven = Math.sin(index * 1.93 + t * 4.6) * 0.75;
        const sag = Math.sin(Math.PI * t) * getSegmentSag(point, next);
        points.push({
          x: base.x + normal.x * uneven,
          y: base.y + normal.y * uneven + sag
        });
      }
    });

    return points;
  }

  function getSegmentSag(a, b) {
    const wrapSegment = a.kind?.includes("entry") || a.kind?.includes("lower") || a.kind?.includes("side");
    const freeEnd = b.kind === "loop";
    if (freeEnd) return 2.4;
    if (wrapSegment) return 0.8;
    return 3.2;
  }

  function getLoopConnection(rect, loopPointOverride) {
    const loopPoint = loopPointOverride ?? getCurrentLoopPoint(rect);
    const loopRect = loopHandle.getBoundingClientRect();
    return {
      x: loopPoint.x - loopRect.width * 0.08,
      y: loopPoint.y + loopRect.height * 0.28,
      kind: "loop"
    };
  }

  function getCurrentLoopPoint(rect) {
    const loopRect = loopHandle.getBoundingClientRect();
    return {
      x: loopRect.left + loopRect.width / 2 - rect.left,
      y: loopRect.top + loopRect.height / 2 - rect.top
    };
  }

  function setLoopToRest() {
    if (!machine || !loopHandle) return;
    const rect = machine.getBoundingClientRect();
    setLoopCss(percentPoint(CLOSURE_STATES[closureState].loopRest, rect), rect);
  }

  function setLoopCss(point, rect) {
    loopHandle.style.setProperty("--loop-x", `${(point.x / rect.width) * 100}%`);
    loopHandle.style.setProperty("--loop-y", `${(point.y / rect.height) * 100}%`);
  }

  function updateAnchorTension(loopPointOverride) {
    if (!machine) return;
    const rect = machine.getBoundingClientRect();
    const stateConfig = CLOSURE_STATES[closureState];
    const rest = percentPoint(stateConfig.loopRest, rect);
    const loopPoint = loopPointOverride ?? getCurrentLoopPoint(rect);
    const vector = {
      x: loopPoint.x - rest.x,
      y: loopPoint.y - rest.y
    };
    const tension = clamp(Math.hypot(vector.x, vector.y) / 180, 0, 1);

    ["a", "b", "c"].forEach((key) => {
      const element = gateLayer.querySelector(`[data-gate-anchor='${key}']`);
      const isActive = stateConfig.activeAnchor === key;
      const visualWeight = key === "a" ? 0.018 : key === "b" ? 0.028 : 0.04;
      const maxOffset = key === "a" ? 1.6 : key === "b" ? 2.4 : 3.2;
      const offset = isActive
        ? limitVector({ x: vector.x * visualWeight, y: vector.y * visualWeight }, maxOffset)
        : { x: 0, y: 0 };
      const rotation = isActive
        ? clamp((vector.x / 120) * tension * (key === "c" ? 1.6 : key === "b" ? 1.05 : 0.7), -2, 2)
        : 0;

      element.style.setProperty("--tension-x", `${offset.x}px`);
      element.style.setProperty("--tension-y", `${offset.y}px`);
      element.style.setProperty("--tension-rotation", `${rotation}deg`);
    });
  }

  function getAnchorMetrics(key, machineRect) {
    const element = gateLayer.querySelector(`[data-gate-anchor='${key}']`);
    const rect = element.getBoundingClientRect();
    return {
      center: percentPoint(ANCHOR_POINTS[key], machineRect),
      width: rect.width || 90,
      height: rect.height || 64
    };
  }

  function showGateMessage(html) {
    const message = gateLayer.querySelector("[data-gate-message]");
    message.innerHTML = html;
    message.dataset.visible = html ? "true" : "false";
  }

  function playReleaseSound(anchorKey) {
    if (!audio) return;
    audio.startGateNoise?.();
  }

  function playFinalSound() {
    if (!audio) return;
    audio.startGateNoise?.();
  }

  function normalizedDot(vector, direction) {
    const length = Math.max(1, Math.hypot(vector.x, vector.y));
    const directionLength = Math.max(1, Math.hypot(direction.x, direction.y));
    return (vector.x / length) * (direction.x / directionLength) + (vector.y / length) * (direction.y / directionLength);
  }

  function pointsToPath(points) {
    return points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${formatPoint(point)}`)
      .join(" ");
  }

  return {
    initAccessGate
  };
}

function offsetPoint(point, x, y) {
  return {
    x: point.x + x,
    y: point.y + y
  };
}

function percentPoint(point, rect) {
  return {
    x: (point.x / 100) * rect.width,
    y: (point.y / 100) * rect.height
  };
}

function limitVector(vector, maxLength) {
  const length = Math.hypot(vector.x, vector.y);
  if (length <= maxLength) return vector;
  return {
    x: (vector.x / length) * maxLength,
    y: (vector.y / length) * maxLength
  };
}

function lerpPoint(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t
  };
}

function segmentNormal(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  return {
    x: -dy / length,
    y: dx / length
  };
}

function easeOutBack(t) {
  const c1 = 1.35;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function formatPoint(point) {
  return `${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
