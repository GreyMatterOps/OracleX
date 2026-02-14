from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.oracle_routes import router as oracle_router

# 1. CREATE THE APP FIRST
app = FastAPI()

# 2. THEN ADD MIDDLEWARE
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. THEN INCLUDE ROUTERS
app.include_router(oracle_router)
