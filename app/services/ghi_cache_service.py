import pandas as pd
import json

from app.core.redis_client import redis_client
from app.services.nasa_service import fetch_nasa_daily_data


def _get_bucket(lat, lon):
    return (round(lat, 1), round(lon, 1))


def _make_cache_key(lat, lon, start, end):
    lat_b, lon_b = _get_bucket(lat, lon)
    return f"ghi:{lat_b}:{lon_b}:{start}:{end}"


def get_ghi_for_range(lat, lon, start_date, end_date):

    cache_key = _make_cache_key(lat, lon, start_date, end_date)
    # we try redis first
    cached = redis_client.get(cache_key)

    if cached:
        data = json.loads(cached)
        df = pd.DataFrame(data)
        df.index = pd.to_datetime(df.index)
        return df

    #  2. Cache miss → call NASA
    df = fetch_nasa_daily_data(lat, lon, start_date, end_date)

    #  3. Store in Redis
    redis_client.set(
        cache_key,
        df.to_json(date_format="iso")
    )

    return df
