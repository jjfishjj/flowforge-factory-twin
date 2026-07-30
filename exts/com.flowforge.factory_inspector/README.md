# FlowForge Factory Inspector

Minimal Omniverse Kit Extension that reads the active `/Factory` prim, switches its `layout` VariantSet, counts equipment carrying `factory:stationId`, and identifies the likely bottleneck from cycle time and nominal OEE.

## Try it in USD Composer

1. Add this repository's `exts` directory as an Extension Search Path.
2. Enable **FlowForge Factory Inspector** in the Extension Manager.
3. Open `assets/usd/factory.usda`.
4. Use **Baseline** and **Optimized** in the panel to switch the composed layout.

This extension must be runtime-tested inside a compatible Omniverse Kit application; normal CPython can only perform syntax checks because `omni.*` modules are supplied by Kit.

