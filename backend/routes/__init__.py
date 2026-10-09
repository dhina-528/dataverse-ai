# Backend API routers
from .upload import router as upload_router
from .analytics import router as analytics_router
from .insights import router as insights_router

__all__ = ["upload_router", "analytics_router", "insights_router"]
