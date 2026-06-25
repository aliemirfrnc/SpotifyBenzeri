from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from backend.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="USER")
    created_at = Column(Float, nullable=False)

    # Relationships can be added here as the migration progresses
    # e.g. subscriptions = relationship("Subscription", back_populates="user")

class RateLimit(Base):
    __tablename__ = "rate_limits"

    ip_address = Column(String, primary_key=True, index=True)
    request_count = Column(Integer, default=1)
    reset_at = Column(Float, nullable=False)

# Not: Diğer tüm tablolar (pronunciation_sessions, user_words, plans vb.)
# Raw SQL'den SQLAlchemy'ye kademeli olarak geçirildikçe buraya eklenecektir.
