"""Decode Google Drive download results (JSON with base64 'content') into one deduplicated, slim JSONL.

usage: python3 -I ingest.py <dir-with-download-json-files> <out.jsonl>
Raw events never leave this machine. Only fields needed for the analysis are kept.
"""
import base64, glob, json, sys

src, out = sys.argv[1], sys.argv[2]
seen, n = set(), 0
with open(out, "w") as o:
    for f in sorted(glob.glob(f"{src}/*.txt")):
        try:
            j = json.load(open(f))
            raw = base64.b64decode(j["content"]).decode("utf-8", "replace")
        except Exception:
            continue
        for line in raw.splitlines():
            try:
                d = json.loads(line)
            except Exception:
                continue
            if d["event_id"] in seen:
                continue
            seen.add(d["event_id"])
            o.write(json.dumps({
                "event_id": d["event_id"], "pc": d["computer_id"], "event_type": d["event_type"],
                "ts": d["timestamp_local"][:23].replace("T", " "),  # local wall-clock time
                "meta": json.dumps(d["metadata"]),
            }) + "\n")
            n += 1
print(n, "events written")
