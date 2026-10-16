#!/usr/bin/env python3
"""Publish synthetic FlowForge telemetry to a local MQTT broker (MQTT 3.1.1, QoS 0).

The script uses only Python's standard library. Run a broker separately, for example:
    mosquitto -c tools/mosquitto-test.conf -v
    python3 tools/mock_mqtt_publisher.py --interval 2

The default ``auto`` scenario cycles through normal, warning, fault and recovery
states. Use --scenario to pin a condition for a repeatable manual test.
"""
from __future__ import annotations

import argparse
import json
import math
import random
import socket
import struct
import sys
import time
from datetime import datetime, timezone

STATIONS = (
    ("Receiving", 94.0, 0.38),
    ("CNC_01", 89.0, 0.52),
    ("Inspection", 91.0, 0.46),
    ("Assembly", 82.0, 0.39),
    ("Packaging", 88.0, 0.43),
)


def encode_remaining_length(length: int) -> bytes:
    """Encode an MQTT variable-byte integer."""
    if length < 0 or length > 268_435_455:
        raise ValueError("MQTT packet is too large")
    encoded = bytearray()
    while True:
        digit = length % 128
        length //= 128
        if length:
            digit |= 0x80
        encoded.append(digit)
        if not length:
            return bytes(encoded)


def mqtt_string(value: str) -> bytes:
    data = value.encode("utf-8")
    if len(data) > 65_535:
        raise ValueError("MQTT UTF-8 field is too long")
    return struct.pack("!H", len(data)) + data


def recv_exact(connection: socket.socket, size: int) -> bytes:
    chunks = bytearray()
    while len(chunks) < size:
        chunk = connection.recv(size - len(chunks))
        if not chunk:
            raise ConnectionError("broker closed the connection")
        chunks.extend(chunk)
    return bytes(chunks)


def connect_packet(client_id: str, keepalive: int = 120) -> bytes:
    # MQTT 3.1.1 CONNECT: clean session, no username/password.
    variable_header = mqtt_string("MQTT") + bytes((4, 0x02)) + struct.pack("!H", keepalive)
    body = variable_header + mqtt_string(client_id)
    return bytes((0x10,)) + encode_remaining_length(len(body)) + body


def publish_packet(topic: str, payload: bytes) -> bytes:
    body = mqtt_string(topic) + payload
    return bytes((0x30,)) + encode_remaining_length(len(body)) + body


def wait_for_connack(connection: socket.socket) -> None:
    header = recv_exact(connection, 2)
    if header[0] != 0x20:
        raise ConnectionError(f"expected MQTT CONNACK (0x20), received 0x{header[0]:02x}")
    body = recv_exact(connection, header[1])
    if len(body) != 2 or body[0] != 0:
        code = body[1] if len(body) > 1 else "unknown"
        raise ConnectionError(f"broker rejected CONNECT (return code {code})")


def phase_for(sequence: int, scenario: str) -> str:
    if scenario != "auto":
        return scenario
    step = sequence % 12
    if step < 4:
        return "normal"
    if step < 6:
        return "warning"
    if step < 8:
        return "fault"
    return "recovery"


def transition_events(sequence: int, phase: str, scenario: str, now: str) -> list[dict]:
    if scenario == "auto":
        if sequence == 0 or phase == phase_for(sequence - 1, scenario):
            return []
    elif sequence > 0 or phase not in ("warning", "fault"):
        return []

    event_by_phase = {
        "warning": ("warning", "LOW_OEE", "Assembly", "Warning: Assembly OEE dropped below the 70% test threshold."),
        "fault": ("critical", "MACHINE_FAULT", "CNC_01", "Fault: CNC 01 drive fault; simulated equipment state is FAULT."),
        "recovery": ("info", "FAULT_CLEARED", "CNC_01", "Recovery: CNC 01 fault cleared; telemetry has returned to normal."),
        "normal": ("info", "SCENARIO_RESET", "Factory", "Scenario reset: factory telemetry is back to normal."),
    }
    severity, code, source, message = event_by_phase[phase]
    return [{"severity": severity, "code": code, "source": source, "message": message, "timestamp": now}]


