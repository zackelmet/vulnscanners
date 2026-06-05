import json
import os
import queue
import re
import shlex
import subprocess
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from flask import Flask, jsonify, request

app = Flask(__name__)
job_queue = queue.Queue()

SCANNER_TOKEN = os.getenv("GCP_WEBHOOK_SECRET", "")
WEBHOOK_URL = os.getenv("VERCEL_WEBHOOK_URL", "")
WORKERS = int(os.getenv("SCAN_WORKERS", "2"))
MAX_TIMEOUT = int(os.getenv("SCAN_TIMEOUT_SECONDS", "1800"))
OUTPUT_ROOT = Path(os.getenv("SCAN_OUTPUT_DIR", "/opt/vulnscanners/output"))


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_target_url(target: str) -> str:
    if target.startswith("http://") or target.startswith("https://"):
        return target
    return f"http://{target}"


def _zap_summary(stdout: str, json_output: str):
    # zap-full-scan.py prints a tally line like:
    #   FAIL-NEW: 0  FAIL-INPROG: 0  WARN-NEW: 4  WARN-INPROG: 0  INFO: 0  IGNORE: 0  PASS: 138
    # The old code counted the word "alert" — which never appears in this
    # output, so alertsMentioned was always 0 (every scan looked clean).
    fails = warns = passes = 0
    m = re.search(r"FAIL-NEW:\s*(\d+).*?WARN-NEW:\s*(\d+).*?PASS:\s*(\d+)", stdout, re.S)
    if m:
        fails, warns, passes = int(m.group(1)), int(m.group(2)), int(m.group(3))

    # Prefer the true alert count from the structured -J JSON report.
    json_alerts = None
    if json_output:
        try:
            data = json.loads(json_output)
            json_alerts = sum(len(site.get("alerts", [])) for site in data.get("site", []))
        except Exception:
            json_alerts = None

    alerts = json_alerts if json_alerts is not None else (fails + warns)

    # If every HTTP response ZAP saw was a 5xx (and nothing FAILed), the target
    # was effectively down — the active scan had nothing real to test. Flag it
    # so the app shows "target unreachable" instead of a misleading clean report.
    statuses = re.findall(r"\((\d{3})\s", stdout)
    unreachable = bool(statuses) and all(s[0] == "5" for s in statuses) and fails == 0

    return {
        "scanner": "zap",
        "alertsMentioned": alerts,  # kept name for the app's summary line
        "failNew": fails,
        "warnNew": warns,
        "pass": passes,
        "targetUnreachable": unreachable,
        "rawPreview": stdout[:4000],
    }


def summarize_output(scanner: str, output: str, json_output: str = ""):
    if scanner == "nmap":
        hosts_up = output.lower().count("host is up")
        open_ports = output.lower().count(" open ")
        # With -Pn nmap always assumes the host is up, so "host down" no longer
        # signals unreachability. Zero responsive ports means nothing was
        # scannable (host filtered/blocked or genuinely has no open services).
        return {
            "scanner": scanner,
            "hostsUp": hosts_up,
            "openPorts": open_ports,
            "targetUnreachable": open_ports == 0,
            "rawPreview": output[:4000],
        }
    if scanner == "nuclei":
        # Output is now JSONL — one JSON object per finding.
        findings = sum(1 for line in output.splitlines() if line.strip().startswith("{"))
        return {"scanner": scanner, "findings": findings, "rawPreview": output[:4000]}
    if scanner == "zap":
        return _zap_summary(output, json_output)
    return {"scanner": scanner, "rawPreview": output[:4000]}


def run_nmap(target: str, options: dict):
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    xml_path = OUTPUT_ROOT / f"nmap-{os.getpid()}-{int(time.time()*1000)}.xml"
    # -Pn skips ICMP host-discovery: most firewalled/CDN'd hosts drop ping, and
    # without it nmap declares them "host down" and scans nothing. A vuln
    # scanner is told what to scan, so always treat the target as online.
    args = ["nmap", "-Pn", "-sV", "-T3", "-oX", str(xml_path), target]
    top_ports = options.get("topPorts") if isinstance(options, dict) else None
    if top_ports:
        args.extend(["--top-ports", str(top_ports)])
    proc = subprocess.run(args, capture_output=True, text=True, timeout=MAX_TIMEOUT)
    try:
        proc.xml_output = xml_path.read_text(encoding="utf-8", errors="ignore")
    except FileNotFoundError:
        proc.xml_output = ""
    finally:
        try:
            xml_path.unlink()
        except FileNotFoundError:
            pass
    return proc


