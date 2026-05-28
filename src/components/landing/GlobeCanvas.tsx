"use client";

import { useEffect, useRef } from "react";

const CITIES = [
  { lat: 37.7, lon: -122.4 },
  { lat: 40.7, lon: -74.0 },
  { lat: -23.5, lon: -46.6 },
  { lat: 51.5, lon: -0.1 },
  { lat: 50.1, lon: 8.7 },
  { lat: 6.5, lon: 3.4 },
  { lat: 25.2, lon: 55.3 },
  { lat: 19.1, lon: 72.9 },
  { lat: 1.3, lon: 103.8 },
  { lat: 35.7, lon: 139.7 },
  { lat: -33.9, lon: 151.2 },
  { lat: 43.7, lon: -79.4 },
  { lat: 48.9, lon: 2.3 },
  { lat: 37.6, lon: 126.9 },
  { lat: 55.8, lon: 37.6 },
  { lat: -26.2, lon: 28.0 },
  { lat: 30.0, lon: 31.2 },
  { lat: 39.9, lon: 116.4 },
  { lat: 19.4, lon: -99.1 },
  { lat: 34.0, lon: -118.2 },
  { lat: 41.0, lon: 29.0 },
  { lat: -34.6, lon: -58.4 },
  { lat: 59.9, lon: 10.7 },
  { lat: 52.5, lon: 13.4 },
  { lat: 45.5, lon: -73.6 },
  { lat: 22.3, lon: 114.2 },
];

interface Props {
  wrapClassName?: string;
  canvasClassName?: string;
  tickerClassName?: string;
  dotClassName?: string;
}

