
import os
import json
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Literal

from dotenv import load_dotenv
from fastapi import (
    FastAPI, Depends, HTTPException, status,
    WebSocket, WebSocketDisconnect
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from pwdlib import PasswordHash
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import (
    create_engine, Column, Integer, String, DateTime,
    Boolean, ForeignKey, Float, Text, UniqueConstraint, func, text
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from pywebpush import webpush, WebPushException


# =====================================================
# ENVIRONMENT
# =====================================================

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY")
VAPID_SUBJECT = os.getenv(
    "VAPID_SUBJECT",
    "mailto:admin@foodexpiryrescue.com"
)

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
)

EXPIRY_CHECK_INTERVAL_SECONDS = int(
    os.getenv("EXPIRY_CHECK_INTERVAL_SECONDS", "900")
)

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL must be configured in backend/.env")

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY must be configured in backend/.env")


# =====================================================
# DATABASE
# =====================================================

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)

Base = declarative_base()


# =====================================================
# AUTHENTICATION
# =====================================================

password_hash = PasswordHash.recommended()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# =====================================================
# FASTAPI
# =====================================================

app = FastAPI(
    title="Food Expiry Rescue API",
    description="Backend API for Food Expiry Rescue",
    version="1.5.0",
)


# =====================================================
# CORS
# =====================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:5176",
        "http://127.0.0.1:5176",
        "http://localhost:5177",
        "http://127.0.0.1:5177",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================
# DATABASE MODELS
# =====================================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=False)
    role = Column(String(20), nullable=False)
    hashed_password = Column(String(255), nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Food(Base):
    __tablename__ = "food_items"

    id = Column(Integer, primary_key=True, index=True)
    food_name = Column(String(100), nullable=False)
    quantity = Column(String(100), nullable=False)
    location = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    description = Column(String(500), nullable=True)
    expiry_time = Column(DateTime(timezone=True), nullable=True)

    donor_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )

    is_available = Column(Boolean, default=True, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class FoodRequest(Base):
    __tablename__ = "food_requests"

    id = Column(Integer, primary_key=True, index=True)
    food_id = Column(Integer, ForeignKey("food_items.id"), nullable=False)

    receiver_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )

    receiver_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    quantity = Column(String(100), nullable=False)
    message = Column(String(500), nullable=True)
    status = Column(String(20), default="pending", nullable=False)

    volunteer_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )

    pickup_status = Column(
        String(20),
        default="waiting",
        nullable=False,
    )

    volunteer_assigned_at = Column(DateTime(timezone=True), nullable=True)
    collected_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(
        Integer,
        ForeignKey("food_requests.id"),
        nullable=False,
        index=True,
    )
    sender_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )
    message = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    endpoint = Column(Text, nullable=False, unique=True)
    subscription_json = Column(Text, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class ExpiryAlertLog(Base):
    __tablename__ = "expiry_alert_logs"

    id = Column(Integer, primary_key=True, index=True)

    food_id = Column(
        Integer,
        ForeignKey("food_items.id"),
        nullable=False,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    notification_type = Column(String(30), nullable=False)

    sent_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "food_id",
            "user_id",
            "notification_type",
            name="uq_food_user_expiry_alert",
        ),
    )


# =====================================================
# CREATE TABLES AND MIGRATE EXISTING DATABASE
# =====================================================

Base.metadata.create_all(bind=engine)


def migrate_existing_tables():
    if engine.dialect.name != "postgresql":
        return

    with engine.begin() as connection:

        connection.execute(text("""
            ALTER TABLE food_items
            ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION
        """))

        connection.execute(text("""
            ALTER TABLE food_items
            ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION
        """))

        connection.execute(text("""
            ALTER TABLE food_items
            ADD COLUMN IF NOT EXISTS donor_id INTEGER
            REFERENCES users(id)
        """))

        connection.execute(text("""
            ALTER TABLE food_requests
            ADD COLUMN IF NOT EXISTS receiver_id INTEGER
            REFERENCES users(id)
        """))

        connection.execute(text("""
            ALTER TABLE food_requests
            ADD COLUMN IF NOT EXISTS volunteer_id INTEGER
            REFERENCES users(id)
        """))

        connection.execute(text("""
            ALTER TABLE food_requests
            ADD COLUMN IF NOT EXISTS pickup_status VARCHAR(20)
            NOT NULL DEFAULT 'waiting'
        """))

        connection.execute(text("""
            ALTER TABLE food_requests
            ADD COLUMN IF NOT EXISTS volunteer_assigned_at TIMESTAMPTZ
        """))

        connection.execute(text("""
            ALTER TABLE food_requests
            ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ
        """))

        connection.execute(text("""
            ALTER TABLE food_requests
            ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ
        """))