def run_nuclei(target: str, options: dict):
    # -jsonl emits one JSON object per finding so the report engine can parse
    # structured fields (name, severity, CVE/CWE, matched-at) losslessly instead
    # of scraping the human-readable text lines.
    args = ["nuclei", "-u", ensure_target_url(target), "-silent", "-no-color", "-jsonl"]
    severity = options.get("severity") if isinstance(options, dict) else None
    if isinstance(severity, list) and severity:
        args.extend(["-severity", ",".join(str(s) for s in severity)])
    elif severity:
        args.extend(["-severity", str(severity)])
    return subprocess.run(args, capture_output=True, text=True, timeout=MAX_TIMEOUT)


def run_zap(target: str, options: dict):
    # ZAP always runs a FULL ACTIVE scan (spider + active scan) — no profile
    # choice. `-J` writes a structured JSON report into the mounted wrk dir,
    # which we read back and ship for lossless parsing. `-I` keeps a non-zero
    # exit (warnings) from being treated as a hard failure.
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    target_url = ensure_target_url(target)
    stamp = f"{os.getpid()}-{int(time.time()*1000)}"
    json_name = f"zap-{stamp}.json"
    json_path = OUTPUT_ROOT / json_name
    # Name the container so we can force-remove it if the scan times out.
    container_name = f"zap-{stamp}"
    args = [
        "docker", "run", "--rm", "--name", container_name, "-u", "root",
        "-v", f"{OUTPUT_ROOT}:/zap/wrk", "zaproxy/zap-stable",
        "zap-full-scan.py", "-t", target_url, "-J", json_name, "-I",
    ]
    try:
        proc = subprocess.run(args, capture_output=True, text=True, timeout=MAX_TIMEOUT)
    except subprocess.TimeoutExpired:
        # subprocess.run kills the `docker run` client on timeout, but the
        # container keeps running detached — force-remove it so it doesn't leak
        # CPU/RAM on the box. Re-raise so worker_loop reports the scan failed.
        subprocess.run(
            ["docker", "rm", "-f", container_name],
            capture_output=True, text=True, check=False,
        )
        raise
    try:
        proc.json_output = json_path.read_text(encoding="utf-8", errors="ignore")
    except FileNotFoundError:
        proc.json_output = ""
    finally:
        try:
            json_path.unlink()
        except FileNotFoundError:
            pass
    return proc


def run_scan(scanner: str, target: str, options: dict):
    if scanner == "nmap":
        return run_nmap(target, options)
    if scanner == "nuclei":
        return run_nuclei(target, options)
    if scanner == "zap":
        return run_zap(target, options)
    return subprocess.CompletedProcess(args=[scanner], returncode=1, stdout="", stderr=f"unsupported scanner: {scanner}")


def persist_output(scan_id: str, scanner: str, stdout_text: str, stderr_text: str, xml_text: str = ""):
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    base = OUTPUT_ROOT / f"{scan_id}_{scanner}"
    out_file = base.with_suffix(".stdout.txt")
    err_file = base.with_suffix(".stderr.txt")
    xml_file = base.with_suffix(".xml") if xml_text else None
    out_file.write_text(stdout_text or "", encoding="utf-8", errors="ignore")
    err_file.write_text(stderr_text or "", encoding="utf-8", errors="ignore")
    if xml_file is not None:
        xml_file.write_text(xml_text, encoding="utf-8", errors="ignore")
    return str(out_file), str(err_file), (str(xml_file) if xml_file else None)


# Retry schedule (seconds) for the result callback. A completed scan that
# fails to report back is a lost result + a wrongly-spent credit, so we retry
# transient failures (5xx / network) instead of dropping them. The receiver is
# idempotent (dedupes on eventId), so retries are safe. The stuck-scan reaper on
# the app side is the final backstop if every attempt here fails.
CALLBACK_RETRY_DELAYS = [0, 2, 5, 15, 30]


def post_callback(payload: dict):
    if not WEBHOOK_URL:
        return
    scan_id = payload.get("scanId", "?")
    last_err = None
    for attempt, delay in enumerate(CALLBACK_RETRY_DELAYS):
        if delay:
            time.sleep(delay)
        try:
            resp = requests.post(
                WEBHOOK_URL,
                headers={"Content-Type": "application/json", "x-webhook-secret": SCANNER_TOKEN},
                data=json.dumps(payload),
                timeout=20,
            )
            if resp.status_code < 500:
                # 2xx success, or 4xx (won't change on retry) — stop either way.
                if resp.status_code >= 400:
                    print(
                        f"[callback] non-retryable {resp.status_code} for scan={scan_id}: "
                        f"{resp.text[:300]!r}",
                        flush=True,
                    )
                return
            last_err = f"HTTP {resp.status_code}"
        except Exception as exc:
            last_err = f"{type(exc).__name__}: {str(exc)[:300]}"
        print(
            f"[callback] attempt {attempt + 1}/{len(CALLBACK_RETRY_DELAYS)} failed for "
            f"scan={scan_id}: {last_err}; retrying",
            flush=True,
        )
    print(
        f"[callback] GAVE UP for scan={scan_id} after {len(CALLBACK_RETRY_DELAYS)} attempts; "
        f"last_err={last_err} — app-side reaper will reconcile",
        flush=True,
    )


