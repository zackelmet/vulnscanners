#!/usr/bin/env python3
"""
Unified Scanner Server
Receives scan jobs via HTTP, queues them, runs nmap/openvas/zap,
uploads XML + PDF results to GCS, then POSTs back to the webapp webhook.
"""

import os
import json
import queue
import threading
import subprocess
import tempfile
import logging
import time
import requests
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify
from google.cloud import storage
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_LEFT, TA_CENTER

# ── Config ───────────────────────────────────────────────────────────────────
SCANNER_TOKEN   = os.environ.get("SCANNER_TOKEN", "")
GCS_BUCKET      = os.environ.get("GCS_BUCKET", "hosted-scanners-reports")
WEBAPP_WEBHOOK  = os.environ.get("WEBAPP_WEBHOOK_URL", "")
GCP_WEBHOOK_SECRET = os.environ.get("GCP_WEBHOOK_SECRET", "")
MAX_QUEUE_SIZE  = int(os.environ.get("MAX_QUEUE_SIZE", "50"))
WORKER_THREADS  = int(os.environ.get("WORKER_THREADS", "3"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

app = Flask(__name__)
job_queue: queue.Queue = queue.Queue(maxsize=MAX_QUEUE_SIZE)
gcs_client = storage.Client()

# ── Auth middleware ───────────────────────────────────────────────────────────
def require_token(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("X-Scanner-Token", "")
        if not SCANNER_TOKEN or token != SCANNER_TOKEN:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

# ── Routes ────────────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "queue_size": job_queue.qsize()}), 200

@app.route("/scan", methods=["POST"])
@require_token
def enqueue_scan():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    required = ["scanId", "scanner", "target"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"Missing field: {field}"}), 400

    scanner = data["scanner"].lower()
    if scanner not in ("nmap", "openvas", "zap"):
        return jsonify({"error": "scanner must be nmap, openvas, or zap"}), 400

    job = {
        "scanId":   data["scanId"],
        "scanner":  scanner,
        "target":   data["target"],
        "options":  data.get("options", {}),
        "userId":   data.get("userId", ""),
        "queued_at": datetime.utcnow().isoformat(),
    }

    try:
        job_queue.put_nowait(job)
        log.info(f"Queued job {job['scanId']} ({scanner}) → {job['target']}")
        return jsonify({"status": "queued", "scanId": job["scanId"], "queue_position": job_queue.qsize()}), 202
    except queue.Full:
        return jsonify({"error": "Queue full, try again later"}), 503

@app.route("/status", methods=["GET"])
@require_token
def status():
    return jsonify({
        "queue_size": job_queue.qsize(),
        "max_queue":  MAX_QUEUE_SIZE,
        "workers":    WORKER_THREADS,
    }), 200

# ── Worker ────────────────────────────────────────────────────────────────────
def worker(worker_id: int):
    log.info(f"Worker {worker_id} started")
    while True:
        job = job_queue.get()
        try:
            process_job(job)
        except Exception as e:
            log.error(f"Worker {worker_id} unhandled error on {job['scanId']}: {e}", exc_info=True)
            notify_webapp(job["scanId"], job["scanner"], "failed", {}, str(e), user_id=job.get("userId", ""))
        finally:
            job_queue.task_done()

def process_job(job: dict):
    scan_id = job["scanId"]
    scanner = job["scanner"]
    target  = job["target"]
    user_id = job.get("userId", "")
    log.info(f"Processing {scan_id}: {scanner} → {target}")

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        try:
            if scanner == "nmap":
                xml_path, summary = run_nmap(target, tmp, job.get("options", {}))
            elif scanner == "openvas":
                xml_path, summary = run_openvas(target, tmp, job.get("options", {}))
            elif scanner == "zap":
                xml_path, summary = run_zap(target, tmp, job.get("options", {}))
            else:
                raise ValueError(f"Unknown scanner: {scanner}")

            pdf_path = generate_pdf(scan_id, scanner, target, xml_path, tmp)
            xml_url  = upload_to_gcs(scan_id, scanner, xml_path, "xml")
            pdf_url  = upload_to_gcs(scan_id, scanner, pdf_path, "pdf")

            log.info(f"Completed {scan_id}: xml={xml_url} pdf={pdf_url}")
            notify_webapp(scan_id, scanner, "completed", {
                "xmlUrl":  xml_url,
                "pdfUrl":  pdf_url,
                "summary": summary,
            }, user_id=user_id)

        except subprocess.TimeoutExpired:
            log.error(f"Timeout on {scan_id}")
            notify_webapp(scan_id, scanner, "timeout", {}, "Scan timed out", user_id=user_id)
        except Exception as e:
            log.error(f"Failed {scan_id}: {e}", exc_info=True)
            notify_webapp(scan_id, scanner, "failed", {}, str(e), user_id=user_id)

# ── Scanners ──────────────────────────────────────────────────────────────────
def run_nmap(target: str, tmp: Path, options: dict) -> tuple[Path, dict]:
    xml_out = tmp / "nmap.xml"
    flags = options.get("flags", "-sV -sC -T4 --open")
    cmd = ["nmap"] + flags.split() + ["-oX", str(xml_out), target]
    log.info(f"nmap cmd: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0 and not xml_out.exists():
        raise RuntimeError(f"nmap failed: {result.stderr}")
    summary = parse_nmap_summary(xml_out)
    return xml_out, summary

def parse_nmap_summary(xml_path: Path) -> dict:
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        hosts = root.findall("host")
        open_ports = []
        for host in hosts:
            for port in host.findall(".//port"):
                state = port.find("state")
                if state is not None and state.get("state") == "open":
                    svc = port.find("service")
                    open_ports.append({
                        "port":     port.get("portid"),
                        "protocol": port.get("protocol"),
                        "service":  svc.get("name", "") if svc is not None else "",
                        "version":  svc.get("product", "") + " " + svc.get("version", "") if svc is not None else "",
                    })
        return {"hosts_scanned": len(hosts), "open_ports": open_ports, "open_port_count": len(open_ports)}
    except Exception:
        return {}

def run_openvas(target: str, tmp: Path, options: dict) -> tuple[Path, dict]:
    """
    Run OpenVAS (GVM) community scan via gvm-cli.
    Requires gvm-cli and openvas/gvmd to be installed and running.
    """
    xml_out = tmp / "openvas.xml"
    scan_config = options.get("scan_config", "daba56c8-73ec-11df-a475-002264764cea")  # Full and fast

    script = tmp / "openvas_scan.gmp"
    script.write_text(f"""
from gvm.protocols.gmp import Gmp
from gvm.connections import UnixSocketConnection
from gvm.transforms import EtreeTransform
import time, sys

conn = UnixSocketConnection(path="/run/gvmd/gvmd.sock")
transform = EtreeTransform()
with Gmp(connection=conn, transform=transform) as gmp:
    gmp.authenticate("admin", open("/etc/gvm/admin_password").read().strip())
    res = gmp.create_target(name="scan-{target}-{int(time.time())}", hosts="{target}", port_list_id="33d0cd82-57c6-11e1-8ed1-406186ea4fc5")
    target_id = res.get("id")
    res = gmp.create_task(name="scan-{target}", config_id="{scan_config}", target_id=target_id, scanner_id="08b69003-5fc2-4037-a479-93b440211c73")
    task_id = res.get("id")
    gmp.start_task(task_id)
    while True:
        status = gmp.get_task(task_id)
        progress = int(status.find("task/progress").text or 0)
        task_status = status.find("task/status").text
        if task_status in ("Done", "Stopped") or progress >= 100:
            break
        time.sleep(10)
    report_id = status.find(".//last_report/report").get("id")
    report = gmp.get_report(report_id, filter_string="apply_overrides=0 levels=hmlg rows=1000", report_format_id="a994b278-1f62-11e1-96ac-406186ea4fc5")
    import xml.etree.ElementTree as ET
    ET.ElementTree(report).write(sys.argv[1])
""")

    result = subprocess.run(
        ["gvm-script", "--gmp-username", "admin", "--gmp-password",
         open("/etc/gvm/admin_password").read().strip(),
         "socket", "--sockpath", "/run/gvmd/gvmd.sock", "--", str(script), str(xml_out)],
        capture_output=True, text=True, timeout=3600
    )
    if result.returncode != 0 and not xml_out.exists():
        raise RuntimeError(f"OpenVAS failed (rc={result.returncode}): {result.stderr[:500]}")
    summary = parse_openvas_summary(xml_out)
    return xml_out, summary

def parse_openvas_summary(xml_path: Path) -> dict:
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        results = root.findall(".//result")
        severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
        findings = []
        for r in results:
            sev_el = r.find("severity")
            sev = float(sev_el.text or 0) if sev_el is not None else 0
            if sev >= 9.0:     bucket = "critical"
            elif sev >= 7.0:   bucket = "high"
            elif sev >= 4.0:   bucket = "medium"
            elif sev > 0:      bucket = "low"
            else:              bucket = "info"
            severity_counts[bucket] += 1
            name_el = r.find("name")
            findings.append({"name": name_el.text if name_el is not None else "", "severity": sev, "bucket": bucket})
        return {"total_findings": len(results), "severity_counts": severity_counts, "findings": findings[:20]}
    except Exception:
        return {}

def run_zap(target: str, tmp: Path, options: dict) -> tuple[Path, dict]:
    """
    Run OWASP ZAP via the snap zaproxy CLI in daemon mode with the Python ZAP API client.
    Falls back to writing an empty report if the API client is unavailable.
    """
    import socket
    import time as _time
    xml_out = tmp / "zap.xml"
    scan_type = options.get("scan_type", "baseline")  # baseline | full

    # ZAP is installed as snap → /snap/bin/zaproxy
    zap_bin = "/snap/bin/zaproxy"
    zap_port = 8090
    api_key  = "hackeranalytics-zap-key"

    # Start ZAP in daemon mode
    zap_cmd = [
        zap_bin, "-daemon",
        "-port", str(zap_port),
        "-config", f"api.key={api_key}",
        "-config", "api.addrs.addr.name=.*",
        "-config", "api.addrs.addr.regex=true",
        "-config", "connection.timeoutInSecs=60",
        "-config", "scanner.threadPerHost=4",
    ]
    log.info(f"ZAP daemon cmd: {' '.join(zap_cmd)}")
    zap_proc = subprocess.Popen(
        zap_cmd,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        env={**os.environ, "HOME": "/home/scanner"}
    )

    try:
        # Wait up to 120 s for ZAP to bind its port
        deadline = _time.time() + 120
        while _time.time() < deadline:
            try:
                with socket.create_connection(("127.0.0.1", zap_port), timeout=2):
                    break
            except OSError:
                _time.sleep(2)
        else:
            raise RuntimeError("ZAP daemon did not start within 120 s")

        log.info("ZAP daemon ready")

        try:
            from zapv2 import ZAPv2
            zap = ZAPv2(apikey=api_key, proxies={"http": f"http://127.0.0.1:{zap_port}", "https": f"http://127.0.0.1:{zap_port}"})
        except ImportError:
            log.warning("zapv2 not installed — using requests fallback")
            zap = None

        base_url = f"http://127.0.0.1:{zap_port}/JSON"
        headers  = {"Accept": "application/json"}

        def zap_get(path, params=None):
            p = {"apikey": api_key, **(params or {})}
            r = requests.get(f"{base_url}/{path}", params=p, headers=headers, timeout=30)
            r.raise_for_status()
            return r.json()

        # Spider the target
        log.info(f"ZAP spider: {target}")
        r = zap_get("spider/action/scan", {"url": target, "maxChildren": "20", "recurse": "true"})
        spider_id = r.get("scan", "0")
        timeout_spider = _time.time() + 600  # 10 min max
        while _time.time() < timeout_spider:
            r = zap_get("spider/view/status", {"scanId": spider_id})
            pct = int(r.get("status", 100))
            log.info(f"ZAP spider {pct}%")
            if pct >= 100:
                break
            _time.sleep(5)

        if scan_type == "full":
            # Active scan
            log.info(f"ZAP active scan: {target}")
            r = zap_get("ascan/action/scan", {"url": target, "recurse": "true", "inScopeOnly": "false"})
            ascan_id = r.get("scan", "0")
            timeout_ascan = _time.time() + 1200  # 20 min max
            while _time.time() < timeout_ascan:
                r = zap_get("ascan/view/status", {"scanId": ascan_id})
                pct = int(r.get("status", 100))
                log.info(f"ZAP active scan {pct}%")
                if pct >= 100:
                    break
                _time.sleep(10)

        # Export XML report
        report_url = f"http://127.0.0.1:{zap_port}/OTHER/core/other/xmlreport/"
        rp = requests.get(report_url, params={"apikey": api_key}, timeout=30)
        rp.raise_for_status()
        xml_out.write_bytes(rp.content)
        log.info(f"ZAP XML report saved ({len(rp.content)} bytes)")

    finally:
        zap_proc.terminate()
        try:
            zap_proc.wait(timeout=15)
        except subprocess.TimeoutExpired:
            zap_proc.kill()

    if not xml_out.exists() or xml_out.stat().st_size < 50:
        xml_out.write_text(
            f'<?xml version="1.0"?><OWASPZAPReport version="2.14">'
            f'<site host="{target}"><alerts></alerts></site></OWASPZAPReport>'
        )
    summary = parse_zap_summary(xml_out)
    return xml_out, summary

def parse_zap_summary(xml_path: Path) -> dict:
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        alerts = root.findall(".//alertitem")
        risk_counts = {"high": 0, "medium": 0, "low": 0, "informational": 0}
        findings = []
        for a in alerts:
            risk_el  = a.find("riskdesc")
            name_el  = a.find("alert")
            desc_el  = a.find("desc")
            risk_str = (risk_el.text or "").split(" ")[0].lower() if risk_el is not None else "informational"
            if risk_str in risk_counts:
                risk_counts[risk_str] += 1
            findings.append({
                "name": name_el.text if name_el is not None else "",
                "risk": risk_str,
                "description": (desc_el.text or "")[:200] if desc_el is not None else "",
            })
        return {"total_alerts": len(alerts), "risk_counts": risk_counts, "findings": findings[:20]}
    except Exception:
        return {}

# ── PDF Generation ────────────────────────────────────────────────────────────
def generate_pdf(scan_id: str, scanner: str, target: str, xml_path: Path, tmp: Path) -> Path:
    pdf_path = tmp / f"{scanner}.pdf"
    doc = SimpleDocTemplate(str(pdf_path), pagesize=letter,
                            rightMargin=0.75*inch, leftMargin=0.75*inch,
                            topMargin=0.75*inch, bottomMargin=0.75*inch)
    styles = getSampleStyleSheet()
    story = []

    # Title
    title_style = ParagraphStyle("Title", parent=styles["Title"], fontSize=20,
                                  textColor=colors.HexColor("#1a1a2e"), spaceAfter=6)
    sub_style   = ParagraphStyle("Sub",   parent=styles["Normal"], fontSize=10,
                                  textColor=colors.HexColor("#666666"), spaceAfter=4)
    h2_style    = ParagraphStyle("H2",    parent=styles["Heading2"], fontSize=13,
                                  textColor=colors.HexColor("#1a1a2e"), spaceBefore=14, spaceAfter=6)
    body_style  = ParagraphStyle("Body",  parent=styles["Normal"], fontSize=9, leading=13)
    code_style  = ParagraphStyle("Code",  parent=styles["Code"],   fontSize=8, leading=11,
                                  backColor=colors.HexColor("#f5f5f5"))

    story.append(Paragraph("Hacker Analytics", title_style))
    story.append(Paragraph(f"Scan Report — {scanner.upper()}", sub_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e0e0e0")))
    story.append(Spacer(1, 0.1*inch))

    # Meta table
    meta = [
        ["Scan ID",  scan_id],
        ["Target",   target],
        ["Scanner",  scanner.upper()],
        ["Date",     datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")],
    ]
    t = Table(meta, colWidths=[1.5*inch, 5*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (0, -1), colors.HexColor("#f0f4f8")),
        ("FONTNAME",    (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 9),
        ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#d0d0d0")),
        ("PADDING",     (0, 0), (-1, -1), 5),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.2*inch))

    # Scanner-specific content
    if scanner == "nmap":
        _add_nmap_content(story, xml_path, h2_style, body_style, code_style)
    elif scanner == "openvas":
        _add_openvas_content(story, xml_path, h2_style, body_style)
    elif scanner == "zap":
        _add_zap_content(story, xml_path, h2_style, body_style)

    # Footer note
    story.append(Spacer(1, 0.3*inch))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e0e0e0")))
    story.append(Paragraph(
        "This report was automatically generated by Hacker Analytics. "
        "Results are provided for informational purposes. Always validate findings manually.",
        ParagraphStyle("Footer", parent=styles["Normal"], fontSize=7, textColor=colors.grey)
    ))

    doc.build(story)
    return pdf_path

def _add_nmap_content(story, xml_path, h2, body, code):
    story.append(Paragraph("Open Ports & Services", h2))
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        rows = [["Port", "Protocol", "State", "Service", "Version"]]
        for host in root.findall("host"):
            addr = host.find("address")
            ip = addr.get("addr", "") if addr is not None else ""
            for port in host.findall(".//port"):
                state = port.find("state")
                svc   = port.find("service")
                if state is not None and state.get("state") == "open":
                    rows.append([
                        port.get("portid", ""),
                        port.get("protocol", ""),
                        state.get("state", ""),
                        svc.get("name", "") if svc is not None else "",
                        ((svc.get("product", "") + " " + svc.get("version", "")).strip()) if svc is not None else "",
                    ])
        if len(rows) == 1:
            story.append(Paragraph("No open ports found.", body))
        else:
            t = Table(rows, colWidths=[0.7*inch, 0.8*inch, 0.7*inch, 1.2*inch, 3.3*inch])
            t.setStyle(TableStyle([
                ("BACKGROUND",  (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
                ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
                ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE",    (0, 0), (-1, -1), 8),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7f9fc")]),
                ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#d0d0d0")),
                ("PADDING",     (0, 0), (-1, -1), 4),
            ]))
            story.append(t)

        # Scripts/vulns
        scripts = root.findall(".//script")
        if scripts:
            story.append(Paragraph("Script Output", h2))
            for s in scripts[:30]:
                story.append(Paragraph(f"<b>{s.get('id', '')}</b>: {s.get('output', '')[:300]}", body))
    except Exception as e:
        story.append(Paragraph(f"Could not parse XML: {e}", body))

def _add_openvas_content(story, xml_path, h2, body):
    story.append(Paragraph("Vulnerability Findings", h2))
    risk_colors = {
        "critical": colors.HexColor("#7b0000"),
        "high":     colors.HexColor("#c0392b"),
        "medium":   colors.HexColor("#e67e22"),
        "low":      colors.HexColor("#2980b9"),
        "info":     colors.HexColor("#7f8c8d"),
    }
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        results = root.findall(".//result")
        if not results:
            story.append(Paragraph("No findings.", body))
            return
        rows = [["Severity", "CVSS", "Finding", "Host"]]
        for r in results[:50]:
            sev_el  = r.find("severity")
            name_el = r.find("name")
            host_el = r.find("host")
            sev = float(sev_el.text or 0) if sev_el is not None else 0
            bucket = "critical" if sev >= 9 else "high" if sev >= 7 else "medium" if sev >= 4 else "low" if sev > 0 else "info"
            rows.append([bucket.upper(), f"{sev:.1f}",
                         (name_el.text or "")[:80] if name_el is not None else "",
                         host_el.text if host_el is not None else ""])
        t = Table(rows, colWidths=[0.9*inch, 0.7*inch, 4.4*inch, 1.2*inch])
        t.setStyle(TableStyle([
            ("BACKGROUND",  (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
            ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
            ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",    (0, 0), (-1, -1), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7f9fc")]),
            ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#d0d0d0")),
            ("PADDING",     (0, 0), (-1, -1), 4),
        ]))
        story.append(t)
    except Exception as e:
        story.append(Paragraph(f"Could not parse XML: {e}", body))

def _add_zap_content(story, xml_path, h2, body):
    story.append(Paragraph("Web Application Findings", h2))
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        alerts = root.findall(".//alertitem")
        if not alerts:
            story.append(Paragraph("No alerts found.", body))
            return
        rows = [["Risk", "Alert", "URL (sample)"]]
        for a in alerts[:50]:
            risk_el = a.find("riskdesc")
            name_el = a.find("alert")
            uri_el  = a.find(".//uri")
            rows.append([
                (risk_el.text or "").split(" ")[0] if risk_el is not None else "",
                (name_el.text or "")[:80] if name_el is not None else "",
                (uri_el.text or "")[:60] if uri_el is not None else "",
            ])
        t = Table(rows, colWidths=[1.0*inch, 3.5*inch, 2.7*inch])
        t.setStyle(TableStyle([
            ("BACKGROUND",  (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
            ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
            ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",    (0, 0), (-1, -1), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7f9fc")]),
            ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#d0d0d0")),
            ("PADDING",     (0, 0), (-1, -1), 4),
        ]))
        story.append(t)
    except Exception as e:
        story.append(Paragraph(f"Could not parse XML: {e}", body))

# ── GCS Upload ────────────────────────────────────────────────────────────────
def upload_to_gcs(scan_id: str, scanner: str, local_path: Path, ext: str) -> str:
    bucket = gcs_client.bucket(GCS_BUCKET)
    blob_name = f"{scan_id}/{scanner}.{ext}"
    blob = bucket.blob(blob_name)
    blob.upload_from_filename(str(local_path))
    blob.make_public()
    url = f"https://storage.googleapis.com/{GCS_BUCKET}/{blob_name}"
    log.info(f"Uploaded {blob_name} → {url}")
    return url

# ── Webhook back to webapp ─────────────────────────────────────────────────────
def notify_webapp(scan_id: str, scanner: str, status: str, results: dict, error: str = "", user_id: str = ""):
    """POST scan result back to webapp webhook.
    Field names match what /api/scans/webhook/route.ts expects.
    """
    if not WEBAPP_WEBHOOK:
        log.warning("WEBAPP_WEBHOOK_URL not set, skipping webhook")
        return

    xml_url  = results.get("xmlUrl", "")
    pdf_url  = results.get("pdfUrl", "")
    summary  = results.get("summary", {})

    payload = {
        # identity
        "scanId":               scan_id,
        "userId":               user_id,
        "scannerType":          scanner,
        # status
        "status":               status,
        "errorMessage":         error or None,
        "timestamp":            datetime.utcnow().isoformat(),
        # XML result (stored in GCS as public URL)
        "gcpXmlStorageUrl":     xml_url or None,
        # PDF report (stored in GCS as public URL)
        "gcpReportStorageUrl":  pdf_url or None,
        # summary dict → resultsSummary
        "resultsSummary":       summary or None,
        # legacy aliases — keep for backward compat
        "gcpStorageUrl":        xml_url or None,
        "summary":              summary or None,
        "results":              results,
    }
    headers = {"Content-Type": "application/json"}
    if GCP_WEBHOOK_SECRET:
        headers["X-Webhook-Secret"] = GCP_WEBHOOK_SECRET
    for attempt in range(3):
        try:
            resp = requests.post(WEBAPP_WEBHOOK, json=payload, headers=headers, timeout=15)
            log.info(f"Webhook {scan_id}: HTTP {resp.status_code}")
            if resp.status_code < 500:
                return
            log.warning(f"Webhook {scan_id} got {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            log.warning(f"Webhook attempt {attempt+1} failed: {e}")
        time.sleep(2 ** attempt)
    log.error(f"All webhook attempts failed for {scan_id}")

# ── Startup ───────────────────────────────────────────────────────────────────
def start_workers():
    for i in range(WORKER_THREADS):
        t = threading.Thread(target=worker, args=(i,), daemon=True)
        t.start()
    log.info(f"Started {WORKER_THREADS} worker threads")

if __name__ == "__main__":
    if not SCANNER_TOKEN:
        log.warning("⚠️  SCANNER_TOKEN not set — all requests will be rejected")
    start_workers()
    log.info(f"Scanner server starting on :5000 | bucket={GCS_BUCKET} | webhook={WEBAPP_WEBHOOK}")
    app.run(host="0.0.0.0", port=5000, threaded=True)
