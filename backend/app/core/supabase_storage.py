from supabase import create_client, Client
from app.core.config import settings

class SupabaseStorage:
    def __init__(self):
        self.supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        self.bucket_name = "factoring-assets"

    def upload_file(self, file_content: bytes, destination_path: str, content_type: str) -> str:
        """
        Uploads bytes to Supabase Storage.
        Returns the destination path (key).
        """
        self.supabase.storage.from_(self.bucket_name).upload(
            file=file_content,
            path=destination_path,
            file_options={"content-type": content_type, "upsert": "false"} 
        )
        return destination_path

    def get_public_url(self, path: str) -> str:
        return self.supabase.storage.from_(self.bucket_name).get_public_url(path)

    def delete_file(self, path: str):
        """
        Deletes a file from Supabase Storage.
        """
        self.supabase.storage.from_(self.bucket_name).remove([path])

supabase_storage = SupabaseStorage()
