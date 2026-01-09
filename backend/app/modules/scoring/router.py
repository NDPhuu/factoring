from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.modules.auth.models import User
from app.modules.auth.router import get_current_user
from app.modules.scoring.services import ScoringService
from app.modules.fi.models import FinancialInstitution
from sqlalchemy import select

router = APIRouter(prefix="/scoring", tags=["Scoring"])

@router.post("/calculate/{invoice_id}")
async def calculate_credit_score(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Check quyền: Chỉ Admin hoặc chính SME đó mới được chấm điểm (MVP cho SME tự bấm)
    # ... (Logic check quyền bỏ qua cho nhanh)

    service = ScoringService(db)
    try:
        score_record = await service.calculate_score(invoice_id)
        return score_record
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
    # 2. MATCHING: Tìm FI phù hợp ngay lập tức
    # Lấy tất cả FI
    fis_result = await db.execute(select(FinancialInstitution))
    all_fis = fis_result.scalars().all()
    
    matched_fis = []
    for fi in all_fis:
        config = fi.risk_config or {}
        
        # Check 1: Điểm số
        min_score = config.get("min_score", 0)
        if score_record.total_score < min_score:
            continue
            
        # Check 2: Hạng
        accepted_grades = config.get("accepted_grades", [])
        if score_record.grade.value not in accepted_grades:
            continue
            
        matched_fis.append({
            "fi_name": fi.name,
            "short_name": fi.short_name,
            "offer_ltv": config.get("max_ltv", 0)
        })

    # 3. Trả về kết quả gộp
    return {
        "score_info": score_record,
        "matched_investors": matched_fis # Danh sách nhà đầu tư phù hợp
    }