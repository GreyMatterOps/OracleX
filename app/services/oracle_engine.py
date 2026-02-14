from fastapi import HTTPException
import pandas as pd

from app.db.mock_data import BONDS_REGISTRY, MOCK_PRODUCTION_DATA
from app.services.nasa_service import fetch_nasa_daily_data


# -------------------------------------------------------
# Global Oracle Constants
# -------------------------------------------------------
SYSTEM_EFFICIENCY = 0.8
MAX_PR_ALLOWED = 100
MIN_GHI_THRESHOLD = 0.5


# -------------------------------------------------------
# Core Calculation Logic (Shared)
# -------------------------------------------------------
def _calculate_pr(actual_energy, ghi, capacity_kw, threshold):

    # Ignore extremely low sunlight days
    if ghi < MIN_GHI_THRESHOLD:
        return {
            "performance_ratio": 0,
            "verdict": "IGNORED_DAY",
            "theoretical_max_kwh": 0,
            "flag": "LOW_GHI"
        }

    theoretical_max = ghi * capacity_kw * SYSTEM_EFFICIENCY

    if theoretical_max == 0:
        pr = 0
    else:
        pr = (actual_energy / theoretical_max) * 100

    pr = round(pr, 2)

    flag = None

    # Physical validation
    max_possible = capacity_kw * 24
    if actual_energy > max_possible:
        flag = "INVALID_PRODUCTION"

    if pr > MAX_PR_ALLOWED:
        flag = "PR_ANOMALY"

    status = "COMPLIANT" if pr >= threshold else "PENALTY"

    return {
        "performance_ratio": pr,
        "verdict": status,
        "theoretical_max_kwh": round(theoretical_max, 2),
        "flag": flag
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
        raise HTTPException(status_code=404, detail="No production data")

    actual_energy = production["actual_energy_kwh"]

    df = fetch_nasa_daily_data(
        bond["lat"],
        bond["lon"],
        date,
        date
    )

    ghi = float(df.iloc[0]["GHI"])

    result = _calculate_pr(
        actual_energy,
        ghi,
        bond["capacity_kw"],
        bond["threshold"]
    )

    return {
        "bond_id": bond_id,
        "bond_name": bond["name"],
        "date": date,
        "actual_energy_kwh": actual_energy,
        "ghi": round(ghi, 2),
        **result,
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

    history = [x for x in MOCK_PRODUCTION_DATA if x["bond_id"] == bond_id]
    if not history:
        raise HTTPException(status_code=404, detail="No production data")

    history = sorted(history, key=lambda x: x["date"])

    start_date = history[0]["date"]
    end_date = history[-1]["date"]

    nasa_df = fetch_nasa_daily_data(
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

        if date_obj in nasa_df.index:
            ghi = float(nasa_df.loc[date_obj]["GHI"])
        else:
            ghi = 5.0

        result = _calculate_pr(
            actual_energy,
            ghi,
            bond["capacity_kw"],
            bond["threshold"]
        )

        if result["verdict"] == "COMPLIANT":
            compliant_count += 1
        elif result["verdict"] == "PENALTY":
            penalty_count += 1

        results.append({
            "date": date,
            "actual_energy_kwh": actual_energy,
            "ghi": round(ghi, 2),
            **result
        })

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
