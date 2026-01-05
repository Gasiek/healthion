from fastapi import APIRouter

from .auth import router as auth_router
from .wearables import router as wearables_router

v1_router = APIRouter()
v1_router.include_router(auth_router, tags=["auth"])
v1_router.include_router(wearables_router, prefix="/wearables", tags=["wearables"])

__all__ = ["v1_router"]