migrate_existing_tables()


# =====================================================
# PYDANTIC SCHEMAS
# =====================================================

class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=10, max_length=20)
    role: Literal["donor", "receiver", "volunteer"]
    password: str = Field(min_length=8, max_length=128)


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    phone: str
    role: str

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class FoodCreate(BaseModel):
    food_name: str = Field(min_length=2, max_length=100)
    quantity: str = Field(min_length=1, max_length=100)
    location: str = Field(min_length=2, max_length=255)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    description: str | None = Field(default=None, max_length=500)
    expiry_time: datetime | None = None


class FoodRequestCreate(BaseModel):
    receiver_name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=10, max_length=20)
    quantity: str = Field(min_length=1, max_length=100)
    message: str | None = Field(default=None, max_length=500)


class PushSubscriptionCreate(BaseModel):
    subscription: dict


# =====================================================
# DATABASE DEPENDENCY
# =====================================================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =====================================================
# PASSWORD HELPERS
# =====================================================

def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hash.verify(plain_password, hashed_password)


# =====================================================
# JWT HELPERS
# =====================================================

def create_access_token(user_id: int, role: str):
    expires = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": expires,
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Invalid or expired authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        user_id = payload.get("sub")

        if user_id is None:
            raise credentials_exception

        user_id = int(user_id)

    except (JWTError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise credentials_exception

    return user


def require_role(user: User, role: str):
    if user.role != role:
        raise HTTPException(
            status_code=403,
            detail=f"Only {role}s can perform this action",
        )


# =====================================================
# EXPIRY RISK CALCULATOR
# =====================================================

def calculate_expiry_risk(expiry_time):
    if expiry_time is None:
        return {
            "risk_score": None,
            "risk_level": "unknown",
            "hours_remaining": None,
        }

    if expiry_time.tzinfo is None:
        expiry_time = expiry_time.replace(tzinfo=timezone.utc)

    current_time = datetime.now(timezone.utc)
    time_remaining = expiry_time - current_time
    hours_remaining = time_remaining.total_seconds() / 3600

    if hours_remaining <= 0:
        return {
            "risk_score": 100,
            "risk_level": "expired",
            "hours_remaining": 0,
        }

    if hours_remaining <= 2:
        risk_score, risk_level = 100, "critical"
    elif hours_remaining <= 6:
        risk_score, risk_level = 85, "high"
    elif hours_remaining <= 12:
        risk_score, risk_level = 70, "high"
    elif hours_remaining <= 24:
        risk_score, risk_level = 55, "medium"
    elif hours_remaining <= 48:
        risk_score, risk_level = 35, "low"
    else:
        risk_score, risk_level = 15, "low"

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "hours_remaining": round(hours_remaining, 1),
    }


# =====================================================
# COMMON FOOD RESPONSE
# =====================================================

def food_response(food):
    risk = calculate_expiry_risk(food.expiry_time)

    return {
        "id": food.id,
        "food_name": food.food_name,
        "quantity": food.quantity,
        "location": food.location,
        "latitude": food.latitude,
        "longitude": food.longitude,
        "description": food.description,
        "expiry_time": (
            food.expiry_time.isoformat()
            if food.expiry_time else None
        ),
        "is_available": food.is_available,
        "risk_score": risk["risk_score"],
        "risk_level": risk["risk_level"],
        "hours_remaining": risk["hours_remaining"],
    }


# =====================================================
# HOME AND HEALTH
# =====================================================

@app.get("/")
def home():
    return {
        "message": "Food Expiry Rescue API is running",
        "status": "success",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


# =====================================================
# REGISTRATION
# =====================================================

@app.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    user_data: RegisterRequest,
    db: Session = Depends(get_db),
):
    email = str(user_data.email).lower()

    existing_user = db.query(User).filter(
        User.email == email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="This email is already registered",
        )

    new_user = User(
        full_name=user_data.full_name,
        email=email,
        phone=user_data.phone,
        role=user_data.role,
        hashed_password=hash_password(user_data.password),
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="This email is already registered",
        )

    return new_user


