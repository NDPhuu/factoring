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


@router.post("/register/sme", response_model=auth_schemas.UserResponse)
async def register_sme(payload: auth_schemas.RegisterSMERequest, db: AsyncSession = Depends(get_db)):
    # 1. Check email exists
    print(f"DEBUG: Registering SME - Checking email {payload.user.email}")
    result = await db.execute(select(auth_models.User).where(auth_models.User.email == payload.user.email))
    if result.scalar_one_or_none():
        print("DEBUG: Email already exists")
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Check tax code exists
    print(f"DEBUG: Checking tax code {payload.sme.tax_code}")
    result = await db.execute(select(sme_models.SME).where(sme_models.SME.tax_code == payload.sme.tax_code))
    if result.scalar_one_or_none():
         print("DEBUG: Tax Code already exists")
         raise HTTPException(status_code=400, detail="Tax Code already exists")

    # 3. Create User
    new_user = auth_models.User(
        email=payload.user.email,
        hashed_password=get_password_hash(payload.user.password),
        full_name=payload.user.full_name,
        role=UserRole.SME,
        is_active=False # Wait for Admin Approval
    )
    db.add(new_user)
    await db.flush() # Get ID

    # 4. Create SME Profile
    new_sme = sme_models.SME(
        user_id=new_user.id, # Link via FK
        tax_code=payload.sme.tax_code,
        company_name=payload.sme.company_name,
        address=payload.sme.address,
        legal_rep_name=payload.sme.legal_rep_name,
        legal_rep_cccd=payload.sme.legal_rep_cccd,
        phone_number=payload.sme.phone_number,
        business_license_path=payload.sme.business_license_path,
        cccd_front_path=payload.sme.cccd_front_path,
        cccd_back_path=payload.sme.cccd_back_path,
        portrait_path=payload.sme.portrait_path
    )
    db.add(new_sme)
    
    await db.commit()
    await db.commit()
    # Reload user with relationship to avoid MissingGreenlet
    stmt = select(auth_models.User).options(
        selectinload(auth_models.User.sme_profile),
        selectinload(auth_models.User.fi_profile)
    ).where(auth_models.User.id == new_user.id)
    result = await db.execute(stmt)
    return result.scalar_one()

@router.post("/register/fi", response_model=auth_schemas.UserResponse)
async def register_fi(payload: auth_schemas.RegisterFIRequest, db: AsyncSession = Depends(get_db)):
    # 1. Check email exists
    result = await db.execute(select(auth_models.User).where(auth_models.User.email == payload.user.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Create User
    new_user = auth_models.User(
        email=payload.user.email,
        hashed_password=get_password_hash(payload.user.password),
        full_name=payload.user.full_name,
        role=UserRole.FI,
        is_active=False # Wait for Admin Approval
    )
    db.add(new_user)
    await db.flush()

    # 3. Create FI Profile
    new_fi = fi_models.FinancialInstitution(
        user_id=new_user.id, # Link via FK
        name=payload.fi.name,
        short_name=payload.fi.short_name,
        fi_type=payload.fi.fi_type,
        contact_person_name=payload.fi.contact_person_name,
        contact_phone=payload.fi.contact_phone,
        risk_config=payload.fi.risk_config
    )
    db.add(new_fi)
    
    await db.commit()
    await db.commit()
    # Reload user with relationship to avoid MissingGreenlet
    stmt = select(auth_models.User).options(
        selectinload(auth_models.User.sme_profile),
        selectinload(auth_models.User.fi_profile)
    ).where(auth_models.User.id == new_user.id)
    result = await db.execute(stmt)
    return result.scalar_one()

@router.post("/login", response_model=auth_schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: AsyncSession = Depends(get_db)
):
    # Determine if username is email
    # Our DB stores email, form_data.username will be mapped to email
    print(f"DEBUG: Login attempt for {form_data.username}")
    stmt = select(auth_models.User).where(auth_models.User.email == form_data.username)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if user:
        print(f"DEBUG: User found: {user.email}, ID: {user.id}, Role: {user.role}, Hash: {user.hashed_password[:10]}...")
        pwd_check = verify_password(form_data.password, user.hashed_password)
        print(f"DEBUG: Password check result: {pwd_check}")
    else:
        print("DEBUG: User NOT found.")

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=auth_schemas.UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

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
        print(f"DEBUG FILE ACCESS TOKEN: {token}")
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
        # Allow if Admin OR (User is SME and ID matches) OR (User is FI)
        if is_admin or user.role == UserRole.FI:
            pass # Access granted for Admin and FIs (Marketplace Due Diligence)
        else:
            # Must be SME and own the folder
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
            
        # Return FULL path so DB stores "uploads/..."
        return {"file_path": destination_path}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
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