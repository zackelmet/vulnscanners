'use client';

import { useEffect, useRef, useState } from 'react';

const CITIES = [
  { n: 'sfo', lat: 37.7,  lon: -122.4 },
  { n: 'nyc', lat: 40.7,  lon: -74.0  },
  { n: 'sao', lat: -23.5, lon: -46.6  },
  { n: 'lon', lat: 51.5,  lon: -0.1   },
  { n: 'fra', lat: 50.1,  lon: 8.7    },
  { n: 'lag', lat: 6.5,   lon: 3.4    },
  { n: 'dxb', lat: 25.2,  lon: 55.3   },
  { n: 'mum', lat: 19.1,  lon: 72.9   },
  { n: 'sgp', lat: 1.3,   lon: 103.8  },
  { n: 'tok', lat: 35.7,  lon: 139.7  },
  { n: 'syd', lat: -33.9, lon: 151.2  },
];

interface Props {
  wrapClassName?: string;
  canvasClassName?: string;
  tickerClassName?: string;
  dotClassName?: string;
}

export default function GlobeCanvas({ wrapClassName, canvasClassName, tickerClassName, dotClassName }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const [ticker, setTicker] = useState('scanning · sfo · nyc · fra · sgp · syd');

  useEffect(() => {
    if (!canvasRef.current || !wrapRef.current) return;

    let animId: number;
    let pingTimer: ReturnType<typeof setInterval>;
    let disposeRenderer: (() => void) | null = null;
    let roDisconnect:    (() => void) | null = null;

    (async () => {
      const THREE = await import('three');
      if (!canvasRef.current || !wrapRef.current) return;

      const canvas = canvasRef.current;
      const wrap   = wrapRef.current;

      // ── Renderer ──────────────────────────────────────────────────
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      disposeRenderer = () => renderer.dispose();

      const scene  = new THREE.Scene();
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

      scene.add(new THREE.AmbientLight(0x2a4060, 0.7));
      const key = new THREE.DirectionalLight(0x9dc3ff, 1.1);
      key.position.set(2, 1.5, 2);
      scene.add(key);

      // Base sphere
      earth.add(new THREE.Mesh(
        new THREE.SphereGeometry(1.0, 64, 64),
        new THREE.MeshPhongMaterial({
          color: 0x0a1220,
          specular: 0x223a5a,
          shininess: 18,
          emissive: 0x071220,
          emissiveIntensity: 0.35,
        })
      ));

      // Graticule wireframe
      earth.add(new THREE.Mesh(
        new THREE.SphereGeometry(1.005, 36, 24),
        new THREE.MeshBasicMaterial({ color: 0x4493f8, wireframe: true, transparent: true, opacity: 0.18 })
      ));

      // Land-dot cloud (Fibonacci sphere + continent noise mask)
      {
        const N = 2200;
        const positions: number[] = [];
        const colors:    number[] = [];
        const c1     = new THREE.Color(0x4493f8);
        const c2     = new THREE.Color(0x98dfb5);
        const golden = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < N; i++) {
          const y     = 1 - (i / (N - 1)) * 2;
          const r     = Math.sqrt(1 - y * y);
          const theta = golden * i;
          const x     = Math.cos(theta) * r;
          const z     = Math.sin(theta) * r;
          const lat   = Math.asin(y);
          const lon   = Math.atan2(z, x);
          const n =
            Math.sin(lat * 2.2) * Math.cos(lon * 1.6) +
            Math.sin(lat * 4.1 + 0.9) * 0.55 +
            Math.cos(lon * 3.3 + 1.2) * 0.45 +
            Math.sin(lat * 1.2 + lon * 0.8) * 0.6;
          if (n > 0.35) {
            positions.push(x * 1.01, y * 1.01, z * 1.01);
            const mix = Math.max(0, Math.min(1, (n - 0.35) / 1.8));
            const col = c1.clone().lerp(c2, mix);
            colors.push(col.r, col.g, col.b);
          }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors,    3));
        earth.add(new THREE.Points(geo, new THREE.PointsMaterial({
          size: 0.022,
          vertexColors: true,
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
        })));
      }

      // Atmosphere halo (additive rim shader)
      scene.add(new THREE.Mesh(
        new THREE.SphereGeometry(1.12, 48, 48),
        new THREE.ShaderMaterial({
          transparent: true,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
          uniforms: { c: { value: new THREE.Color(0x4493f8) } },
          vertexShader: `
            varying vec3 vN;
            void main() {
              vN = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`,
          fragmentShader: `
            uniform vec3 c;
            varying vec3 vN;
            void main() {
              float i = pow(0.72 - dot(vN, vec3(0.0, 0.0, 1.0)), 2.4);
              gl_FragColor = vec4(c, 1.0) * i * 0.9;
            }`,
        })
      ));

      // ── Scan pings ────────────────────────────────────────────────
      type Ping = { dot: THREE.Mesh; ring: THREE.Mesh; start: number; ttl: number };
      const pings:  Ping[]  = [];
      const pingGeo = new THREE.RingGeometry(0.02, 0.03, 24);
      const recent: string[] = [];

      function latLonToVec3(lat: number, lon: number, r: number) {
        const phi  = (90 - lat) * Math.PI / 180;
        const thet = (lon + 180) * Math.PI / 180;
        return new THREE.Vector3(
          -r * Math.sin(phi) * Math.cos(thet),
           r * Math.cos(phi),
           r * Math.sin(phi) * Math.sin(thet)
        );
      }

      function firePing() {
        const city  = CITIES[Math.floor(Math.random() * CITIES.length)];
        const pos   = latLonToVec3(city.lat, city.lon, 1.02);
        const color = Math.random() < 0.5 ? 0x98dfb5 : 0x4493f8;

        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.015, 12, 12),
          new THREE.MeshBasicMaterial({ color, transparent: true })
        );
        dot.position.copy(pos);
        earth.add(dot);

        const ring = new THREE.Mesh(pingGeo, new THREE.MeshBasicMaterial({
          color, transparent: true, opacity: 0.9, side: THREE.DoubleSide,
        }));
        ring.position.copy(pos);
        ring.lookAt(pos.clone().multiplyScalar(2));
        earth.add(ring);

        pings.push({ dot, ring, start: performance.now(), ttl: 2200 });
        recent.unshift(city.n);
        if (recent.length > 5) recent.pop();
        setTicker('scanning · ' + recent.join(' · '));
      }

      pingTimer = setInterval(firePing, 1800);
      firePing();

      // ── Render loop ───────────────────────────────────────────────
      const clock = new THREE.Clock();
      function loop() {
        animId = requestAnimationFrame(loop);
        const dt = clock.getDelta();
        earth.rotation.y += dt * (Math.PI * 2 / 40);
        earth.rotation.x  = 0.25;

        const now = performance.now();
        for (let i = pings.length - 1; i >= 0; i--) {
          const p   = pings[i];
          const age = (now - p.start) / p.ttl;
          if (age >= 1) {
            earth.remove(p.dot);
            earth.remove(p.ring);
            p.dot.geometry.dispose();
            (p.dot.material  as THREE.Material).dispose();
            (p.ring.material as THREE.Material).dispose();
            pings.splice(i, 1);
            continue;
          }
          const s = 1 + age * 5.5;
          p.ring.scale.set(s, s, s);
          (p.ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - age);
          (p.dot.material  as THREE.MeshBasicMaterial).opacity = 1  - age * 0.4;
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
      clearInterval(pingTimer);
      disposeRenderer?.();
      roDisconnect?.();
    };
  }, []);

  return (
    <div ref={wrapRef} className={wrapClassName}>
      {/* ambient glow behind the sphere */}
      <div style={{
        position: 'absolute', inset: '-10%',
        background: 'radial-gradient(circle at 50% 50%, rgba(3,102,214,0.18), transparent 58%)',
        filter: 'blur(6px)',
        pointerEvents: 'none',
        borderRadius: '50%',
      }} />
      <canvas ref={canvasRef} className={canvasClassName} />
      <div className={tickerClassName}>
        <span className={dotClassName} />
        {ticker}
      </div>
    </div>
  );
}
