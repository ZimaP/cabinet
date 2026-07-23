# Cabinet — parametric 3D cabinet catalog

An interactive catalog of frameless base and wall cabinets. Every carcass board, shelf, front, drawer-box board, slide section, hinge component, shelf pin, and pull is generated procedurally as an individual Three.js part; assemblies are never resized with a global scale.

- Live: https://zimap.github.io/cabinet/
- Repository: https://github.com/ZimaP/cabinet

## Cabinet models

| Model | Default size (W × H × D) | Nominal widths |
| --- | --- | --- |
| Door + Drawer | 24 × 34.5 × 24 in | 18, 21, 24, 27, 30, 33, 36, 39, 42 in |
| Triple Drawer | 24 × 34.5 × 24 in | 12, 15, 18, 21, 24, 30, 36 in |
| Double Door + Double Drawer | 36 × 34.5 × 24 in | 33, 36, 39, 42 in |
| Vanity Sink Base | 30 × 34.5 × 21 in | 30 in |
| Wall Single Door — 42 in high | 9 × 42 × 12 in | 9, 12, 15, 18, 21, 24 in |
| Wall Double Door — 42 in high | 24 × 42 × 12 in | 24, 27, 30, 33, 36, 39, 42, 48 in |
| Wall Single Door — 36 in high | 9 × 36 × 12 in | 9, 12, 15, 18, 21, 24 in |
| Wall Double Door — 36 in high | 24 × 36 × 12 in | 24, 27, 30, 33, 36, 42, 48 in |

Choose a family with the **Cabinet model** selector. Base-cabinet dimensions remain continuously adjustable within their safe ranges. Each wall-cabinet family appears only once in that menu: its separate **Catalog adjustments** section selects the discrete model number, Category A/B/C list price, door handing where applicable, and carcass material. For example, changing the 42-inch single-door family from W942 to W1242 rebuilds that same procedural cabinet at 12 inches wide instead of adding a duplicate menu model.

## Wall-cabinet catalog

The four wall families reproduce the supplied New York Kitchen Specialist catalog:

- 42-inch single door, left or right: W942 through W2442; three adjustable shelves.
- 42-inch double door: W2442 through W4842; three adjustable shelves.
- 36-inch single door, left or right: W936 through W2436; two adjustable shelves.
- 36-inch double door: W2436, W2736, W3036, W3336, W3636, W4236, and W4836; two adjustable shelves. W3936 is not present in the supplied table.

All A/B/C prices are stored exactly as printed, including the irregular W2142 Category B value of 380. Category D is not selectable because every supplied D cell is blank and no Category D specification is provided. The catalog is dated October 1999, so displayed values are identified as historical list prices rather than current quotes.

Door/front categories are:

- A: 3/4-inch melamine with 0.18 PVC edge, 3 mm PVC edge, or oak J-pull.
- B: white or color laminate with the listed PVC-edge, 90-degree postformed, or 180-degree postformed/C-channel treatments.
- C: all “Thermafoil” doors, preserving the source spelling.

## Reference construction

- Side, bottom, shelf, door, and drawer-front thickness: **0.75 in**
- Back-panel thickness: **0.25 in**
- Strengthening rail section: **0.75 × 3.9375 in**
- Toe-kick section: **0.75 × 4.5 in**
- Full-depth melamine plywood shelves where shown, solid-wood drawer boxes, undermount soft-close slides, and concealed six-way-adjustable hinges

The wall cabinets use their own supplied European frameless specification: 3/4-inch industrial-grade melamine sides, top/bottom panels, and adjustable shelves with PVC edges; a 1/2-inch industrial-grade melamine back; white nylon locking shelf pins; self-closing concealed steel hinges; preglued 8 mm hardwood dowels; and 32 mm-system shelf-pin spacing. They contain no toe kick, drawer, slide, or base-cabinet reinforcing-rail assembly. The optional 3/4-inch maple veneer-core plywood with clear coat is available in the controls, but its unlisted surcharge is deliberately not added to the printed price.

## Documented assumptions

Shared dimensions not visible in the references are centralized in `src/model/cabinetConstants.ts`: 1/8-in front reveals; a 3-in recessed toe-kick; 1/2-in drawer-box stock with a 1/4-in bottom; practical undermount-slide clearances; standard approximately 35-mm European hinge cups; and lightweight representative screw and hardware sizes. Both side panels on every model use a real 4.5-in-high × 3-in-deep lower-front toe-kick notch; the diagonal opening in the original construction illustration remains only a cutaway. The original cabinet's drawer zone is 18% of usable front height, clamped to 5.5–8 in, with its shelf centered in the lower opening.

For the Triple Drawer model, the shallow top front uses 22% of available front height, clamped to 5.5–7.5 in; the remaining height is split 47% to the middle front and 53% to the bottom front, with practical box-height limits and fixed reveals. For the Double Door + Double Drawer model, the lower compartment uses one full-width shelf and the upper drawer bay uses a 0.75-in center divider. The asterisks beside the 39- and 42-in reference widths have no supplied footnote, so those sizes use the same construction logic as 33 and 36 in. Inset Shaker-style face detail is represented procedurally without changing nominal cut sizes.

The VS30 Vanity Sink Base uses the reference's 30-in nominal width and an assumed 21-in vanity depth because no overall depth was supplied. Its false-front zone uses 20% of usable front height, clamped to 6–8 in. The reference-matched assembly has two notched side panels, a raised bottom, finished back, recessed toe kick, independent front and rear top stretchers, a shallow full-width support behind the false fronts, and one short center support within that false-front zone. It also has paired slab false fronts, paired slab doors, four concealed hinges, and two pulls. No shelf, full-height divider, working drawers, drawer boxes, slides, corner braces, or additional back rails are included.

The supplied wall-cabinet pages do not state overall depth, overlay/reveal, hinge count, or exact shelf elevations. The implementation therefore uses a documented conventional 12-inch wall depth, 1/8-inch front reveals, evenly spaced initial shelf positions, two hinges per 36-inch door, and three hinges per 42-inch door. These are isolated wall-cabinet assumptions and do not alter the catalog dimensions, shelf counts, construction stock, model numbers, or prices.

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
