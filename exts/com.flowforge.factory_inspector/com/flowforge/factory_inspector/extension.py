"""Omniverse Kit panel for inspecting the FlowForge factory stage."""

import omni.ext
import omni.ui as ui
import omni.usd


class FactoryInspectorExtension(omni.ext.IExt):
    WINDOW_TITLE = "FlowForge Factory Inspector"
    FACTORY_PATH = "/Factory"

    def on_startup(self, ext_id):
        self._window = ui.Window(self.WINDOW_TITLE, width=360, height=300)
        with self._window.frame:
            with ui.VStack(spacing=8):
                ui.Label("OPENUSD FACTORY CONTROL", height=24)
                self._status = ui.Label("Open assets/usd/factory.usda to begin.", word_wrap=True)
                with ui.HStack(height=32, spacing=6):
                    ui.Button("Baseline", clicked_fn=lambda: self._select_layout("Baseline"))
                    ui.Button("Optimized", clicked_fn=lambda: self._select_layout("Optimized"))
                ui.Button("Refresh metadata", height=32, clicked_fn=self._refresh)
                self._details = ui.Label("", word_wrap=True)
        self._refresh()

    def on_shutdown(self):
        self._window = None
        self._status = None
        self._details = None

    def _stage(self):
        return omni.usd.get_context().get_stage()

    def _factory_prim(self):
        stage = self._stage()
        return stage.GetPrimAtPath(self.FACTORY_PATH) if stage else None

    def _select_layout(self, name):
        factory = self._factory_prim()
        if not factory or not factory.IsValid():
            self._status.text = "Factory prim not found at /Factory."
            return
        variants = factory.GetVariantSet("layout")
        if name not in variants.GetVariantNames():
            self._status.text = f"Layout variant '{name}' is unavailable."
            return
        variants.SetVariantSelection(name)
        self._refresh()

    def _refresh(self):
        stage = self._stage()
        factory = self._factory_prim()
        if not stage or not factory or not factory.IsValid():
            self._status.text = "Factory prim not found at /Factory."
            self._details.text = "Open assets/usd/factory.usda in USD Composer."
            return

        layout = factory.GetVariantSet("layout").GetVariantSelection() or "Unselected"
        stations = []
        for prim in stage.Traverse():
            station_id = prim.GetAttribute("factory:stationId")
            if station_id and station_id.HasAuthoredValueOpinion():
                cycle = prim.GetAttribute("factory:cycleTimeMinutes").Get()
                oee = prim.GetAttribute("factory:nominalOee").Get()
                stations.append((station_id.Get(), cycle, oee))

        bottleneck = max(stations, key=lambda row: row[1] / row[2]) if stations else None
        self._status.text = f"Layout: {layout}  |  Stations: {len(stations)}"
        if bottleneck:
            self._details.text = (
                f"Likely constraint: {bottleneck[0]}\n"
                f"Cycle time: {bottleneck[1]:.2f} min\n"
                f"Nominal OEE: {bottleneck[2]:.0%}"
            )
        else:
            self._details.text = "No factory:stationId metadata found."

