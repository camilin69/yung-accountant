from datetime import datetime

class Purchase:
    def __init__(self, user_id, date, description, amount, category, created_at=None):
        self.user_id = user_id
        self.date = date
        self.description = description
        self.amount = amount
        self.category = category
        self.created_at = created_at or datetime.now()
        self.updated_at = datetime.now()
    
    def to_dict(self):
        return {
            'user_id': self.user_id,
            'date': self.date,
            'description': self.description,
            'amount': self.amount,
            'category': self.category,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
    
    @staticmethod
    def from_dict(data):
        return Purchase(
            user_id=data['user_id'],
            date=data['date'],
            description=data['description'],
            amount=data['amount'],
            category=data['category'],
            created_at=data.get('created_at', datetime.now())
        )