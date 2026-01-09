from datetime import datetime, timedelta
from typing import Any, Union
from jose import jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet
from sqlalchemy.types import TypeDecorator, String
from app.core.config import settings
import base64
from datetime import datetime, timedelta


# 1. Cấu hình Hash Password
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# 2. Cấu hình Mã hóa dữ liệu (Nghị định 13)
# Tạo key từ SECRET_KEY (cắt lấy 32 bytes để làm key cho Fernet)
# Lưu ý: Trong thực tế nên dùng key riêng, nhưng MVP dùng tạm SECRET_KEY
def get_cipher_key():
    key = settings.SECRET_KEY
    # Pad hoặc cắt để đảm bảo key đủ 32 bytes url-safe base64
    return base64.urlsafe_b64encode(key[:32].encode().ljust(32, b'0'))

cipher = Fernet(get_cipher_key())

# 3. Custom Type cho SQLAlchemy để tự động Mã hóa/Giải mã
class EncryptedString(TypeDecorator):
    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            # Mã hóa trước khi lưu vào DB
            return cipher.encrypt(value.encode('utf-8')).decode('utf-8')
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            # Giải mã khi đọc từ DB ra
            try:
                return cipher.decrypt(value.encode('utf-8')).decode('utf-8')
            except:
                return value # Trả về gốc nếu lỗi (phòng trường hợp data cũ chưa mã hóa)
        return value

# --- Các hàm tiện ích ---
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Union[timedelta, None] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt