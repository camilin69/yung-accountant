import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # MongoDB
    MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
    MONGO_DB = os.getenv('MONGO_DB', 'cuenta_confiable')
    
    # Keycloak
    KEYCLOAK_URL = os.getenv('KEYCLOAK_URL', 'http://keycloak:8080')
    KEYCLOAK_REALM = os.getenv('KEYCLOAK_REALM', 'cuenta-confiable')
    KEYCLOAK_ADMIN = os.getenv('KEYCLOAK_ADMIN', 'admin')
    KEYCLOAK_ADMIN_PASSWORD = os.getenv('KEYCLOAK_ADMIN_PASSWORD', 'admin123')
    
    # Client Secrets
    CLIENT_ALCALDIA_DUITAMA_SECRET = os.getenv('CLIENT_ALCALDIA_DUITAMA_SECRET', 'duitama-secret-2024')
    CLIENT_ALCALDIA_SOGAMOSO_SECRET = os.getenv('CLIENT_ALCALDIA_SOGAMOSO_SECRET', 'sogamoso-secret-2024')
    CLIENT_ALCALDIA_TUNJA_SECRET = os.getenv('CLIENT_ALCALDIA_TUNJA_SECRET', 'tunja-secret-2024')
    
    @staticmethod
    def get_client_secret(client_id):
        secrets = {
            'alcaldia-duitama': Config.CLIENT_ALCALDIA_DUITAMA_SECRET,
            'alcaldia-sogamoso': Config.CLIENT_ALCALDIA_SOGAMOSO_SECRET,
            'alcaldia-tunja': Config.CLIENT_ALCALDIA_TUNJA_SECRET
        }
        return secrets.get(client_id, '')