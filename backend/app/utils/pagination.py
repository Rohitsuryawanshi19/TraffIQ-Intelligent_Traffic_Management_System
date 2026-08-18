from typing import TypeVar, Generic, List
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