# =====================================================
# LOGIN
# =====================================================

@app.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    email = form_data.username.lower()

    user = db.query(User).filter(User.email == email).first()

    if (
        user is None
        or not verify_password(
            form_data.password,
            user.hashed_password,
        )
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(user.id, user.role)

    return {
        "access_token": token,
        "token_type": "bearer",
    }


# =====================================================
# CURRENT USER
# =====================================================

@app.get("/users/me", response_model=UserResponse)
def read_users_me(
    current_user: User = Depends(get_current_user),
):
    return current_user


# =====================================================
# DONATE FOOD
# =====================================================

@app.post("/food", status_code=status.HTTP_201_CREATED)
def donate_food(
    food: FoodCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_role(current_user, "donor")

    new_food = Food(
        food_name=food.food_name,
        quantity=food.quantity,
        location=food.location,
        latitude=food.latitude,
        longitude=food.longitude,
        description=food.description,
        expiry_time=food.expiry_time,
        donor_id=current_user.id,
        is_available=True,
    )

    try:
        db.add(new_food)
        db.commit()
        db.refresh(new_food)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to save food donation",
        )

    return {
        "message": "Food donated successfully",
        "food": food_response(new_food),
    }


# =====================================================
# FIND AVAILABLE FOOD
# =====================================================

@app.get("/food")
def find_food(db: Session = Depends(get_db)):
    foods = (
        db.query(Food)
        .filter(Food.is_available.is_(True))
        .order_by(Food.id.desc())
        .all()
    )

    return [food_response(item) for item in foods]


# =====================================================
# FOOD RECOMMENDATIONS
# =====================================================

@app.get("/food/recommendations")
def get_food_recommendations(db: Session = Depends(get_db)):
    foods = (
        db.query(Food)
        .filter(Food.is_available.is_(True))
        .all()
    )

    recommendations = []

    for food in foods:
        risk = calculate_expiry_risk(food.expiry_time)

        if risk["risk_level"] == "expired":
            continue

        item = food_response(food)

        item["recommendation_reason"] = (
            "Prioritized because it has a shorter "
            "time remaining before expiry."
        )

        recommendations.append(item)

    recommendations.sort(
        key=lambda item: (
            item["risk_score"] is None,
            -(item["risk_score"] or 0),
        )
    )

    return {
        "message": "Food recommendations generated successfully",
        "total_recommendations": len(recommendations),
        "recommendations": recommendations,
    }


# =====================================================
# EMERGENCY FOOD ALERTS
# =====================================================

@app.get("/food/emergency-alerts")
def get_emergency_food_alerts(db: Session = Depends(get_db)):
    foods = (
        db.query(Food)
        .filter(Food.is_available.is_(True))
        .order_by(Food.id.desc())
        .all()
    )

    alerts = []

    for food in foods:
        risk = calculate_expiry_risk(food.expiry_time)

        if risk["risk_level"] not in ["high", "critical"]:
            continue

        alerts.append({
            "id": food.id,
            "food_name": food.food_name,
            "quantity": food.quantity,
            "location": food.location,
            "latitude": food.latitude,
            "longitude": food.longitude,
            "expiry_time": (
                food.expiry_time.isoformat()
                if food.expiry_time else None
            ),
            "risk_score": risk["risk_score"],
            "risk_level": risk["risk_level"],
            "hours_remaining": risk["hours_remaining"],
            "alert_message": (
                f"Urgent! {food.food_name} needs to be rescued soon."
            ),
        })

    alerts.sort(key=lambda item: item["hours_remaining"])

    return {
        "message": "Emergency food alerts generated successfully",
        "total_alerts": len(alerts),
        "alerts": alerts,
    }


# =====================================================
# FOOD EXPIRY NOTIFICATIONS
# =====================================================

@app.get("/notifications/expiry")
def get_expiry_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    foods = (
        db.query(Food)
        .filter(
            Food.expiry_time.isnot(None),
            Food.is_available.is_(True),
            Food.donor_id == current_user.id,
        )
        .order_by(Food.expiry_time.asc())
        .all()
    )

    notifications = []

    for food in foods:
        risk = calculate_expiry_risk(food.expiry_time)
        hours = risk["hours_remaining"]

        if risk["risk_level"] == "expired":
            notification_type = "expired"
            message = f"{food.food_name} has expired."

        elif hours is not None and hours <= 48:
            notification_type = "expiring_soon"
            message = (
                f"{food.food_name} is expiring soon. "
                f"Only {hours} hours remaining."
            )

        else:
            continue

        notifications.append({
            "food_id": food.id,
            "food_name": food.food_name,
            "quantity": food.quantity,
            "location": food.location,
            "expiry_time": food.expiry_time.isoformat(),
            "notification_type": notification_type,
            "message": message,
            "risk_score": risk["risk_score"],
            "risk_level": risk["risk_level"],
            "hours_remaining": hours,
        })

    return {
        "message": "Food expiry notifications generated successfully",
        "total_notifications": len(notifications),
        "notifications": notifications,
    }


# =====================================================
# SEND PUSH NOTIFICATION
# =====================================================

def send_push_notification(subscription, title, message):
    if not VAPID_PUBLIC_KEY or not VAPID_PRIVATE_KEY:
        print("Push notification skipped: VAPID keys are missing.")
        return False

    try:
        webpush(
            subscription_info=subscription,
            data=json.dumps({
                "title": title,
                "body": message,
            }),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_SUBJECT},
            ttl=3600,
        )

        return True

    except WebPushException as error:
        print("Push notification failed:", repr(error))
        return False

    except Exception as error:
        print("Unexpected push notification error:", repr(error))
        return False


