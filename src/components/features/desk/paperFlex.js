import * as THREE from "three";
import gsap from "gsap";

export function createPaperFlex(track) {
  // ---------- paper that bends ----------
  // Sheets, covers and passes flex instead of moving as rigid boards. Each keeps its meshes'
  // rest shapes and, whenever its `bend` changes, curls them along its root's x: from one edge
  // (`from`, a page on its hinge) or out both ways from the middle (`centre`, a pass held in
  // the hand). A bend of 1 lifts the far edge a quarter of `length`; negative curls it down.
  // The outline hulls bend with them, so the ink follows the paper. Meshes given here need
  // geometry split along x (see bendable) to curve smoothly.
  const bendable = (w, d, h = 0) => (h ? new THREE.BoxGeometry(w, h, d, 16, 1, 1) : new THREE.PlaneGeometry(w, d, 16, 1));
  const paperFlexes = [];
  function paperFlex(root, meshes, { from = 0, length, centre = false }) {
    root.updateMatrixWorld(true);
    const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const parts = [];
    meshes.forEach((m) => m.traverse((o) => {
      if (!o.isMesh) return;
      o.geometry = track(o.geometry.clone());
      const toRoot = new THREE.Matrix4().multiplyMatrices(rootInv, o.matrixWorld);
      parts.push({ o, base: o.geometry.attributes.position.array.slice(), toRoot, fromRoot: toRoot.clone().invert() });
    }));
    const flex = { bend: 0, applied: 0, parts, from, length, centre };
    paperFlexes.push(flex);
    return flex;
  }
  const flexV = new THREE.Vector3();
  function updatePaperFlex() {
    paperFlexes.forEach((flex) => {
      if (Math.abs(flex.bend - flex.applied) < 1e-4) return;
      flex.applied = flex.bend;
      const { from, length, centre } = flex;
      const lift = flex.bend * length * 0.25;
      flex.parts.forEach(({ o, base, toRoot, fromRoot }) => {
        const pos = o.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          flexV.fromArray(base, i * 3).applyMatrix4(toRoot);
          const t = Math.max(0, (centre ? Math.abs(flexV.x - from) : flexV.x - from) / length);
          // a curl, pulled in a touch along x so the paper doesn't stretch as it lifts
          const rise = lift * t * t;
          flexV.y += rise;
          flexV.x -= Math.sign(flexV.x - from || 1) * (rise * rise) / (length * 1.5) * t;
          flexV.applyMatrix4(fromRoot);
          pos.setXYZ(i, flexV.x, flexV.y, flexV.z);
        }
        pos.needsUpdate = true;
        o.geometry.computeVertexNormals();
        o.geometry.computeBoundingSphere();
      });
    });
  }
  // A springy flex: a quick curl to `peak`, then back through flat, overshooting a little and
  // quivering out, as paper does
  const flexTo = (flex, peak, { duration = 0.9, delay = 0, rise = 0.14 } = {}) => gsap.to(flex, {
    keyframes: [{ bend: peak, duration: rise, ease: "power2.out" }, { bend: 0, duration, ease: "elastic.out(1, 0.35)" }],
    delay,
    overwrite: true,
  });
  // The same, for paper lying among other paper: one curl one way and an easing back, never
  // swinging through flat to the other side, where it would cut into its neighbours
  const flexSettle = (flex, peak, { duration = 0.5, delay = 0, rise = 0.12 } = {}) => gsap.to(flex, {
    keyframes: [{ bend: peak, duration: rise, ease: "power2.out" }, { bend: 0, duration, ease: "sine.out" }],
    delay,
    overwrite: true,
  });

  return { bendable, paperFlex, updatePaperFlex, flexTo, flexSettle };
}
