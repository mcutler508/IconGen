# PRD v1.1 — Icon Studio + Background Removal Quality

## 1) Summary

Enhance the existing IconMaker MVP with a **v1.1 release** focused on:
- **Icon Studio** controls: export any subset of detected icons + choose output pixel size
- A materially improved **Remove Background** result quality (reliable transparency, fewer halos)
- Clear **input guidance** so users generate/upload icon sheets that work best
- UI polish: remove the **blinking cursor** in the original image preview area

**Primary user outcome (v1.1):**
Upload → detect → review → optionally remove background → select specific icons → export at chosen px size.

**Non-goals (v1.1):**
- Full icon editor (brush/eraser, vector editing)
- Prompt generator / prompt library inside the app
- Server-side processing, accounts, cloud storage
- Batch uploads (multi-image)
- ML semantic tagging

---

## 2) Constraints

- App remains **in-browser only** (privacy-first; no uploads to server).
- v1.1 is delivered as **exactly 4 features** (scope-locked).
- Each feature must be built and **tested before moving to the next**.
- Must preserve existing determinism rules: same input + same params → same outputs.
- OpenCV.js remains **dynamically imported** (not in initial bundle).

---

## 3) Tech Stack (unchanged)

| Layer | Technology |
|------|------------|
| Framework | React 18+ with Vite |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS + shadcn/ui |
| Image Processing | OpenCV.js (dynamically imported) |
| ZIP Generation | JSZip |
| Unit Testing | Vitest |
| E2E Testing | Playwright |
| Deployment | Vercel (static site) |

---

## 4) New/Updated Defaults & Ranges (v1.1)

### Export Size (new)
- Presets: **64, 128, 256, 512, 1024**
- Custom: integer **32–2048**
- Default: **256**

### Background Removal (quality upgrade, internal tuning)
Existing user-facing toggle remains:
- Background Removal: on/off (default **on**)

New/updated internal constants (names may vary):
- `BG_CONFIDENCE_THRESHOLD` (existing): **0.85** (default unchanged)
- Add optional: `BG_EDGE_FEATHER_PX`: **1** (or 2 if needed)
- Add optional: `BG_BORDER_SAMPLE_INSET_PX`: **1**
- Add optional: `BG_MAX_BG_VARIANCE`: tuned for near-white backgrounds

> Note: v1.1 may add internal thresholds but should avoid adding new user-facing sliders unless required.

---

## 5) Determinism Rules (v1.1)

v1.0 determinism rules remain unchanged:
- Sorting: top-to-bottom, then left-to-right
- Row grouping tolerance: 10px
- Bbox integer rounding rules remain

Additional v1.1 determinism:
1. **Selection does not reorder** icons.
2. **Export naming remains based on original index** (`icon-001.png`, etc.), even when exporting a subset.
3. Resizing does not affect ordering or manifest indexing—only final pixel dimensions.

---

## 6) The 4 Features (Scope Lock)

## Feature 1 — Icon Studio: Selective Export + Output Pixel Size

### Problem
Users want to export only the icons they care about, and they need consistent pixel sizes for app/UI usage.

### User Story
After detection and preview, a user can:
- select/deselect any icon
- choose an export size (preset or custom)
- export a ZIP that contains only the selected icons, resized appropriately

### UX Requirements
- Add an **Icon Studio** section near the export controls:
  - Export Size dropdown (presets) + Custom size input
  - “Select All” / “Select None”
  - Export button shows count: “Export ZIP (7)”
- Export size change should not require re-running detection.

### Functional Requirements
- Resize occurs **after** crop + padding + background removal (if enabled).
- Maintain aspect ratio using one of:
  - **Fit-within**: max(icon width, icon height) = target px
- Manifest must record chosen export size and actual output dimensions.

### Manifest Updates (v1.1)
Add at top-level:
- `export`: `{ "sizePx": 256, "mode": "fitWithin" }`

For each icon, ensure:
- `finalSize` reflects post-resize dimensions.

### Acceptance Criteria
- User can export a single icon from a set (subset export works).
- Export size presets produce correct pixel outputs.
- Custom size input validates and clamps to 32–2048.
- File naming remains based on original index (no renumbering).
- Manifest reflects subset inclusion + export size.

### Tests
- **Unit (Vitest):**
  - Resizer preserves aspect ratio and fits within target px
  - Custom size validation (bounds, non-integer handling)
  - ZIP builder includes only selected icons (files)
  - Manifest includes all icons, with correct `included` values
  - Manifest includes `export.sizePx`
- **E2E (Playwright):**
  - Upload sample → detect → select 1 icon → export triggers download
  - Change export size preset → export again → verify manifest text generated reflects new size
  - Toggle selection reduces “selected count” in UI

---

## Feature 2 — Background Removal v2 (Quality Upgrade)

### Problem
“Remove Background” is currently inconsistent: halos, partial removal, gradients getting clipped, or poor results when background is near-white but not perfectly uniform.

### User Story
When a user toggles Remove Background on, exported icons have clean transparency with minimal edge artifacts (especially for AI-generated icon sheets on white backgrounds).

### Requirements (MVP Pragmatic Approach)
Implement a more robust foreground mask for near-white backgrounds:

