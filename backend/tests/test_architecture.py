import inspect
import unittest
from pathlib import Path

import database
import logic_engine
import schemas


class ArchitectureLayeringTests(unittest.TestCase):
    def test_main_is_endpoint_focused(self) -> None:
        main_path = Path(__file__).resolve().parent.parent / "main.py"
        source = main_path.read_text(encoding="utf-8")

        self.assertIn("from logic_engine import", source)
        self.assertIn("import database", source)

        self.assertNotIn("import pandas as pd", source)
        self.assertNotIn("import numpy as np", source)
        self.assertNotIn("class F1DataStore", source)
        self.assertNotIn("class SimulationEngine", source)

    def test_database_storage_functions_exist(self) -> None:
        for fn_name in [
            "initialize_database",
            "sync_reference_tables",
            "save_simulation_run",
            "list_driver_records",
            "list_round_records",
            "list_simulation_runs",
            "get_latest_simulation_run",
            "get_simulation_run_by_id",
            "get_simulation_summary",
        ]:
            self.assertTrue(hasattr(database, fn_name), f"missing {fn_name}")
            self.assertTrue(callable(getattr(database, fn_name)), f"{fn_name} not callable")

    def test_logic_engine_owns_simulation_logic(self) -> None:
        self.assertTrue(hasattr(logic_engine, "F1DataStore"))
        self.assertTrue(hasattr(logic_engine, "SimulationEngine"))
        self.assertTrue(hasattr(logic_engine, "MODEL_VERSION"))
        self.assertTrue(hasattr(logic_engine, "BUDGET_CAP"))

        engine_cls = logic_engine.SimulationEngine
        for method_name in ["load", "simulate", "run_simulation", "calculate_modifiers"]:
            self.assertTrue(hasattr(engine_cls, method_name), f"SimulationEngine missing {method_name}")

    def test_schemas_module_contains_api_contracts(self) -> None:
        required_schema_names = [
            "SliderSet",
            "SimulationRequest",
            "SimulationResponse",
            "DriverSimulationResult",
            "SimulationHistoryItem",
            "BudgetConfigResponse",
            "SimulationSummaryResponse",
        ]
        for schema_name in required_schema_names:
            self.assertTrue(hasattr(schemas, schema_name), f"missing schema {schema_name}")
            schema_obj = getattr(schemas, schema_name)
            self.assertTrue(inspect.isclass(schema_obj), f"{schema_name} is not a class")
            self.assertTrue(hasattr(schema_obj, "model_fields"), f"{schema_name} is not a pydantic model")


if __name__ == "__main__":
    unittest.main()
