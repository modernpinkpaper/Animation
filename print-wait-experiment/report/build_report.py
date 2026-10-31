"""Build a single self-contained, private HTML report from results/summary.json (no network, no external assets)."""
import json, sys, html
R = json.load(open(sys.argv[1])); out = sys.argv[2]
S, W, A = R["by_side"], R["within_pc_test"], R["alerts"]
bp = {d["printer"]: d for d in R["by_printer"]}

def bar_rows(items, maxv, fmt, color_of):
    rows = []
    for i, (label, v) in enumerate(items):
        w = max(1.5, 100 * v / maxv)
        rows.append(f'<div class="row"><span class="lab">{html.escape(label)}</span>'
                    f'<span class="track"><span class="fill" style="width:{w:.1f}%;background:var({color_of(label)})" title="{html.escape(label)}: {fmt(v)}"></span></span>'
                    f'<span class="val">{fmt(v)}</span></div>')
    return "".join(rows)

col = lambda l: "--right" if l in ("Right", "Extra right", "Right-hand printers") else ("--left" if l in ("Left", "Extra left", "Left-hand printers") else "--label")
printers = [(d["printer"], d["median_s"]) for d in sorted(R["by_printer"], key=lambda d: d["median_s"])]
share = f'''
<div class="pair"><div><h4>Share of jobs</h4>{bar_rows([("Left-hand printers", S["left"]["pct_jobs"]), ("Right-hand printers", S["right"]["pct_jobs"])], 100, lambda v: f"{v:.0f}%", col)}</div>
<div><h4>Share of all queue waiting</h4>{bar_rows([("Left-hand printers", S["left"]["pct_wait"]), ("Right-hand printers", S["right"]["pct_wait"])], 100, lambda v: f"{v:.0f}%", col)}</div></div>'''
day_rows = "".join(f'<tr><td>{d["day"]}</td><td>{d["side"]}</td><td>{d["jobs"]}</td><td>{d["median_s"]:.0f} s</td></tr>' for d in R["by_day_side"])
pc_rows = "".join(f'<tr><td>{d["pc"]}</td><td>{d["side"]}</td><td>{d["jobs"]}</td><td>{d["median_s"]:.0f} s</td></tr>' for d in R["by_pc_side"])
dm = R["depth_matched_median_s"]