# =====================================================
# SAVE BROWSER PUSH SUBSCRIPTION
# =====================================================

@app.post("/notifications/subscribe")
def subscribe_to_notifications(
    data: PushSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subscription = data.subscription

    endpoint = subscription.get("endpoint")
    keys = subscription.get("keys")

    if (
        not endpoint
        or not isinstance(keys, dict)
        or not keys.get("p256dh")
        or not keys.get("auth")
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid push subscription",
        )

    existing = db.query(PushSubscription).filter(
        PushSubscription.endpoint == endpoint
    ).first()

    try:
        serialized = json.dumps(subscription)

        if existing:
            existing.user_id = current_user.id
            existing.subscription_json = serialized
        else:
            db.add(PushSubscription(
                user_id=current_user.id,
                endpoint=endpoint,
                subscription_json=serialized,
            ))

        db.commit()

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not save notification subscription",
        )

    return {
        "message": "Push notifications subscribed successfully"
    }


# =====================================================
# AUTOMATIC EXPIRY ALERT CHECKER
# =====================================================

def check_and_send_expiry_alerts():
    db = SessionLocal()
    sent_count = 0

    try:
        foods = (
            db.query(Food)
            .filter(
                Food.is_available.is_(True),
                Food.expiry_time.isnot(None),
                Food.donor_id.isnot(None),
            )
            .all()
        )

        for food in foods:
            risk = calculate_expiry_risk(food.expiry_time)
            hours = risk["hours_remaining"]

            if hours is None or hours > 48:
                continue

            if risk["risk_level"] == "expired":
                notification_type = "expired"
                title = "Food expiry alert"
                message = f"{food.food_name} has expired."
            else:
                notification_type = "expiring_soon"
                title = "Food expiring soon"
                message = (
                    f"{food.food_name} is expiring soon. "
                    f"Only {hours} hours remaining."
                )

            donor_id = food.donor_id

            already_sent = db.query(ExpiryAlertLog).filter(
                ExpiryAlertLog.food_id == food.id,
                ExpiryAlertLog.user_id == donor_id,
                ExpiryAlertLog.notification_type == notification_type,
            ).first()

            if already_sent:
                continue

            subscriptions = db.query(PushSubscription).filter(
                PushSubscription.user_id == donor_id
            ).all()

            if not subscriptions:
                continue

            successfully_sent = False

            for saved_subscription in subscriptions:
                try:
                    subscription_data = json.loads(
                        saved_subscription.subscription_json
                    )
                except (TypeError, json.JSONDecodeError):
                    continue

                if send_push_notification(
                    subscription_data,
                    title,
                    message,
                ):
                    successfully_sent = True

            if successfully_sent:
                db.add(ExpiryAlertLog(
                    food_id=food.id,
                    user_id=donor_id,
                    notification_type=notification_type,
                ))

                try:
                    db.commit()
                    sent_count += 1
                except IntegrityError:
                    db.rollback()
                except SQLAlchemyError as error:
                    db.rollback()
                    print("Could not save expiry alert log:", repr(error))

        print(
            f"Expiry push check complete. "
            f"Alert groups sent: {sent_count}"
        )

    except Exception as error:
        db.rollback()
        print("Expiry notification checker error:", repr(error))

    finally:
        db.close()


