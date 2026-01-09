from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_password_hash
from app.modules.auth import models as auth_models
from app.modules.auth import schemas as auth_schemas
from app.modules.sme import models as sme_models
from app.modules.fi import models as fi_models
from fastapi.security import OAuth2PasswordRequestForm
from app.core.security import verify_password, create_access_token
from datetime import timedelta
from app.core.config import settings
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from fastapi import UploadFile, File
import shutil
import os
from pathlib import Path
from fastapi.responses import FileResponse
import uuid
from app.modules.auth.models import User, UserRole
from sqlalchemy.orm import selectinload


router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    result = await db.execute(
        select(auth_models.User)
        .options(
            selectinload(auth_models.User.sme_profile),
            selectinload(auth_models.User.fi_profile)
        )
        .where(auth_models.User.id == int(user_id))
    )
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
        
    return user


from fastapi.responses import RedirectResponse
from app.core.supabase_storage import supabase_storage

@router.get("/files/{file_path:path}")
async def get_uploaded_file_manual(
    file_path: str,
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db) 
):
    """
    Secure file viewer.
    - Path format:
      1. `{sme_id}/{session}/{filename}` (Invoice docs) -> Strict SME ownership check.
      2. `uploads/{filename}` (KYC docs) -> Check against DB or Admin only.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid User ID")
    except JWTError:
         raise HTTPException(status_code=401, detail="Invalid Access Token")

    # Fetch User
    result = await db.execute(select(auth_models.User).options(selectinload(auth_models.User.sme_profile)).where(auth_models.User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    is_admin = user.role == UserRole.ADMIN
    
    # 3. Ownership Check
    # Case A: Path starts with SME ID (e.g. "15/xyz/invoice.pdf")
    first_part = file_path.split("/")[0]
    
    if first_part.isdigit():
        path_sme_id = int(first_part)
        # Allow if Admin OR (User is SME and ID matches)
        if not is_admin:
            if not user.sme_profile or user.sme_profile.id != path_sme_id:
                raise HTTPException(status_code=403, detail="You do not own this file")
                
    # Case B: Path starts with "uploads/" (Legacy/KYC)
    elif file_path.startswith("uploads/"):
        if not is_admin:
             # Strict check: Is this file in my SME profile key paths?
             # This requires extra DB query if not loaded.
             # Simplification: Only allow if it's one of their known docs
             if not user.sme_profile:
                 raise HTTPException(status_code=403, detail="Access Denied")
             
             # Check known paths
             allowed_paths = [
                 user.sme_profile.business_license_path,
                 user.sme_profile.cccd_front_path,
                 user.sme_profile.cccd_back_path,
                 user.sme_profile.portrait_path
             ]
             # Note: filename in path matches filename in DB? 
             # DB stores full path like "uploads/uuid.pdf". file_path is "uploads/uuid.pdf" so exact match.
             if file_path not in allowed_paths:
                  raise HTTPException(status_code=403, detail="You do not own this KYC document")

    else:
        # Unknown path format -> Block
        if not is_admin:
            raise HTTPException(status_code=403, detail="Access Denied to unknown path")

    # 4. Redirect to Supabase
    public_url = supabase_storage.get_public_url(file_path)
    return RedirectResponse(url=public_url)

# ... (skip to upload_kyc_document)

@router.post("/upload-kyc")
async def upload_kyc_document(
    file: UploadFile = File(...)
):
    if file.content_type not in ["image/jpeg", "image/png", "application/pdf"]:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, PDF allowed.")
    
    # 2. Validate Size
    # Read into memory (Be careful with potential large files, but max is 5MB)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Max 5MB.")

    try:
        # 3. Upload to Supabase
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        destination_path = f"uploads/{unique_filename}"
        
        supabase_storage.upload_file(content, destination_path, file.content_type)
            
        return {"file_path": unique_filename}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.put("/admin/approve/{user_id}")
async def approve_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only Admin can approve users")
        
    user = await db.get(auth_models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_active = True
    await db.commit()
    return {"message": f"User {user.email} approved successfully"}

@router.put("/admin/reject/{user_id}")
async def reject_user(
    user_id: int,
    payload: auth_schemas.RejectUserRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only Admin can reject users")
        
    user = await db.get(auth_models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_active = False
    user.rejection_reason = payload.reason
    await db.commit()
    
    return {"message": f"User {user.email} rejected."}

@router.get("/admin/users", response_model=List[auth_schemas.UserResponse])
async def get_all_users(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    stmt = select(auth_models.User).options(
            selectinload(auth_models.User.sme_profile),
            selectinload(auth_models.User.fi_profile)
        )
    
    if status == 'pending':
        # Pending = Inactive AND Rejection Reason is NULL
        stmt = stmt.where(auth_models.User.is_active == False, auth_models.User.rejection_reason == None)
    elif status == 'rejected':
        # Rejected = Inactive AND Rejection Reason is NOT NULL
        stmt = stmt.where(auth_models.User.is_active == False, auth_models.User.rejection_reason != None)
    elif status == 'active':
        stmt = stmt.where(auth_models.User.is_active == True)
        
    result = await db.execute(stmt)
    return result.scalars().all()