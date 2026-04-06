from datetime import datetime

class User:
    def __init__(self, name, email, user_type, password, keycloak_id=None, mongo_id=None, created_at=None):
        self.name = name
        self.email = email
        self.user_type = user_type
        self.password = password
        self.keycloak_id = keycloak_id
        self.mongo_id = mongo_id
        self.created_at = created_at or datetime.now()
    
    def to_dict(self):
        return {
            'name': self.name,
            'email': self.email,
            'user_type': self.user_type,
            'password': self.password,
            'keycloak_id': self.keycloak_id,
            'created_at': self.created_at
        }
    
    @staticmethod
    def from_dict(data):
        return User(
            name=data['name'],
            email=data['email'],
            user_type=data['user_type'],
            password=data['password'],
            keycloak_id=data.get('keycloak_id'),
            created_at=data.get('created_at', datetime.now())
        )