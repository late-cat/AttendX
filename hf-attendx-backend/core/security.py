
from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
from core.config import settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def get_api_key(api_key_header: str = Security(api_key_header)):
    """
    Validate API Key. 
    If running locally or if header matches settings.API_KEY, allow access.
    """
    if api_key_header == settings.API_KEY:
        return api_key_header
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Could not validate credentials"
    )

def verify_public_endpoint():
    """Dependency for endpoints that should remain public (like visual stats)"""
    return Trues
