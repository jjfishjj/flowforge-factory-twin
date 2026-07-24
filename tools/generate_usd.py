#!/usr/bin/env python3
"""Generate an OpenUSD ASCII factory stage without requiring the USD Python SDK."""
from __future__ import annotations
import argparse
from pathlib import Path

LAYOUTS = {
    "baseline": {
        "Receiving": (10, 18, 15, 14), "CNC_01": (32, 12, 16, 14),
        "Inspection": (58, 15, 14, 13), "Assembly": (35, 52, 18, 16),
        "Packaging": (72, 48, 16, 14),
    },
    "optimized": {
        "Receiving": (12, 25, 15, 14), "CNC_01": (34, 14, 16, 14),
        "Inspection": (59, 15, 14, 13), "Assembly": (61, 48, 18, 16),
        "Packaging": (34, 49, 16, 14),
    },
}
CYCLE = {"Receiving": .38, "CNC_01": .52, "Inspection": .46, "Assembly": .39, "Packaging": .43}

def cube(name: str, x: float, y: float, w: float, d: float, color: tuple[float, float, float]) -> str:
    return f'''        def Xform "{name}" (
            customData = {{ string factory:assetType = "equipment" }}
        )
        {{
            double factory:cycleTimeMinutes = {CYCLE[name]}
            string factory:stationId = "{name}"
            double3 xformOp:translate = ({x + w/2}, {y + d/2}, 1.5)
            uniform token[] xformOpOrder = ["xformOp:translate"]
            def Cube "Geometry"
            {{
                double size = 1
                color3f[] primvars:displayColor = [({color[0]}, {color[1]}, {color[2]})]
                double3 xformOp:scale = ({w}, {d}, 3)
                uniform token[] xformOpOrder = ["xformOp:scale"]
            }}
        }}'''

def build(layout: str) -> str:
    colors = [(0.35,.8,.25),(.25,.65,.4),(.2,.75,.65),(.7,.9,.2),(.4,.75,.3)]
    equipment = "\n".join(cube(n, *dims, colors[i]) for i, (n, dims) in enumerate(LAYOUTS[layout].items()))
    return f'''#usda 1.0
(
    defaultPrim = "Factory"
    metersPerUnit = 1
    upAxis = "Z"
    customLayerData = {{ string factory:layoutScenario = "{layout}" }}
)

def Xform "Factory"
{{
    def Scope "Architecture"
    {{
        def Cube "Floor"
        {{
            double size = 1
            color3f[] primvars:displayColor = [(0.08, 0.12, 0.1)]
            double3 xformOp:scale = (100, 78, 0.2)
            double3 xformOp:translate = (50, 39, -0.1)
            uniform token[] xformOpOrder = ["xformOp:scale", "xformOp:translate"]
        }}
    }}
    def Scope "Equipment"
    {{
{equipment}
    }}
    def Scope "MaterialFlow" (
        customData = {{ string factory:route = "Receiving>CNC_01>Inspection>Assembly>Packaging" }}
    )
    {{
    }}
}}
'''

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--layout", choices=LAYOUTS, default="optimized")
    parser.add_argument("--output", type=Path, default=Path("factory.usda"))
    args = parser.parse_args()
    args.output.write_text(build(args.layout), encoding="utf-8")
    print(f"Wrote {args.output} ({args.layout} layout)")

if __name__ == "__main__":
    main()

