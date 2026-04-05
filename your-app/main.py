"""
main.py — Catapult Platform backend entry point

Run with:
    uvicorn your-app.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes.lecture_analysis import router as lecture_router

app = FastAPI(
    title="Catapult Platform",
    description="Educational lecture analysis using TRIBE v2 + MiroFish persona simulation",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(lecture_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "catapult-platform"}
