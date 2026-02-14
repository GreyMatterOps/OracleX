from fastapi import HTTPException
import pandas as pd

from app.db.mock_data import BONDS_REGISTRY, MOCK_PRODUCTION_DATA
from app.services.ghi_cache_service import get_ghi_for_range


# -------------------------------------------------------
# Global Oracle Constants
# -------------------------------------------------------
SYSTEM_EFFICIENCY = 0.8
MAX_PR_ALLOWED = 100
MIN_GHI_THRESHOLD = 0.5


# -------------------------------------------------------
# Core PR Calculation 
# -------------------------------------------------------
def _calculate_pr(actual_energy, ghi, capacity_kw, threshold):
    """
    Pure deterministic PR calculation.
    No external calls, no DB access.
    """

    # Ignore extremely low sunlight days
    if ghi < MIN_GHI_THRESHOLD:
        return {
            "performance_ratio": 0,
            "theoretical_max_kwh": 0,
            "verdict": "IGNORED_DAY",
            "flag": "LOW_GHI"
        }

    theoretical_max = ghi * capacity_kw * SYSTEM_EFFICIENCY

    pr = 0 if theoretical_max == 0 else (actual_energy / theoretical_max) * 100
    pr = round(pr, 2)

    flag = None

    # Physical validation
    max_possible_energy = capacity_kw * 24
    if actual_energy > max_possible_energy:
        flag = "INVALID_PRODUCTION"

    if pr > MAX_PR_ALLOWED:
        flag = "PR_ANOMALY"

    status = "COMPLIANT" if pr >= threshold else "PENALTY"

    return {
        "performance_ratio": pr,
        "theoretical_max_kwh": round(theoretical_max, 2),
        "verdict": status,
        "flag": flag
    }


# -------------------------------------------------------
# Internal Helper 
# -------------------------------------------------------
def _build_daily_result(bond, date, actual_energy, ghi):
    """
    Shared daily workflow used by both single-day and batch modes.
    """

    result = _calculate_pr(
        actual_energy,
        ghi,
        bond["capacity_kw"],
        bond["threshold"]
    )

    return {
        "date": date,
        "actual_energy_kwh": actual_energy,
        "ghi": round(ghi, 2),
        **result
    }


# -------------------------------------------------------
# Single Day Calculation
# -------------------------------------------------------
def calculate_pr_for_date(bond_id: str, date: str):

    bond = BONDS_REGISTRY.get(bond_id)
    if not bond:
        raise HTTPException(status_code=404, detail="Bond not found")

    production = next(
        (x for x in MOCK_PRODUCTION_DATA
         if x["bond_id"] == bond_id and x["date"] == date),
        None
    )

    if not production:
        raise HTTPException(status_code=404, detail="No production data for this date")

    actual_energy = production["actual_energy_kwh"]

    ghi_df = get_ghi_for_range(
        bond["lat"],
        bond["lon"],
        date,
        date
    )

    ghi = float(ghi_df.iloc[0]["GHI"])

    daily_result = _build_daily_result(
        bond,
        date,
        actual_energy,
        ghi
    )

    return {
        "bond_id": bond_id,
        "bond_name": bond["name"],
        **daily_result,
        "threshold_required": bond["threshold"],
        "contract_address": bond["contract_address"]
    }


# -------------------------------------------------------
# Batch Calculation (6 Months)
# -------------------------------------------------------
def batch_calculate_pr_for_180_days(bond_id: str):

    bond = BONDS_REGISTRY.get(bond_id)
    if not bond:
        raise HTTPException(status_code=404, detail="Bond not found")

    history = [
        x for x in MOCK_PRODUCTION_DATA
        if x["bond_id"] == bond_id
    ]

    if not history:
        raise HTTPException(status_code=404, detail="No production data found")

    history = sorted(history, key=lambda x: x["date"])

    start_date = history[0]["date"]
    end_date = history[-1]["date"]

    ghi_df = get_ghi_for_range(
        bond["lat"],
        bond["lon"],
        start_date,
        end_date
    )

    results = []
    compliant_count = 0
    penalty_count = 0

    for record in history:

        date = record["date"]
        actual_energy = record["actual_energy_kwh"]

        date_obj = pd.to_datetime(date)

        ghi = float(
            ghi_df.loc[date_obj]["GHI"]
        ) if date_obj in ghi_df.index else 5.0

        daily_result = _build_daily_result(
            bond,
            date,
            actual_energy,
            ghi
        )

        if daily_result["verdict"] == "COMPLIANT":
            compliant_count += 1
        elif daily_result["verdict"] == "PENALTY":
            penalty_count += 1

        results.append(daily_result)

    return {
        "bond_id": bond_id,
        "bond_name": bond["name"],
        "period": "6 Months",
        "start_date": start_date,
        "end_date": end_date,
        "total_days": len(results),
        "compliant_days": compliant_count,
        "penalty_days": penalty_count,
        "threshold": bond["threshold"],
        "audit_log": results
    }


# -------------------------------------------------------
# Penalty Summary 
# -------------------------------------------------------
def get_penalty_summary(bond_id: str):

    batch_results = batch_calculate_pr_for_180_days(bond_id)

    penalty_events = [
        {
            "date": r["date"],
            "pr": r["performance_ratio"],
            "actual_energy": r["actual_energy_kwh"],
            "theoretical_max": r["theoretical_max_kwh"],
            "shortfall": (
                r["theoretical_max_kwh"] - r["actual_energy_kwh"]
            )
        }
        for r in batch_results["audit_log"]
        if r["verdict"] == "PENALTY"
    ]

    return {
        "bond_id": bond_id,
        "total_days": batch_results["total_days"],
        "penalty_days": batch_results["penalty_days"],
        "penalty_rate": round(
            (batch_results["penalty_days"] /
             batch_results["total_days"]) * 100,
            2
        ),
        "penalty_events": penalty_events,
        "compliance_summary": {
            "compliant_days": batch_results["compliant_days"],
            "penalty_days": batch_results["penalty_days"]
        }
    }
