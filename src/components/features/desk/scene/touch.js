import * as THREE from "three";
import gsap from "gsap";

export function createTouch(runtime) {
  // ---------- pinch to look closer ----------
  // Two fingers zoom about the point between them and pan as they move together; once zoomed,
  // one finger drags the overview around, and before that it turns the diorama. These run before the handlers above and keep a
  // pinch's fingers from also tapping, dragging or sailing anything.
  const touches = new Map();
  let pinch = null;
  let pan = null;
  // A finger's offset from the canvas centre, up positive, in world units at the current zoom
  function touchSpan() {
    const [a, b] = [...touches.values()];
    const rect = runtime.core.renderer.domElement.getBoundingClientRect();
    const unitsPerPixel = runtime.animation.viewH / (runtime.camera.cam.zoom * runtime.camera.userView.zoom) / rect.height;
    return {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      mx: ((a.x + b.x) / 2 - rect.left - rect.width / 2) * unitsPerPixel,
      my: -((a.y + b.y) / 2 - rect.top - rect.height / 2) * unitsPerPixel,
    };
  }
  const onTouchDown = (e) => {
    if (e.pointerType === "touch") touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) {
      // The first finger's tap or drag is called off: this is a pinch now
      const [first] = touches.keys();
      runtime.pointer.onPointerCancel({ pointerId: first });
      runtime.pointer.downAt = null;
      pan = null;
      gsap.killTweensOf(runtime.camera.userView);
      pinch = touchSpan();
      e.stopImmediatePropagation();
    } else if (touches.size > 2) e.stopImmediatePropagation();
    else if (runtime.camera.focus.name === "overview" && e.button === 0 && (runtime.camera.userView.zoom > 1.01 || runtime.room.diorama)) {
      // One finger (or the mouse) sweeps the view: pans it once zoomed, else turns the diorama
      pan = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    }
  };
  const onTouchMove = (e) => {
    if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && touches.size === 2 && touches.has(e.pointerId)) {
      // The world point between the fingers stays between them as they spread and move
      const now = touchSpan();
      const scale = pinch.dist > 0 ? now.dist / pinch.dist : 1;
      const before = runtime.camera.userView.zoom;
      runtime.camera.userView.zoom = THREE.MathUtils.clamp(before * scale, 1, runtime.camera.USER_ZOOM_MAX);
      const k = before / runtime.camera.userView.zoom;
      runtime.camera.userView.x += pinch.mx - now.mx * k;
      runtime.camera.userView.y += pinch.my - now.my * k;
      runtime.camera.clampUserView();
      pinch = touchSpan();
      runtime.core.responsiveUntil = performance.now() + 2000;
      e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }
    if (pan?.pointerId === e.pointerId && !(runtime.pointer.chairDrag || runtime.pointer.hatDrag || runtime.pointer.lanyardDrag || runtime.aboutBoard.noteDrag || runtime.pointer.stickyDrag)) {
      if (!pan.moved && Math.hypot(e.clientX - pan.x, e.clientY - pan.y) < 8) return;
      pan.moved = true;
      if (runtime.camera.userView.zoom > 1.01) {
        const unitsPerPixel = runtime.animation.viewH / (runtime.camera.cam.zoom * runtime.camera.userView.zoom) / runtime.core.renderer.domElement.clientHeight;
        runtime.camera.userView.x -= (e.clientX - pan.x) * unitsPerPixel;
        runtime.camera.userView.y += (e.clientY - pan.y) * unitsPerPixel;
        runtime.camera.clampUserView();
      } else {
        runtime.camera.dioramaYaw = THREE.MathUtils.clamp(runtime.camera.dioramaYaw - (e.clientX - pan.x) * 0.006, runtime.camera.DIORAMA_YAW[0], runtime.camera.DIORAMA_YAW[1]);
        runtime.camera.applyShot(true);
      }
      Object.assign(pan, { x: e.clientX, y: e.clientY });
      runtime.core.responsiveUntil = performance.now() + 2000;
      e.stopImmediatePropagation();
    }
  };
  const onTouchUp = (e) => {
    if (pan?.pointerId === e.pointerId) {
      if (pan.moved) runtime.pointer.downAt = null;
      pan = null;
    }
    if (!touches.delete(e.pointerId) || !pinch) return;
    // A pinch ends only when every finger is off; the one left behind taps nothing
    if (!touches.size) pinch = null;
    e.stopImmediatePropagation();
  };
  ["pointerdown", onTouchDown, "pointermove", onTouchMove, "pointerup", onTouchUp, "pointercancel", onTouchUp].forEach((v, i, a) => {
    if (i % 2 === 0) runtime.core.renderer.domElement.addEventListener(v, a[i + 1], { capture: true });
  });
  // A trackpad pinch arrives as a wheel with Ctrl held: the same zoom, about the pointer
  const onPinchWheel = (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const rect = runtime.core.renderer.domElement.getBoundingClientRect();
    const unitsPerPixel = runtime.animation.viewH / (runtime.camera.cam.zoom * runtime.camera.userView.zoom) / rect.height;
    const mx = (e.clientX - rect.left - rect.width / 2) * unitsPerPixel;
    const my = -(e.clientY - rect.top - rect.height / 2) * unitsPerPixel;
    const before = runtime.camera.userView.zoom;
    gsap.killTweensOf(runtime.camera.userView);
    runtime.camera.userView.zoom = THREE.MathUtils.clamp(before * Math.exp(-e.deltaY * 0.01), 1, runtime.camera.USER_ZOOM_MAX);
    const k = before / runtime.camera.userView.zoom;
    runtime.camera.userView.x += mx - mx * k;
    runtime.camera.userView.y += my - my * k;
    runtime.camera.clampUserView();
    runtime.core.responsiveUntil = performance.now() + 2000;
  };
  runtime.core.renderer.domElement.addEventListener("wheel", onPinchWheel, { capture: true, passive: false });

  runtime.core.renderer.domElement.addEventListener("pointermove", runtime.pointer.onPointerMove);
  runtime.core.renderer.domElement.addEventListener("pointerdown", runtime.pointer.onPointerDown);
  runtime.core.renderer.domElement.addEventListener("pointerup", runtime.pointer.onPointerUp);
  runtime.core.renderer.domElement.addEventListener("pointerleave", runtime.pointer.onPointerLeave);
  runtime.core.renderer.domElement.addEventListener("pointercancel", runtime.pointer.onPointerCancel);
  runtime.core.renderer.domElement.addEventListener("lostpointercapture", runtime.pointer.onPointerCancel);
  window.addEventListener("blur", runtime.pointer.onWindowBlur);

  // Public state used by the other scene parts.
  return {
    onPinchWheel,
    onTouchDown,
    onTouchMove,
    onTouchUp,
  };
}
