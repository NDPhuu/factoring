from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.modules.auth.models import User, UserRole
from app.modules.auth.router import get_current_user
from app.modules.fi import models as fi_models
from pydantic import BaseModel
from typing import Dict, Any

router = APIRouter(prefix="/fi", tags=["Financial Institutions"])

class UpdateRiskConfigRequest(BaseModel):
    risk_config: Dict[str, Any]

@router.put("/me/risk-config")
async def update_risk_config(
    payload: UpdateRiskConfigRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.FI or not current_user.fi_profile:
        raise HTTPException(status_code=403, detail="Only FIs can update risk configuration")
    
    fi_entity = await db.get(fi_models.FinancialInstitution, current_user.fi_profile.id)
    if not fi_entity:
        raise HTTPException(status_code=404, detail="FI Profile not found")
        
    # Update config
    # Merge or Replace? Let's Replace for simplicity
    fi_entity.risk_config = payload.risk_config
    
    await db.commit()
    await db.refresh(fi_entity)
    
    return {"message": "Risk configuration updated successfully", "risk_config": fi_entity.risk_config}
