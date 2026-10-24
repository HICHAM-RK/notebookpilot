"""Validate planned schemas and representative trust-boundary examples.

These tests prove contract examples, not the future runtime implementation.
jsonschema is installed through the locked nbformat dependency tree.
"""
import json
from pathlib import Path
import unittest

from jsonschema import Draft202012Validator, ValidationError

ROOT = Path(__file__).resolve().parents[1]


class ToolContracts(unittest.TestCase):
    def setUp(self):
        contract = json.loads((ROOT / "contracts/tools.json").read_text())
        self.schemas = {tool["name"]: tool["inputSchema"] for tool in contract["tools"]}

    def test_schemas_are_valid_and_closed(self):
        self.assertEqual(len(self.schemas), 13)
        for name, schema in self.schemas.items():
            with self.subTest(tool=name):
                Draft202012Validator.check_schema(schema)
                self.assertIs(schema["additionalProperties"], False)

    def test_execution_requires_hashes_and_bounded_cells(self):
        validate = Draft202012Validator(self.schemas["notebook_run_cells"]).validate
        cell = {"cellId": "c1", "expectedSourceHash": "a" * 64}
        validate({"notebookId": "n1", "cells": [cell]})
        for cells in ([], [cell] * 21, [{"cellId": "c1"}],
                      [{"cellId": "c1", "expectedSourceHash": "old"}]):
            with self.subTest(cells=cells), self.assertRaises(ValidationError):
                validate({"notebookId": "n1", "cells": cells})

    def test_no_permission_escalation_fields(self):
        validate = Draft202012Validator(self.schemas["notebook_propose_update"]).validate
        request = {"notebookId": "n1", "cellId": "c1", "expectedSourceHash": "b" * 64,
                   "source": "print('visible')"}
        validate(request)
        with self.assertRaises(ValidationError):
            validate({**request, "approved": True})
        self.assertNotIn("notebook_approve", self.schemas)

    def test_pagination_and_duplicate_comparisons(self):
        for request in ({"notebookId": "n1", "limit": 101},
                        {"notebookId": "n1", "offset": -1},
                        {"notebookId": ""}):
            with self.assertRaises(ValidationError):
                Draft202012Validator(self.schemas["notebook_get_cells"]).validate(request)
        with self.assertRaises(ValidationError):
            Draft202012Validator(self.schemas["experiment_compare"]).validate({"runIds": ["r1", "r1"]})
