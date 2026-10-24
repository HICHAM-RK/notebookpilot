"""The development server must enable shared memory in the page and workers."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread
from urllib.error import HTTPError
from urllib.request import urlopen
import unittest

from scripts.serve import IsolatedStaticHandler


class ServerTests(unittest.TestCase):
    def test_static_files_and_errors_carry_isolation_headers(self):
        with TemporaryDirectory() as folder:
            Path(folder, "index.html").write_text("<p>NotebookPilot</p>")
            Path(folder, "worker.js").write_text("self.onmessage = () => {};")
            handler = partial(IsolatedStaticHandler, directory=folder)
            with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
                thread = Thread(target=server.serve_forever, daemon=True)
                thread.start()
                try:
                    for name, expected in [("index.html", 200), ("worker.js", 200), ("missing", 404)]:
                        with self.subTest(path=name):
                            try:
                                response = urlopen(f"http://127.0.0.1:{server.server_port}/{name}")
                            except HTTPError as error:
                                response = error
                            with response:
                                self.assertEqual(response.status, expected)
                                self.assertEqual(response.headers["Cross-Origin-Opener-Policy"], "same-origin")
                                self.assertEqual(response.headers["Cross-Origin-Embedder-Policy"], "require-corp")
                                if name == "index.html":
                                    self.assertEqual(response.read(), b"<p>NotebookPilot</p>")
                finally:
                    server.shutdown()
                    thread.join()
