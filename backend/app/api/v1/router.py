from fastapi import APIRouter
from .auth import auth_router
from .signals import signals_router
from .vehicles import vehicles_router
from .violations import violations_router
from .admin import admin_router

api_v1_router = APIRouter()

@api_v1_router.get("/health")
def api_v1_health():
    return {"status": "healthy", "version": "v1"}

api_v1_router.include_router(auth_router)
api_v1_router.include_router(signals_router)
api_v1_router.include_router(vehicles_router)
api_v1_router.include_router(violations_router)
api_v1_router.include_router(admin_router)
