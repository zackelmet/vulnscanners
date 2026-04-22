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

    let animId: number;
    let arcTimer: ReturnType<typeof setInterval>;
    let disposeRenderer: (() => void) | null = null;
    let roDisconnect: (() => void) | null = null;

    (async () => {
      const THREE = await import("three");
      if (!canvasRef.current || !wrapRef.current) return;

      const canvas = canvasRef.current;
      const wrap = wrapRef.current;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

      // Grayscale earth shader
      earth.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(1.0, 64, 64),
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
        segs = 64,
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
        // 3 staggered rings per ping
        for (let wave = 0; wave < 3; wave++) {
          const mat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.0,
            side: THREE.DoubleSide,
          });
          const mesh = new THREE.Mesh(
            new THREE.RingGeometry(0.001, 0.018, 32),
            mat,
          );
          mesh.position.copy(pos);
          mesh.lookAt(pos.clone().multiplyScalar(3));
          earth.add(mesh);
          radars.push({ mesh, mat, start: performance.now() + wave * 280 });
        }
      }

      // ── Arc system ────────────────────────────────────────────────
      type ArcEntry = {
        pts: V3[];
        trail: InstanceType<typeof THREE.Line>[];
        trailMats: InstanceType<typeof THREE.LineBasicMaterial>[];
        head: InstanceType<typeof THREE.Mesh>;
        headMat: MBM;
        start: number;
        ttl: number;
        done: boolean;
        toPos: V3;
        color: number;
      };
      const liveArcs: ArcEntry[] = [];
      const TAIL = 12; // number of trail segments to keep visible
      const arcColors = [0xffffff, 0x88ccff, 0x4493f8, 0x22d3ee, 0x99aaff];

      function fireArc() {
        const a = CITIES[Math.floor(Math.random() * CITIES.length)];
        let b = CITIES[Math.floor(Math.random() * CITIES.length)];
        while (b === a) b = CITIES[Math.floor(Math.random() * CITIES.length)];

        const color = arcColors[Math.floor(Math.random() * arcColors.length)];
        const pts = buildArcPoints(a, b);
        const ttl = 2200 + Math.random() * 800;

        // Pre-build all segment Lines (only TAIL will be shown at a time)
        const trail: InstanceType<typeof THREE.Line>[] = [];
        const trailMats: InstanceType<typeof THREE.LineBasicMaterial>[] = [];

        for (let i = 0; i < pts.length - 1; i++) {
          const mat = new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity: 0,
            linewidth: 1,
          });
          const geo = new THREE.BufferGeometry().setFromPoints([
            pts[i],
            pts[i + 1],
          ]);
          const ln = new THREE.Line(geo, mat);
          earth.add(ln);
          trail.push(ln);
          trailMats.push(mat);
        }

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
          trail,
          trailMats,
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
          for (let i = 0; i < trail.length; i++) {
            earth.remove(trail[i]);
            trail[i].geometry.dispose();
            trailMats[i].dispose();
          }
          const idx = liveArcs.indexOf(entry);
          if (idx !== -1) liveArcs.splice(idx, 1);
        }, ttl + 600);
      }

      // Seed 6 arcs staggered, then maintain target density
      const TARGET = 6;
      for (let i = 0; i < TARGET; i++) setTimeout(fireArc, i * 200);
      arcTimer = setInterval(() => {
        if (liveArcs.length < TARGET) fireArc();
      }, 400);

      // ── Render loop ───────────────────────────────────────────────
      const clock = new THREE.Clock();
      function loop() {
        animId = requestAnimationFrame(loop);
        const dt = clock.getDelta();
        earth.rotation.y += dt * ((Math.PI * 2) / 55);
        earth.rotation.x = 0.18;

        const now = performance.now();

        // Animate arcs
        for (const arc of liveArcs) {
          const t = Math.min(1, (now - arc.start) / arc.ttl);
          const headIdx = Math.min(
            arc.pts.length - 1,
            Math.floor(t * (arc.pts.length - 1)),
          );
          arc.head.position.copy(arc.pts[headIdx]);
          arc.headMat.opacity = t < 0.88 ? 1 : 1 - (t - 0.88) / 0.12;

          // Show only the trailing TAIL segments behind the head
          const segCount = arc.trail.length;
          for (let i = 0; i < segCount; i++) {
            const dist = headIdx - i;
            if (dist >= 0 && dist < TAIL) {
              // Fade from bright at head to transparent at tail
              const fade = 1 - dist / TAIL;
              arc.trailMats[i].opacity =
                fade * (t < 0.88 ? 0.85 : 0.85 * (1 - (t - 0.88) / 0.12));
            } else {
              arc.trailMats[i].opacity = 0;
            }
          }

          // Radar at destination on arrival
          if (!arc.done && t >= 0.97) {
            arc.done = true;
            spawnRadar(arc.toPos, arc.color);
          }
        }

        // Animate radar rings
        for (let i = radars.length - 1; i >= 0; i--) {
          const r = radars[i];
          const age = (now - r.start) / 1100;
          if (age < 0) continue; // staggered delay not yet started
          if (age >= 1) {
            earth.remove(r.mesh);
            r.mat.dispose();
            radars.splice(i, 1);
            continue;
          }
          const s = 1 + age * 8;
          r.mesh.scale.set(s, s, s);
          r.mat.opacity = 0.7 * (1 - age);
        }

        renderer.render(scene, camera);
      }

      resize();
      loop();

      const ro = new ResizeObserver(resize);
      ro.observe(wrap);
      roDisconnect = () => ro.disconnect();
    })();

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(arcTimer);
      disposeRenderer?.();
      roDisconnect?.();
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
