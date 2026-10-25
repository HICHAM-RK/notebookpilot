"""Use the locked JupyterLite app's own metadata for federation sharing."""
from pathlib import Path
import tarfile

import jupyterlite_core

root = Path(__file__).resolve().parents[1]
archive = Path(jupyterlite_core.__file__).parent / "jupyterlite-app-0.8.5.tgz"
if not archive.exists():
    raise SystemExit("Locked JupyterLite archive missing; update the build contract before upgrading.")
with tarfile.open(archive) as bundle:
    metadata = bundle.extractfile("package/lab/package.json")
    if metadata is None:
        raise SystemExit("JupyterLite lab metadata missing")
    destination = root / "build" / "core"
    destination.mkdir(parents=True, exist_ok=True)
    (destination / "package.json").write_bytes(metadata.read())