1. **Estimate background** using border sampling (with inset)
2. Compute per-pixel “background-likeness” using color distance + variance tolerance
3. Generate alpha mask (binary) then refine:
   - Morphological open/close to remove specks and fill small gaps
   - Hole filling for interior regions that should remain solid
4. Apply **edge feathering** (1px) to reduce jaggies/halo
5. Compute confidence (keep existing confidence behavior):
   - If confidence ≥ 0.85 → apply transparency
   - Else keep original background + warning badge

### UX Requirements
- Keep existing warning badge (“Background removal uncertain”).
- Add a brief tooltip or short help text explaining why.

### Acceptance Criteria
- On near-white background icon sheets:
  - Transparency is applied reliably when confidence ≥ 0.85
  - Minimal halo around edges in exported PNGs
  - Interior gradients preserved (not punched out)
- On busy/complex backgrounds:
  - The feature fails softly (more fallbacks), does not destroy icon content

### Tests
- **Unit (Vitest):**
  - Background estimation returns expected value for synthetic images
  - Mask classification correctly separates white background from colored foreground
  - Confidence calculation matches expected values on known cases
  - Feathering produces non-jagged alpha transitions (basic alpha checks)
  - Confidence < 0.85 triggers fallback + warning
- **Golden/fixture tests:**
  - Add 2–3 small synthetic fixtures:
    - white bg + colored icon
    - off-white bg + colored icon
    - gradient icon on white bg
  - Assert: bgRemoved true/false expected and key pixel alpha values at anchor points

---

## Feature 3 — Input Guidance: Instruction Box + “Best Results” Messaging

### Problem
Users may upload images with text, busy backgrounds, or non-uniform backgrounds that reduce detection quality and background removal reliability.

### User Story
Before running detection, users see clear instructions for generating ideal icon sheets (e.g., Gemini) so results are better on first try.

### UX Requirements
Add a static **Instruction Box** near Upload/Detect controls:
- “Best results: generate icon sets with a **solid white background**.”
- “Avoid text/captions.”
- “High-res images are fine.”
- “If detections are noisy: increase Min Area.”

Keep it short (3–5 bullets). No modal.

### Acceptance Criteria
- Instruction box is visible before clicking Detect.
- Copy is concise and reduces confusion.

### Tests
- **Unit (Vitest):**
  - N/A (copy-only), but can snapshot component rendering if you already snapshot test UI components.
- **E2E (Playwright):**
  - Load app → instruction box visible
  - After upload → instruction box still visible (or collapsible if designed)

---

## Feature 4 — UI Polish: Remove Blinking Cursor in Original Image Area

### Problem
A blinking text caret/cursor appears in the original image preview area, making the app feel broken and distracting users during review.

### User Story
The original preview behaves like a viewer/canvas, not a text input—no caret.

### Requirements
- Identify the source (focusable element, contenteditable, overlay, CSS) and remove it:
  - Ensure the image container is not `contenteditable`
  - Ensure no hidden input is positioned over the image
  - Ensure focus styles/caret are not appearing due to CSS
- Original image area should still allow intended interactions (e.g., hover, bbox overlay) without showing text caret.

### Acceptance Criteria
- No blinking caret appears:
  - on initial load
  - after upload
  - after detection
  - after toggling settings
  - after clicking on the image area

### Tests
- **Unit (Vitest):**
  - N/A (UI behavior), optional component test verifying no `contenteditable` or input overlay in the DOM structure.
- **E2E (Playwright):**
  - Click original image area → ensure no text caret appears
  - (If feasible) screenshot-based assertion that caret is absent in the preview region

---

## 7) Milestones (Build + Test Gates)

### Milestone 1 — Feature 1 Complete
- Selective export + export size implemented
- All Feature 1 unit + E2E tests passing

### Milestone 2 — Feature 2 Complete
- Background removal v2 implemented and validated on fixtures
- All Feature 2 unit tests passing; golden/fixture assertions stable

### Milestone 3 — Feature 3 Complete
- Instruction box implemented
- E2E verifies visibility in key states

### Milestone 4 — Feature 4 Complete (v1.1 Done)
- Blinking cursor eliminated across flows
- E2E sanity checks pass
- Full suite: unit + E2E green

---

## 8) Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Background removal still imperfect on complex backgrounds | Fail softly using confidence + warning; push user toward white backgrounds via instructions |
| Resizing introduces blur or quality loss | Use high-quality canvas scaling; test multiple sizes; keep aspect ratio |
| Export subset breaks determinism | Keep original index-based naming; manifest lists all icons |
| UI caret issue recurs | Add a targeted E2E check and DOM guardrail (no contenteditable/overlay inputs) |

---

## 9) Definition of Done (v1.1)

- [ ] Selective export + export size working with correct naming + manifest updates
- [ ] Background removal improved; validated against fixtures; minimal halos on white backgrounds
- [ ] Instruction box visible and helpful
- [ ] Blinking cursor removed from original preview area
- [ ] All tests passing (Vitest + Playwright)
- [ ] OpenCV.js remains dynamically imported and initial bundle constraints preserved
- [ ] Deployed build works end-to-end