async def expiry_notification_loop():
    while True:
        try:
            await asyncio.to_thread(check_and_send_expiry_alerts)

        except asyncio.CancelledError:
            raise

        except Exception as error:
            print("Expiry notification loop error:", repr(error))

        await asyncio.sleep(EXPIRY_CHECK_INTERVAL_SECONDS)


@app.on_event("startup")
async def start_expiry_notification_loop():
    app.state.expiry_notification_task = asyncio.create_task(
        expiry_notification_loop()
    )


@app.on_event("shutdown")
async def stop_expiry_notification_loop():
    task = getattr(app.state, "expiry_notification_task", None)

    if task:
        task.cancel()

        try:
            await task
        except asyncio.CancelledError:
            pass


# =====================================================
# FOOD HEATMAP
# =====================================================

@app.get("/food/heatmap")
def get_food_heatmap(db: Session = Depends(get_db)):
    foods = (
        db.query(Food)
        .filter(
            Food.is_available.is_(True),
            Food.latitude.isnot(None),
            Food.longitude.isnot(None),
        )
        .all()
    )

    location_groups = {}

    for food in foods:
        risk = calculate_expiry_risk(food.expiry_time)

        if risk["risk_level"] == "expired":
            continue

        coordinate_key = (
            round(food.latitude, 5),
            round(food.longitude, 5),
        )

        if coordinate_key not in location_groups:
            location_groups[coordinate_key] = {
                "latitude": food.latitude,
                "longitude": food.longitude,
                "food_count": 0,
                "urgency_total": 0,
                "urgency_count": 0,
                "food_items": [],
            }

        group = location_groups[coordinate_key]
        group["food_count"] += 1

        if risk["risk_score"] is not None:
            group["urgency_total"] += risk["risk_score"]
            group["urgency_count"] += 1

        group["food_items"].append({
            "id": food.id,
            "food_name": food.food_name,
            "quantity": food.quantity,
            "location": food.location,
            "expiry_time": (
                food.expiry_time.isoformat()
                if food.expiry_time else None
            ),
            "risk_score": risk["risk_score"],
            "risk_level": risk["risk_level"],
            "hours_remaining": risk["hours_remaining"],
        })

    heatmap_points = []

    for group in location_groups.values():
        food_count = group["food_count"]

        if group["urgency_count"] > 0:
            average_urgency = (
                group["urgency_total"] / group["urgency_count"]
            )
        else:
            average_urgency = 0

        donation_intensity = min(food_count / 5, 1.0)
        urgency_intensity = average_urgency / 100

        heatmap_points.append({
            "latitude": group["latitude"],
            "longitude": group["longitude"],
            "food_count": food_count,
            "donation_intensity": round(donation_intensity, 2),
            "urgency_intensity": round(urgency_intensity, 2),
            "average_urgency_score": round(average_urgency, 1),
            "food_items": group["food_items"],
        })

    return {
        "message": "Food heat map data generated successfully",
        "total_locations": len(heatmap_points),
        "total_food_items": sum(
            point["food_count"] for point in heatmap_points
        ),
        "heatmap_points": heatmap_points,
    }


# =====================================================
# REQUEST FOOD
# =====================================================

@app.post(
    "/food/{food_id}/requests",
    status_code=status.HTTP_201_CREATED,
)
def request_food(
    food_id: int,
    request_data: FoodRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_role(current_user, "receiver")

    food = db.query(Food).filter(
        Food.id == food_id,
        Food.is_available.is_(True),
    ).first()

    if food is None:
        raise HTTPException(
            status_code=404,
            detail="Food donation not found or no longer available",
        )

    new_request = FoodRequest(
        food_id=food_id,
        receiver_id=current_user.id,
        receiver_name=request_data.receiver_name,
        phone=request_data.phone,
        quantity=request_data.quantity,
        message=request_data.message,
        status="pending",
    )

    try:
        db.add(new_request)
        db.commit()
        db.refresh(new_request)

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to save food request",
        )

    return {
        "message": "Food request submitted successfully",
        "request": {
            "id": new_request.id,
            "food_id": new_request.food_id,
            "receiver_name": new_request.receiver_name,
            "quantity": new_request.quantity,
            "status": new_request.status,
        },
    }


