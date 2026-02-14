import requests
import pandas as pd

NASA_BASE_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"

# Reuse connection (faster at scale)
session = requests.Session()


def fetch_nasa_daily_data(lat, lon, start, end):

    start_fmt = start.replace("-", "")
    end_fmt = end.replace("-", "")

    url = (
        f"{NASA_BASE_URL}?"
        "parameters=ALLSKY_SFC_SW_DWN"
        "&community=RE"
        f"&longitude={lon}"
        f"&latitude={lat}"
        f"&start={start_fmt}"
        f"&end={end_fmt}"
        "&format=JSON"
    )

    try:
        response = session.get(url, timeout=10)

        # Check HTTP status
        if response.status_code != 200:
            raise Exception(f"NASA API error {response.status_code}")

        data = response.json()

        # Validate structure
        params = (
            data.get("properties", {})
                .get("parameter", {})
        )

        if "ALLSKY_SFC_SW_DWN" not in params:
            raise Exception("Missing GHI data")

        df = pd.DataFrame({
            "GHI": params["ALLSKY_SFC_SW_DWN"]
        })

        df.index = pd.to_datetime(df.index, format="%Y%m%d")
        df = df.astype(float)

        return df

    except Exception as e:
        #fallback but visible
        print(f"[NASA FALLBACK] {e}")

        return pd.DataFrame(
            {"GHI": [5.0]},
            index=[pd.to_datetime(start)]
        )
