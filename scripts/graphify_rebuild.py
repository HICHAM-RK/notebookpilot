"""Re-render the recorded Graphify extraction; does not re-extract changed sources."""

import argparse
import json
from pathlib import Path
import sys


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--skill", type=Path, required=True, help="Graphify package directory")
args = parser.parse_args()
sys.path.insert(0, str(args.skill.resolve().parent))

from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json, to_html, to_obsidian, to_canvas
from graphify.benchmark import run_benchmark

root = Path(__file__).resolve().parents[1]
out = root / "graphify-out"
extraction = json.loads((out / "extraction.json").read_text())
detection = json.loads((out / "detection.json").read_text())
graph = build_from_json(extraction)
if not graph:
    raise SystemExit("Extraction produced an empty graph")
analysis_path = out / "analysis.json"
communities = ({int(k): v for k, v in json.loads(analysis_path.read_text())["communities"].items()}
               if analysis_path.exists() else cluster(graph))
if {node for members in communities.values() for node in members} != set(graph.nodes):
    raise SystemExit("Extraction changed: remove analysis.json and labels.json, then recluster and relabel")
cohesion = score_all(graph, communities)
labels_path = out / "labels.json"
labels = {int(k): v for k, v in json.loads(labels_path.read_text()).items()} if labels_path.exists() else {}
labels = {cid: labels.get(cid, f"Community {cid}") for cid in communities}
gods = god_nodes(graph)
surprises = surprising_connections(graph, communities)
questions = suggest_questions(graph, communities, labels)
analysis = {"communities": communities, "cohesion": cohesion, "gods": gods,
            "surprises": surprises, "questions": questions}
(out / "analysis.json").write_text(json.dumps(analysis, indent=2) + "\n")
report = generate(graph, communities, cohesion, labels, gods, surprises, detection,
                  {"input": 0, "output": 0}, "NotebookPilot source snapshot",
                  suggested_questions=questions)
report = report.replace("- Token cost: 0 input · 0 output",
                        "- Token cost: unavailable; semantic extraction used an agent. Zero placeholders are not measured usage or zero cost.")
report = report.replace("## Corpus Check", "This graph describes the recorded source snapshot. Specification nodes describe planned features, not implementation evidence. See corpus-snapshot.json for hashes and docs/GRAPHIFY.md for limitations.\n\n## Corpus Check", 1)
(out / "GRAPH_REPORT.md").write_text(report)
to_json(graph, communities, str(out / "graph.json"))
to_html(graph, communities, str(out / "graph.html"), community_labels=labels)
to_obsidian(graph, communities, str(out / "obsidian"), community_labels=labels, cohesion=cohesion)
to_canvas(graph, communities, str(out / "obsidian/graph.canvas"), community_labels=labels)
if detection["total_words"] > 5000:
    benchmark = run_benchmark(str(out / "graph.json"), corpus_words=detection["total_words"])
    (out / "benchmark.json").write_text(json.dumps(benchmark, indent=2) + "\n")
print(f"Graph: {graph.number_of_nodes()} nodes, {graph.number_of_edges()} edges, {len(communities)} communities")
for cid, members in communities.items():
    print(cid, ":", ", ".join(graph.nodes[n].get("label", n) for n in members[:8]))
