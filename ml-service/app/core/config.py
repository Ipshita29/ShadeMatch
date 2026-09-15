import os

from dotenv import load_dotenv

load_dotenv()

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
CLIENT_URL = os.getenv("CLIENT_URL", "http://localhost:5173")
SERVER_URL = os.getenv("SERVER_URL", "http://localhost:5000")
