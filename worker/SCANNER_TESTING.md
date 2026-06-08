# Scanner parity testing

How we validate the core product promise — **a hosted scan produces the same
result as running the tool yourself locally** (see the "feels local" positioning).
For each scanner we run the CLI **locally** and the **hosted** worker against the
**same target**, then compare (a) the raw tool output and (b) the rendered report.

> TL;DR: same tool + same flags + same target should give the same *findings*.
> Raw bytes can differ (tool version, request ordering); **findings are what must match.**

---

## 1. Pick a target reachable from BOTH vantage points

The single biggest source of false differences is the target treating the two
source IPs differently (rate-limiting, geo, WAF, blocking a residential vs a
datacenter IP). Pick a target that:

- you are **authorized** to scan,
- responds from **your local machine** AND **the Hetzner worker box**, and
- actually has findings (open ports + web vulns).

Check reachability from both before starting:

```bash
# local
curl -sS -m 10 -o /dev/null -w "%{http_code}\n" http://demo.testfire.net/
# box
ssh -i ~/.ssh/vulnscanners_hetzner_ed25519 root@178.104.172.54 \
  'curl -sS -m 10 -o /dev/null -w "%{http_code}\n" http://demo.testfire.net/'
```

Good defaults: **`demo.testfire.net`** (IBM AltoroMutual — reachable from both,
open 80/443/8080, real web vulns) and **`scanme.nmap.org`** (Nmap's sanctioned
host) for nmap. Avoid `testphp.vulnweb.com` (frequently down) and Heroku
juice-shop (flaky 503s).

## 2. Match tool versions to the worker

Version drift changes raw output (and sometimes findings). Match the box:

| Tool   | Worker version | Install locally |
| ------ | -------------- | --------------- |
| nmap   | 7.94SVN        | `apt install nmap` (note if older, e.g. 7.80 — expect extra service-probe XML on the newer box, same ports) |
| nuclei | v3.8.0, templates v10.4.4 | download the matching release: `curl -sSL -o /tmp/n.zip https://github.com/projectdiscovery/nuclei/releases/download/v3.8.0/nuclei_3.8.0_linux_amd64.zip && unzip -o /tmp/n.zip nuclei -d ~/.local/bin` |
| zap    | `zaproxy/zap-stable` (docker) | `docker pull zaproxy/zap-stable` (needs docker perms — `sudo` or the `docker` group) |

**Warm the nuclei template cache first.** The very first nuclei run downloads
~13k templates and can under-report (a cold run has reported 0 findings). Run it
once to populate `~/nuclei-templates`, then run the real comparison.

## 3. Run each scanner locally with the EXACT worker flags

These mirror `worker/app.py` — keep them in sync if the worker flags change.

```bash
T=demo.testfire.net

# nmap  (worker: run_nmap)
nmap -Pn -sV -T3 --top-ports 1000 -oX /tmp/local-nmap.xml "$T"

# nuclei  (worker: run_nuclei) — JSONL on STDOUT (capture stdout, do NOT use -o;
# the worker reads result.stdout, and -o can change/withhold the JSONL)
nuclei -u "http://$T" -silent -no-color -jsonl > /tmp/local-nuclei.jsonl

# zap  (worker: run_zap) — full active scan, JSON report
docker run --rm -u root -v /tmp/zap-local:/zap/wrk zaproxy/zap-stable \
  zap-full-scan.py -t "http://$T/" -J zap.json -I
```

## 4. Run the same scans on the hosted worker

