# Cabinet — parametric 3D base-cabinet catalog

An interactive catalog of three frameless kitchen base cabinets. Every carcass board, front, drawer-box board, slide section, and hinge component is generated procedurally as an individual Three.js part; assemblies are never resized with a global scale.

- Live: https://zimap.github.io/cabinet/
- Repository: https://github.com/ZimaP/cabinet

## Cabinet models

| Model | Default size (W × H × D) | Nominal widths |
| --- | --- | --- |
| Door + Drawer | 24 × 34.5 × 24 in | 18, 21, 24, 27, 30, 33, 36, 39, 42 in |
| Triple Drawer | 24 × 34.5 × 24 in | 12, 15, 18, 21, 24, 30, 36 in |
| Double Door + Double Drawer | 36 × 34.5 × 24 in | 33, 36, 39, 42 in |

Choose a model with the **Cabinet model** selector. Width remains continuously adjustable between that model's smallest and largest supported sizes; height is 28–42 in and depth is 18–30 in.

## Reference construction

- Side, bottom, shelf, door, and drawer-front thickness: **0.75 in**
- Back-panel thickness: **0.25 in**
- Strengthening rail section: **0.75 × 3.9375 in**
- Toe-kick section: **0.75 × 4.5 in**
- Full-depth melamine plywood shelf, solid-wood drawer box, undermount soft-close slides, and two concealed six-way-adjustable hinges

## Documented assumptions

Shared dimensions not visible in the references are centralized in `src/model/cabinetConstants.ts`: 1/8-in front reveals; a 3-in recessed toe-kick; 1/2-in drawer-box stock with a 1/4-in bottom; practical undermount-slide clearances; standard approximately 35-mm European hinge cups; and lightweight representative screw and hardware sizes. The original cabinet's drawer zone is 18% of usable front height, clamped to 5.5–8 in, with its shelf centered in the lower opening. Its right side is a complete rectangular panel—the diagonal opening is only an illustration cutaway.

For the Triple Drawer model, the shallow top front uses 22% of available front height, clamped to 5.5–7.5 in; the remaining height is split 47% to the middle front and 53% to the bottom front, with practical box-height limits and fixed reveals. For the Double Door + Double Drawer model, the lower compartment uses one full-width shelf and the upper drawer bay uses a 0.75-in center divider. The asterisks beside the 39- and 42-in reference widths have no supplied footnote, so those sizes use the same construction logic as 33 and 36 in. Inset Shaker-style face detail is represented procedurally without changing nominal cut sizes.

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

Each model's calculator uses one world unit per inch and recalculates every part's geometry and assembled transform from width, height, and depth. Fixed stock thicknesses, rail sections, reveals, toe-kick height, and hardware cross-sections remain unchanged. The exploded control interpolates translations and rotations from those assembled transforms, so resizing and model changes remain stable at every explosion amount. Use the slider on any device or scroll over the viewer; drag or pinch to orbit and zoom.

## Dimensions Mode

Use the **Dimensions** toggle to show or hide the two principal cut dimensions for every wooden cabinet component in the selected model. Material thickness and hardware dimensions are intentionally excluded. Labels update automatically as cabinet width, height, or depth changes, and follow their parts through the exploded view; increase the explosion amount to inspect them more clearly.
