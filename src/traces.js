import * as THREE from "three";

export function createTraceSystem({ scene, soilMeshes, state }) {
  function addPhoneTrace(mesh) {
    const id = `phone-${state.interactionCount}`;
    state.traces.add(id);
    addBrokenWaveform(mesh.position.x, mesh.position.y + 0.03, 1.12, "#e8e4d8", 0.68);
    addDisconnectedRoute(mesh.position.x + 0.04, mesh.position.y - 0.16, 0.72, "#991f28", 0.56);
  }

  function addRegisterTrace(mesh) {
    const red = new THREE.LineBasicMaterial({ color: "#ba1e27", transparent: true, opacity: 0.86 });
    for (let i = 0; i < 3; i += 1) {
      const y = mesh.position.y + THREE.MathUtils.randFloat(-0.28, 0.26);
      const x1 = mesh.position.x - 0.58 + THREE.MathUtils.randFloat(-0.03, 0.04);
      const x2 = mesh.position.x + 0.58 + THREE.MathUtils.randFloat(-0.04, 0.03);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x1, y, 0.9 + i * 0.002),
          new THREE.Vector3(x2, y + THREE.MathUtils.randFloat(-0.025, 0.025), 0.9 + i * 0.002)
        ]),
        red.clone()
      );
      scene.add(line);

      if (i === 1) {
        addRoughRectOutline(mesh.position.x, y, 1.08, 0.18, "#ba1e27", 0.52, 0.906);
      }
    }
  }

  function addGardeniaTrace(mesh) {
    for (let i = 0; i < 9; i += 1) {
      const marker = createNullMarker(
        THREE.MathUtils.randFloat(0.08, 0.2),
        i % 3 === 0 ? "#fbffe8" : "#e4e8cf",
        THREE.MathUtils.randFloat(0.16, 0.36)
      );
      marker.position.set(
        mesh.position.x + THREE.MathUtils.randFloat(-0.78, 0.78),
        mesh.position.y + THREE.MathUtils.randFloat(-0.68, 0.68),
        0.82 + i * 0.002
      );
      marker.rotation.z = THREE.MathUtils.randFloat(-0.35, 0.35);
      scene.add(marker);
    }
  }

  function addSheetFoldTrace(mesh) {
    for (let i = 0; i < 3; i += 1) {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(1.55 + i * 0.16, 0.14),
        new THREE.MeshBasicMaterial({
          color: i === 1 ? "#1d2025" : "#efe7d3",
          transparent: true,
          opacity: i === 1 ? 0.34 : 0.22
        })
      );
      strip.position.set(
        mesh.position.x + THREE.MathUtils.randFloat(-0.18, 0.18),
        mesh.position.y - 0.18 + i * 0.16,
        0.78 + i * 0.004
      );
      strip.rotation.z = THREE.MathUtils.randFloat(-0.09, 0.09);
      scene.add(strip);
    }
    addDashedFieldBoundary(mesh.position.x, mesh.position.y + 0.05, 1.78, 0.66, "#efe7d3", 0.34, 0.798);
  }

  function addWaterReadyTrace() {
    soilMeshes.forEach((mesh, index) => {
      addGridCellHalo(mesh.position.x, mesh.position.y, 0.95, 0.62, "#9bc8d4", 0.24, 0.74 + index * 0.002);
    });
  }

  function addSoilDarkening(mesh) {
    for (let i = 0; i < 3; i += 1) {
      const bleed = new THREE.Mesh(
        new THREE.PlaneGeometry(0.74 + i * 0.16, 0.2 + i * 0.05),
        new THREE.MeshBasicMaterial({
          color: i === 0 ? "#101719" : "#263436",
          transparent: true,
          opacity: i === 0 ? 0.46 : 0.26
        })
      );
      bleed.position.set(
        mesh.position.x + THREE.MathUtils.randFloat(-0.14, 0.14),
        mesh.position.y + THREE.MathUtils.randFloat(-0.08, 0.08),
        0.86 + i * 0.004
      );
      bleed.rotation.z = THREE.MathUtils.randFloat(-0.16, 0.16);
      scene.add(bleed);
    }

    for (let i = 0; i < 4; i += 1) {
      const y = mesh.position.y + THREE.MathUtils.randFloat(-0.22, 0.22);
      addBrokenLine(
        mesh.position.x - 0.5,
        y,
        mesh.position.x + 0.5,
        y + THREE.MathUtils.randFloat(-0.05, 0.05),
        3,
        "#0b0f10",
        0.34,
        0.88 + i * 0.002
      );
    }
  }

  function addBrokenWaveform(x, y, width, color, opacity) {
    const segmentCount = 13;
    const step = width / segmentCount;
    let segmentStart = null;
    let previous = null;
    for (let i = 0; i <= segmentCount; i += 1) {
      const px = x - width / 2 + i * step;
      const py = y + (i % 2 === 0 ? -0.07 : 0.08) + THREE.MathUtils.randFloat(-0.025, 0.025);
      const current = new THREE.Vector3(px, py, 0.95);
      const gap = i === 4 || i === 8;
      if (!segmentStart) segmentStart = current;
      if (gap && previous) {
        addLineSegment(segmentStart, previous, color, opacity);
        segmentStart = null;
      } else if (i === segmentCount && segmentStart) {
        addLineSegment(segmentStart, current, color, opacity);
      }
      previous = current;
    }
  }

  function addDisconnectedRoute(x, y, width, color, opacity) {
    const points = [
      new THREE.Vector3(x - width / 2, y, 0.956),
      new THREE.Vector3(x - width * 0.18, y + 0.08, 0.956),
      new THREE.Vector3(x - width * 0.02, y - 0.02, 0.956),
      new THREE.Vector3(x + width * 0.26, y + 0.06, 0.956),
      new THREE.Vector3(x + width / 2, y - 0.03, 0.956)
    ];
    addLineSegment(points[0], points[1], color, opacity);
    addLineSegment(points[2], points[3], color, opacity);
    addLineSegment(points[3], points[4], color, opacity * 0.72);
  }

  function addRoughRectOutline(x, y, width, height, color, opacity, z) {
    const left = x - width / 2;
    const right = x + width / 2;
    const top = y + height / 2;
    const bottom = y - height / 2;
    addBrokenLine(left, top, right, top + THREE.MathUtils.randFloat(-0.02, 0.02), 2, color, opacity, z);
    addBrokenLine(left, bottom, right, bottom + THREE.MathUtils.randFloat(-0.02, 0.02), 2, color, opacity, z);
    addBrokenLine(left, bottom, left + THREE.MathUtils.randFloat(-0.02, 0.02), top, 1, color, opacity, z);
    addBrokenLine(right, bottom, right + THREE.MathUtils.randFloat(-0.02, 0.02), top, 1, color, opacity, z);
  }

  function addDashedFieldBoundary(x, y, width, height, color, opacity, z) {
    const dashCount = 6;
    for (let i = 0; i < dashCount; i += 1) {
      const startX = x - width / 2 + (i / dashCount) * width;
      const endX = startX + width / (dashCount * 2);
      addLineSegment(
        new THREE.Vector3(startX, y + height / 2, z),
        new THREE.Vector3(endX, y + height / 2 + THREE.MathUtils.randFloat(-0.015, 0.015), z),
        color,
        opacity
      );
      addLineSegment(
        new THREE.Vector3(startX, y - height / 2, z),
        new THREE.Vector3(endX, y - height / 2 + THREE.MathUtils.randFloat(-0.015, 0.015), z),
        color,
        opacity
      );
    }
  }

  function addGridCellHalo(x, y, width, height, color, opacity, z) {
    addRoughRectOutline(x, y, width, height, color, opacity, z);
    addBrokenLine(x - width / 2, y, x + width / 2, y + THREE.MathUtils.randFloat(-0.03, 0.03), 3, color, opacity * 0.8, z + 0.002);
    addBrokenLine(x, y - height / 2, x + THREE.MathUtils.randFloat(-0.03, 0.03), y + height / 2, 2, color, opacity * 0.72, z + 0.004);
  }

  function createNullMarker(radius, color, opacity) {
    const group = new THREE.Group();
    const field = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 1.8, radius * 0.86),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
    );
    group.add(field);

    const slashMaterial = new THREE.LineBasicMaterial({ color: "#f8f2dc", transparent: true, opacity: opacity * 0.72 });
    const slash = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-radius * 0.74, -radius * 0.28, 0.01),
        new THREE.Vector3(radius * 0.74, radius * 0.3, 0.01)
      ]),
      slashMaterial
    );
    group.add(slash);
    return group;
  }

  function addBrokenLine(x1, y1, x2, y2, gaps, color, opacity, z) {
    const parts = gaps + 1;
    for (let i = 0; i < parts; i += 1) {
      if (i % 3 === 2) continue;
      const startT = i / parts + 0.025;
      const endT = (i + 0.72) / parts;
      const start = new THREE.Vector3(
        THREE.MathUtils.lerp(x1, x2, startT),
        THREE.MathUtils.lerp(y1, y2, startT) + THREE.MathUtils.randFloat(-0.012, 0.012),
        z
      );
      const end = new THREE.Vector3(
        THREE.MathUtils.lerp(x1, x2, endT),
        THREE.MathUtils.lerp(y1, y2, endT) + THREE.MathUtils.randFloat(-0.012, 0.012),
        z
      );
      addLineSegment(start, end, color, opacity);
    }
  }

  function addLineSegment(start, end, color, opacity) {
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([start, end]), material);
    scene.add(line);
  }

  return {
    addPhoneTrace,
    addRegisterTrace,
    addGardeniaTrace,
    addSheetFoldTrace,
    addWaterReadyTrace,
    addSoilDarkening
  };
}
