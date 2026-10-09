from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes.upload import router as upload_router
from .routes.analytics import router as analytics_router
from .routes.insights import router as insights_router

app = FastAPI(
    title="Dataverse AI Engine",
    description="High-performance backend API for data processing, statistical analytics, and AI-driven insights.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits frontend dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(upload_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(insights_router, prefix="/api")


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Dataverse AI Core Engine",
        "version": "1.0.0",
        "docs_url": "/docs"
    }


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "engine": "FastAPI + Pandas + Ollama Gateway"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
