# 即時資料展示模式

FlowForge 的前端可在合成資料、MQTT over WebSocket、OPC UA Gateway WebSocket 三種模式間切換。現有 GitHub Pages 網站仍可直接使用合成資料，不需要帳號、broker 或後端服務。

> 此展示用途不等於工業控制或安全系統。不要將瀏覽器頁面暴露在未受保護的 OT 網路上，也不要把 broker 密碼、私鑰或憑證放進前端程式碼。

## 合成資料

預設模式在瀏覽器本機產生設備狀態、OEE、週期時間、WIP、產量與 AGV 利用率資料。此模式不會連線或送出任何資料，可用於離線展示。

## MQTT

選擇 **MQTT over WebSocket**，輸入 broker 的 WebSocket URL 和 topic filter，然後按 **CONNECT**。

- URL 格式：`wss://broker.example.com:8084/mqtt`（broker 必須啟用 WebSocket listener）
- GitHub Pages 是 HTTPS；遠端 broker 請使用 `wss://`，且 broker 需允許該頁面的來源連線。
- 預設 topic filter：`flowforge/factory/+/telemetry`
- 瀏覽器用 MQTT.js 透過 CDN 載入；首次連線需要可存取 `unpkg.com`。
- 此 demo 不提供帳密輸入欄位，也不把憑證儲存在瀏覽器。需要身分驗證時，建議使用具短效憑證的受控 gateway 或專用 WebSocket broker。

支援單筆訊息：

```json
{"tag":"Assembly.oee","value":82.4,"unit":"%","timestamp":"2026-10-16T14:00:00Z"}
```

支援批次訊息：

```json
{
  "tags": [
    {"tag":"Assembly.state","value":"RUNNING","timestamp":"2026-10-16T14:00:00Z"},
    {"tag":"Assembly.oee","value":82.4,"unit":"%"},
    {"tag":"Assembly.cycleTime","value":0.41,"unit":"min"},
    {"tag":"factory.production.output","value":438,"unit":"units/shift"},
    {"tag":"factory.wip","value":21,"unit":"units"},
    {"tag":"factory.agv.utilization","value":71,"unit":"%"}
  ]
}
```

也支援以 tag 名稱為 key 的 JSON 物件，例如 `{"factory.wip":21,"Assembly.oee":82.4}`。設備名稱識別 Receiving、CNC／Machining、Inspection、Assembly、Packaging；設備欄位識別 `state`／`status`、`oee` 和 `cycleTime`。彙總指標識別 throughput／production output、WIP 及 AGV utilization。

### 本機 MQTT 測試

Repository 附有 Mosquitto 的本機測試設定，以及只使用 Python 標準函式庫的 MQTT 3.1.1 QoS 0 publisher。此 publisher 會定期發送合成產量、WIP、AGV 利用率、設備 OEE、cycle time、狀態與 alarm/event 訊息；它是測試資料發送端，不是正式 broker。

1. 安裝 Mosquitto，於專案根目錄開啟終端機並啟動匿名、僅綁定本機的測試 broker：

   ```bash
   mosquitto -c tools/mosquitto-test.conf -v
   ```

2. 另開一個終端機，開始每 2 秒推送資料（按 `Ctrl+C` 停止）：

   ```bash
   python3 tools/mock_mqtt_publisher.py --interval 2 --scenario auto
   ```

   `auto` 情境會循環推送 4 筆正常資料、2 筆低 OEE 警告、2 筆 CNC 01 故障，再送 4 筆復原資料；以預設 2 秒間隔，約第 8 秒出現警告，第 12 秒進入故障，第 16 秒復原。使用 `--scenario normal|warning|fault` 可固定情境；`--count 1 --scenario fault` 可單筆測試故障。`--seed 7` 可固定隨機指標以便重現；亦可使用 `--host`、`--port`、`--topic` 指向其他測試 broker。

   每筆 JSON 除 `tags` 外，異常轉換時會附加 `events` 陣列，事件包含 `severity`、`code`、`source`、`message` 與時間戳。警告會降低 Assembly OEE；故障會把 CNC 01 設為 `FAULT`、OEE 設為 0 並拉長週期時間；復原事件會把狀態恢復為正常。前端把 warning 呈現為琥珀色事件，把 error/critical/fault 呈現為紅色事件。

3. 本機以 `python3 -m http.server 8080` 開啟網站，在 **Real-time Factory Telemetry** 選 **MQTT over WebSocket**，設定 endpoint 為 `ws://127.0.0.1:9001/mqtt`，topic filter 保持 `flowforge/factory/+/telemetry`，再按 **CONNECT**。

