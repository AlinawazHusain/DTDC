import aioboto3
from fastapi import UploadFile

# Load these from environment variables or Railway secrets
RAILWAY_S3_BUCKET = "stackable-cabinet-wsiys56"
RAILWAY_S3_REGION = "auto"
RAILWAY_S3_ACCESS_KEY = "tid_GFSpOYlIFIlAYngsTsCqVOne_MaMwy_aPVoMGHlbpaSleBAESq"
RAILWAY_S3_SECRET_KEY = "tsec_myiorH-hi8dTWFeq_tEz4KximErWtQvnEXRi8mL6WhK9mX9cKZGgdsoZ0AXTJz6m2cOBoA"
RAILWAY_ENDPOINT = "https://t3.storageapi.dev"


async def upload_file_to_railway(file: UploadFile, filename: str) -> str:
    """
    Upload a file object (like UploadFile from FastAPI) to Railway S3 bucket.
    Returns the public URL of the uploaded file.
    """
    session = aioboto3.Session(
        aws_access_key_id=RAILWAY_S3_ACCESS_KEY,
        aws_secret_access_key=RAILWAY_S3_SECRET_KEY,
        region_name=RAILWAY_S3_REGION  # keep 'auto' for Railway
    )

    # Correct usage: endpoint_url must be keyword
    async with session.client(
        "s3",
        endpoint_url=RAILWAY_ENDPOINT,
        aws_access_key_id=RAILWAY_S3_ACCESS_KEY,
        aws_secret_access_key=RAILWAY_S3_SECRET_KEY,
        region_name=RAILWAY_S3_REGION
    ) as s3_client:
        await s3_client.upload_fileobj(
            Fileobj=file.file,
            Bucket=RAILWAY_S3_BUCKET,
            Key=filename,
            ExtraArgs={"ACL": "public-read"}  # optional: make file public
        )

    # Return the accessible URL
    return f"{RAILWAY_ENDPOINT}/{RAILWAY_S3_BUCKET}/{filename}"