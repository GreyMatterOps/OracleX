import random
from datetime import datetime, timedelta


# -------------------------------------------------------
# Bond Registry (Mock Metadata)
# -------------------------------------------------------
BONDS_REGISTRY = {
    "BOND_1": {
        "name": "Green Solar Farm Alpha",
        "capacity_kw": 50.0,
        "threshold": 75,
        "lat": 12.97,
        "lon": 77.59,
        "contract_address": "0x78efd50b1607a9b0a350849202111e6ac7255d50"
    }
}


# -------------------------------------------------------
# Production Data Store
# -------------------------------------------------------
MOCK_PRODUCTION_DATA = []


# -------------------------------------------------------
# History Generator
# -------------------------------------------------------
def generate_bond_history(bond_id: str, days=30):

    history = []
    today = datetime.now()

    bond = BONDS_REGISTRY.get(bond_id)
    cap = bond["capacity_kw"] if bond else 50.0

    for i in range(days):

        date_str = (
            today - timedelta(days=days - i)
        ).strftime("%Y-%m-%d")

        # Simulated sunlight range
        ghi_sim = random.uniform(4.0, 6.0)

        # Realistic production
        actual = (ghi_sim * cap * 0.8) * random.uniform(0.7, 0.95)

        history.append({
            "bond_id": bond_id,
            "date": date_str,
            "actual_energy_kwh": round(actual, 2)
        })

    return history


# -------------------------------------------------------
# Auto-generate history at startup
# -------------------------------------------------------
MOCK_PRODUCTION_DATA.extend(
    generate_bond_history("BOND_1", days=30)
)
