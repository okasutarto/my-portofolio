import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

function shadowGeometry(source) {
  if (source instanceof RoundedBoxGeometry) {
    source.computeBoundingBox();
    const size = source.boundingBox.getSize(new THREE.Vector3());
    const center = source.boundingBox.getCenter(new THREE.Vector3());
    const box = new THREE.BoxGeometry(size.x, size.y, size.z);
    box.translate(center.x, center.y, center.z);
    box.deleteAttribute("normal");
    box.deleteAttribute("uv");
    return box;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", source.attributes.position);
  if (source.index) geometry.setIndex(source.index);
  else geometry.setIndex(Array.from({ length: source.attributes.position.count }, (_, i) => i));
  return geometry;
}

// One native draw for opaque, untextured toon parts, in both colour and shadow passes.
// Original meshes remain in the hierarchy for animation, outlines and ray picking (layer 2).
export function createToonBatch(scene, renderer, track) {
  if (!renderer.capabilities.isWebGL2 || !renderer.extensions.has("WEBGL_multi_draw")) return () => {};
  const entries = [];
  let gradient;
  scene.traverse((object) => {
    const m = object.material;
    if (!object.isMesh || !object.castShadow || object.isSkinnedMesh || object.isInstancedMesh ||
      !m?.isMeshToonMaterial || m.side !== THREE.FrontSide || m.shadowSide !== null || m.transparent ||
      m.opacity !== 1 || !m.depthWrite || !m.depthTest || m.vertexColors || m.map || m.emissiveMap || m.normalMap || m.bumpMap ||
      m.alphaTest || m.alphaMap || m.displacementMap || m.lightMap || m.aoMap || m.wireframe || m.flatShading ||
      object.customDepthMaterial || object.customDistanceMaterial || !object.geometry.attributes.normal || object.geometry.morphAttributes.position?.length) return;
    if (gradient !== undefined && m.gradientMap !== gradient) return;
    gradient = m.gradientMap;
    const source = object.geometry;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", source.attributes.position);
    geometry.setAttribute("normal", source.attributes.normal);
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(source.attributes.position.count * 3), 3));
    if (source.index) geometry.setIndex(source.index);
    else geometry.setIndex(Array.from({ length: source.attributes.position.count }, (_, i) => i));
    entries.push({ object, geometry, shadow: shadowGeometry(source), positionVersion: -1, normalVersion: -1, color: new THREE.Color(-1, -1, -1), matrix: new THREE.Matrix4(), visible: null });
  });
  if (!entries.length) return () => {};
  const material = track(new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: gradient, vertexColors: true }));
  const vertices = entries.reduce((n, entry) => n + entry.geometry.attributes.position.count, 0);
  const indices = entries.reduce((n, entry) => n + entry.geometry.index.count, 0);
  const batch = track(new THREE.BatchedMesh(entries.length, vertices, indices, material));
  batch.receiveShadow = true;
  batch.frustumCulled = false;
  batch.sortObjects = false;
  batch.raycast = () => {};
  const shadowMaterial = track(new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  const shadowVertices = entries.reduce((n, entry) => n + entry.shadow.attributes.position.count, 0);
  const shadowIndices = entries.reduce((n, entry) => n + entry.shadow.index.count, 0);
  const shadows = track(new THREE.BatchedMesh(entries.length, shadowVertices, shadowIndices, shadowMaterial));
  shadows.castShadow = true;
  shadows.frustumCulled = shadows.sortObjects = false;
  shadows.raycast = () => {};
  const prepareShadow = shadows.onBeforeRender;
  shadows.onBeforeShadow = (renderer, object, camera, shadowCamera, geometry, material) => {
    shadows.geometry.setDrawRange(0, Infinity);
    prepareShadow.call(shadows, renderer, null, shadowCamera, geometry, material);
  };
  shadows.onBeforeRender = () => shadows.geometry.setDrawRange(0, 0);
  entries.forEach((entry) => {
    entry.id = batch.addGeometry(entry.geometry);
    entry.shadowId = shadows.addGeometry(entry.shadow);
  });
  scene.add(batch, shadows);
  return () => {
    scene.updateMatrixWorld();
    entries.forEach((entry) => {
      const { object, geometry, id } = entry;
      const m = object.material;
      // Animated emissive surfaces use their original material for as long as they glow.
      const supported = m.isMeshToonMaterial && !m.map && !m.emissiveMap && !m.transparent && m.opacity === 1 && m.emissive.r === 0 && m.emissive.g === 0 && m.emissive.b === 0;
      object.layers.enable(2);
      if (supported) object.layers.disable(0);
      else object.layers.enable(0);
      let visible = m.visible && supported;
      for (let parent = object; parent && visible; parent = parent.parent) visible = parent.visible;
      if (visible !== entry.visible) {
        batch.setVisibleAt(id, visible);
        shadows.setVisibleAt(entry.shadowId, visible);
        entry.visible = visible;
      }
      if (!supported) return;
      if (!entry.matrix.equals(object.matrixWorld)) {
        entry.matrix.copy(object.matrixWorld);
        batch.setMatrixAt(id, entry.matrix);
        shadows.setMatrixAt(entry.shadowId, entry.matrix);
      }
      let changed = false;
      if (!entry.color.equals(m.color)) {
        entry.color.copy(m.color);
        const colors = geometry.attributes.color;
        for (let i = 0; i < colors.count; i++) colors.setXYZ(i, m.color.r, m.color.g, m.color.b);
        changed = true;
      }
      const source = object.geometry.attributes;
      if (changed || source.position.version !== entry.positionVersion || source.normal.version !== entry.normalVersion) {
        batch.setGeometryAt(id, geometry);
        if (source.position.version !== entry.positionVersion) {
          const next = shadowGeometry(object.geometry);
          shadows.setGeometryAt(entry.shadowId, next);
          entry.shadow.dispose();
          entry.shadow = next;
        }
        entry.positionVersion = source.position.version;
        entry.normalVersion = source.normal.version;
      }
    });
  };
}
