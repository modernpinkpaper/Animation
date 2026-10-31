"""Print-queue wait analysis (DuckDB). Writes anonymised aggregates to results/summary.json.

usage: python3 -I analyze.py <slim_events.jsonl> <summary.json>
"""
import json, sys
import duckdb
import numpy as np

src, out = sys.argv[1], sys.argv[2]
con = duckdb.connect()
con.execute(f"""create table ev as select event_id, pc, event_type, cast(ts as timestamp) ts, meta::JSON j
  from read_json('{src}', format='newline_delimited',
  columns={{event_id:'VARCHAR',pc:'VARCHAR',event_type:'VARCHAR',ts:'VARCHAR',meta:'VARCHAR'}})""")
Q = lambda s: con.sql(s).fetchall()

# --- finished jobs joined to their start record (for document type); queue seconds = submit -> finish
con.execute("""create table fin as select pc, j->>'$.printer' pr, ts fin_ts, j->>'$.job_id' job_id,
  try_cast(j->>'$.pages_printed' as int) pages, try_cast(j->>'$.seconds_in_queue' as double) q
  from ev where event_type='print_job_finished'""")
con.execute("""create table start as select pc, j->>'$.job_id' job_id, any_value(lower(j->>'$.document_name')) doc,
  any_value(j->>'$.job_status') js from ev where event_type='print_job' group by 1,2""")
# kind is decided from the document name; names themselves are never written out
con.execute("""create table jobs as select f.*, s.js,
  case when s.doc similar to '.*(maintenance|status inquiry|about_blank|test page).*' then 'service'
       when s.doc like '%.indd' or s.doc like '%flat%' then 'production' else 'other' end kind
  from fin f left join start s using (pc, job_id)""")
con.execute("""create table prod as select *, fin_ts - to_seconds(q) submit_ts,
  case when pr like '%RIGHT%' then 'right' when pr like 'DYMO%' then 'label' else 'left' end side
  from jobs where kind='production' and q is not null""")

PN = {"<---LEFT SIDE PRINTER": "Left", "<<XTRA LEFT": "Extra left", "RIGHT SIDE PRINTER--->": "Right",
      "XTRA RIGHT>>": "Extra right", "DYMO LabelWriter 4XL": "Label", "DYMO LabelWriter 4XL (Copy 1)": "Label"}
con.execute("create table pn(pr varchar, name varchar)")
for k, v in PN.items(): con.execute("insert into pn values (?,?)", [k, v])
PC = {r[0]: f"PC-{chr(65+i)}" for i, r in enumerate(Q("select pc from prod group by 1 order by count(*) desc"))}

R = {}
R["scope"] = dict(zip(["events", "pcs", "first", "last"], Q("select count(*), count(distinct pc), min(ts)::varchar, max(ts)::varchar from ev")[0]))
tot = Q("select kind, count(*) from jobs group by 1")
R["job_kinds"] = dict(tot)
R["service_share_pct"] = round(100 * dict(tot).get("service", 0) / sum(dict(tot).values()), 1)
R["production_jobs"] = Q("select count(*) from prod")[0][0]
R["production_printed_pct"] = round(Q("select 100.0*avg((pages>0)::int) from prod")[0][0], 1)

# per printer
rows = Q("""select name, count(*) n, round(sum(q)/60,1) wait_min, round(median(q),1) med, round(quantile_cont(q,0.9),1) p90,
  round(avg(pages),2) pg from prod join pn using(pr) group by 1 order by 3 desc""")
R["by_printer"] = [dict(zip(["printer", "jobs", "wait_min", "median_s", "p90_s", "pages_per_job"], r)) for r in rows]
tj, tw = sum(r[1] for r in rows), sum(r[2] for r in rows)
for d in R["by_printer"]:
    d["pct_jobs"], d["pct_wait"] = round(100 * d["jobs"] / tj, 1), round(100 * d["wait_min"] / tw, 1)

# side groups
rows = Q("""select side, count(*), round(sum(q)/60,1), round(median(q),1), round(quantile_cont(q,0.9),1)
  from prod group by 1""")
R["by_side"] = {r[0]: dict(jobs=r[1], wait_min=r[2], median_s=r[3], p90_s=r[4],
                           pct_jobs=round(100*r[1]/tj, 1), pct_wait=round(100*r[2]/tw, 1)) for r in rows}
R["wait_over_2min"] = dict(zip(["jobs", "pct_jobs", "pct_wait"], Q(
    "select count(*) filter (where q>120), round(100.0*count(*) filter (where q>120)/count(*),1), round(100.0*sum(q) filter (where q>120)/sum(q),1) from prod")[0]))

