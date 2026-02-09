# PRD — Icon Splash → Individual Icon Assets

## 1) Summary

Build a web app that takes a single "icon splash" image (a collage/sprite-like sheet of icons) and outputs **individual icon files** as reusable design/dev assets.

**Primary user outcome:**
Upload 1 image → automatically detect icons → preview results → export all icons as a ZIP.

**Non-goals (v1):**
- Full design suite or editing tools
- Vectorization / SVG tracing
- Team collaboration, accounts, or cloud storage
- Manual drawing of bounding boxes
- Batch uploads (multi-image)
- Semantic labeling / ML-based tagging

---

## 2) Target Users

1. **Designers / content creators** — want assets fast for Figma, Canva, or presentations.
2. **Developers** — want clean PNGs for UI integration.
3. **AI tool builders** — want to quickly convert icon packs into usable individual files.

---

## 3) Constraints

- App has **exactly 4 features** (scope-locked).
- Each feature must be built and **tested before moving to the next**.
- MVP is usable with a single uploaded PNG/JPG/WebP.
- All processing happens **in-browser** (no server uploads). Privacy-first.
- Dark/light mode is a **UI requirement**, not a feature. It does not count toward the 4-feature scope.

---

## 4) Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18+ with Vite |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS + shadcn/ui |
| Image Processing | OpenCV.js (dynamically imported — see Build Constraints) |
| ZIP Generation | JSZip |
| Unit Testing | Vitest |
| E2E Testing | Playwright |
| Deployment | Vercel (static site) |

### Build Constraints
- **OpenCV.js must be dynamically imported** only when detection or crop is invoked. It must NOT be in the initial bundle.
- Lazy-load the WASM module with a loading indicator during first use.
- Target initial bundle < 500 KB (excluding OpenCV.js).

---

## 5) Defaults & Ranges

All parameters have locked defaults. Golden tests depend on these exact values.

| Parameter | Range | Default | Notes |
|-----------|-------|---------|-------|
| Sensitivity | 0–255 | 128 | Maps to OpenCV adaptiveThreshold block size / C value |
| Min Area | 0–10,000 px² | 200 | Filters noise blobs below this area |
| Padding | 0–24 px | 4 | Added around each cropped icon |
| Background Removal | on / off | on | Toggle for transparent background output |
| BG Confidence Threshold | — | 0.85 | Not user-facing; internal constant |

---

## 6) Determinism Rules

These rules prevent "icon-002 vs icon-003 swapped" regressions and ensure reproducibility.

1. **Sorting**: Icons are sorted top-to-bottom, then left-to-right.
2. **Row grouping**: Icons within **10px vertical distance** (Y-axis) are considered the same row, then sorted by X position within that row.
3. **Bbox integers**: All bounding box values are integers.
   - `x`, `y`: `Math.floor()`
   - `w`, `h`: `Math.ceil()`
4. **Same input + same params = same output.** No randomness in any step.

---

## 7) The 4 Features (Scope Lock)

### Feature 1 — Upload & Input Validation

User uploads an image. App validates the file and displays a preview with metadata.

**Acceptance Criteria**
- Accept: `.png`, `.jpg`/`.jpeg`, `.webp`
- Reject all other formats with a clear, user-friendly error message
- Display: uploaded image preview, file name, dimensions (w×h), and file size
- "Reset" button clears all state and returns to initial view
- Max file size: 20 MB (configurable constant)
- Max dimensions: warn (but still allow) if > 8000px on either axis
- Handle EXIF orientation for JPEG files

**Tests**
- **Unit (Vitest):**
  - File type validation returns correct accept/reject
  - Image metadata extraction returns correct width/height
  - File size validation rejects files over limit
- **E2E (Playwright):**
  - Upload valid PNG → preview + metadata displayed
  - Upload invalid file → error message shown, no preview
  - Reset button returns to clean initial state

---

