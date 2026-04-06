from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timedelta
import os
from Saving import Saving

app = Flask(__name__)
CORS(app)

# Configuración MongoDB
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
MONGO_DB = os.getenv('MONGO_DB', 'cuenta_confiable')

client = MongoClient(MONGO_URI)
db = client[MONGO_DB]
savings_collection = db['savings']

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'}), 200

@app.route('/api/savings', methods=['GET'])
def get_savings():
    try:
        user_id = request.args.get('user_id')
        time_range = request.args.get('range', 'all')
        
        if not user_id:
            return jsonify({'error': 'user_id es requerido'}), 400
        
        query = {'user_id': user_id}
        
        # Filtrar por rango de tiempo
        if time_range != 'all':
            now = datetime.now()
            if time_range == 'week':
                start_date = now - timedelta(days=7)
            elif time_range == 'month':
                start_date = now - timedelta(days=30)
            elif time_range == 'quarter':
                start_date = now - timedelta(days=90)
            elif time_range == 'year':
                start_date = now - timedelta(days=365)
            else:
                start_date = None
            
            if start_date:
                query['date'] = {'$gte': start_date}
        
        savings = list(savings_collection.find(query).sort('date', -1))
        
        for saving in savings:
            saving['_id'] = str(saving['_id'])
        
        return jsonify(savings), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/savings', methods=['POST'])
def create_saving():
    try:
        data = request.json
        
        saving = Saving(
            user_id=data['user_id'],
            date=datetime.fromisoformat(data['date'].replace('Z', '+00:00')),
            description=data['description'],
            amount=data['amount'],
            category=data['category']
        )
        
        result = savings_collection.insert_one(saving.to_dict())
        
        return jsonify({
            'message': 'Ahorro registrado exitosamente',
            'id': str(result.inserted_id)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/savings/<saving_id>', methods=['PUT'])
def update_saving(saving_id):
    try:
        data = request.json
        data['updated_at'] = datetime.now()
        
        if 'date' in data:
            data['date'] = datetime.fromisoformat(data['date'].replace('Z', '+00:00'))
        
        result = savings_collection.update_one(
            {'_id': ObjectId(saving_id)},
            {'$set': data}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'Registro no encontrado'}), 404
        
        return jsonify({'message': 'Registro actualizado exitosamente'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/savings/<saving_id>', methods=['DELETE'])
def delete_saving(saving_id):
    try:
        result = savings_collection.delete_one({'_id': ObjectId(saving_id)})
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Registro no encontrado'}), 404
        
        return jsonify({'message': 'Registro eliminado exitosamente'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/savings/user/<user_id>/stats', methods=['GET'])
def get_savings_stats(user_id):
    try:
        savings = list(savings_collection.find({'user_id': user_id}))
        
        total = sum(s['amount'] for s in savings)
        
        # Estadísticas por mes
        current_month = datetime.now().month
        current_year = datetime.now().year
        monthly_total = sum(
            s['amount'] for s in savings 
            if s['date'].month == current_month and s['date'].year == current_year
        )
        
        # Estadísticas por categoría
        categories = {}
        for saving in savings:
            cat = saving['category']
            if cat not in categories:
                categories[cat] = 0
            categories[cat] += saving['amount']
        
        # Proyección anual
        avg_monthly = total / 12 if len(savings) > 0 else 0
        yearly_projection = avg_monthly * 12
        
        return jsonify({
            'total': total,
            'monthly_total': monthly_total,
            'yearly_projection': yearly_projection,
            'categories': categories,
            'total_records': len(savings)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5003, debug=True)