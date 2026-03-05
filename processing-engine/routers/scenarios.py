from fastapi import APIRouter, HTTPException, Request
from typing import Dict, Any, List
from decimal import Decimal
from datetime import date

from services.asc606_engine import ASC606Engine
from models.contract import ContractTerms

router = APIRouter()


@router.post("/what-if")
async def run_what_if_scenario(request: Dict[str, Any]):
    """
    Model revenue impact of contract changes:
    - Price increases/decreases
    - Contract extensions
    - Scope changes
    - Early termination
    """
    original = ContractTerms(**request["original_contract"])
    scenarios_input = request.get("scenarios", [])
    transactions = request.get("transactions", [])

    engine = ASC606Engine()
    results = {"original": None, "scenarios": []}

    # Process original
    original_entries = []
    for txn in transactions:
        from models.contract import Transaction
        t = Transaction(**txn)
        entries = engine.process_transaction(t, original)
        original_entries.extend(entries)

    results["original"] = {
        "label": "Original Contract",
        "total_recognized": float(sum(e.recognized_amount for e in original_entries)),
        "period_summary": _summarize_by_period(original_entries)
    }

    # Process each scenario
    for scenario in scenarios_input:
        modified_contract_data = {**request["original_contract"], **scenario.get("changes", {})}
        try:
            modified = ContractTerms(**modified_contract_data)
            scenario_entries = []
            for txn in transactions:
                from models.contract import Transaction
                t = Transaction(**txn)
                entries = engine.process_transaction(t, modified)
                scenario_entries.extend(entries)

            results["scenarios"].append({
                "label": scenario.get("label", "Scenario"),
                "changes": scenario.get("changes", {}),
                "total_recognized": float(sum(e.recognized_amount for e in scenario_entries)),
                "period_summary": _summarize_by_period(scenario_entries),
                "delta_vs_original": float(
                    sum(e.recognized_amount for e in scenario_entries) -
                    sum(e.recognized_amount for e in original_entries)
                )
            })
        except Exception as e:
            results["scenarios"].append({
                "label": scenario.get("label"),
                "error": str(e)
            })

    return results


def _summarize_by_period(entries) -> Dict[str, float]:
    summary = {}
    for e in entries:
        period = e.accounting_period
        summary[period] = summary.get(period, 0.0) + float(e.recognized_amount)
    return summary