測試 listener 使用匿名連線，且只綁定 `127.0.0.1`；**僅供本機測試，請勿暴露到網路或用於生產環境**。Mosquitto 必須具備 WebSocket listener 支援。Publisher 連到標準 MQTT/TCP listener `127.0.0.1:1883`，瀏覽器則透過 WebSocket listener `127.0.0.1:9001` 訂閱同一 broker。

## OPC UA

標準 OPC UA Client 需要 OPC UA Binary／安全通道，瀏覽器並不直接連到 OPC UA Server。本模式因此採用 **OPC UA → Gateway → WebSocket JSON → 瀏覽器**：在欄位中填入 gateway 的 `wss://` URL，由 gateway 在受信任的網路區段建立 OPC UA 訂閱，再將值推送到瀏覽器。

### 擴充為 OPC UA 資料擷取

建議把擷取服務部署在 OT 網路中的工業電腦或受控 Edge Gateway，而不是在 GitHub Pages 的瀏覽器端實作 OPC UA Client。服務使用 OPC UA Client SDK 連到指定 Server endpoint，完成 endpoint/security policy 協商、應用程式憑證信任與 user 身分驗證，再以最低讀取權限建立 Session。連線後先用 Browse/Read 驗證設備模型與 NodeId 對應，再建立 `Subscription` 和 `MonitoredItem`，讓 Server 依資料變更與事件通知推送更新；採樣/發布週期、deadband 和佇列大小按 tag 變化速率及可接受延遲設定。OPC UA 規範將資料/事件監看、採樣、filter、queue 與 Subscription 發布分開定義。[Subscription 與 MonitoredItem 規範](https://reference.opcfoundation.org/specs/OPC-10000-4/5.13)

擷取服務的正規化層應把伺服器特定 NodeId 映射到穩定 tag（例如 `Assembly.oee`），同時保留 `sourceTimestamp`、OPC UA `StatusCode`/quality、unit、data type 與來源 NodeId。事件 MonitoredItem 可把告警的 severity、code、source、message 和時間送入 `events` 陣列；資料變更則放入 `tags`。這樣前端仍使用現有 JSON schema，不必知道 OPC UA SDK 或伺服器的位址空間細節。

小型展示可由 Gateway 直接以 WSS 將正規化 JSON 推送給一個瀏覽器分頁。若要供多個前端、MES 或歷史資料服務使用，可讓 Gateway 將同一資料流發佈至具身分驗證與 ACL 的 MQTT broker、訊息平台或 time-series store，再由前端透過授權的 WSS 訂閱。OPC UA Client/Server Subscription 是一種擷取方式；OPC UA PubSub 則可在多對多資料分發需求下另行評估，兩者不是同一層的設定選項。[OPC UA 架構與 PubSub 說明](https://opcfoundation.org/about/opc-technologies/opc-ua/)

部署時要拒絕未信任或過期的 Server 憑證，勿自動信任未知憑證；優先採用端點支援的簽章與加密安全模式，避免 `SecurityMode=None`。把 Client 放在 OT/DMZ 的分區邊界，只開啟所需的出站連線與 NodeId 讀取權限；憑證私鑰存放在受保護的系統憑證庫，並管理輪替、撤銷與連線稽核。[OPC Foundation 安全建議](https://opcfoundation.org/wp-content/uploads/2017/11/OPC-UA-Security-Advise-EN.pdf)

建議的資料流如下：

```text
PLC / OPC UA Server
  → Edge OPC UA Client（憑證信任、Session、Subscription / MonitoredItems）
  → NodeId 映射與品質/時間戳正規化
  → WSS Gateway 或受控 MQTT / 訊息平台
  → 本頁 telemetry JSON parser、事件清單與即時趨勢圖
```

Gateway 可傳送與 MQTT 範例相同的 JSON 訊息，或使用下列格式：

```json
{
  "type":"telemetry",
  "data":{
    "tags":[
      {"nodeId":"ns=2;s=Factory.Assembly.OEE","value":82.4,"unit":"%","sourceTimestamp":"2026-10-16T14:00:00Z"},
      {"nodeId":"ns=2;s=Factory.Assembly.State","value":"RUNNING"}
    ]
  }
}
```

Gateway 的認證、OPC UA 憑證信任清單、NodeId 對應與訂閱週期由部署端負責；勿在公開靜態頁面中放置 OPC UA 私鑰或永久 token。當 HTTPS 頁面連至遠端 gateway 時，必須使用 `wss://`。

## 連線狀態與資料新鮮度

連線成功後，狀態列顯示來源狀態、最後更新時間及設備資料；超過 15 秒沒有新訊息時標示無資料提示。若連線中斷，可按 **DISCONNECT** 後修正設定再連線。每個瀏覽器分頁獨立連線，關閉頁面會終止連線。
