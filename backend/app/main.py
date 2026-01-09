from fastapi import FastAPI
from app.core.config import settings

# ==============================================================================
# 1. IMPORT MODELS THEO THỨ TỰ PHỤ THUỘC (DEPENDENCY ORDER)
# ==============================================================================
# Nguyên tắc: Import các bảng "Con" trước, bảng "Cha" sau để Registry ghi nhận đủ.

# 1. Payment (BankAccount) - Ít phụ thuộc nhất
from app.modules.payment import models as payment_models

# 2. Invoice & Scoring & Trading (Phụ thuộc lẫn nhau, nhưng cần có trước khi SME link tới)
from app.modules.scoring import models as scoring_models
from app.modules.trading import models as trading_models
from app.modules.invoice import models as invoice_models

# 3. FI & SME (Phụ thuộc vào User, nhưng User lại link ngược lại nên load tầm giữa)
from app.modules.fi import models as fi_models
from app.modules.sme import models as sme_models

# 4. Auth (User) - Thường là bảng trung tâm
from app.modules.auth import models as auth_models
# ==============================================================================

# 2. IMPORT ROUTERS
from app.modules.auth.router import router as auth_router
from app.modules.invoice.router import router as invoice_router
from app.modules.scoring.router import router as scoring_router
from app.modules.trading.router import router as trading_router
from app.modules.sme.router import router as sme_router
from app.modules.dashboard.router import router as dashboard_router
from app.modules.payment.router import router as payment_router
from app.modules.fi.router import router as fi_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title=settings.PROJECT_NAME)

# Cấu hình cho phép Frontend truy cập
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://factoring1.vercel.app/","http://localhost:5173"], # Cho phép mọi domain (bao gồm Cloudflare Tunnel)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles
import os

# Create storage dir if not exists
os.makedirs("storage/uploads", exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory="storage/uploads"), name="static")

# 3. Đăng ký Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(invoice_router, prefix=settings.API_V1_STR)
app.include_router(scoring_router, prefix=settings.API_V1_STR)
app.include_router(trading_router, prefix=settings.API_V1_STR)
app.include_router(sme_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)
app.include_router(payment_router, prefix=settings.API_V1_STR)
app.include_router(fi_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {"message": "Factoring Platform MVP is running!"}