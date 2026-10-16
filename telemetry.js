(() => {
  const $ = (selector) => document.querySelector(selector);
  const sourceSelect = $('#telemetry-source');
  if (!sourceSelect) return;

  const stationNames = ['Receiving', 'CNC_01', 'Inspection', 'Assembly', 'Packaging'];
  const stations = Object.fromEntries(stationNames.map((name) => [name, {
    name, state: 'RUNNING', oee: 0, cycleTime: 0, updatedAt: null
  }]));
  const metrics = { output: 0, oee: 0, wip: 0, agv: 0 };
  let transport = null;
  let demoTimer = null;
  let staleTimer = null;
  let lastMessageAt = null;
  let mqttScriptPromise = null;
  let previousStates = {};

  const setStatus = (label, className = '') => {
    const badge = $('#telemetry-status');
    badge.textContent = label;
    badge.className = `telemetry-status ${className}`.trim();
  };

  const clockTime = (date) => date instanceof Date && !Number.isNaN(date.valueOf())
    ? date.toLocaleTimeString([], { hour12: false }) : '—';

  const numeric = (value) => {
    if (typeof value === 'string') value = value.replace(/[% ,]/g, '');
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  function render() {
    const hasData = sourceSelect.value === 'demo' || lastMessageAt !== null;
    const online = stationNames.filter((name) => stations[name].state === 'RUNNING').length;
    const validOee = stationNames.map((name) => stations[name].oee).filter((value) => value > 0);
    const meanOee = validOee.length ? validOee.reduce((sum, value) => sum + value, 0) / validOee.length : metrics.oee;
    $('#telemetry-output').textContent = hasData ? Math.round(metrics.output).toLocaleString() : '—';
    $('#telemetry-oee').textContent = hasData ? `${meanOee.toFixed(1)}%` : '—';
    $('#telemetry-online').textContent = hasData ? `${online}/${stationNames.length}` : '—';
    $('#telemetry-wip').textContent = hasData ? Math.round(metrics.wip).toLocaleString() : '—';
    $('#telemetry-agv').textContent = hasData ? `${Math.round(metrics.agv)}%` : '—';
    $('#telemetry-stations').innerHTML = stationNames.map((name) => {
      const station = stations[name];
      const stateClass = station.state === 'FAULT' ? 'fault' : station.state === 'OFFLINE' ? 'offline' : station.state === 'IDLE' ? 'idle' : 'running';
      return `<tr><th scope="row">${name.replace('_', ' ')}</th><td><span class="station-state ${stateClass}">${station.state}</span></td><td>${station.oee ? `${station.oee.toFixed(1)}%` : '—'}</td><td>${station.cycleTime ? `${station.cycleTime.toFixed(2)} min` : '—'}</td><td>${clockTime(station.updatedAt)}</td></tr>`;
    }).join('');
  }

  function logEvent(message, kind = '') {
    const list = $('#telemetry-events');
    const row = document.createElement('li');
    row.className = kind;
    const time = document.createElement('time');
    time.textContent = clockTime(new Date());
    const text = document.createElement('span');
    text.textContent = message;
    row.append(time, text);
    list.prepend(row);
    while (list.children.length > 6) list.lastElementChild.remove();
  }

  function resetForExternalSource() {
    lastMessageAt = null;
    previousStates = {};
    metrics.output = 0;
    metrics.oee = 0;
    metrics.wip = 0;
    metrics.agv = 0;
    stationNames.forEach((name) => Object.assign(stations[name], {
      state: 'OFFLINE', oee: 0, cycleTime: 0, updatedAt: null
    }));
    $('#telemetry-last-update').textContent = 'WAITING FOR FIRST TELEMETRY MESSAGE';
    $('#telemetry-events').replaceChildren();
    render();
    logEvent('Waiting for external telemetry data.');
  }

  function normalizeTag(tag) {
    return String(tag || '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
  }

  function stationForTag(tag) {
    const clean = normalizeTag(tag);
    if (clean.includes('cnc') || clean.includes('machining')) return 'CNC_01';
    return stationNames.find((name) => clean.includes(name.toLowerCase())) || null;
  }

  function applyTag(tag, rawValue, unit = '', timestamp = null) {
    if (!tag) return;
    const clean = normalizeTag(tag);
    const value = rawValue && typeof rawValue === 'object' && 'value' in rawValue ? rawValue.value : rawValue;
    const record = rawValue && typeof rawValue === 'object' ? rawValue : {};
    const ts = timestamp || record.timestamp || record.ts || record.sourceTimestamp;
    const parsedDate = ts ? new Date(ts) : new Date();
    const at = Number.isNaN(parsedDate.valueOf()) ? new Date() : parsedDate;
    const stationName = stationForTag(clean);
    const station = stationName && stations[stationName];
    const amount = numeric(value);
    const textValue = String(value ?? '').toUpperCase();

    if (station) {
      station.updatedAt = at;
      if (/(state|status|mode)$/.test(clean) || ['RUNNING', 'IDLE', 'FAULT', 'STOPPED', 'OFFLINE'].includes(textValue)) {
        station.state = textValue === 'STOPPED' ? 'IDLE' : (['RUNNING', 'IDLE', 'FAULT', 'OFFLINE'].includes(textValue) ? textValue : station.state);
        if (previousStates[stationName] !== station.state) {
          logEvent(`${stationName.replace('_', ' ')} → ${station.state}`, station.state === 'FAULT' ? 'event-fault' : '');
          previousStates[stationName] = station.state;
        }
      } else if (clean.includes('oee') && amount !== null) {
        station.oee = Math.max(0, Math.min(100, amount));
      } else if ((clean.includes('cycle') || clean.includes('cycletime')) && amount !== null) {
        station.cycleTime = amount;
      }
    }

    if (amount !== null) {
      if (/throughput|production\.output|units\.produced|line\.output/.test(clean)) metrics.output = amount;
      else if (/(^|\.)wip($|\.)|work\.in\.process/.test(clean)) metrics.wip = amount;
      else if (/agv.*(util|usage)|fleet.*util/.test(clean)) metrics.agv = Math.max(0, Math.min(100, amount));
      else if (/line\.oee|factory\.oee|overall\.oee/.test(clean)) metrics.oee = Math.max(0, Math.min(100, amount));
      else if (!station && clean.endsWith('.oee')) metrics.oee = Math.max(0, Math.min(100, amount));
    }

    lastMessageAt = at;
    $('#telemetry-last-update').textContent = `LAST UPDATE · ${clockTime(at)}`;
    render();
  }

  function consumePayload(payload) {
    let message;
    try { message = typeof payload === 'string' ? JSON.parse(payload) : payload; }
    catch { logEvent('Received a non-JSON telemetry message.', 'event-fault'); return; }
    if (!message || typeof message !== 'object') return;
    const batch = message.tags || message.data?.tags;
    if (Array.isArray(batch)) {
      batch.forEach((item) => applyTag(item.tag || item.name || item.nodeId, item, item.unit, item.timestamp || item.sourceTimestamp));
    } else if (Array.isArray(message.data)) {
      message.data.forEach((item) => applyTag(item.tag || item.name || item.nodeId, item, item.unit, item.timestamp || item.sourceTimestamp));
    } else if (message.tag || message.nodeId || message.name) {
      applyTag(message.tag || message.nodeId || message.name, message, message.unit, message.timestamp || message.sourceTimestamp);
    } else {
      const values = message.values || message.data || message;
      Object.entries(values).forEach(([tag, value]) => {
        if (!['type', 'event', 'timestamp', 'ts', 'source', 'values', 'data'].includes(tag)) applyTag(tag, value, value?.unit, value?.timestamp);
      });
    }
  }

  function startDemo() {
    stopTransport();
    sourceSelect.value = 'demo';
    $('#telemetry-endpoint-wrap').hidden = true;
    $('#telemetry-topic-wrap').hidden = true;
    $('#telemetry-connect').hidden = true;
    $('#telemetry-disconnect').hidden = true;
    $('#telemetry-demo').hidden = false;
    $('#telemetry-hint').textContent = '使用瀏覽器內的合成資料展示設備狀態與指標；不會連線或傳送資料至外部服務。';
    setStatus('DEMO STREAM', 'is-demo');
    $('#telemetry-last-update').textContent = 'WAITING FOR FIRST SAMPLE';
    if (demoTimer) clearInterval(demoTimer);
    stationNames.forEach((name, index) => {
      stations[name].state = 'RUNNING';
      stations[name].oee = [94, 89, 91, 82, 88][index];
      stations[name].cycleTime = [0.38, 0.52, 0.46, 0.39, 0.43][index];
    });
    metrics.output = 426;
    metrics.oee = 88.8;
    metrics.wip = 19;
    metrics.agv = 72;
    logEvent('Synthetic telemetry stream started.');
    const tick = () => {
      const now = new Date();
      metrics.output = Math.max(0, metrics.output + Math.round(2 + Math.random() * 5));
      metrics.wip = Math.max(3, Math.round(metrics.wip + (Math.random() - 0.48) * 4));
      metrics.agv = Math.max(35, Math.min(96, metrics.agv + (Math.random() - 0.5) * 9));
      stationNames.forEach((name, index) => {
        const station = stations[name];
        station.updatedAt = now;
        station.oee = Math.max(60, Math.min(99, station.oee + (Math.random() - 0.5) * 1.6));
        station.cycleTime = [0.38, 0.52, 0.46, 0.39, 0.43][index] * (0.97 + Math.random() * 0.06);
      });
      lastMessageAt = now;
      $('#telemetry-last-update').textContent = `LAST UPDATE · ${clockTime(now)}`;
      render();
    };
    tick();
    demoTimer = setInterval(tick, 1800);
    clearInterval(staleTimer);
  }

  function stopTransport() {
    if (demoTimer) clearInterval(demoTimer);
    demoTimer = null;
    clearInterval(staleTimer);
    if (!transport) return;
    try {
      if (transport.kind === 'mqtt') transport.client.end(true);
      else transport.socket.close();
    } catch { /* Ignore close races. */ }
    transport = null;
  }

  function updateSourceFields() {
    const source = sourceSelect.value;
    const live = source !== 'demo';
    $('#telemetry-endpoint-wrap').hidden = !live;
    $('#telemetry-topic-wrap').hidden = source !== 'mqtt';
    $('#telemetry-connect').hidden = !live;
    $('#telemetry-disconnect').hidden = !transport;
    $('#telemetry-demo').hidden = live;
    $('#telemetry-hint').textContent = source === 'mqtt'
      ? '連接支援 MQTT over WebSocket（ws://／wss://）。GitHub Pages 使用 HTTPS，遠端 broker 必須提供 WSS 與允許的 WebSocket listener。'
      : source === 'opcua'
        ? '瀏覽器不直接執行 OPC UA Binary；請填入 OPC UA Gateway 的 WebSocket URL。Gateway 將 OPC UA 訂閱值轉為此頁可讀的 JSON 訊息。'
        : '使用瀏覽器內的合成資料展示設備狀態與指標；不會連線或傳送資料至外部服務。';
  }

  function loadMqttLibrary() {
    if (window.mqtt) return Promise.resolve(window.mqtt);
    if (!mqttScriptPromise) {
      mqttScriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/mqtt/dist/mqtt.min.js';
        script.async = true;
        script.onload = () => window.mqtt ? resolve(window.mqtt) : reject(new Error('MQTT.js did not initialize'));
        script.onerror = () => reject(new Error('Could not load MQTT.js from unpkg.com'));
        document.head.append(script);
      });
    }
    return mqttScriptPromise;
  }

  function connectMqtt() {
    const endpoint = $('#telemetry-endpoint').value.trim();
    const topic = $('#telemetry-topic').value.trim();
    if (!endpoint || !topic) throw new Error('請輸入 MQTT WebSocket endpoint 與 topic filter。');
    if (location.protocol === 'https:' && endpoint.startsWith('ws://') && !/^ws:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(endpoint)) {
      throw new Error('此頁透過 HTTPS 開啟時，遠端 MQTT broker 必須使用 wss://。');
    }
    return loadMqttLibrary().then((mqtt) => {
      const client = mqtt.connect(endpoint, { reconnectPeriod: 2500, connectTimeout: 10000, clean: true });
      transport = { kind: 'mqtt', client };
      client.on('connect', () => {
        if (!transport || transport.client !== client) return;
        client.subscribe(topic, { qos: 0 }, (error) => {
          if (error) { setStatus('SUBSCRIBE ERROR', 'is-error'); logEvent(error.message, 'event-fault'); return; }
          setStatus('MQTT CONNECTED', 'is-live');
          logEvent(`MQTT connected · subscribed ${topic}`);
        });
      });
      client.on('message', (_topic, payload) => consumePayload(payload.toString()));
      client.on('reconnect', () => setStatus('RECONNECTING', 'is-warn'));
      client.on('close', () => { if (transport?.client === client) setStatus('MQTT DISCONNECTED', 'is-warn'); });
      client.on('error', (error) => { setStatus('MQTT ERROR', 'is-error'); logEvent(error.message, 'event-fault'); });
    });
  }

  function connectOpcUaGateway() {
    const endpoint = $('#telemetry-endpoint').value.trim();
    if (!endpoint) throw new Error('請輸入 OPC UA Gateway WebSocket URL。');
    if (!/^wss?:\/\//i.test(endpoint)) throw new Error('Gateway URL 必須使用 ws:// 或 wss://。');
    if (location.protocol === 'https:' && endpoint.startsWith('ws://') && !/^ws:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(endpoint)) {
      throw new Error('此頁透過 HTTPS 開啟時，遠端 Gateway 必須使用 wss://。');
    }
    const socket = new WebSocket(endpoint);
    transport = { kind: 'opcua', socket };
    socket.addEventListener('open', () => {
      if (!transport || transport.socket !== socket) return;
      setStatus('GATEWAY CONNECTED', 'is-live');
      logEvent('OPC UA WebSocket gateway connected.');
    });
    socket.addEventListener('message', (event) => consumePayload(event.data));
    socket.addEventListener('error', () => { setStatus('GATEWAY ERROR', 'is-error'); logEvent('WebSocket gateway connection error.', 'event-fault'); });
    socket.addEventListener('close', () => { if (transport?.socket === socket) setStatus('GATEWAY DISCONNECTED', 'is-warn'); });
  }

  $('#telemetry-connect').addEventListener('click', async () => {
    stopTransport();
    setStatus('CONNECTING…', 'is-warn');
    $('#telemetry-connect').disabled = true;
    $('#telemetry-disconnect').hidden = false;
    $('#telemetry-error').textContent = '';
    try {
      if (sourceSelect.value === 'mqtt') await connectMqtt();
      else connectOpcUaGateway();
      $('#telemetry-disconnect').hidden = false;
      staleTimer = setInterval(() => {
        if (transport && lastMessageAt && Date.now() - lastMessageAt.getTime() > 15000) setStatus('NO DATA · CHECK CONNECTION', 'is-warn');
      }, 3000);
    } catch (error) {
      setStatus('CONNECTION FAILED', 'is-error');
      $('#telemetry-error').textContent = error.message || 'Connection could not be started.';
      logEvent(error.message || 'Connection could not be started.', 'event-fault');
      stopTransport();
      $('#telemetry-disconnect').hidden = true;
    } finally {
      $('#telemetry-connect').disabled = false;
    }
  });

  $('#telemetry-disconnect').addEventListener('click', () => {
    stopTransport();
    setStatus('DISCONNECTED', 'is-warn');
    $('#telemetry-disconnect').hidden = true;
    $('#telemetry-connect').hidden = false;
    logEvent('Telemetry source disconnected.');
  });

  $('#telemetry-demo').addEventListener('click', startDemo);
  sourceSelect.addEventListener('change', () => {
    stopTransport();
    updateSourceFields();
    setStatus(sourceSelect.value === 'demo' ? 'DEMO STREAM' : 'NOT CONNECTED', sourceSelect.value === 'demo' ? 'is-demo' : 'is-warn');
    $('#telemetry-disconnect').hidden = true;
    $('#telemetry-error').textContent = '';
    if (sourceSelect.value === 'demo') startDemo();
    else resetForExternalSource();
  });

  updateSourceFields();
  render();
  startDemo();
})();
