import sys
import os
import asyncio
from sqlalchemy import text
sys.path.append(os.getcwd())

from app.core.database import engine

async def migrate():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN rejection_reason VARCHAR"))
            print("Successfully added 'rejection_reason' column.")
        except Exception as e:
            print(f"Migration failed (Column might already exist): {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
