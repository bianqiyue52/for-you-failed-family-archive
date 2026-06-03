import * as THREE from "three";
import { createAccessGate } from "./accessGate.js";
import { createAudioSystem } from "./audio.js";
import { createFragmentSystem } from "./fragments.js";
import { createInteractionSystem } from "./interactions.js";
import { createScene } from "./scene.js";
import { createStatusSystem } from "./status.js";
import { createTraceSystem } from "./traces.js";

const app = document.querySelector("#app");
const gateLayer = document.querySelector("#archive-access-gate");
const fragmentLayer = document.querySelector("#fragment-layer");
const currentRecordLayer = document.querySelector("#current-record-layer");
const statusLayer = document.querySelector("#archive-status-layer");
const logLayer = document.querySelector("#archive-log-layer");
const reportLayer = document.querySelector("#archive-report-layer");
const blackout = document.querySelector("#blackout");
const wateringMeter = document.querySelector("#watering-meter");
const meterFill = document.querySelector(".meter-fill");
const classificationEls = [...document.querySelectorAll(".classification")];

const state = {
  hovered: null,
  interactionCount: 0,
  traces: new Set(),
  isFilling: false,
  fillStartedAt: 0,
  wateringReady: false,
  wateredSoil: new Set(),
  blackedOut: false,
  archiveGateOpen: false,
  audioContext: null,
  archiveDamageLevel: 0,
  archiveLog: [],
  objectAccessCounts: {
    phone: 0,
    tent: 0,
    register: 0,
    gardenia: 0,
    wateringCan: 0,
    soil: 0
  }
};

const clock = new THREE.Clock();
const sceneSystem = createScene(app);
sceneSystem.initScene();

const fragments = createFragmentSystem({ fragmentLayer, classificationEls, state });
const status = createStatusSystem({ currentRecordLayer, statusLayer, logLayer, reportLayer, state });
const audio = createAudioSystem(state);
const accessGate = createAccessGate({ gateLayer, state, status, audio });
const traces = createTraceSystem({
  scene: sceneSystem.scene,
  soilMeshes: sceneSystem.soilMeshes,
  state
});
const interactions = createInteractionSystem({
  renderer: sceneSystem.renderer,
  camera: sceneSystem.camera,
  objects: sceneSystem.objects,
  soilMeshes: sceneSystem.soilMeshes,
  state,
  meterFill,
  wateringMeter,
  blackout,
  fragments,
  audio,
  traces,
  status
});

accessGate.initAccessGate();
interactions.initInteractions();
animate();

function animate() {
  const elapsed = clock.getElapsedTime();
  sceneSystem.updateObjectMotion(state, elapsed);
  interactions.updateWateringProgress();
  sceneSystem.render();
  requestAnimationFrame(animate);
}