def worker_loop(worker_id: int):
    while True:
        job = job_queue.get()
        if job is None:
            return
        scan_id = job["scanId"]
        user_id = job["userId"]
        scanner = job["scanner"]
        target = job["target"]
        options = job.get("options") or {}
        event_id = f"evt_{scan_id}_{int(time.time())}_{worker_id}"
        started_at = utc_now_iso()
        start_ts = time.time()
        print(
            f"[worker={worker_id}] START scan_id={scan_id} scanner={scanner} target={target!r} options={options}",
            flush=True,
        )
        try:
            result = run_scan(scanner, target, options)
            completed_at = utc_now_iso()
            duration = int(time.time() - start_ts)
            xml_output = getattr(result, "xml_output", "") or ""
            json_output = getattr(result, "json_output", "") or ""
            stdout_len = len(result.stdout or "")
            stderr_len = len(result.stderr or "")
            xml_len = len(xml_output)
            print(
                f"[worker={worker_id}] END scan_id={scan_id} scanner={scanner} "
                f"rc={result.returncode} duration={duration}s "
                f"stdout_bytes={stdout_len} stderr_bytes={stderr_len} xml_bytes={xml_len}",
                flush=True,
            )
            if result.returncode == 0 and stdout_len == 0:
                # Completed cleanly but produced no output — surface it loudly
                # so we can debug instead of silently shipping an empty report.
                stderr_tail = (result.stderr or "")[-400:]
                print(
                    f"[worker={worker_id}] WARN scan_id={scan_id} completed with empty stdout; "
                    f"stderr_tail={stderr_tail!r}",
                    flush=True,
                )
            out_file, err_file, xml_file = persist_output(
                scan_id, scanner, result.stdout, result.stderr, xml_output
            )
            ok = result.returncode == 0
            payload = {
                "eventId": event_id,
                "scanId": scan_id,
                "userId": user_id,
                "scannerType": scanner,
                "status": "completed" if ok else "failed",
                "startedAt": started_at,
                "completedAt": completed_at,
                "durationSec": duration,
                "resultPath": out_file,
                "resultsSummary": summarize_output(scanner, result.stdout, json_output) if ok else None,
                "billingUnits": 1 if ok else None,
                "errorMessage": None if ok else (result.stderr or "scan failed")[:2000],
                "rawStdout": result.stdout or "",
                "rawXml": xml_output or None,
                "rawJson": json_output or None,
                "rawPayload": {
                    "stdout": result.stdout[:12000],
                    "stderr": result.stderr[:4000],
                    "stdoutPath": out_file,
                    "stderrPath": err_file,
                    "xmlPath": xml_file,
                    "cmd": " ".join(shlex.quote(str(x)) for x in (result.args or [])),
                },
            }
            post_callback(payload)
        except Exception as exc:
            duration = int(time.time() - start_ts)
            print(
                f"[worker={worker_id}] FAIL scan_id={scan_id} scanner={scanner} "
                f"duration={duration}s exception={type(exc).__name__}: {str(exc)[:500]}",
                flush=True,
            )
            post_callback({
                "eventId": event_id,
                "scanId": scan_id,
                "userId": user_id,
                "scannerType": scanner,
                "status": "failed",
                "startedAt": started_at,
                "completedAt": utc_now_iso(),
                "durationSec": duration,
                "resultPath": "local://scanner-output",
                "errorMessage": str(exc)[:2000],
                "rawPayload": {"exception": str(exc)},
            })
        finally:
            job_queue.task_done()


@app.get("/health")
def health():
    return jsonify({"ok": True, "queue_size": job_queue.qsize(), "workers": WORKERS})


@app.post("/scan")
def scan():
    token = request.headers.get("X-Scanner-Token", "")
    if SCANNER_TOKEN and token != SCANNER_TOKEN:
        return jsonify({"error": "unauthorized"}), 401
    data = request.get_json(silent=True) or {}
    required = ["scanId", "scanner", "target", "userId"]
    missing = [k for k in required if not data.get(k)]
    if missing:
        return jsonify({"error": f"missing fields: {', '.join(missing)}"}), 400
    if data["scanner"] not in {"nmap", "nuclei", "zap"}:
        return jsonify({"error": "invalid scanner"}), 400
    job_queue.put({
        "scanId": str(data["scanId"]),
        "scanner": str(data["scanner"]),
        "target": str(data["target"]),
        "userId": str(data["userId"]),
        "options": data.get("options") or {},
    })
    return jsonify({"queued": True, "queue_position": job_queue.qsize()}), 202


def start_workers():
    for i in range(WORKERS):
        threading.Thread(target=worker_loop, args=(i + 1,), daemon=True).start()


if __name__ == "__main__":
    start_workers()
    app.run(host="127.0.0.1", port=8080)