### Feature 2 — Automatic Icon Detection (Segmentation)

App detects individual icon regions in the splash image and produces bounding boxes.

**Detection Algorithm (OpenCV.js)**

**Primary path:**
1. Convert to grayscale
2. Gaussian blur
3. `adaptiveThreshold` (binary inverse, block size derived from sensitivity)
4. Morphological close → open (remove gaps, then noise)
5. `connectedComponentsWithStats`
6. Extract bounding boxes `{x, y, w, h}` (integer rules per Section 6)
7. Sort per determinism rules (Section 6)
8. Filter by min area threshold

**Fallback path** (triggers if primary returns 0 bboxes OR > 500 bboxes):
1. Canny edge detection
2. Dilate → morphological close
3. `findContours` → `boundingRect`
4. Same sort + filter steps as primary

When fallback triggers, display a subtle info message: _"Detection refined — adjusted algorithm for better results."_

**Adjustable Parameters**
| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| Sensitivity | 0–255 | 128 | Controls threshold contrast for detection |
| Min Area | 0–10,000 px² | 200 | Filters out small noise blobs |

**UX**
- After processing, overlay bounding boxes on the original image
- Display total icon count detected
- User can adjust parameters and re-run detection
- If detection count > **500**: show warning _"High detection count. Consider increasing Min Area to filter noise."_

**Acceptance Criteria**
- Detection returns a deterministic list of bounding boxes for same input + params
- Overlay accurately matches detected regions
- Parameter changes visibly affect results
- Works reliably on flat icons with light/white backgrounds
- Fallback triggers correctly when primary produces 0 or >500 results

**Tests**
- **Unit (Vitest):**
  - Bbox list is stable and deterministic for same inputs/params
  - Min-area filter correctly removes small components
  - Fallback triggers when primary returns 0 or >500 bboxes
  - Bbox values are integers per rounding rules
- **Golden-file tests:**
  - 2–3 sample splash images in `/test-assets`
  - Store expected bbox counts at default parameters
  - Store a few anchor bboxes (index, x, y, w, h) for regression stability
- **E2E (Playwright):**
  - Upload sample → run detection → shows non-zero bounding boxes
  - Adjust sensitivity slider → box count changes
  - **Assert overlay elements exist** (canvas is non-empty OR DOM box elements match count)

---

### Feature 3 — Crop, Cleanup & Preview Grid

From detected bounding boxes, generate individual icon images and display them in a preview grid.

**Cleanup Pipeline**
1. Crop each bounding box region from source image
2. Apply padding (0–24px, user-adjustable slider, default 4)
3. Clamp padded region to image bounds (never exceed source dimensions)
4. Background removal:
   - Sample border pixels (top/bottom/left/right edges of crop, 1px inward) to estimate background color (mean RGB)
   - Compute color distance mask: pixel-by-pixel Euclidean distance from estimated bg color
   - **Confidence** = (% of border pixels classified as bg) × (bg pixel coverage in crop)
   - If confidence ≥ **0.85** → apply alpha mask → transparent PNG output
   - If confidence < **0.85** → keep original background + flag icon with warning: _"Background removal uncertain"_

**Preview Grid**
Each icon tile shows:
- Index number
- Dimensions (w×h)
- "Exclude" toggle (removes icon from export set)
- Warning badge if background removal fell back

**Acceptance Criteria**
- Grid renders within **2 seconds** for ~100 icons on typical consumer hardware
- Excluding an icon removes it from export set
- Output icons have transparent background when confidence ≥ 0.85
- Graceful fallback at confidence < 0.85: original background + warning badge
- Padding does not exceed original image bounds

**Tests**
- **Unit (Vitest):**
  - Crop function returns correct dimensions with bounds checking
  - Padding expands crop correctly, clamped to image bounds
  - Background color estimation returns consistent color for synthetic test images
  - Confidence calculation returns expected value for known inputs
  - Confidence < 0.85 triggers fallback path
