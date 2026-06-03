import * as THREE from "three";
import { ASSET_CONFIG, OBJECT_DEFINITIONS, VISUAL_CONSTANTS } from "./config.js";

export function createScene(app) {
  const loader = new THREE.TextureLoader();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#08090b");

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -20, 20);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  app.appendChild(renderer.domElement);

  const objects = [];
  const soilMeshes = [];

  function initScene() {
    resize();
    createHouse();
    OBJECT_DEFINITIONS.forEach(createInteractivePlane);
    window.addEventListener("resize", resize);
  }

  function createHouse() {
    const [floorWidth, floorHeight] = VISUAL_CONSTANTS.floorSize;
    const floor = makeImagePlane("floor", floorWidth, floorHeight);
    floor.position.set(0, 0, -0.2);
    floor.material.opacity = 0.68;
    scene.add(floor);

    const wallMaterial = new THREE.MeshBasicMaterial({
      color: "#d8cfba",
      transparent: true,
      opacity: 0.12
    });
    [
      [-2.8, 1.0, 3.3, 0.08, 0.14],
      [1.7, 1.15, 3.6, 0.08, -0.05],
      [-0.2, -1.68, 5.4, 0.08, 0.03],
      [-4.35, -0.25, 0.08, 4.8, -0.03],
      [4.2, 0.1, 0.08, 4.1, 0.08]
    ].forEach(([x, y, w, h, r]) => {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMaterial.clone());
      wall.position.set(x, y, 0.02);
      wall.rotation.z = r;
      scene.add(wall);
    });
  }

  function createInteractivePlane(definition) {
    const [width, height] = definition.size;
    const mesh = makeImagePlane(definition.asset, width, height);
    const [x, y, z] = definition.position;
    mesh.position.set(x, y, z);
    mesh.rotation.z = definition.rotation ?? 0;
    mesh.userData = {
      ...definition,
      basePosition: new THREE.Vector3(x, y, z),
      baseRotation: definition.rotation ?? 0,
      baseOpacity: mesh.material.opacity,
      hoverSeed: Math.random() * 1000
    };
    scene.add(mesh);
    objects.push(mesh);

    if (definition.key === "soil") {
      soilMeshes.push(mesh);
    }
  }

  function makeImagePlane(assetKey, width, height) {
    const geometry = new THREE.PlaneGeometry(width, height, 18, 12);
    const material = new THREE.MeshBasicMaterial({
      map: makePlaceholderTexture(assetKey),
      transparent: true,
      opacity: assetKey === "floor" ? 0.7 : 0.92
    });
    const mesh = new THREE.Mesh(geometry, material);

    const imagePath = ASSET_CONFIG.images[assetKey];
    if (imagePath) {
      loader.load(
        imagePath,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          mesh.material.map = texture;
          mesh.material.needsUpdate = true;
        },
        undefined,
        () => {
          mesh.material.map = makePlaceholderTexture(assetKey);
          mesh.material.needsUpdate = true;
        }
      );
    }

    return mesh;
  }

  function makePlaceholderTexture(assetKey) {
    const placeholder = ASSET_CONFIG.placeholders[assetKey] ?? { color: "#777777", label: assetKey };
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = placeholder.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = "#ffffff";
    for (let i = -256; i < 256; i += 32) {
      ctx.fillRect(i, 0, 10, 256);
      ctx.translate(0, 0);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.38)";
    ctx.lineWidth = 5;
    ctx.strokeRect(12, 12, 232, 232);
    ctx.fillStyle = "rgba(0,0,0,0.58)";
    ctx.font = "700 42px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(placeholder.label, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  function resize() {
    const aspect = window.innerWidth / window.innerHeight;
    const bounds = getFramedBounds();
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;
    const contentAspect = contentWidth / contentHeight;
    const viewWidth = aspect < contentAspect ? contentWidth : contentHeight * aspect;
    const viewHeight = aspect < contentAspect ? contentWidth / aspect : contentHeight;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    camera.left = centerX - viewWidth / 2;
    camera.right = centerX + viewWidth / 2;
    camera.top = centerY + viewHeight / 2;
    camera.bottom = centerY - viewHeight / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function getFramedBounds() {
    const [floorWidth, floorHeight] = VISUAL_CONSTANTS.floorSize;
    const margin = VISUAL_CONSTANTS.frameSafeMargin;
    const floorBounds = {
      minX: -floorWidth / 2,
      maxX: floorWidth / 2,
      minY: -floorHeight / 2,
      maxY: floorHeight / 2
    };
    const objectBounds = OBJECT_DEFINITIONS.reduce(
      (bounds, definition) => {
        const [x, y] = definition.position;
        const [width, height] = definition.size;
        return {
          minX: Math.min(bounds.minX, x - width / 2),
          maxX: Math.max(bounds.maxX, x + width / 2),
          minY: Math.min(bounds.minY, y - height / 2),
          maxY: Math.max(bounds.maxY, y + height / 2)
        };
      },
      floorBounds
    );

    return {
      minX: objectBounds.minX - margin,
      maxX: objectBounds.maxX + margin,
      minY: objectBounds.minY - margin,
      maxY: objectBounds.maxY + margin
    };
  }

  function updateObjectMotion(state, elapsed) {
    const failure = Math.min(state.interactionCount / 12, 1);

    objects.forEach((mesh) => {
      const data = mesh.userData;
      if (mesh === state.hovered) {
        const wobble = Math.sin(elapsed * 18 + data.hoverSeed) * (0.018 + failure * 0.016);
        mesh.position.x = data.basePosition.x + wobble + random(-0.003, 0.003) * (1 + failure);
        mesh.position.y = data.basePosition.y + Math.cos(elapsed * 13 + data.hoverSeed) * (0.014 + failure * 0.012);
        mesh.rotation.z = data.baseRotation + Math.sin(elapsed * 16) * 0.025;
        mesh.material.opacity = 0.68 + Math.sin(elapsed * 22) * 0.12;
      } else if (state.interactionCount > 4) {
        mesh.position.x = data.basePosition.x + Math.sin(elapsed * 0.9 + data.hoverSeed) * failure * 0.012;
        mesh.position.y = data.basePosition.y + Math.cos(elapsed * 1.1 + data.hoverSeed) * failure * 0.012;
      }
    });
  }

  function render() {
    renderer.render(scene, camera);
  }

  return {
    scene,
    camera,
    renderer,
    objects,
    soilMeshes,
    initScene,
    updateObjectMotion,
    render
  };
}

function random(min, max) {
  return min + Math.random() * (max - min);
}
