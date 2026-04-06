from datetime import datetime

class Goal:
    def __init__(self, user_id, title, description, target_amount, current_amount, 
                 start_date, end_date, created_at=None):
        self.user_id = user_id
        self.title = title
        self.description = description
        self.target_amount = target_amount
        self.current_amount = current_amount
        self.start_date = start_date
        self.end_date = end_date
        self.created_at = created_at or datetime.now()
        self.updated_at = datetime.now()
    
    def to_dict(self):
        return {
            'user_id': self.user_id,
            'title': self.title,
            'description': self.description,
            'target_amount': self.target_amount,
            'current_amount': self.current_amount,
            'start_date': self.start_date,
            'end_date': self.end_date,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
    
    @staticmethod
    def from_dict(data):
        return Goal(
            user_id=data['user_id'],
            title=data['title'],
            description=data['description'],
            target_amount=data['target_amount'],
            current_amount=data['current_amount'],
            start_date=data['start_date'],
            end_date=data['end_date'],
            created_at=data.get('created_at', datetime.now())
        )