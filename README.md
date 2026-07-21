# Cabinet — parametric 3D base cabinet

An interactive, browser-based construction model of a frameless kitchen base cabinet. Every carcass board, front, drawer-box board, slide section, and hinge component is generated procedurally as an individual Three.js part; the assembly is never resized with a global scale.

- Live: https://zimap.github.io/cabinet/
- Repository: https://github.com/ZimaP/cabinet

## Reference construction

- Default overall size: **24 × 34.5 × 24 in** (width × height × depth)
- Side, bottom, shelf, door, and drawer-front thickness: **0.75 in**
- Back-panel thickness: **0.25 in**
- Strengthening rail section: **0.75 × 3.9375 in**
- Toe-kick section: **0.75 × 4.5 in**
- Full-depth melamine plywood shelf, solid-wood drawer box, undermount soft-close slides, and two concealed six-way-adjustable hinges

## Documented assumptions

Dimensions not visible in the reference are centralized in `src/model/cabinetConstants.ts`: 1/8-in front reveals; a 3-in recessed toe-kick; 1/2-in drawer-box stock with a 1/4-in bottom; practical undermount-slide clearances; a drawer zone equal to 18% of usable front height, clamped to 5.5–8 in; a shelf centered in the lower storage opening; standard approximately 35-mm European hinge cups; and lightweight representative screw and hardware sizes. The right side is a complete rectangular panel—the diagonal opening in the reference is treated only as an illustration cutaway.

## Run locally

```bash
npm ci
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
```

Vite serves the project under `/cabinet/`, matching the GitHub Pages repository path.

## Parametric and exploded behavior

`calculateCabinetLayout()` uses one world unit per inch and recalculates each part's geometry and assembled transform from width, height, and depth. Fixed stock thicknesses, rail sections, reveals, toe-kick height, and hardware cross-sections remain unchanged. The exploded control interpolates translations and rotations from those assembled transforms, so resizing remains stable at every explosion amount. Use the slider on any device or scroll over the viewer; drag or pinch to orbit and zoom.
