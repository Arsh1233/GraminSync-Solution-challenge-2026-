"""
GraminSync Optimization Engine - FastAPI Backend on Cloud Run
Implements the Initial Volunteer-Task Mapping (i-VTM) algorithm using
Cosine Similarity and Integer Linear Programming (ILP) via Google OR-Tools.
"""
from fastapi import FastAPI
from app.routers import matching

app = FastAPI(
    title="GraminSync Optimization Engine",
    description="Volunteer-Task matching using Cosine Similarity + ILP (OR-Tools)",
    version="1.0.0",
)

app.include_router(matching.router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "graminsync-optimization-engine"}
