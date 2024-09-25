from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Dict

DATABASE_URL = "sqlite:///./database.db"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

class UserClick(Base):
    __tablename__ = "user_clicks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True)
    clicks = Column(Integer, default=0)

Base.metadata.create_all(bind=engine)

class ClickData(BaseModel):
    userId: int
    clickCount: int

class ClickGetData(BaseModel):
    userId: int

last_request_time: Dict[str, datetime] = {}

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse(
        name="index.html", context={"request": request}
    )

@app.post("/api/click", response_class=JSONResponse)
async def click(data: ClickData, db: Session = Depends(get_db)):
    current_time = datetime.now()
    last_time = last_request_time.get(data.userId)

    if last_time and (current_time - last_time) < timedelta(seconds=4.5):
        raise HTTPException(status_code=429, detail="Requests can only be made every 5 seconds")

    last_request_time[data.userId] = current_time

    if data.clickCount > 100:
        data.clickCount = 100

    user_click = db.query(UserClick).filter(UserClick.user_id == data.userId).first()
    if user_click:
        user_click.clicks += data.clickCount
    else:
        user_click = UserClick(user_id=data.userId, clicks=data.clickCount)
        db.add(user_click)
    db.commit()
    return JSONResponse(content={"message": "Click data saved successfully"})

@app.post("/api/get-clicks", response_class=JSONResponse)
async def get_clicks(data: ClickGetData, db: Session = Depends(get_db)):
    user_click = db.query(UserClick).filter(UserClick.user_id == data.userId).first()
    if user_click:
        return JSONResponse(content={"clicks": user_click.clicks})
    else:
        user_click = UserClick(user_id=data.userId, clicks=0)
        db.add(user_click)
        db.commit()
        return JSONResponse(content={"clicks": 0})