# replication across days and PCs (n>=8)
R["by_day_side"] = [dict(zip(["day", "side", "jobs", "median_s"], r)) for r in Q(
    "select strftime(submit_ts,'%m-%d'), side, count(*), round(median(q),1) from prod where side!='label' group by all order by 1,2")]
R["by_pc_side"] = [dict(pc=PC[r[0]], side=r[1], jobs=r[2], median_s=r[3]) for r in Q(
    "select pc, side, count(*), round(median(q),1) from prod where side!='label' group by all having count(*)>=8 order by 1,2")]

# confounder 1: queue depth at arrival (jobs on same printer already submitted, not finished)
rows = Q("select pc, pr, side, submit_ts, fin_ts, q, js from prod order by submit_ts")
depth = [sum(1 for o in rows if o[1] == r[1] and o[3] < r[3] and o[4] > r[3]) for r in rows]
dm = {}
for r, d in zip(rows, depth):
    if r[2] != "label" and d <= 1: dm.setdefault(r[2], []).append(r[5])
R["depth_matched_median_s"] = {k: dict(jobs=len(v), median_s=round(float(np.median(v)), 1)) for k, v in dm.items()}
# confounder 2: 'Paused' spooler state
R["paused_share_pct"] = {k: round(100*v, 0) for k, v in Q("select side, avg((js like 'Paused%')::int) from prod group by 1")}
R["median_s_not_paused"] = dict(Q("select side, round(median(q),1) from prod where js is null or js not like 'Paused%' group by 1"))

# within-PC test on the busiest PC: right vs left, hour-stratified permutation + bootstrap CI
top = Q("select pc from prod group by 1 order by count(*) desc limit 1")[0][0]
K = [(r[2], r[3].hour, r[5]) for r in rows if r[0] == top and r[2] != "label"]
rng = np.random.default_rng(7)
med = lambda g, s: float(np.median([x[2] if len(x) == 3 else x[1] for x in g if x[0] == s]))
obs = med(K, "right") - med(K, "left")
hrs, cnt, N = sorted({x[1] for x in K}), 0, 5000
for _ in range(N):
    perm = []
    for h in hrs:
        g = [x for x in K if x[1] == h]; lab = [x[0] for x in g]; rng.shuffle(lab)
        perm += [(l, x[2]) for l, x in zip(lab, g)]
    cnt += (med(perm, "right") - med(perm, "left")) >= obs
L = np.array([x[2] for x in K if x[0] == "left"]); Rt = np.array([x[2] for x in K if x[0] == "right"])
bs = [np.median(rng.choice(Rt, len(Rt))) - np.median(rng.choice(L, len(L))) for _ in range(5000)]
R["within_pc_test"] = dict(pc=PC[top], n_left=len(L), n_right=len(Rt), median_left_s=round(float(np.median(L)), 1),
    median_right_s=round(float(np.median(Rt)), 1), diff_s=round(obs, 1),
    ci95=[round(float(v), 1) for v in np.percentile(bs, [2.5, 97.5])], perm_p=round((cnt+1)/(N+1), 4))

# secondary: how trustworthy is the printer 'out of toner' alert?
R["alerts"] = dict(zip(["problem_events", "out_of_toner_events", "cleared_events"], Q(
    "select count(*), count(*) filter (where j->>'$.reason'='Out of toner/ink'), count(*) filter (where j->>'$.reason'='cleared') from ev where event_type='printer_problem'")[0]))
R["alerts"]["median_gap_between_alert_changes_s"] = Q("""with p as (select ts, lag(ts) over (partition by pc, j->>'$.printer' order by ts) prev from ev where event_type='printer_problem')
  select round(median(epoch(ts-prev)),0) from p where prev is not null""")[0][0]
st = Q("""select count(*), sum((pages>0)::int) from (select f.pages, (select j->>'$.reason' from ev p where p.event_type='printer_problem' and p.pc=f.pc
  and p.j->>'$.printer'=f.pr and p.ts<=f.fin_ts order by p.ts desc limit 1) r from fin f) where r='Out of toner/ink'""")[0]
R["alerts"]["jobs_finished_under_toner_alert"], R["alerts"]["of_which_printed_pages"] = st[0], int(st[1])
R["alerts"]["production_jobs_submitted_under_toner_alert"] = Q("""select count(*) from prod p where (select j->>'$.reason' from ev e where e.event_type='printer_problem' and e.pc=p.pc
  and e.j->>'$.printer'=p.pr and e.ts<=p.submit_ts order by e.ts desc limit 1) in ('Out of toner/ink','Low toner/ink')""")[0][0]

json.dump(R, open(out, "w"), indent=1)
print(json.dumps({k: R[k] for k in ["production_jobs", "by_side", "within_pc_test", "alerts"]}, indent=1))
