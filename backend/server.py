from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from pymongo import MongoClient
from datetime import datetime, timedelta
import os
import jwt
import hashlib
import uuid
from typing import List, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="6ex - Fractional Stock Investment API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

try:
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    # Test connection
    client.admin.command('ping')
    logger.info(f"Successfully connected to MongoDB at {MONGO_URL}")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {e}")
    raise

# Collections
users_collection = db.users
investments_collection = db.investments

# Security
security = HTTPBearer()
JWT_SECRET = "your-secret-key-change-in-production"
JWT_ALGORITHM = "HS256"

# Mock stock data
MOCK_STOCKS = {
    'NFLX': {'name': 'Netflix Inc.', 'price': 487.23, 'change': 12.45, 'changePercent': 2.62},
    'GOOGL': {'name': 'Alphabet Inc.', 'price': 174.82, 'change': -2.18, 'changePercent': -1.23},
    'TSLA': {'name': 'Tesla Inc.', 'price': 248.95, 'change': 8.73, 'changePercent': 3.63},
    'AMZN': {'name': 'Amazon.com Inc.', 'price': 186.71, 'change': 5.12, 'changePercent': 2.82},
    'META': {'name': 'Meta Platforms Inc.', 'price': 528.14, 'change': -7.25, 'changePercent': -1.35},
    'CRM': {'name': 'Salesforce Inc.', 'price': 312.45, 'change': 4.67, 'changePercent': 1.52},
    'MNST': {'name': 'Monster Beverage Corp.', 'price': 52.89, 'change': 1.23, 'changePercent': 2.38},
    'CMG': {'name': 'Chipotle Mexican Grill', 'price': 3247.12, 'change': 45.78, 'changePercent': 1.43},
    'BIIB': {'name': 'Biogen Inc.', 'price': 155.67, 'change': -3.21, 'changePercent': -2.02},
    'BRK.B': {'name': 'Berkshire Hathaway Inc.', 'price': 459.23, 'change': 2.45, 'changePercent': 0.54}
}

# Pydantic models
class UserRegister(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Investment(BaseModel):
    stock_symbol: str
    amount: float

class UserResponse(BaseModel):
    id: str
    email: str
    created_at: datetime
    portfolio: List[dict] = []

class InvestmentResponse(BaseModel):
    id: str
    user_id: str
    stock_symbol: str
    shares: float
    invested_amount: float
    invested_at: datetime

# Helper functions
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        user = users_collection.find_one({"email": email})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

# API endpoints
@app.get("/")
async def root():
    return {"message": "6ex API - Fractional Stock Investment Platform", "version": "1.0.0"}

@app.post("/api/auth/register")
async def register(user_data: UserRegister):
    # Check if user already exists
    if users_collection.find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "created_at": datetime.utcnow(),
        "portfolio": []
    }
    
    users_collection.insert_one(user_doc)
    
    # Create access token
    access_token = create_access_token(data={"sub": user_data.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": user_data.email,
            "created_at": user_doc["created_at"],
            "portfolio": []
        }
    }

@app.post("/api/auth/login")
async def login(user_data: UserLogin):
    user = users_collection.find_one({"email": user_data.email})
    
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    # Get user's portfolio
    user_investments = list(investments_collection.find({"user_id": user["id"]}))
    portfolio = []
    for inv in user_investments:
        portfolio.append({
            "stock_symbol": inv["stock_symbol"],
            "shares": inv["shares"],
            "invested_amount": inv["invested_amount"],
            "invested_at": inv["invested_at"]
        })
    
    access_token = create_access_token(data={"sub": user_data.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "created_at": user["created_at"],
            "portfolio": portfolio
        }
    }

@app.get("/api/user/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    # Get user's portfolio
    user_investments = list(investments_collection.find({"user_id": current_user["id"]}))
    portfolio = []
    for inv in user_investments:
        portfolio.append({
            "stock_symbol": inv["stock_symbol"],
            "shares": inv["shares"],
            "invested_amount": inv["invested_amount"],
            "invested_at": inv["invested_at"]
        })
    
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "created_at": current_user["created_at"],
        "portfolio": portfolio
    }

@app.get("/api/stocks")
async def get_stocks():
    return {"stocks": MOCK_STOCKS}

