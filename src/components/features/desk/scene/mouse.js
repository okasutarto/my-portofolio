import * as THREE from "three";
import gsap from "gsap";
import { sfx } from "@/composables/useSfx";

export function createMouse(runtime) {
  // ---------- mouse (decor) ----------
  const mouse = new THREE.Group();
  mouse.position.set(3.75, runtime.keyboard.MAT_TOP, 0.5);
  mouse.rotation.y = -0.12;
  runtime.core.scene.add(mouse);
  const mouseBody = runtime.core.mesh(runtime.core.rbox(0.5, 0.26, 0.8, 0.13), runtime.core.toon("#ffffff"), { outline: 0.035 });
  mouseBody.position.y = 0.13;
  const seam = new THREE.Mesh(runtime.core.track(new THREE.BoxGeometry(0.02, 0.01, 0.34)), runtime.core.shadowFill);
  seam.position.set(0, 0.262, -0.2);
  const wheel = runtime.core.mesh(runtime.core.rbox(0.07, 0.06, 0.14, 0.02), runtime.core.toon("#e11d48"), { outline: 0.015, cast: false });
  wheel.position.set(0, 0.27, -0.2);
  mouse.add(mouseBody, seam, wheel);
  // It follows your real cursor over the desk, and clicks when you click.
  const MOUSE_ORIGIN = { x: 3.7, z: 0.45 };
  const mouseAim = { x: 3.75, z: 0.5 };
  const pressMouse = () => gsap.fromTo(mouseBody.position, { y: 0.09 }, { y: 0.13, duration: 0.2, ease: "back.out(3)" });
  // Click it and it turns into a real mouse for a moment: ears, eyes and a tail pop out, and it
  // scampers two laps round the clear patch of desk beside the keyboard, then goes back to work
  const earMat = runtime.core.toon("#d4d4d8");
  const critter = [];
  [-1, 1].forEach((side) => {
    const ear = runtime.core.mesh(new THREE.SphereGeometry(0.11, 14, 10), earMat, { outline: 0.015 });
    ear.scale.set(1, 1, 0.35);
    ear.position.set(side * 0.15, 0.36, -0.12);
    const inner = runtime.core.mesh(new THREE.SphereGeometry(0.065, 12, 8), runtime.core.toon("#ff90e8"), { outline: 0 });
    inner.position.z = 0.04;
    ear.add(inner);
    const eye = runtime.core.mesh(new THREE.SphereGeometry(0.035, 10, 8), runtime.core.toon("#000000"), { outline: 0 });
    eye.position.set(side * 0.1, 0.24, -0.36);
    critter.push(ear, eye);
  });
  const tailCurve = new THREE.CatmullRomCurve3([[0, 0.08, 0.38], [0, 0.06, 0.55], [0.13, 0.06, 0.66], [0.04, 0.12, 0.76], [-0.08, 0.2, 0.76]].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const tail = runtime.core.mesh(new THREE.TubeGeometry(tailCurve, 24, 0.022, 6), runtime.core.toon("#ff90e8"), { outline: 0.012 });
  critter.push(tail);
  critter.forEach((part) => {
    part.userData.scale = part.scale.clone();
    part.scale.setScalar(0.001);
    mouse.add(part);
  });
  let mouseRunning = false;
  // Two laps of an ellipse in the clear patch between the keyboard (x < 2.5), the coaster
  // (x > 4.76), the phone stand (z < -1.36) and the envelope (z > 2.18), with room for its body
  const RUN = { x: 3.63, z: 0.4, rx: 0.62, rz: 1.05 };
  const onLap = (a) => ({ x: RUN.x + Math.cos(a) * RUN.rx, z: RUN.z + Math.sin(a) * RUN.rz });
  const leg = () => ({ u: 0 });
  function scamper() {
    if (mouseRunning) return;
    mouseRunning = true;
    gsap.killTweensOf(mouse.rotation);
    runtime.secrets.discover("rat");
    critter.forEach((part, i) => gsap.to(part.scale, { ...part.userData.scale, duration: 0.3, delay: i * 0.04, ease: "back.out(3)" }));
    sfx.squeak();
    runtime.cat.catSpotsMouse();
    const start = { x: mouse.position.x, z: mouse.position.z };
    // Join the loop where it's nearest, run it twice round, and leave from the same point
    const A0 = Math.atan2((start.z - RUN.z) / RUN.rz, (start.x - RUN.x) / RUN.rx);
    const lap = onLap(A0);
    let last = { ...start };
    // Turns ease round instead of snapping, the short way round
    const place = (p) => {
      const dx = p.x - last.x;
      const dz = p.z - last.z;
      if (Math.hypot(dx, dz) > 1e-4) {
        const target = Math.atan2(-dx, -dz);
        const turn = Math.atan2(Math.sin(target - mouse.rotation.y), Math.cos(target - mouse.rotation.y));
        mouse.rotation.y += turn * 0.35;
      }
      mouse.position.x = p.x;
      mouse.position.z = p.z;
      last = p;
      wheel.rotation.x -= 0.4;
      mouseBody.position.y = 0.13 + Math.abs(Math.sin(performance.now() / 55)) * 0.03;
    };
    const [out, laps, home] = [leg(), leg(), leg()];
    gsap.timeline({
      onComplete: () => {
        mouseRunning = false;
        mouseBody.position.y = 0.13;
        mouse.rotation.y = Math.atan2(Math.sin(mouse.rotation.y), Math.cos(mouse.rotation.y));
        critter.forEach((part) => gsap.to(part.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.25, ease: "back.in(2)" }));
        gsap.to(mouse.rotation, { y: -0.12, duration: 0.4, ease: "back.out(2)" });
      },
    })
      .delay(0.35)
      .to(out, { u: 1, duration: 0.25, ease: "power1.in", onUpdate: () => place({ x: start.x + (lap.x - start.x) * out.u, z: start.z + (lap.z - start.z) * out.u }) })
      .to(laps, { u: 1, duration: 3.2, ease: "sine.inOut", onUpdate: () => place(onLap(A0 - laps.u * Math.PI * 4)) })
      .to(home, { u: 1, duration: 0.35, ease: "power2.out", onUpdate: () => place({ x: lap.x + (mouseAim.x - lap.x) * home.u, z: lap.z + (mouseAim.z - lap.z) * home.u }) });
    [0.4, 1.3, 2.2, 3.0].forEach((delay) => sfx.patter({ duration: 0.7, delay }));
    runtime.core.timers.push(setTimeout(() => sfx.squeak(), 4100));
  }
  runtime.core.register(mouse, {
    onHover: (on) => {
      if (mouseRunning) return;
      gsap.to(mouse.rotation, { y: on ? -0.28 : -0.12, duration: 0.25, ease: "power2.out", overwrite: true });
      gsap.to(wheel.rotation, { x: on ? -0.65 : 0, duration: 0.3, overwrite: true });
    },
    onClick: () => {
      sfx.click();
      scamper();
    },
  });

  // Public state used by the other scene parts.
  return {
    mouse,
    mouseAim,
    MOUSE_ORIGIN,
    pressMouse,
    get mouseRunning() { return mouseRunning; },
  };
}