export default function GlobeCanvas({ wrapClassName, canvasClassName }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !wrapRef.current) return;

    let animId = 0;
    let arcTimer: ReturnType<typeof setInterval> | null = null;
    let disposeRenderer: (() => void) | null = null;
    let roDisconnect: (() => void) | null = null;
    let ioDisconnect: (() => void) | null = null;
    let onVisibility: (() => void) | null = null;
    let idleHandle: number | null = null;
    let cancelled = false;

    // Run the heavy WebGL render loop only when the canvas is actually on
    // screen AND the tab is visible. Keeping the main thread idle the rest of
    // the time is what keeps Lighthouse's Total Blocking Time near zero.
    let onscreen = true;
    let pageVisible =
      typeof document === "undefined" || document.visibilityState !== "hidden";
    const isActive = () => onscreen && pageVisible && !cancelled;

    async function init() {
      const THREE = await import("three");
      if (cancelled || !canvasRef.current || !wrapRef.current) return;

      const canvas = canvasRef.current;
      const wrap = wrapRef.current;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
      // Cap device-pixel-ratio: above 1.5 the extra fragments cost a lot for
      // no visible gain on a small hero canvas.
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      disposeRenderer = () => renderer.dispose();

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.set(0, 0, 3.2);

      function resize() {
        const s = wrap.clientWidth;
        renderer.setSize(s, s, false);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
      }

      const earth = new THREE.Group();
      scene.add(earth);

      scene.add(new THREE.AmbientLight(0xffffff, 0.45));
      const key = new THREE.DirectionalLight(0xffffff, 1.1);
      key.position.set(3, 2, 2);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x8899aa, 0.3);
      fill.position.set(-2, -1, -1);
      scene.add(fill);

      const loader = new THREE.TextureLoader();
      const [dayTex, bumpTex] = await Promise.all([
        loader.loadAsync("/textures/earth-blue-marble.jpg"),
        loader.loadAsync("/textures/earth-topology.png"),
      ]);
      if (cancelled) {
        dayTex.dispose();
        bumpTex.dispose();
        renderer.dispose();
        return;
      }

      // Grayscale earth shader
      earth.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(1.0, 48, 48),
          new THREE.ShaderMaterial({
            uniforms: { map: { value: dayTex }, bumpMap: { value: bumpTex } },
            vertexShader: `
              varying vec2 vUv; varying vec3 vNormal;
              void main() {
                vUv = uv; vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
              }`,
            fragmentShader: `
              uniform sampler2D map;
              varying vec2 vUv; varying vec3 vNormal;
              void main() {
                vec4  col  = texture2D(map, vUv);
                float lum  = dot(col.rgb, vec3(0.299,0.587,0.114));
                float gray = lum * 0.55 + 0.04;
                float diff = max(0.0, dot(vNormal, normalize(vec3(1.0,0.8,0.8))));
                gray = gray * (0.55 + 0.45 * diff);
                gl_FragColor = vec4(vec3(gray), 1.0);
              }`,
          }),
        ),
      );

      // Grid overlay
      earth.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(1.004, 36, 24),
          new THREE.MeshBasicMaterial({
            color: 0x4493f8,
            wireframe: true,
            transparent: true,
            opacity: 0.055,
          }),
        ),
      );

      // Atmosphere halo
      scene.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(1.13, 48, 48),
          new THREE.ShaderMaterial({
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            uniforms: { c: { value: new THREE.Color(0x4493f8) } },
            vertexShader: `varying vec3 vN; void main() { vN = normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
            fragmentShader: `uniform vec3 c; varying vec3 vN; void main() { float i=pow(0.72-dot(vN,vec3(0,0,1)),2.6); gl_FragColor=vec4(c,1.0)*i*0.9; }`,
          }),
        ),
      );

      // ── Helpers ───────────────────────────────────────────────────
      type V3 = InstanceType<typeof THREE.Vector3>;
      type MBM = InstanceType<typeof THREE.MeshBasicMaterial>;

      function latLonToVec3(lat: number, lon: number, r: number): V3 {
        const phi = ((90 - lat) * Math.PI) / 180;
        const thet = ((lon + 180) * Math.PI) / 180;
        return new THREE.Vector3(
          -r * Math.sin(phi) * Math.cos(thet),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(thet),
        );
      }

      function buildArcPoints(
        from: { lat: number; lon: number },
        to: { lat: number; lon: number },
        segs = 48,
        alt = 0.36,
      ): V3[] {
        const vA = latLonToVec3(from.lat, from.lon, 1.0);
        const vB = latLonToVec3(to.lat, to.lon, 1.0);
        const pts: V3[] = [];
        for (let i = 0; i <= segs; i++) {
          const t = i / segs;
          const v = new THREE.Vector3().lerpVectors(vA, vB, t).normalize();
          pts.push(v.multiplyScalar(1.0 + alt * Math.sin(t * Math.PI)));
        }
        return pts;
      }

      // ── Radar rings ───────────────────────────────────────────────
      type RadarEntry = {
        mesh: InstanceType<typeof THREE.Mesh>;
        mat: MBM;
        start: number;
      };
      const radars: RadarEntry[] = [];

      function spawnRadar(pos: V3, color: number) {
        // single quiet ring per ping
        const mat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.0,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(
          new THREE.RingGeometry(0.001, 0.012, 32),
          mat,
        );
        mesh.position.copy(pos);
        mesh.lookAt(pos.clone().multiplyScalar(3));
        earth.add(mesh);
        radars.push({ mesh, mat, start: performance.now() });
      }

      // ── Arc system ────────────────────────────────────────────────
      // Each arc is ONE Line (single draw call). The "comet" trail is drawn
      // by advancing the geometry's draw range instead of allocating and
      // animating dozens of per-segment Line objects every frame.
      type ArcEntry = {
        pts: V3[];
        line: InstanceType<typeof THREE.Line>;
        lineMat: InstanceType<typeof THREE.LineBasicMaterial>;
        geom: InstanceType<typeof THREE.BufferGeometry>;
        head: InstanceType<typeof THREE.Mesh>;
        headMat: MBM;
        start: number;
        ttl: number;
        done: boolean;
        toPos: V3;
        color: number;
      };
      const liveArcs: ArcEntry[] = [];
      const TAIL = 12; // number of trailing segments kept visible behind the head
      const arcColors = [0xffffff, 0x88ccff, 0x4493f8, 0x22d3ee, 0x99aaff];

      function fireArc() {
        const a = CITIES[Math.floor(Math.random() * CITIES.length)];
        let b = CITIES[Math.floor(Math.random() * CITIES.length)];
        while (b === a) b = CITIES[Math.floor(Math.random() * CITIES.length)];

        const color = arcColors[Math.floor(Math.random() * arcColors.length)];
        const pts = buildArcPoints(a, b);
        const ttl = 2200 + Math.random() * 800;

        // One geometry + one material for the whole arc.
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        geom.setDrawRange(0, 0);
        const lineMat = new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: 0,
        });
        const line = new THREE.Line(geom, lineMat);
        earth.add(line);

        const headMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
        });
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.022, 10, 10),
          headMat,
        );
        earth.add(head);

        const fromPos = latLonToVec3(a.lat, a.lon, 1.02);
        const toPos = latLonToVec3(b.lat, b.lon, 1.02);

        // Radar at origin on departure
        spawnRadar(fromPos, color);

        const entry: ArcEntry = {
          pts,
          line,
          lineMat,
          geom,
          head,
          headMat,
          start: performance.now(),
          ttl,
          done: false,
          toPos,
          color,
        };
        liveArcs.push(entry);

        // Cleanup after arrival
        setTimeout(() => {
          earth.remove(head);
          headMat.dispose();
          (
            head.geometry as InstanceType<typeof THREE.BufferGeometry>
          ).dispose();
          earth.remove(line);
          geom.dispose();
          lineMat.dispose();
          const idx = liveArcs.indexOf(entry);
          if (idx !== -1) liveArcs.splice(idx, 1);
        }, ttl + 600);
      }

      // Seed arcs staggered, then maintain target density.
      const TARGET = 12;
      for (let i = 0; i < TARGET; i++) setTimeout(fireArc, i * 100);
      arcTimer = setInterval(() => {
        if (isActive() && liveArcs.length < TARGET) fireArc();
      }, 400);

      // ── Render loop ───────────────────────────────────────────────
      const clock = new THREE.Clock();
      function loop() {
        if (!isActive()) {
          // Stop scheduling frames while idle; resume() restarts the loop.
          animId = 0;
          return;
        }
        animId = requestAnimationFrame(loop);
        const dt = clock.getDelta();
        earth.rotation.y += dt * ((Math.PI * 2) / 55);
        earth.rotation.x = 0.18;

        const now = performance.now();

        // Animate arcs
        for (const arc of liveArcs) {
          const t = Math.min(1, (now - arc.start) / arc.ttl);
          const lastIdx = arc.pts.length - 1;
          const headIdx = Math.min(lastIdx, Math.floor(t * lastIdx));
          arc.head.position.copy(arc.pts[headIdx]);
          arc.headMat.opacity = t < 0.88 ? 1 : 1 - (t - 0.88) / 0.12;

          // Reveal only the trailing TAIL segments behind the head via the
          // geometry draw range — one cheap call instead of per-segment work.
          const startIdx = Math.max(0, headIdx - TAIL);
          arc.geom.setDrawRange(startIdx, headIdx - startIdx + 1);
          arc.lineMat.opacity =
            t < 0.88 ? 0.85 : 0.85 * (1 - (t - 0.88) / 0.12);

          // Radar at destination on arrival
          if (!arc.done && t >= 0.97) {
            arc.done = true;
            spawnRadar(arc.toPos, arc.color);
          }
        }

        // Animate radar rings
        for (let i = radars.length - 1; i >= 0; i--) {
          const r = radars[i];
          const age = (now - r.start) / 1400;
          if (age < 0) continue; // staggered delay not yet started
          if (age >= 1) {
            earth.remove(r.mesh);
            r.mat.dispose();
            (
              r.mesh.geometry as InstanceType<typeof THREE.BufferGeometry>
            ).dispose();
            radars.splice(i, 1);
            continue;
          }
          const s = 1 + age * 5;
          r.mesh.scale.set(s, s, s);
          r.mat.opacity = 0.35 * (1 - age);
        }

        renderer.render(scene, camera);
      }

      function resume() {
        if (animId === 0 && isActive()) {
          clock.getDelta(); // discard the idle gap so rotation doesn't jump
          loop();
        }
      }

      resize();
      resume();

      const ro = new ResizeObserver(resize);
      ro.observe(wrap);
      roDisconnect = () => ro.disconnect();

      // Pause/resume on tab visibility.
      onVisibility = () => {
        pageVisible = document.visibilityState !== "hidden";
        resume();
      };
      document.addEventListener("visibilitychange", onVisibility);

      // Pause/resume as the hero scrolls in and out of view.
      const io = new IntersectionObserver(
        (entries) => {
          onscreen = entries[0]?.isIntersecting ?? true;
          resume();
        },
        { threshold: 0.01 },
      );
      io.observe(wrap);
      ioDisconnect = () => io.disconnect();
    }

    // Defer the (heavy) Three.js import + scene build until the main thread is
    // idle so it never competes with hydration / first interaction.
    const ric = (
      window as unknown as {
        requestIdleCallback?: (
          cb: () => void,
          opts?: { timeout: number },
        ) => number;
      }
    ).requestIdleCallback;
    if (ric) {
      idleHandle = ric(
        () => {
          if (!cancelled) init();
        },
        { timeout: 2000 },
      );
    } else {
      idleHandle = window.setTimeout(() => {
        if (!cancelled) init();
      }, 200) as unknown as number;
    }

    return () => {
      cancelled = true;
      if (idleHandle != null) {
        const cic = (
          window as unknown as {
            cancelIdleCallback?: (h: number) => void;
          }
        ).cancelIdleCallback;
        if (ric && cic) cic(idleHandle);
        else clearTimeout(idleHandle);
      }
      if (animId) cancelAnimationFrame(animId);
      if (arcTimer) clearInterval(arcTimer);
      if (onVisibility)
        document.removeEventListener("visibilitychange", onVisibility);
      disposeRenderer?.();
      roDisconnect?.();
      ioDisconnect?.();
    };
  }, []);

  return (
    <div ref={wrapRef} className={wrapClassName}>
      <div
        style={{
          position: "absolute",
          inset: "-10%",
          background:
            "radial-gradient(circle at 50% 50%, rgba(3,102,214,0.18), transparent 58%)",
          filter: "blur(8px)",
          pointerEvents: "none",
          borderRadius: "50%",
        }}
      />
      <canvas ref={canvasRef} className={canvasClassName} />
    </div>
  );
}