# =====================================================
# VIEW FOOD REQUESTS
# =====================================================

@app.get("/food/requests")
def get_food_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(FoodRequest, Food)
        .join(Food, FoodRequest.food_id == Food.id)
    )

    if current_user.role == "donor":
        query = query.filter(Food.donor_id == current_user.id)

    elif current_user.role == "receiver":
        query = query.filter(
            FoodRequest.receiver_id == current_user.id
        )

    else:
        raise HTTPException(
            status_code=403,
            detail="Only donors and receivers can view food requests",
        )

    requests = query.order_by(FoodRequest.id.desc()).all()

    return [
        {
            "request_id": food_request.id,
            "food_id": food.id,
            "food_name": food.food_name,
            "food_location": food.location,
            "receiver_name": food_request.receiver_name,
            "phone": food_request.phone,
            "requested_quantity": food_request.quantity,
            "message": food_request.message,
            "status": food_request.status,
            "created_at": (
                food_request.created_at.isoformat()
                if food_request.created_at else None
            ),
        }
        for food_request, food in requests
    ]


# =====================================================
# ACCEPT OR REJECT REQUEST
# =====================================================

@app.put("/food/requests/{request_id}/status")
def update_food_request_status(
    request_id: int,
    new_status: Literal["accepted", "rejected"],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_role(current_user, "donor")

    food_request = (
        db.query(FoodRequest)
        .join(Food, FoodRequest.food_id == Food.id)
        .filter(
            FoodRequest.id == request_id,
            Food.donor_id == current_user.id,
        )
        .first()
    )

    if food_request is None:
        raise HTTPException(
            status_code=404,
            detail="Food request not found for your donations",
        )

    if food_request.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="This request has already been processed",
        )

    food_request.status = new_status

    try:
        db.commit()
        db.refresh(food_request)

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update food request status",
        )

    return {
        "message": f"Food request {new_status} successfully",
        "request_id": food_request.id,
        "status": food_request.status,
    }


# =====================================================
# VOLUNTEER PICKUP SYSTEM
# =====================================================

@app.get("/volunteer/pickups")
def get_volunteer_pickups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "volunteer":
        raise HTTPException(
            status_code=403,
            detail="Only volunteers can view pickup tasks",
        )

    tasks = (
        db.query(FoodRequest, Food)
        .join(Food, FoodRequest.food_id == Food.id)
        .filter(
            FoodRequest.status == "accepted",
            (
                (FoodRequest.pickup_status == "waiting")
                | (FoodRequest.volunteer_id == current_user.id)
            ),
        )
        .order_by(FoodRequest.id.desc())
        .all()
    )

    return [
        {
            "request_id": request.id,
            "food_id": food.id,
            "food_name": food.food_name,
            "location": food.location,

            # Coordinates used by the volunteer pickup map
            "latitude": food.latitude,
            "longitude": food.longitude,

            "quantity": request.quantity,
            "receiver_name": request.receiver_name,
            "receiver_phone": request.phone,
            "pickup_status": request.pickup_status,
            "volunteer_id": request.volunteer_id,
        }
        for request, food in tasks
    ]


@app.post("/volunteer/pickups/{request_id}/accept")
def accept_volunteer_pickup(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "volunteer":
        raise HTTPException(
            status_code=403,
            detail="Only volunteers can accept pickup tasks",
        )

    task = (
        db.query(FoodRequest)
        .filter(FoodRequest.id == request_id)
        .with_for_update()
        .first()
    )

    if not task:
        raise HTTPException(status_code=404, detail="Request not found")

    if task.status != "accepted":
        raise HTTPException(
            status_code=400,
            detail="Donor must approve the food request first",
        )

    if task.pickup_status != "waiting" or task.volunteer_id is not None:
        raise HTTPException(
            status_code=409,
            detail="This pickup task has already been assigned",
        )

    task.volunteer_id = current_user.id
    task.pickup_status = "assigned"
    task.volunteer_assigned_at = datetime.now(timezone.utc)

    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to accept pickup task",
        )

    return {
        "message": "Pickup task accepted successfully",
        "request_id": task.id,
        "pickup_status": task.pickup_status,
    }


@app.put("/volunteer/pickups/{request_id}/status")

