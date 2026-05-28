// Radial cover flourish — concentric arcs emanating from the bottom-center
// of the cover, in our brand blue. Mirrors the "sonar ping" look on the
// Aikido cover but tinted to our palette.

import React from "react";
import { Svg, Path, Defs, LinearGradient, Stop, Rect } from "@react-pdf/renderer";
import { C } from "./_theme";

// Page is US Letter: 612x792 pts. Flourish lives in the bottom ~45%.
// Origin point of all arcs is roughly (306, 820) — just below the page edge.
const CX = 306;
const CY = 820;
const ARCS = [120, 180, 240, 300, 360, 420, 480, 540];

export function RadialFlourish() {
  return (
    <Svg
      width={612}
      height={792}
      viewBox="0 0 612 792"
      style={{ position: "absolute", top: 0, left: 0 }}
    >
      <Defs>
        {/* Vertical wash from navy at top to slightly lighter at bottom */}
        <LinearGradient id="bgGradient" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={C.navy} />
          <Stop offset="100%" stopColor="#0d2336" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={612} height={792} fill="url(#bgGradient)" />

      {/* Concentric arcs, each fainter than the last */}
      {ARCS.map((r, i) => {
        // Arc opacity tapers off with radius
        const opacity = Math.max(0.04, 0.22 - i * 0.025);
        // Start at (CX - r, CY) and sweep to (CX + r, CY) — top half visible
        const d = `M ${CX - r} ${CY} A ${r} ${r} 0 0 1 ${CX + r} ${CY}`;
        return (
          <Path
            key={r}
            d={d}
            stroke={C.blueLight}
            strokeWidth={0.6}
            strokeOpacity={opacity}
            fill="none"
          />
        );
      })}

      {/* Innermost solid-feeling ring of dots for the "sonar" effect.
          react-pdf SVG doesn't support stroke-dasharray reliably, so we
          fake it with a series of tiny circles along the bottom arc. */}
      {(() => {
        const dots = [];
        const r = 580;
        // Sweep from ~210° to ~330° along the arc; spread ~60 dots
        const startA = (200 * Math.PI) / 180;
        const endA = (340 * Math.PI) / 180;
        const N = 60;
        for (let i = 0; i < N; i++) {
          const a = startA + ((endA - startA) * i) / (N - 1);
          const x = CX + r * Math.cos(a);
          const y = CY + r * Math.sin(a);
          const dotR = 0.9;
          const opacity = 0.35 + 0.3 * Math.sin((Math.PI * i) / (N - 1));
          dots.push(
            <Path
              key={`dot-${i}`}
              d={`M ${x} ${y} m -${dotR} 0 a ${dotR} ${dotR} 0 1 0 ${dotR * 2} 0 a ${dotR} ${dotR} 0 1 0 -${dotR * 2} 0`}
              fill={C.blueLight}
              fillOpacity={opacity}
            />,
          );
        }
        return dots;
      })()}
    </Svg>
  );
}
