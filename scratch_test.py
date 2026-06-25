import os
from backend.core.config import JWT_SECRET
from backend.core.auth import create_token_pair, decode_access_token

def test():
    print(f"JWT_SECRET from config: {JWT_SECRET}")
    access_token, refresh_token = create_token_pair(1, "test@test.com")
    print(f"Generated Access Token: {access_token[:20]}...")
    decoded_user = decode_access_token(access_token)
    print(f"Decoded User ID: {decoded_user}")

if __name__ == "__main__":
    test()
