from app.services.oracle_engine import (
    calculate_pr_for_date,
    batch_calculate_pr_for_180_days,
    get_penalty_summary
)

from app.services.blockchain import write_audit_to_chain


# -------------------------------------------------------
# DAILY ORACLE EXECUTION
# -------------------------------------------------------
def run_daily_audit(bond_id: str, date: str):
    """
    Runs oracle calculation for a single day.
    No blockchain interaction here.
    Safe for frontend usage.
    """
    result = calculate_pr_for_date(bond_id, date)
    return result


# -------------------------------------------------------
# DAILY ORACLE + BLOCKCHAIN PUBLISH
# -------------------------------------------------------
def run_and_publish_daily_audit(bond_id: str, date: str):
    """
    Runs oracle calculation and publishes result to blockchain.
    Blockchain failure will NOT break oracle result.
    """

    result = calculate_pr_for_date(bond_id, date)

    tx_link = None

    # Do not publish ignored days
    if result["verdict"] != "IGNORED_DAY":
        try:
            tx_link = write_audit_to_chain(
                result["date"],
                result["verdict"],
                result["performance_ratio"]
            )
        except Exception as e:
            tx_link = f"Blockchain Error: {str(e)}"

    return {
        "oracle_result": result,
        "blockchain_tx": tx_link
    }


# -------------------------------------------------------
# BATCH AUDIT (6 MONTHS)
# -------------------------------------------------------
def run_batch_audit(bond_id: str):
    """
    Runs 180-day audit calculation.
    Used for dashboards or reporting.
    """
    return batch_calculate_pr_for_180_days(bond_id)


# -------------------------------------------------------
# PENALTY SUMMARY (SMART CONTRACT READY)
# -------------------------------------------------------
def get_penalty_report(bond_id: str):
    """
    Returns penalty-only summary.
    Used for settlement logic.
    """
    return get_penalty_summary(bond_id)