def make_message(sequence: int, rng: random.Random, scenario: str = "auto") -> dict:
    now = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    phase = phase_for(sequence, scenario)
    increment = rng.randint(0, 1) if phase == "fault" else rng.randint(2, 6)
    output = 420 + sequence * increment
    wip = max(4, 19 + round(5 * math.sin(sequence / 3)) + rng.randint(-1, 1))
    agv_utilization = max(35, min(96, round(68 + 18 * math.sin(sequence / 4) + rng.uniform(-3, 3))))
    tags = [
        {"tag": "factory.production.output", "value": output, "unit": "units/shift", "timestamp": now},
        {"tag": "factory.wip", "value": wip, "unit": "units", "timestamp": now},
        {"tag": "factory.agv.utilization", "value": agv_utilization, "unit": "%", "timestamp": now},
    ]
    for index, (name, nominal_oee, cycle_time) in enumerate(STATIONS):
        state = "IDLE" if sequence > 0 and (sequence + index * 3) % 17 == 0 else "RUNNING"
        oee = round(max(55, min(99, nominal_oee + rng.uniform(-2.2, 2.2))), 1)
        actual_cycle = round(cycle_time * rng.uniform(0.97, 1.04), 3)
        if phase == "warning" and name == "Assembly":
            oee = round(rng.uniform(63.0, 68.0), 1)
        elif phase == "fault" and name == "CNC_01":
            state, oee, actual_cycle = "FAULT", 0, round(cycle_time * 3.5, 3)
        tags.extend((
            {"tag": f"{name}.state", "value": state, "timestamp": now},
            {"tag": f"{name}.oee", "value": oee, "unit": "%", "timestamp": now},
            {"tag": f"{name}.cycleTime", "value": actual_cycle, "unit": "min", "timestamp": now},
        ))
    return {
        "type": "telemetry",
        "source": "mock-mqtt-publisher",
        "scenario": phase,
        "tags": tags,
        "events": transition_events(sequence, phase, scenario, now),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Publish synthetic FlowForge factory telemetry and test alarms to MQTT.")
    parser.add_argument("--host", default="127.0.0.1", help="MQTT TCP broker host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=1883, help="MQTT TCP broker port (default: 1883)")
    parser.add_argument("--topic", default="flowforge/factory/demo/telemetry", help="publish topic (default matches the dashboard filter)")
    parser.add_argument("--interval", type=float, default=2.0, help="seconds between samples (default: 2)")
    parser.add_argument("--count", type=int, default=0, help="number of messages; 0 runs until Ctrl+C (default: 0)")
    parser.add_argument("--scenario", choices=("auto", "normal", "warning", "fault"), default="auto", help="auto-cycle anomalies or pin one test condition (default: auto)")
    parser.add_argument("--seed", type=int, default=None, help="optional random seed for repeatable numeric values")
    parser.add_argument("--client-id", default="flowforge-mock-publisher", help="MQTT client identifier")
    args = parser.parse_args()
    if args.port < 1 or args.port > 65_535:
        parser.error("--port must be between 1 and 65535")
    if args.interval <= 0:
        parser.error("--interval must be greater than zero")
    if args.count < 0:
        parser.error("--count must be zero (infinite) or a positive integer")
    if not args.topic or "+" in args.topic or "#" in args.topic:
        parser.error("--topic must be a publish topic, not a wildcard filter")
    return args


def main() -> int:
    args = parse_args()
    rng = random.Random(args.seed)
    try:
        print(f"Connecting to MQTT broker {args.host}:{args.port} …", flush=True)
        with socket.create_connection((args.host, args.port), timeout=5) as connection:
            connection.settimeout(5)
            connection.sendall(connect_packet(args.client_id))
            wait_for_connack(connection)
            connection.settimeout(None)
            print(f"Connected; publishing to {args.topic} every {args.interval:g}s. Press Ctrl+C to stop.", flush=True)
            sequence = 0
            while args.count == 0 or sequence < args.count:
                message = make_message(sequence, rng, args.scenario)
                encoded = json.dumps(message, separators=(",", ":")).encode("utf-8")
                connection.sendall(publish_packet(args.topic, encoded))
                sequence += 1
                values = {item["tag"]: item["value"] for item in message["tags"]}
                event_label = message["events"][0]["code"] if message["events"] else "-"
                print(f"[{sequence}] phase={message['scenario']} output={values['factory.production.output']} WIP={values['factory.wip']} AGV={values['factory.agv.utilization']}% event={event_label}", flush=True)
                if args.count == 0 or sequence < args.count:
                    time.sleep(args.interval)
            connection.sendall(b"\xe0\x00")  # MQTT DISCONNECT
        return 0
    except KeyboardInterrupt:
        print("\nStopped by user.", file=sys.stderr)
        return 130
    except (OSError, ConnectionError, ValueError) as exc:
        print(f"MQTT test publisher error: {exc}", file=sys.stderr)
        print("Start a broker first; see tools/mosquitto-test.conf and docs/telemetry.md.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
