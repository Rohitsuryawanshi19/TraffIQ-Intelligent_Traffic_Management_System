import os, sys

BASE = 'app'

# Directories to create
dirs = [
    'app/core',
    'app/utils',
    'app/models',
    'app/schemas',
    'app/repositories',
    'app/services',
    'app/api',
    'app/api/v1',
    'tests'
]

for d in dirs:
    os.makedirs(d, exist_ok=True)
    init_file = os.path.join(d, '__init__.py')
    if not os.path.exists(init_file) and 'tests' not in d:
        with open(init_file, 'w') as f:
            f.write('')

print("Created directory structure")

# 1. app/core/config.py
with open('app/core/config.py', 'w', encoding='utf-8') as f:
    f.write('''import os

class Settings:
    PROJECT_NAME: str = "Smart Traffic Management System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "smart_traffic_secret_key_2026_super_secure")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./smart_traffic.db")

settings = Settings()
''')

# 2. app/core/logging.py
with open('app/core/logging.py', 'w', encoding='utf-8') as f:
    f.write('''import logging

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    )

logger = logging.getLogger("smart_traffic")
''')

# 3. app/utils/pagination.py
with open('app/utils/pagination.py', 'w', encoding='utf-8') as f:
    f.write('''from typing import TypeVar, Generic, List
from pydantic import BaseModel

T = TypeVar('T')

class Page(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    pages: int

def paginate(items: List[T], page: int = 1, size: int = 50) -> Page[T]:
    total = len(items)
    pages = (total + size - 1) // size if size > 0 else 1
    start = (page - 1) * size
    end = start + size
    return Page(
        items=items[start:end],
        total=total,
        page=page,
        size=size,
        pages=pages
    )
''')

print("Created core & utils")
