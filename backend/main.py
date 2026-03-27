from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

import models
import database

app = FastAPI(title="Hackathon API")


# Pydantic models
class ItemBase(BaseModel):
    name: str
    description: str


class ItemCreate(ItemBase):
    pass


class Item(ItemBase):
    id: int

    class Config:
        from_attributes = True


# Create tables
models.Base.metadata.create_all(bind=database.engine)


@app.get("/")
def read_root():
    return {"message": "This is our 2026 - CodeQuantum Hackathon Backend Server/API"}


@app.get("/items/", response_model=List[Item])
def read_items(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    items = db.query(models.Item).offset(skip).limit(limit).all()
    return items


@app.post("/items/", response_model=Item)
def create_item(item: ItemCreate, db: Session = Depends(database.get_db)):
    db_item = models.Item(name=item.name, description=item.description)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(database.get_db)):
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(db_item)
    db.commit()
    return {"message": "Item deleted successfully"}


# Seed data if empty
@app.on_event("startup")
def startup_event():
    db = next(database.get_db())
    if db.query(models.Item).count() == 0:
        db.add(
            models.Item(
                name="First Item", description="This is the first item in the database"
            )
        )
        db.add(
            models.Item(
                name="Second Item",
                description="This is the second item in the database",
            )
        )
        db.commit()
