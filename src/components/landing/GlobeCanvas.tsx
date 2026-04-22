"use client";

import { useEffect, useRef, useState } from "react";

const CITIES = [
  { n: "San Francisco", lat: 37.7, lon: -122.4 },
  { n: "New York", lat: 40.7, lon: -74.0 },
  { n: "São Paulo", lat: -23.5, lon: -46.6 },
  { n: "London", lat: 51.5, lon: -0.1 },
  { n: "Frankfurt", lat: 50.1, lon: 8.7 },
  { n: "Lagos", lat: 6.5, lon: 3.4 },
  { n: "Dubai", lat: 25.2, lon: 55.3 },
  { n: "Mumbai", lat: 19.1, lon: 72.9 },
  { n: "Singapore", lat: 1.3, lon: 103.8 },
  { n: "Tokyo", lat: 35.7, lon: 139.7 },
  { n: "Sydney", lat: -33.9, lon: 151.2 },
  { n: "Toronto", lat: 43.7, lon: -79.4 },
  { n: "Paris", lat: 48.9, lon: 2.3 },
  { n: "Seoul", lat: 37.6, lon: 126.9 },
];

interface Props {
  wrapClassName?: string;
  canvasClassName?: string;
  tickerClassName?: string;
  dotClassName?: string;
}

function latLonToVec3(
  THREE: typeof import("three"),
  lat: number,
  lon: number,
  r: number,
) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const thet = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(thet),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(thet),
  );
}

export default function GlobeCanvas({
  wrapClassName,
  canvasClassName,
  tickerClassName,
  dotClassName,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [ticker, setTicker] = useState(
    "scanning · San Francisco → Tokyo · London → Singapore",
  );

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

      // ── Renderer ──────────────────────────────────────────────────
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

      // ── Earth group ───────────────────────────────────────────────
      const earth = new THREE.Group();
      scene.add(earth);

      // Lighting
      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      const key = new THREE.DirectionalLight(0xfff0e0, 1.35);
      key.position.set(3, 2, 2);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x3060a0, 0.25);
      fill.position.set(-2, -1, -1);
      scene.add(fill);

      // ── Texture load ──────────────────────────────────────────────
      const loader = new THREE.TextureLoader();
      const [dayTex, bumpTex] = await Promise.all([
        loader.loadAsync("/textures/earth-blue-marble.jpg"),
        loader.loadAsync("/textures/earth-topology.png"),
      ]);

      earth.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(1.0, 64, 64),
          new THREE.MeshPhongMaterial({
            map: dayTex,
            bumpMap: bumpTex,
            bumpScale: 0.06,
            specular: new THREE.Color(0x224466),
            shininess: 14,
          }),
        ),
      );

      // Subtle grid overlay
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
          new THREE.SphereGeometry(1.14, 48, 48),
          new THREE.ShaderMaterial({
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            uniforms: { c: { value: new THREE.Color(0x2a88ff) } },
            vertexShader: `
              varying vec3 vN;
              void main() {
                vN = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
              }`,
            fragmentShader: `
              uniform vec3 c;
              varying vec3 vN;
              void main() {
                float i = pow(0.72 - dot(vN, vec3(0.0,0.0,1.0)), 2.6);
                gl_FragColor = vec4(c,1.0) * i * 0.85;
              }`,
          }),
        ),
      );

      // ── Scan-arc system ───────────────────────────────────────────
      type V3 = InstanceType<typeof THREE.Vector3>;
      type Mat = InstanceType<typeof THREE.MeshBasicMaterial>;
      type ArcEntry = {
        head: InstanceType<typeof THREE.Mesh>;
        pts: V3[];
        start: number;
        ttl: number;
      };
      const liveArcs: ArcEntry[] = [];
      const arcColors = [0x4493f8, 0x22d3ee, 0xa78bfa, 0x34d399];

      function buildArcPoints(
        from: { lat: number; lon: number },
        to: { lat: number; lon: number },
        segs = 64,
        alt = 0.36,
      ): V3[] {
        const vFrom = latLonToVec3(THREE, from.lat, from.lon, 1.0);
        const vTo = latLonToVec3(THREE, to.lat, to.lon, 1.0);
        const pts: V3[] = [];
        for (let i = 0; i <= segs; i++) {
          const t = i / segs;
          const v = new THREE.Vector3().lerpVectors(vFrom, vTo, t).normalize();
          pts.push(v.multiplyScalar(1.0 + alt * Math.sin(t * Math.PI)));
        }
        return pts;
      }

      function fireArc() {
        const a = CITIES[Math.floor(Math.random() * CITIES.length)];
        let b = CITIES[Math.floor(Math.random() * CITIES.length)];
        while (b === a) b = CITIES[Math.floor(Math.random() * CITIES.length)];

        const color = arcColors[Math.floor(Math.random() * arcColors.length)];
        const pts = buildArcPoints(a, b);

        // Faint full-arc trail
        const trailGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const trailMat = new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: 0.2,
        });
        const trail = new THREE.Line(trailGeo, trailMat);
        earth.add(trail);

        // Bright moving head
        const headMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
        });
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.018, 10, 10),
          headMat,
        );
        earth.add(head);

        // Origin pulse dot (red — "target being scanned")
        const originMat = new THREE.MeshBasicMaterial({
          color: 0xff4455,
          transparent: true,
          opacity: 0.9,
        });
        const origin = new THREE.Mesh(
          new THREE.SphereGeometry(0.016, 10, 10),
          originMat,
        );
        origin.position.copy(latLonToVec3(THREE, a.lat, a.lon, 1.02));
        earth.add(origin);

        const entry: ArcEntry = {
          head,
          pts,
          start: performance.now(),
          ttl: 2800,
        };
        liveArcs.push(entry);

        setTicker(`scanning · ${a.n} → ${b.n}`);

        const TTL = 3200;
        setTimeout(() => {
          earth.remove(trail);
          earth.remove(head);
          earth.remove(origin);
          trailGeo.dispose();
          trailMat.dispose();
          headMat.dispose();
          originMat.dispose();
          const idx = liveArcs.indexOf(entry);
          if (idx !== -1) liveArcs.splice(idx, 1);
        }, TTL);
      }

      arcTimer = setInterval(fireArc, 1600);
      fireArc();
      setTimeout(fireArc, 700);

      // ── Render loop ───────────────────────────────────────────────
      const clock = new THREE.Clock();
      function loop() {
        animId = requestAnimationFrame(loop);
        const dt = clock.getDelta();
        earth.rotation.y += dt * ((Math.PI * 2) / 50);
        earth.rotation.x = 0.2;

        const now = performance.now();
        for (const arc of liveArcs) {
          const t = Math.min(1, (now - arc.start) / arc.ttl);
          const idx = Math.min(
            arc.pts.length - 1,
            Math.floor(t * (arc.pts.length - 1)),
          );
          arc.head.position.copy(arc.pts[idx]);
          (arc.head.material as Mat).opacity =
            t < 0.88 ? 1 : 1 - (t - 0.88) / 0.12;
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
            "radial-gradient(circle at 50% 50%, rgba(3,102,214,0.20), transparent 58%)",
          filter: "blur(8px)",
          pointerEvents: "none",
          borderRadius: "50%",
        }}
      />
      <canvas ref={canvasRef} className={canvasClassName} />
      <div className={tickerClassName}>
        <span className={dotClassName} />
        {ticker}
      </div>
    </div>
  );
}
