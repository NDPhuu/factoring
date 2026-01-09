from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

import os
import sys
from dotenv import load_dotenv

# ------------------------------------------------------------------------
# 1. THÊM ĐƯỜNG DẪN DỰ ÁN VÀO SYSTEM PATH
# Để Python tìm thấy thư mục 'app'
sys.path.append(os.getcwd())

# 2. LOAD BIẾN MÔI TRƯỜNG
load_dotenv()

# 3. IMPORT BASE VÀ CÁC MODELS
# Quan trọng: Phải import hết các model để Base.metadata nhận diện được
from app.core.database import Base
from app.core.config import settings
from app.modules.auth.models import User
from app.modules.sme.models import SME
from app.modules.fi.models import FinancialInstitution
from app.modules.invoice.models import Invoice
from app.modules.scoring.models import CreditScore
from app.modules.payment.models import BankAccount
from app.modules.trading.models import Offer
# ------------------------------------------------------------------------

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# ------------------------------------------------------------------------
# 4. GHI ĐÈ URL DATABASE TỪ SETTINGS
# Alembic dùng driver sync (psycopg2), nên ta bỏ "+asyncpg" đi
db_url = settings.DATABASE_URL.replace("+asyncpg", "")
config.set_main_option("sqlalchemy.url", db_url)
# ------------------------------------------------------------------------

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ------------------------------------------------------------------------
# 5. GÁN METADATA (ĐÂY LÀ CHỖ SỬA LỖI CỦA BẠN)
# target_metadata = None  <-- Dòng cũ gây lỗi
target_metadata = Base.metadata
# ------------------------------------------------------------------------

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata # Quan trọng: Phải truyền biến này vào
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()