- **Visual regression (lightweight):**
  - Crop sample splash → compare resulting icon dimensions against expected values
- **E2E (Playwright):**
  - Detection → grid appears with matching count
  - Exclude toggle reduces "selected for export" count in UI

---

### Feature 4 — Export Assets (ZIP)

Export selected icons as a downloadable ZIP file.

**Export Specification**
- Format: PNG with transparency (when available)
- Naming: `icon-001.png`, `icon-002.png`, ... (zero-padded, sequential, based on **original index** not filtered index)
- **manifest.json** (required, always included):

```json
{
  "schemaVersion": 1,
  "source": "original-filename.png",
  "parameters": {
    "sensitivity": 128,
    "minArea": 200,
    "padding": 4,
    "backgroundRemoval": true,
    "bgConfidenceThreshold": 0.85
  },
  "icons": [
    {
      "index": 1,
      "filename": "icon-001.png",
      "included": true,
      "originalBbox": { "x": 10, "y": 20, "w": 64, "h": 64 },
      "paddingApplied": 4,
      "finalSize": { "width": 72, "height": 72 },
      "bgRemoved": true,
      "bgConfidence": 0.92
    },
    {
      "index": 3,
      "filename": "icon-003.png",
      "included": false,
      "originalBbox": { "x": 200, "y": 20, "w": 48, "h": 48 },
      "paddingApplied": 4,
      "finalSize": { "width": 56, "height": 56 },
      "bgRemoved": false,
      "bgConfidence": 0.71
    }
  ],
  "excluded": [3, 14]
}
```

**Manifest notes:**
- `originalBbox`: the raw detection bounding box (pre-padding)
- `paddingApplied`: pixels of padding added on each side
- `finalSize`: actual exported image dimensions (post-padding, post-clamp)
- `included`: whether the icon was included in the ZIP export
- `excluded`: top-level array of excluded icon indices for quick reference
- `bgRemoved`: whether transparent background was applied
- `bgConfidence`: the confidence score for background detection
- All icons are listed in the manifest (included and excluded) for full reproducibility

**Acceptance Criteria**
- Clicking "Export ZIP" downloads a `.zip` file
- ZIP contains all **selected** (non-excluded) icons + `manifest.json`
- Icon count in ZIP matches "selected" count in UI
- Manifest includes ALL icons (included + excluded) with correct metadata
- ZIP generated entirely in-browser via JSZip

**Tests**
- **Unit (Vitest):**
  - ZIP builder includes correct file names and counts
  - Manifest JSON validates against expected schema
  - Excluded icons are NOT present as files in ZIP
  - Excluded icons ARE present in manifest with `included: false`
  - `schemaVersion` is 1
- **E2E (Playwright):**
  - Full flow: upload → detect → export → verify UI triggers download event
  - **ZIP verification approach:** Verify JSZip output in-memory in unit tests. In E2E, verify the download is triggered and manifest text is generated correctly (avoid file system assertions in browser E2E).

---

## 8) User Flow

1. **Upload** — Drag-and-drop or click to upload a splash image
2. **Detect** — Click "Detect Icons" → bounding boxes appear on preview
3. **Adjust** — Tweak sensitivity/min-area sliders, re-run if needed
4. **Review** — Browse icon grid, exclude any unwanted detections
5. **Export** — Click "Export ZIP" → download file with all selected icons

---

## 9) UI Layout

Single-page application with a polished, modern design using shadcn/ui components and Tailwind CSS. Dark/light mode toggle defaults to system preference.

**Top Bar**
- App name / logo
- Dark/light mode toggle
- Reset button

**Left Panel (Sidebar)**
- Upload zone (drag-and-drop area with click fallback)
- File metadata display (name, dimensions, size)
- Control sliders:
  - Sensitivity (0–255, default 128)
  - Min Area (0–10,000 px², default 200)
  - Padding (0–24 px, default 4)
  - Background Removal toggle (on by default)
