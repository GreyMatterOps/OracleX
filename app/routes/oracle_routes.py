from fastapi import APIRouter
from app.services.oracle_service import (
    run_daily_audit,
    run_batch_audit,
    get_penalty_report
)

router = APIRouter(prefix="/oracle", tags=["Oracle"])


@router.get("/pr/{bond_id}/{date}")
def get_daily_pr(bond_id: str, date: str):
    return run_daily_audit(bond_id, date)


@router.get("/audit/{bond_id}")
def get_batch_audit(bond_id: str):
    return run_batch_audit(bond_id)


@router.get("/penalty-summary/{bond_id}")
def get_penalty_summary_route(bond_id: str):
    return get_penalty_report(bond_id)
