from datetime import datetime

class Debt:
    def __init__(self, user_id, type, concept, amount, date, due_date=None, 
                 status='pending', created_at=None):
        self.user_id = user_id
        self.type = type  # 'debt' o 'credit'
        self.concept = concept
        self.amount = amount
        self.date = date
        self.due_date = due_date
        self.status = status
        self.created_at = created_at or datetime.now()
        self.updated_at = datetime.now()
    
    def to_dict(self):
        return {
            'user_id': self.user_id,
            'type': self.type,
            'concept': self.concept,
            'amount': self.amount,
            'date': self.date,
            'due_date': self.due_date,
            'status': self.status,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
    
    @staticmethod
    def from_dict(data):
        return Debt(
            user_id=data['user_id'],
            type=data['type'],
            concept=data['concept'],
            amount=data['amount'],
            date=data['date'],
            due_date=data.get('due_date'),
            status=data.get('status', 'pending'),
            created_at=data.get('created_at', datetime.now())
        )

class Income:
    def __init__(self, user_id, date, source, amount, period, created_at=None):
        self.user_id = user_id
        self.date = date
        self.source = source
        self.amount = amount
        self.period = period
        self.created_at = created_at or datetime.now()
        self.updated_at = datetime.now()
    
    def to_dict(self):
        return {
            'user_id': self.user_id,
            'date': self.date,
            'source': self.source,
            'amount': self.amount,
            'period': self.period,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
    
    @staticmethod
    def from_dict(data):
        return Income(
            user_id=data['user_id'],
            date=data['date'],
            source=data['source'],
            amount=data['amount'],
            period=data['period'],
            created_at=data.get('created_at', datetime.now())
        )