- Action buttons:
  - "Detect Icons" (primary)
  - "Export ZIP" (disabled until icons exist; shows selected count)

**Main Panel**
- Upload state: empty state with upload instructions
- After upload: original image preview
- After detection: image with bounding box overlay + icon count
- Below overlay: icon preview grid (appears after crop/cleanup)
- Warning banner if fallback detection was used
- Warning badges on individual icons where bg removal fell back

---

## 10) Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Performance | Grid renders ≤ 2s for 100 icons; handles up to 300 on consumer hardware |
| Max Detections | Warn at > 500; suggest raising Min Area |
| Privacy | Zero server uploads; all processing in-browser |
| Determinism | Same input + same params = same output (see Section 6) |
| Accessibility | Keyboard navigable, visible focus states, WCAG AA contrast |
| Initial Bundle | < 500 KB excluding OpenCV.js WASM |
| OpenCV.js Loading | Dynamically imported on first detection; loading indicator shown |
| Browser Support | Chrome, Firefox, Edge (latest 2 versions); Safari best-effort |

---

## 11) Milestones (Build + Test Gates)

Each milestone must pass all tests before proceeding to the next.

### Milestone 1 — Feature 1 Complete
- Upload works, preview + metadata displayed
- All Feature 1 unit + E2E tests passing

### Milestone 2 — Feature 2 Complete
- Detection produces bounding box overlay (primary + fallback paths)
- Golden-file bbox counts match expectations at default params
- All Feature 2 tests passing

### Milestone 3 — Feature 3 Complete
- Crop + cleanup produces icon grid with confidence-based bg removal
- Exclude toggle works correctly
- All Feature 3 tests passing

### Milestone 4 — Feature 4 Complete (MVP Done)
- Export ZIP downloads with correct icons + manifest (schemaVersion 1)
- All Feature 4 tests passing
- Full E2E flow works on 3+ sample images

### Milestone 5 — Deploy
- Deploy to Vercel as static site
- OpenCV.js lazy-loaded correctly in production build
- Verify production build works end-to-end

---

## 12) Test Data

Store in `/test-assets/`:

| File | Description | Expected Bbox Count (default params) |
|------|-------------|--------------------------------------|
| `splash-01.png` | Flat icons on light background | TBD after first detection run |
| `splash-02.png` | Different spacing/background color | TBD |
| `splash-03.jpg` | JPEG with compression noise | TBD |

For each asset, store:
- Expected bbox count at default params (sensitivity=128, minArea=200)
- 3–5 anchor bboxes (index, x, y, w, h) for regression stability

---

## 13) Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Detection fails on complex/gradient backgrounds | Expose sensitivity + min-area sliders; warn user; fallback algorithm path |
| Background removal is imperfect | Confidence threshold (0.85); transparent when confident; fallback to original + warning |
| Adjacent icons merge into one detection | Morphology tuning + connected component analysis; padding helps |
| OpenCV.js bundle is large (~8MB) | Dynamic import + WASM lazy-load; loading indicator; initial bundle < 500KB |
| Performance degrades with 300+ icons | Virtualize grid rendering; warn at > 500 detections |
| Sorting regressions (icon order flips) | 10px row tolerance; integer bbox values; determinism rules locked |

---

## 14) Definition of Done

- [ ] All 4 features implemented and functional
- [ ] All tests passing (Vitest unit + Playwright E2E)
- [ ] Golden-file tests match expected bbox counts
- [ ] Works correctly on at least 3 sample splash images
- [ ] Exports ZIP with correct icon count, transparent backgrounds, and valid manifest (schemaVersion 1)
- [ ] Dark/light mode toggle working (UI requirement)
- [ ] OpenCV.js dynamically imported (not in initial bundle)
- [ ] Deployed to Vercel as a static site
- [ ] No server-side processing required
