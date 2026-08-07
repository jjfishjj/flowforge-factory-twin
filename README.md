# FlowForge Factory Twin

[![Deploy GitHub Pages](https://github.com/jjfishjj/flowforge-factory-twin/actions/workflows/pages.yml/badge.svg)](https://github.com/jjfishjj/flowforge-factory-twin/actions/workflows/pages.yml)

一個對齊「Omniverse 數位工廠工程師」職缺的作品集專案：用互動式工廠數位雙生比較佈局方案、模擬產能與物流，再輸出可匯入 NVIDIA Omniverse 的 OpenUSD 場景。

**Live Demo:** https://jjfishjj.github.io/flowforge-factory-twin/

網站本身不依賴 USD Composer、GPU 或後端服務，在 macOS、Windows 與手機瀏覽器即可展示。內建 OpenUSD Studio 可操作 Scene Graph、layout variants、設備 metadata 與 USDA composition preview；真正的 `.usda` 資產仍可在 RTX 工作站交由 USD Composer 做最終驗證。

## 專案能力對照

| 職務需求 | 專案證據 |
|---|---|
| Omniverse / OpenUSD | 工廠 assembly 以 VariantSet、references、payload 與語意 metadata 組成 |
| 3D 數位雙生 | Canvas 等角視圖呈現設備、物流路徑、WIP 與即時設備狀態 |
| Facility Layout | Baseline / Optimized 方案切換，量化移動距離與擁塞 |
| 產能與製程模擬 | 依 cycle time、OEE、班次、需求量進行逐分鐘離散模擬 |
| 數據可視化 | Throughput、達成率、WIP、物流距離、瓶頸與時間序列圖 |

## Web Demo highlights

- 即時 Canvas 動畫呈現機械手臂作業、輸送帶流動、AGV 車隊與製程工件。
- AGV traffic model 顯示 utilization、blocked time、queue heatmap 與 predicted conflicts。
- 動畫會跟隨佈局 variant 與 AGV fleet 參數更新，並可暫停方便解說。
- Portfolio Case Study 說明問題、建模方法、技術架構與 86 m → 52 m 的物流改善。
- Composer-free OpenUSD Studio 可在一般瀏覽器檢視 Scene Graph、metadata 與 USDA opinions。

## 快速啟動

不需安裝套件：

```bash
cd omniverse_factory_twin
python3 -m http.server 8080
```

瀏覽 `http://localhost:8080`。

## GitHub Pages

Repository 已包含 `.github/workflows/pages.yml`。建立 GitHub repository 並推送 `main` 後，到 **Settings → Pages → Source** 選擇 **GitHub Actions**，之後每次 push 都會自動發布。

預期展示網址：`https://jjfishjj.github.io/flowforge-factory-twin/`

## Repository 結構

```text
.
├── index.html                  # Dashboard 入口
├── app.js                      # 模擬、視覺化與互動邏輯
├── usd-lab.js                  # OpenUSD Scene Graph 與 metadata 互動
├── styles.css / footer.css     # 響應式工業控制台介面
├── usd-lab.css                 # OpenUSD Studio 介面
├── assets/
│   ├── factory_optimized.usda  # 單檔 OpenUSD prototype
│   └── usd/                    # Variant/reference/payload 模組化 stage
├── exts/
│   └── com.flowforge.factory_inspector # Omniverse Kit Extension
├── tools/
│   └── generate_usd.py         # OpenUSD 場景產生器
└── .github/workflows/pages.yml # GitHub Pages 自動部署
```

## 不依賴 Composer 的 OpenUSD Studio

瀏覽器版本提供可直接放入履歷的技術展示：

- Baseline／Optimized Variant 切換會同步更新工廠佈局與 Scene Graph。
- 點選設備 prim 可檢視 `factory:*` metadata、transform、cycle time 與 OEE。
- Composition 視圖呈現 `factory.usda → station.usda → station_payload.usda` 的 reference／payload 關係。
- USDA preview 可複製，讓面試官看見畫面背後的 OpenUSD schema 表達。
- 使用原生 HTML、CSS、JavaScript，GitHub Pages 可直接託管，無需 WebGL framework 或伺服器。

## OpenUSD 場景

若進入 RTX 實機驗證階段，可在 USD Composer 開啟：

```text
assets/usd/factory.usda
```

場景採用模組化 composition：

- `/Factory` 是 `assembly`，提供 `Baseline`／`Optimized` layout variants。
- 五個設備 prim reference 同一個 `GenericStation` component。
- Component 的公開介面與幾何 payload 分離，可選擇性載入。
- `factory:stationId`、`factory:cycleTimeMinutes`、`factory:nominalOee`、`factory:mesTag` 提供 MES／IoT 串接介面。
- 所有資產使用相對路徑，整個 `assets/usd` 目錄可攜。

原本的單檔輸出工具仍可用於快速產生 flattened prototype：

```bash
python3 tools/generate_usd.py --layout optimized --output factory_optimized.usda
```

Stage 使用 Z-up、meter 單位，設備位於 `/Factory/Equipment`，物流路徑位於 `/Factory/MaterialFlow`。

## Omniverse Kit Extension

`exts/com.flowforge.factory_inspector` 是可加入 USD Composer Extension Search Path 的 Python extension。啟用後可以：

- 讀取目前 stage 的 `factory:*` metadata。
- 在 Baseline 與 Optimized variants 之間切換。
- 統計設備數量。
- 依 cycle time／OEE 找出可能瓶頸。

詳細安裝步驟見 [`exts/com.flowforge.factory_inspector/README.md`](exts/com.flowforge.factory_inspector/README.md)。

OpenUSD CLI、variant validation 與 Metal Hydra render 證據見 [`docs/evidence`](docs/evidence/README.md)。

Windows RTX 實機驗證流程與錄影分鏡見 [`docs/windows-rtx-validation.md`](docs/windows-rtx-validation.md)。

55 秒履歷影片腳本、英文 SRT 字幕與中英文 LinkedIn 貼文見 [`docs/demo-video`](docs/demo-video/recording-script.md)。

可直接預覽的 1080p H.264 影片為 [`factory-twin-portfolio-demo-55s.mp4`](docs/demo-video/factory-twin-portfolio-demo-55s.mp4)，內含可開關的英文字幕軌。

## Demo 腳本（3 分鐘）

1. 先展示 Baseline，指出 Assembly 與 Packaging 距離過遠，物流線交叉。
2. 點「執行模擬」，觀察瓶頸設備、WIP 和需求達成率。
3. 切換 Optimized，保持相同參數重跑，比較產出與物流距離。
4. 調低 Assembly OEE，示範 what-if 分析如何立刻定位瓶頸。
5. 產生 USDA，說明網頁規劃資料如何映射到 Omniverse/OpenUSD stage。

## 範圍與下一步

本 MVP 的模擬是決定性的簡化離散模型，適合展示規劃思路，不能取代正式工業模擬或安全驗證。下一階段可加入：

- 在具備 Omniverse Kit 的環境執行 Extension runtime test 與 USD Validator。
- MQTT / OPC UA 即時設備資料，讓狀態由模擬切換為現場 telemetry。
- AGV 路徑規劃、碰撞區域與多方案最佳化。
- 進一步以 binary payload、Point Instancer 與材質 library 擴充為 SimReady asset pipeline。

## 參考

- [NVIDIA Virtual Factory Integration Guide](https://docs.omniverse.nvidia.com/vfi/latest/overview.html)
- [Factory-Level USD Structuring](https://docs.omniverse.nvidia.com/vfi/latest/guide/factory-level-structuring.html)
- [OpenUSD Structure and Assembly](https://docs.omniverse.nvidia.com/vfi/latest/guide/usd-structure-and-assembly.html)
