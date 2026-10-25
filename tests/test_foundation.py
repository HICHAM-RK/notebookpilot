import contextlib
import io
import os
from pathlib import Path
import unittest

import nbformat

ROOT = Path(__file__).resolve().parents[1]


class FoundationTests(unittest.TestCase):
    def test_notebook_schema_and_fixture_analysis(self):
        notebook = nbformat.read(ROOT / 'content/welcome.ipynb', as_version=4)
        nbformat.validate(notebook)
        output = io.StringIO()
        previous = Path.cwd()
        try:
            os.chdir(ROOT / 'content')
            with contextlib.redirect_stdout(output):
                # Execute only this repository-owned fixture, never uploaded notebooks.
                exec(notebook.cells[1].source, {})
        finally:
            os.chdir(previous)
        self.assertEqual(output.getvalue().strip(), 'Rows: 4; missing ages: 1')


if __name__ == '__main__':
    unittest.main()