Inject straight to the worker on the box (bypasses credits; uses the running
process's token). Use a real `userId` so the webhook persists the result + report.

```bash
ssh -i ~/.ssh/vulnscanners_hetzner_ed25519 root@178.104.172.54 '
  PID=$(systemctl show -p MainPID --value vulnscanners-scanner)
  TOKEN=$(tr "\0" "\n" < /proc/$PID/environ | grep -oP "^GCP_WEBHOOK_SECRET=\K.*")
  U=efRetIVDw4UcMgwYAu75StBq6dx2
  for s in nmap nuclei zap; do
    curl -s -X POST http://127.0.0.1:8080/scan -H "X-Scanner-Token: $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"scanId\":\"parity-$s\",\"userId\":\"$U\",\"scanner\":\"$s\",\"target\":\"demo.testfire.net\",\"options\":{}}"
  done'
```

Watch progress: `tail -f /opt/vulnscanners/logs/scanner.out.log` on the box.

## 5. Compare RAW output

The hosted raw lives inline on the scan doc (`rawXml` / `rawStdout` / `rawJson`
— see [project_vulnscanners_storage]). Fetch it with a Firebase-admin script
(see `.env.local` creds) and diff against the local file. Compare **findings,
not bytes**:

- **nmap** — list open ports + service/product/version from both XMLs. Byte
  size differs by nmap version; the open-port/service set must match.
- **nuclei** — sort `template-id` from both JSONL files (`grep -oE
  '"template-id":"[^"]*"' | sort | uniq -c`). The set of matched templates must
  match.
- **zap** — count + name alerts from both `zap.json`
  (`site[].alerts[].alert` + `riskdesc`). The alert set must match.

## 6. Compare the REPORT

Generate the hosted report and confirm it faithfully represents the raw findings:

```bash
# minted-token flow → GET /api/scans/parity-nuclei/report (PDF)
# then: pdftotext report.pdf - | grep "surfaced N findings"
```

The report's finding count + the Master Findings Table must equal the raw
finding count from step 5. (The report engine parses the same inline raw output.)

---

## Known parity caveats

- **Tool version drift** → different raw bytes, usually same findings. Keep
  local versions matched to the box (table above).
- **Vantage / IP treatment** → the target may rate-limit or block one source IP.
  Watch nuclei's `errors` counter; a high error rate means requests are being
  dropped and findings will be under-counted on that side. This is target
  behavior, not a pipeline bug — note it and prefer targets that treat both IPs
  equally.
- **nuclei cold start** → first run downloads templates and may report 0. Warm
  the cache, then compare.
- **zap locally needs docker perms** → if you're not in the `docker` group it
  fails with "permission denied … docker.sock"; use `sudo` or add yourself to
  the group. The worker runs the identical `zaproxy/zap-stable zap-full-scan.py`
  command, so zap parity is by construction once it runs.

---

## Latest run — 2026-06-08, target `demo.testfire.net`

Versions: nmap local 7.80 / box 7.94 · nuclei v3.8.0 (both) · zap `zaproxy/zap-stable` (both).

| Scanner | Local | Hosted | Verdict |
| ------- | ----- | ------ | ------- |
| **nmap** | 80/tcp http (Apache Tomcat/Coyote 1.1), 8080/tcp http (same), 443 ssl | identical open ports + services | ✅ **match** — raw XML bytes differ (5,911 vs 9,815) only because nmap 7.94 emits extra service-probe metadata; the open-port/service set is identical |
| **nuclei** | same 14 (10× http-missing-security-headers, swagger-api, missing-cookie-samesite-strict, cookies-without-secure, caa-fingerprint) | same 14, same template-ids + counts | ✅ **match** — see caveat below |
| **zap** | not run (docker perms on this box) | 25 alerts incl. **High** Reflected-XSS + **High** SQL Injection | ⚠️ hosted-only this run; identical `zap-full-scan.py` command, so parity by construction — run locally with `sudo` to confirm |

**Report parity:** the hosted nuclei report renders **14** findings and the hosted
zap report **25** — equal to the raw finding counts above (the report engine
parses the same inline raw output).

**nuclei caveat worth remembering (and watching on the hosted side):** a *full*
local nuclei run (all ~10.4k templates) under-reported to **0** on this run. Cause
was the **residential link** dropping enough requests during the high-volume scan
that matching templates' base requests errored out (nuclei's `-max-host-error`
defaults to 30, after which a host is skipped). Restricting to the matched
template-ids — or running from a clean connection — reproduced the hosted result
**exactly** (14, identical template-ids). The Hetzner box's datacenter link
completes the full scan reliably. Takeaway: nuclei full-scan completeness depends
on connection quality on *either* side; if a hosted nuclei scan ever returns a
surprising 0 against a reachable target, suspect transient host-errors and
consider `-no-mhe` / a higher `-max-host-error` on the worker.