@app.get("/api/stocks/{symbol}")
async def get_stock(symbol: str):
    symbol = symbol.upper()
    if symbol not in MOCK_STOCKS:
        raise HTTPException(status_code=404, detail="Stock not found")
    
    return {"symbol": symbol, **MOCK_STOCKS[symbol]}

@app.post("/api/investments/buy")
async def buy_stock(investment: Investment, current_user: dict = Depends(get_current_user)):
    # Validate stock symbol
    if investment.stock_symbol not in MOCK_STOCKS:
        raise HTTPException(status_code=400, detail="Invalid stock symbol")
    
    # Validate investment amount
    if investment.amount < 1:
        raise HTTPException(status_code=400, detail="Minimum investment amount is $1")
    
    stock_price = MOCK_STOCKS[investment.stock_symbol]["price"]
    shares = investment.amount / stock_price
    
    # Check if user already has this stock
    existing_investment = investments_collection.find_one({
        "user_id": current_user["id"],
        "stock_symbol": investment.stock_symbol
    })
    
    if existing_investment:
        # Update existing investment
        new_shares = existing_investment["shares"] + shares
        new_invested_amount = existing_investment["invested_amount"] + investment.amount
        
        investments_collection.update_one(
            {"_id": existing_investment["_id"]},
            {
                "$set": {
                    "shares": new_shares,
                    "invested_amount": new_invested_amount,
                    "last_updated": datetime.utcnow()
                }
            }
        )
    else:
        # Create new investment
        investment_doc = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "stock_symbol": investment.stock_symbol,
            "shares": shares,
            "invested_amount": investment.amount,
            "invested_at": datetime.utcnow()
        }
        investments_collection.insert_one(investment_doc)
    
    # Return updated portfolio
    user_investments = list(investments_collection.find({"user_id": current_user["id"]}))
    portfolio = []
    for inv in user_investments:
        portfolio.append({
            "stock_symbol": inv["stock_symbol"],
            "shares": inv["shares"],
            "invested_amount": inv["invested_amount"],
            "invested_at": inv["invested_at"]
        })
    
    return {
        "message": f"Successfully invested ${investment.amount} in {investment.stock_symbol}",
        "shares_purchased": shares,
        "portfolio": portfolio
    }

@app.get("/api/investments")
async def get_user_investments(current_user: dict = Depends(get_current_user)):
    user_investments = list(investments_collection.find({"user_id": current_user["id"]}))
    
    investments_with_current_value = []
    for inv in user_investments:
        current_stock = MOCK_STOCKS.get(inv["stock_symbol"])
        if current_stock:
            current_value = inv["shares"] * current_stock["price"]
            gain_loss = current_value - inv["invested_amount"]
            gain_loss_percent = (gain_loss / inv["invested_amount"]) * 100
            
            investments_with_current_value.append({
                "id": inv["id"],
                "stock_symbol": inv["stock_symbol"],
                "stock_name": current_stock["name"],
                "shares": inv["shares"],
                "invested_amount": inv["invested_amount"],
                "current_price": current_stock["price"],
                "current_value": current_value,
                "gain_loss": gain_loss,
                "gain_loss_percent": gain_loss_percent,
                "invested_at": inv["invested_at"]
            })
    
    return {"investments": investments_with_current_value}

@app.get("/api/portfolio/summary")
async def get_portfolio_summary(current_user: dict = Depends(get_current_user)):
    user_investments = list(investments_collection.find({"user_id": current_user["id"]}))
    
    total_invested = 0
    total_current_value = 0
    holdings_count = len(user_investments)
    
    for inv in user_investments:
        current_stock = MOCK_STOCKS.get(inv["stock_symbol"])
        if current_stock:
            total_invested += inv["invested_amount"]
            total_current_value += inv["shares"] * current_stock["price"]
    
    total_gain_loss = total_current_value - total_invested
    total_gain_loss_percent = (total_gain_loss / total_invested * 100) if total_invested > 0 else 0
    
    return {
        "total_invested": total_invested,
        "total_current_value": total_current_value,
        "total_gain_loss": total_gain_loss,
        "total_gain_loss_percent": total_gain_loss_percent,
        "holdings_count": holdings_count
    }

# Health check endpoint
@app.get("/api/health")
async def health_check():
    try:
        # Test database connection
        client.admin.command('ping')
        return {"status": "healthy", "database": "connected", "timestamp": datetime.utcnow()}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e), "timestamp": datetime.utcnow()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)