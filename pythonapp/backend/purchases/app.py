from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timedelta
import os
from Purchase import Purchase

app = Flask(__name__)
CORS(app)

# Configuración MongoDB
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
MONGO_DB = os.getenv('MONGO_DB', 'cuenta_confiable')

client = MongoClient(MONGO_URI)
db = client[MONGO_DB]
purchases_collection = db['purchases']

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'}), 200

@app.route('/api/purchases', methods=['GET'])
def get_purchases():
    try:
        user_id = request.args.get('user_id')
        time_range = request.args.get('range', 'all')
        category = request.args.get('category', 'all')
        
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
        
        # Filtrar por categoría
        if category != 'all':
            query['category'] = category
        
        purchases = list(purchases_collection.find(query).sort('date', -1))
        
        for purchase in purchases:
            purchase['_id'] = str(purchase['_id'])
        
        return jsonify(purchases), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/purchases', methods=['POST'])
def create_purchase():
    try:
        data = request.json
        
        purchase = Purchase(
            user_id=data['user_id'],
            date=datetime.fromisoformat(data['date'].replace('Z', '+00:00')),
            description=data['description'],
            amount=data['amount'],
            category=data['category']
        )
        
        result = purchases_collection.insert_one(purchase.to_dict())
        
        return jsonify({
            'message': 'Compra registrada exitosamente',
            'id': str(result.inserted_id)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/purchases/<purchase_id>', methods=['PUT'])
def update_purchase(purchase_id):
    try:
        data = request.json
        data['updated_at'] = datetime.now()
        
        if 'date' in data:
            data['date'] = datetime.fromisoformat(data['date'].replace('Z', '+00:00'))
        
        result = purchases_collection.update_one(
            {'_id': ObjectId(purchase_id)},
            {'$set': data}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'Compra no encontrada'}), 404
        
        return jsonify({'message': 'Compra actualizada exitosamente'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/purchases/<purchase_id>', methods=['DELETE'])
def delete_purchase(purchase_id):
    try:
        result = purchases_collection.delete_one({'_id': ObjectId(purchase_id)})
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Compra no encontrada'}), 404
        
        return jsonify({'message': 'Compra eliminada exitosamente'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/purchases/user/<user_id>/stats', methods=['GET'])
def get_purchase_stats(user_id):
    try:
        purchases = list(purchases_collection.find({'user_id': user_id}))
        
        if not purchases:
            return jsonify({
                'total': 0,
                'average': 0,
                'max': 0,
                'min': 0,
                'categories': {},
                'total_records': 0
            }), 200
        
        total = sum(p['amount'] for p in purchases)
        average = total / len(purchases)
        max_amount = max(p['amount'] for p in purchases)
        min_amount = min(p['amount'] for p in purchases)
        
        # Estadísticas por categoría
        categories = {}
        for purchase in purchases:
            cat = purchase['category']
            if cat not in categories:
                categories[cat] = {
                    'total': 0,
                    'count': 0,
                    'average': 0
                }
            categories[cat]['total'] += purchase['amount']
            categories[cat]['count'] += 1
        
        for cat in categories:
            categories[cat]['average'] = categories[cat]['total'] / categories[cat]['count']
        
        # Últimas 5 compras
        recent = sorted(purchases, key=lambda x: x['date'], reverse=True)[:5]
        recent_list = [{
            'id': str(p['_id']),
            'date': p['date'],
            'description': p['description'],
            'amount': p['amount'],
            'category': p['category']
        } for p in recent]
        
        return jsonify({
            'total': total,
            'average': average,
            'max': max_amount,
            'min': min_amount,
            'categories': categories,
            'total_records': len(purchases),
            'recent': recent_list
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5004, debug=True)