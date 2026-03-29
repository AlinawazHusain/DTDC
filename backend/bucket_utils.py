import aioboto3
from botocore.config import Config
from fastapi import UploadFile

BUCKET_NAME = "stackable-cabinet-wsiys56"
REGION = "auto"
ACCESS_KEY = "tid_GFSpOYlIFIlAYngsTsCqVOne_MaMwy_aPVoMGHlbpaSleBAESq"
SECRET_KEY = "tsec_myiorH-hi8dTWFeq_tEz4KximErWtQvnEXRi8mL6WhK9mX9cKZGgdsoZ0AXTJz6m2cOBoA"
ENDPOINT = "https://t3.storageapi.dev"

# Max allowed by Railway (90 days in seconds)
MAX_EXPIRY = 90 * 24 * 60 * 60  # 7,776,000 seconds

SESSION = aioboto3.Session(
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
    region_name=REGION,
)


async def upload_file_to_railway(file: UploadFile, filename: str) -> str:
    async with SESSION.client(
        "s3",
        endpoint_url=ENDPOINT,
        config=Config(signature_version="s3v4"),
    ) as s3:
        await s3.upload_fileobj(
            Fileobj=file.file,
            Bucket=BUCKET_NAME,
            Key=filename,
        )

        # 90 days — max Railway allows
        url = await s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET_NAME, "Key": filename},
            # ExpiresIn=MAX_EXPIRY,
        )

    return url


async def get_url_for_file(filename: str) -> str:
    """Call this anytime to get a fresh 90-day URL for an existing file."""
    async with SESSION.client(
        "s3",
        endpoint_url=ENDPOINT,
        config=Config(signature_version="s3v4"),
    ) as s3:
        url = await s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET_NAME, "Key": filename},
            # ExpiresIn=MAX_EXPIRY,
        )
    return url