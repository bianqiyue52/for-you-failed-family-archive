import * as THREE from "three";
import { VISUAL_CONSTANTS } from "./config.js";

export function createInteractionSystem({
  renderer,
  camera,
  objects,
  soilMeshes,
  state,
  meterFill,
  wateringMeter,
  blackout,
  fragments,
  audio,
  traces,
  status
}) {
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  let activeWateringPointerId = null;
  let hasActivePointerCapture = false;

  function initInteractions() {
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerCancel);
    renderer.domElement.addEventListener("lostpointercapture", onLostPointerCapture);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);
  }

  function onPointerMove(event) {
    if (!state.archiveGateOpen) return;
    updatePointer(event);
    const hit = getHit();
    setHovered(hit?.object ?? null, event);
  }

  function onPointerDown(event) {
    if (!state.archiveGateOpen) return;
    audio.ensureAudio();
    updatePointer(event);
    const hit = getHit();
    if (!hit) return;

    const mesh = hit.object;
    if (mesh.userData.key === "wateringCan") {
      const fillStarted = beginFill(event);
      if (fillStarted) {
        status.recordInteraction("wateringCan", { waterDamaged: true, x: event.clientX, y: event.clientY });
      }
      fragments.revealFragment("wateringCan", event.clientX, event.clientY);
      return;
    }

    handleObjectClick(mesh, event);
  }

  function onPointerUp(event) {
    finishWateringHold(event, true);
  }

  function onPointerCancel(event) {
    finishWateringHold(event, true);
  }

  function onLostPointerCapture(event) {
    finishWateringHold(event, true, false);
  }

  function onPointerLeave() {
    setHovered(null);
    if (state.isFilling && !hasActivePointerCapture) {
      resetFill();
      clearActiveWateringPointer();
    }
  }

  function handleObjectClick(mesh, event) {
    const key = mesh.userData.key;
    if (key === "soil") {
      waterSoil(mesh, event);
      return;
    }

    if (key === "phone") {
      const point = { x: event.clientX, y: event.clientY };
      audio.playPhoneSequence(() => {
        applyObjectInteraction(mesh, key, point);
      });
      return;
    }

    applyObjectInteraction(mesh, key, { x: event.clientX, y: event.clientY });
  }

  function applyObjectInteraction(mesh, key, point) {
    fragments.revealFragment(key, point.x, point.y);
    status.recordInteraction(key, { x: point.x, y: point.y });
    if (key !== "phone") {
      audio.playMemorySound(key);
    }

    if (key === "phone") traces.addPhoneTrace(mesh);
    if (key === "register") traces.addRegisterTrace(mesh);
    if (key === "gardenia") traces.addGardeniaTrace(mesh);
    if (key === "tent") traces.addSheetFoldTrace(mesh);
  }

  function beginFill(event) {
    if (state.isFilling || state.wateringReady || state.blackedOut) return false;
    activeWateringPointerId = event.pointerId;
    captureWateringPointer(event);
    state.isFilling = true;
    state.fillStartedAt = performance.now();
    wateringMeter.hidden = false;
    audio.playMemorySound("watering");
    return true;
  }

  function resetFill() {
    state.isFilling = false;
    state.fillStartedAt = 0;
    audio.stopLoop("watering");
    meterFill.style.width = "0%";
    wateringMeter.hidden = true;
  }

  function completeFill() {
    state.isFilling = false;
    state.wateringReady = true;
    audio.stopLoop("watering");
    meterFill.style.width = "100%";
    setTimeout(() => {
      wateringMeter.hidden = true;
    }, 650);
    traces.addWaterReadyTrace();
    fragments.revealFragment("wateringCan", window.innerWidth * 0.72, window.innerHeight * 0.72);
  }

  function finishWateringHold(event, revealInterrupt, releaseCapture = true) {
    if (!isActiveWateringPointer(event)) return;

    if (state.isFilling) {
      const elapsed = performance.now() - state.fillStartedAt;
      if (elapsed >= VISUAL_CONSTANTS.fillDurationMs) {
        completeFill();
      } else {
        resetFill();
        status.recordLaborIncomplete({ durationMs: elapsed, x: event.clientX, y: event.clientY });
        if (revealInterrupt) {
          fragments.revealFragment("wateringCan", event.clientX, event.clientY, true);
        }
      }
    }

    if (releaseCapture) {
      releaseWateringPointer(event);
    }
    clearActiveWateringPointer();
  }

  function captureWateringPointer(event) {
    hasActivePointerCapture = false;
    if (!renderer.domElement.setPointerCapture) return;

    try {
      renderer.domElement.setPointerCapture(event.pointerId);
      hasActivePointerCapture = renderer.domElement.hasPointerCapture?.(event.pointerId) ?? true;
    } catch {
      hasActivePointerCapture = false;
    }
  }

  function releaseWateringPointer(event) {
    if (!hasActivePointerCapture || !renderer.domElement.releasePointerCapture) return;

    try {
      if (renderer.domElement.hasPointerCapture?.(event.pointerId) ?? true) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Capture may already be gone after pointercancel/lostpointercapture.
    }
  }

  function isActiveWateringPointer(event) {
    return activeWateringPointerId !== null && event.pointerId === activeWateringPointerId;
  }

  function clearActiveWateringPointer() {
    activeWateringPointerId = null;
    hasActivePointerCapture = false;
  }

  function waterSoil(mesh, event) {
    if (!state.wateringReady) {
      fragments.revealFragment("soil", event.clientX, event.clientY, true);
      audio.playArchiveReject();
      return;
    }

    const soilId = mesh.userData.soilId;
    if (state.wateredSoil.has(soilId)) return;

    state.wateredSoil.add(soilId);
    status.recordInteraction("soil", { waterDamaged: true, x: event.clientX, y: event.clientY });
    mesh.material.color.set("#1a1110");
    mesh.material.opacity = 0.98;
    traces.addSoilDarkening(mesh);
    fragments.revealFragment("soil", event.clientX, event.clientY);
    audio.playMemorySound("soil");

    if (state.wateredSoil.size === soilMeshes.length) {
      triggerBlackout();
    }
  }

  function triggerBlackout() {
    state.blackedOut = true;
    fragments.revealFragment("soil", window.innerWidth * 0.5, window.innerHeight * 0.46);
    audio.playMemorySound("blackout");
    const reportDelayMs = status.showFinalReport();
    setTimeout(() => blackout.classList.add("visible"), reportDelayMs);
  }

  function updatePointer(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  }

  function getHit() {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(objects, false);
    return hits[0] ?? null;
  }

  function setHovered(mesh, event) {
    if (state.hovered === mesh) return;
    if (state.hovered) {
      const data = state.hovered.userData;
      state.hovered.position.copy(data.basePosition);
      state.hovered.rotation.z = data.baseRotation;
      state.hovered.material.opacity = data.baseOpacity;
    }
    state.hovered = mesh;
    if (mesh?.userData.key === "wateringCan") {
      status.showWateringHint(event.clientX, event.clientY);
    }
  }

  function updateWateringProgress() {
    if (state.isFilling) {
      const progress = clamp((performance.now() - state.fillStartedAt) / VISUAL_CONSTANTS.fillDurationMs, 0, 1);
      meterFill.style.width = `${progress * 100}%`;
      if (progress >= 1) completeFill();
    }
  }

  return {
    initInteractions,
    updateWateringProgress
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