def update_volunteer_pickup_status(
    request_id: int,
    new_status: Literal["collected", "delivered"],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "volunteer":
        raise HTTPException(
            status_code=403,
            detail="Only volunteers can update pickup status",
        )

    task = (
        db.query(FoodRequest)
        .filter(
            FoodRequest.id == request_id,
            FoodRequest.volunteer_id == current_user.id,
        )
        .first()
    )

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Pickup task not found or not assigned to you",
        )

    now = datetime.now(timezone.utc)

    if new_status == "collected":
        if task.pickup_status != "assigned":
            raise HTTPException(
                status_code=400,
                detail="Task must be assigned before collection",
            )

        task.pickup_status = "collected"
        task.collected_at = now

    elif new_status == "delivered":
        if task.pickup_status != "collected":
            raise HTTPException(
                status_code=400,
                detail="Food must be collected before delivery",
            )

        task.pickup_status = "delivered"
        task.delivered_at = now

    try:
        db.commit()
        db.refresh(task)

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update pickup status",
        )

    return {
        "message": "Pickup status updated successfully",
        "request_id": task.id,
        "pickup_status": task.pickup_status,
    }


# =====================================================
# REAL-TIME CHAT
# =====================================================

class ChatConnectionManager:
    def __init__(self):
        self.rooms = {}

    async def connect(self, request_id: int, websocket: WebSocket):
        await websocket.accept()
        self.rooms.setdefault(request_id, []).append(websocket)

    def disconnect(self, request_id: int, websocket: WebSocket):
        if request_id in self.rooms:
            if websocket in self.rooms[request_id]:
                self.rooms[request_id].remove(websocket)

            if not self.rooms[request_id]:
                del self.rooms[request_id]

    async def broadcast(self, request_id: int, message: dict):
        connections = self.rooms.get(request_id, []).copy()

        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(request_id, connection)


chat_manager = ChatConnectionManager()


def can_access_chat(db: Session, request_id: int, user: User):
    result = (
        db.query(FoodRequest, Food)
        .join(Food, FoodRequest.food_id == Food.id)
        .filter(FoodRequest.id == request_id)
        .first()
    )

    if not result:
        return False

    food_request, food = result

    return user.id in [
        food.donor_id,
        food_request.receiver_id,
        food_request.volunteer_id,
    ]


@app.get("/chat/{request_id}/messages")
def get_chat_messages(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not can_access_chat(db, request_id, current_user):
        raise HTTPException(
            status_code=403,
            detail="You cannot access this chat",
        )

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.request_id == request_id)
        .order_by(ChatMessage.id.asc())
        .all()
    )

    return [
        {
            "id": message.id,
            "request_id": message.request_id,
            "sender_id": message.sender_id,
            "message": message.message,
            "created_at": (
                message.created_at.isoformat()
                if message.created_at else None
            ),
        }
        for message in messages
    ]


@app.websocket("/ws/chat/{request_id}")
async def websocket_chat(
    websocket: WebSocket,
    request_id: int,
    token: str,
):
    db = SessionLocal()
    connected = False

    try:
        try:
            payload = jwt.decode(
                token,
                SECRET_KEY,
                algorithms=[ALGORITHM],
            )
            user_id = int(payload.get("sub"))
        except (JWTError, ValueError, TypeError):
            await websocket.close(code=1008)
            return

        user = db.query(User).filter(User.id == user_id).first()

        if not user or not can_access_chat(db, request_id, user):
            await websocket.close(code=1008)
            return

        await chat_manager.connect(request_id, websocket)
        connected = True

        while True:
            message_text = await websocket.receive_text()
            message_text = message_text.strip()

            if not message_text:
                continue

            if len(message_text) > 2000:
                await websocket.send_json({
                    "error": "Message cannot exceed 2000 characters"
                })
                continue

            saved_message = ChatMessage(
                request_id=request_id,
                sender_id=user.id,
                message=message_text,
            )

            db.add(saved_message)
            db.commit()
            db.refresh(saved_message)

            message_data = {
                "id": saved_message.id,
                "request_id": request_id,
                "sender_id": user.id,
                "sender_name": user.full_name,
                "message": saved_message.message,
                "created_at": (
                    saved_message.created_at.isoformat()
                    if saved_message.created_at else None
                ),
            }

            await chat_manager.broadcast(request_id, message_data)

    except WebSocketDisconnect:
        pass

    except Exception as error:
        db.rollback()
        print("Chat connection error:", repr(error))

    finally:
        if connected:
            chat_manager.disconnect(request_id, websocket)
        db.close()
