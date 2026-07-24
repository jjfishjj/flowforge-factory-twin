# FlowForge Factory Twin

[![Deploy GitHub Pages](https://github.com/jjfishjj/flowforge-factory-twin/actions/workflows/pages.yml/badge.svg)](https://github.com/jjfishjj/flowforge-factory-twin/actions/workflows/pages.yml)

一個對齊「Omniverse 數位工廠工程師」職缺的作品集專案：用互動式工廠數位雙生比較佈局方案、模擬產能與物流，再輸出可匯入 NVIDIA Omniverse 的 OpenUSD 場景。

## 專案能力對照

| 職務需求 | 專案證據 |
|---|---|
| Omniverse / OpenUSD | `tools/generate_usd.py` 產生具階層、語意 metadata 與佈局 variant 的 USDA stage |
| 3D 數位雙生 | Canvas 等角視圖呈現設備、物流路徑、WIP 與即時設備狀態 |
| Facility Layout | Baseline / Optimized 方案切換，量化移動距離與擁塞 |
| 產能與製程模擬 | 依 cycle time、OEE、班次、需求量進行逐分鐘離散模擬 |
| 數據可視化 | Throughput、達成率、WIP、物流距離、瓶頸與時間序列圖 |

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
├── styles.css / footer.css     # 響應式工業控制台介面
├── assets/
│   └── factory_optimized.usda  # 網頁可直接下載的 OpenUSD 範例
├── tools/
│   └── generate_usd.py         # OpenUSD 場景產生器
└── .github/workflows/pages.yml # GitHub Pages 自動部署
```

## 產生 OpenUSD 場景

```bash
python3 tools/generate_usd.py --layout optimized --output factory_optimized.usda
```

用 USD Composer 或任何支援 OpenUSD 的 Omniverse app 開啟輸出的 `.usda`。Stage 使用 Z-up、meter 單位，設備位於 `/Factory/Equipment`，物流路徑位於 `/Factory/MaterialFlow`；每台設備包含 `factory:*` 自訂屬性，方便後續串接 MES/IoT。

## Demo 腳本（3 分鐘）

1. 先展示 Baseline，指出 Assembly 與 Packaging 距離過遠，物流線交叉。
2. 點「執行模擬」，觀察瓶頸設備、WIP 和需求達成率。
3. 切換 Optimized，保持相同參數重跑，比較產出與物流距離。
4. 調低 Assembly OEE，示範 what-if 分析如何立刻定位瓶頸。
5. 產生 USDA，說明網頁規劃資料如何映射到 Omniverse/OpenUSD stage。

## 範圍與下一步

本 MVP 的模擬是決定性的簡化離散模型，適合展示規劃思路，不能取代正式工業模擬或安全驗證。下一階段可加入：

- 以 Omniverse Kit Extension 直接讀取 `factory:*` metadata 並疊加 KPI。
- MQTT / OPC UA 即時設備資料，讓狀態由模擬切換為現場 telemetry。
- AGV 路徑規劃、碰撞區域與多方案最佳化。
- 使用 USD references / payloads 拆分設備資產，建立可重用的 SimReady asset library。

## 參考

- [NVIDIA Virtual Factory Integration Guide](https://docs.omniverse.nvidia.com/vfi/latest/overview.html)
- [Factory-Level USD Structuring](https://docs.omniverse.nvidia.com/vfi/latest/guide/factory-level-structuring.html)
- [OpenUSD Structure and Assembly](https://docs.omniverse.nvidia.com/vfi/latest/guide/usd-structure-and-assembly.html)
