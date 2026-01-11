import uuid
from fastapi import UploadFile, HTTPException
from app.core.supabase_storage import supabase_storage

async def save_upload_file(upload_file: UploadFile, sme_id: int, sub_folder: str) -> str:
    """
    Uploads file to Supabase Storage.
    Structure: {sme_id}/{sub_folder}/{uuid}_{filename}
    Return: Supabase Path (Key)
    """
    try:
        # 1. Read file content
        content = await upload_file.read()
        
        # 2. Generate path
        unique_filename = f"{uuid.uuid4().hex}_{upload_file.filename}"
        destination_path = f"{sme_id}/{sub_folder}/{unique_filename}"
        
        # 3. Upload to Supabase
        return supabase_storage.upload_file(content, destination_path, upload_file.content_type)

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"DEBUG: File Upload Error: {e}")
        raise HTTPException(status_code=500, detail=f"Could not save file to Supabase: {str(e)}")