page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Print queue wait report</title>
<style>
:root{{--bg:#fcfcfb;--card:#fff;--ink:#0b0b0b;--ink2:#52514e;--line:#e4e3de;--left:#2a78d6;--right:#eb6834;--label:#8a8984;--warn:#fff4e0}}
@media (prefers-color-scheme:dark){{:root:not([data-theme=light]){{--bg:#1a1a19;--card:#232322;--ink:#f0efec;--ink2:#c3c2b7;--line:#3a3a38;--left:#3987e5;--right:#d95926;--label:#8a8984;--warn:#3a3020}}}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,sans-serif}}
main{{max-width:820px;margin:0 auto;padding:24px 16px 64px}}h1{{font-size:1.7rem;margin:.2em 0}}h2{{font-size:1.2rem;margin-top:2em}}h4{{margin:.2em 0 .6em;color:var(--ink2);font-weight:600;font-size:.9rem}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin:12px 0}}.lock{{font-size:.85rem;color:var(--ink2)}}
.big{{font-size:2.4rem;font-weight:700;line-height:1}}.kpis{{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}}.kpis small{{color:var(--ink2);display:block}}
.row{{display:grid;grid-template-columns:150px 1fr 56px;gap:8px;align-items:center;margin:6px 0}}.lab{{font-size:.9rem}}.val{{text-align:right;font-variant-numeric:tabular-nums}}
.track{{height:14px;background:var(--line);border-radius:4px;overflow:hidden;display:block}}.fill{{display:block;height:100%;border-radius:0 4px 4px 0}}
.pair{{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}}table{{border-collapse:collapse;width:100%;font-size:.9rem}}td,th{{border-bottom:1px solid var(--line);padding:4px 8px;text-align:left}}
.warn{{background:var(--warn);border-radius:8px;padding:10px 14px}}ul{{padding-left:1.2em}}
</style></head><body><main>
<p class="lock">PRIVATE · generated locally · no customer names, no employee names · aggregates only</p>
<h1>Where do print jobs wait?</h1>
<p>Sample: {R["scope"]["events"]:,} PC activity events from {R["scope"]["pcs"]} PCs, {R["scope"]["first"][:10]} to {R["scope"]["last"][:10]} (mostly 11:00–16:00 local). {R["production_jobs"]} real print-file jobs.</p>

<div class="card kpis">
<div><span class="big">{S["right"]["pct_jobs"]:.0f}%</span><small>of jobs go to the two right-hand printers…</small></div>
<div><span class="big">{S["right"]["pct_wait"]:.0f}%</span><small>…but they hold this share of all queue waiting</small></div>
<div><span class="big">{S["right"]["median_s"]/S["left"]["median_s"]:.1f}×</span><small>longer typical wait ({S["right"]["median_s"]:.0f} s vs {S["left"]["median_s"]:.0f} s)</small></div></div>

<h2>The finding</h2>
<p>Jobs sent to the right-hand printers wait much longer between "sent" and "finished" than jobs sent to the left-hand printers. The job sizes are the same (about one page each), so this is not just bigger jobs.</p>
<div class="card">{share}</div>
<div class="card"><h4>Typical (median) wait by printer, seconds</h4>{bar_rows(printers, max(v for _, v in printers), lambda v: f"{v:.0f} s", col)}
<p class="lock">Label printer is a different device type; shown for scale only.</p></div>

<h2>Evidence and calculations</h2>
<ul>
<li><b>Wait</b> = <code>seconds_in_queue</code> in the print log (job sent → job finished). Total wait is the sum over jobs. Right-hand: {S["right"]["wait_min"]:.0f} min over {S["right"]["jobs"]} jobs; left-hand: {S["left"]["wait_min"]:.0f} min over {S["left"]["jobs"]} jobs.</li>
<li><b>Cleanest test (same PC, same hours, only the printer differs):</b> {W["pc"]}, {W["n_right"]} right vs {W["n_left"]} left jobs. Median {W["median_right_s"]:.0f} s vs {W["median_left_s"]:.0f} s, difference {W["diff_s"]:.0f} s (95% bootstrap range {W["ci95"][0]:.0f}–{W["ci95"][1]:.0f} s; hour-stratified permutation p = {W["perm_p"]}).</li>
<li><b>Same on both days:</b></li></ul>
<table><tr><th>Day</th><th>Side</th><th>Jobs</th><th>Median wait</th></tr>{day_rows}</table>

<h2>What I checked and ruled out</h2>
<ul>
<li><b>Job size:</b> pages per job are about equal ({", ".join(f'{k} {bp[k]["pages_per_job"]}' for k in ("Left","Right","Extra right"))}).</li>
<li><b>Queue pile-ups:</b> only counting jobs that arrived when at most 1 other job was in line, right-hand median is {dm["right"]["median_s"]:.0f} s vs {dm["left"]["median_s"]:.0f} s for left. Bursts don't explain it.</li>
<li><b>Spooler "Paused" state:</b> paused share is similar on both sides ({R["paused_share_pct"]["left"]:.0f}% vs {R["paused_share_pct"]["right"]:.0f}%), and non-paused jobs still show {R["median_s_not_paused"]["right"]:.0f} s vs {R["median_s_not_paused"]["left"]:.0f} s.</li>
<li><b>Toner alerts:</b> only {A["production_jobs_submitted_under_toner_alert"]} real jobs were sent while a toner alert was active — too few to say anything.</li></ul>

<h2>Limits — what this data does not support</h2>
<div class="warn"><ul>
<li><b>It shows a pattern, not a cause.</b> I don't know why the right-hand printers are slower (hardware, driver, network path, or how the job is processed).</li>
<li><b>Other PCs don't clearly repeat it.</b> Small samples:</li></ul>
<table><tr><th>PC</th><th>Side</th><th>Jobs</th><th>Median wait</th></tr>{pc_rows}</table>
<ul><li>Only 2 days, mostly afternoons, 4 PCs; one PC supplies about 70% of the jobs. One file was lost in download.</li>
<li><b>Queue wait is machine/job time, not staff time.</b> Staff may do other work while waiting. I did <b>not</b> convert it to labor cost, productivity or profit — the data has no staff-time, order-value or cost link.</li>
<li>No per-employee conclusions are drawn or shown. Computer activity is not treated as productive work.</li></ul></div>

<h2>Can it be validated independently?</h2>
<ul>
<li><b>Yes, in about 10 minutes, and this is the real test:</b> from one PC, send the same 1-page file to each printer 5 times, one at a time, and time it with a stopwatch. If the right-hand printers are slower with an empty queue, the log is right.</li>
<li>Compare the right-hand printers' driver, port/IP and connection type against the left-hand ones.</li>
<li>Cross-check job counts with the PaperCut print log CSV (seen opened on a PC; not in the files I could reach).</li>
<li>Your diary mentions printer swaps and how many printers one operator can run, so printers are a known concern. It does not confirm this specific finding.</li></ul>

<h2>Side finding: the data feed itself</h2>
<ul>
<li>{R["service_share_pct"]:.0f}% of "print jobs" in the log are maintenance, status or blank-page jobs, not customer work. Counting jobs from the raw feed overstates output.</li>
<li>The printer alert feed logged {A["problem_events"]} problem events, flipping state about every {A["median_gap_between_alert_changes_s"]:.0f} s. {A["of_which_printed_pages"]} of {A["jobs_finished_under_toner_alert"]} jobs that finished under an "out of toner/ink" alert still printed pages. That alert does not reliably mean "stopped".</li></ul>
</main></body></html>'''
open(out, "w").write(page)
