# Windows RTX Validation Checklist

Use this checklist when the repository is opened on a Windows RTX workstation with NVIDIA USD Composer installed. The Web Demo does not require Composer; this pass adds runtime evidence for the portfolio.

## Codex handoff

On the RTX computer:

1. Clone the repository or open the existing local clone.
2. Open the same Codex task.
3. Send: `Windows RTX repo path: C:\absolute\path\to\flowforge-factory-twin`.
4. Codex should first run `git status`, verify Composer is available, then follow this checklist without changing verified Web Demo behavior.

## 1. Prepare

- Clone or pull `https://github.com/jjfishjj/flowforge-factory-twin`.
- Record the GPU model, NVIDIA driver version and USD Composer version.
- Keep screenshots and recordings under `docs/evidence/rtx/` using the names below.

## 2. Validate the stage

1. Launch USD Composer.
2. Open `assets/usd/factory.usda`.
3. Confirm `/Factory` is the default prim and the stage is Z-up with meters as the linear unit.
4. In the Stage panel, select `/Factory` and switch `layout` from `Baseline` to `Optimized`.
5. Confirm all five station references resolve and both variants render without missing assets.

Capture:

- `01-stage-baseline.png`
- `02-stage-optimized.png`
- `03-variantset-properties.png`

## 3. Load the Kit Extension

1. Open **Window → Extensions**.
2. Add `<repo>\exts` to the Extension Search Path.
3. Search for `FlowForge Factory Inspector` and enable it.
4. Open its panel, refresh the current stage and inspect the station metadata.
5. Use the Extension controls to switch variants and identify the bottleneck.

Capture:

- `04-extension-enabled.png`
- `05-station-metadata.png`
- `06-bottleneck-review.png`

## 4. Record the evidence clip

Record an exact 60-second 1080p clip:

1. `00:00–00:08` — Show the Composer version, Stage tree and Baseline layout.
2. `00:08–00:20` — Select Assembly and show `factory:mesTag`, cycle time and OEE.
3. `00:20–00:32` — Open FlowForge Factory Inspector and refresh the stage.
4. `00:32–00:44` — Switch to Optimized through the Extension and orbit the scene.
5. `00:44–00:54` — Run the bottleneck review and keep the result visible.
6. `00:54–01:00` — End on the full optimized factory with the Extension panel open.

Save as `docs/evidence/rtx/factory-twin-composer-validation.mp4`.

## 5. Acceptance criteria

- No unresolved reference or payload errors in the Console.
- Baseline and Optimized variants both load.
- Five equipment prims expose the expected `factory:*` metadata.
- The Extension loads without a Python exception.
- The screenshots show the Composer version and enough UI context to prove runtime execution.

## Evidence log

After testing, add the actual environment values:

| Item | Result |
|---|---|
| GPU | Pending RTX workstation |
| NVIDIA driver | Pending |
| USD Composer | Pending |
| Baseline variant | Pending |
| Optimized variant | Pending |
| Extension runtime | Pending |
| Console errors | Pending |
