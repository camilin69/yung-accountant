from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timedelta
import os
from models import Debt, Income

app = Flask(__name__)
CORS(app)

# Configuración MongoDB
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
MONGO_DB = os.getenv('MONGO_DB', 'cuenta_confiable')

client = MongoClient(MONGO_URI)
db = client[MONGO_DB]
debts_collection = db['debts']
incomes_collection = db['incomes']

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'}), 200

# ============ ENDPOINTS PARA DEUDAS/CRÉDITOS ============

@app.route('/api/storage/debts', methods=['GET'])
def get_debts():
    try:
        user_id = request.args.get('user_id')
        type_filter = request.args.get('type', 'all')  # debt, credit, all
        
        if not user_id:
            return jsonify({'error': 'user_id es requerido'}), 400
        
        query = {'user_id': user_id}
        if type_filter != 'all':
            query['type'] = type_filter
        
        debts = list(debts_collection.find(query).sort('date', -1))
        
        for debt in debts:
            debt['_id'] = str(debt['_id'])
        
        return jsonify(debts), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/storage/debts', methods=['POST'])
def create_debt():
    try:
        data = request.json
        
        debt = Debt(
            user_id=data['user_id'],
            type=data['type'],
            concept=data['concept'],
            amount=data['amount'],
            date=datetime.fromisoformat(data['date'].replace('Z', '+00:00')),
            due_date=datetime.fromisoformat(data['due_date'].replace('Z', '+00:00')) if data.get('due_date') else None,
            status=data.get('status', 'pending')
        )
        
        result = debts_collection.insert_one(debt.to_dict())
        
        return jsonify({
            'message': 'Registro creado exitosamente',
            'id': str(result.inserted_id)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/storage/debts/<debt_id>', methods=['PUT'])
def update_debt(debt_id):
    try:
        data = request.json
        data['updated_at'] = datetime.now()
        
        if 'date' in data:
            data['date'] = datetime.fromisoformat(data['date'].replace('Z', '+00:00'))
        if 'due_date' in data and data['due_date']:
            data['due_date'] = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
        
        result = debts_collection.update_one(
            {'_id': ObjectId(debt_id)},
            {'$set': data}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'Registro no encontrado'}), 404
        
        return jsonify({'message': 'Registro actualizado exitosamente'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/storage/debts/<debt_id>', methods=['DELETE'])
def delete_debt(debt_id):
    try:
        result = debts_collection.delete_one({'_id': ObjectId(debt_id)})
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Registro no encontrado'}), 404
        
        return jsonify({'message': 'Registro eliminado exitosamente'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============ ENDPOINTS PARA INGRESOS ============

@app.route('/api/storage/incomes', methods=['GET'])
def get_incomes():
    try:
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'user_id es requerido'}), 400
        
        incomes = list(incomes_collection.find({'user_id': user_id}).sort('date', -1))
        
        for income in incomes:
            income['_id'] = str(income['_id'])
        
        return jsonify(incomes), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/storage/incomes', methods=['POST'])
def create_income():
    try:
        data = request.json
        
        income = Income(
            user_id=data['user_id'],
            date=datetime.fromisoformat(data['date'].replace('Z', '+00:00')),
            source=data['source'],
            amount=data['amount'],
            period=data['period']
        )
        
        result = incomes_collection.insert_one(income.to_dict())
        
        return jsonify({
            'message': 'Ingreso registrado exitosamente',
            'id': str(result.inserted_id)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/storage/incomes/<income_id>', methods=['PUT'])
def update_income(income_id):
    try:
        data = request.json
        data['updated_at'] = datetime.now()
        
        if 'date' in data:
            data['date'] = datetime.fromisoformat(data['date'].replace('Z', '+00:00'))
        
        result = incomes_collection.update_one(
            {'_id': ObjectId(income_id)},
            {'$set': data}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'Ingreso no encontrado'}), 404
        
        return jsonify({'message': 'Ingreso actualizado exitosamente'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/storage/incomes/<income_id>', methods=['DELETE'])
def delete_income(income_id):
    try:
        result = incomes_collection.delete_one({'_id': ObjectId(income_id)})
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Ingreso no encontrado'}), 404
        
        return jsonify({'message': 'Ingreso eliminado exitosamente'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============ ENDPOINTS PARA ESTADÍSTICAS ============

@app.route('/api/storage/user/<user_id>/stats', methods=['GET'])
def get_storage_stats(user_id):
    try:
        # Obtener deudas/créditos
        debts = list(debts_collection.find({'user_id': user_id}))
        
        total_debts = sum(d['amount'] for d in debts if d['type'] == 'debt' and d['status'] != 'paid')
        total_credits = sum(d['amount'] for d in debts if d['type'] == 'credit' and d['status'] != 'paid')
        
        # Obtener ingresos
        incomes = list(incomes_collection.find({'user_id': user_id}))
        
        # Ingresos del mes actual
        current_month = datetime.now().month
        current_year = datetime.now().year
        monthly_income = sum(
            i['amount'] for i in incomes 
            if i['date'].month == current_month and i['date'].year == current_year
        )
        
        # Balance actual
        total_income = sum(i['amount'] for i in incomes)
        balance = total_income - total_debts + total_credits
        
        # Proyección de flujo
        pending_debts = [d for d in debts if d['status'] != 'paid']
        next_payments = sorted(
            [d for d in pending_debts if d.get('due_date')],
            key=lambda x: x['due_date']
        )[:5]
        
        return jsonify({
            'current_balance': balance,
            'total_debts': total_debts,
            'total_credits': total_credits,
            'monthly_income': monthly_income,
            'total_income': total_income,
            'pending_debts_count': len(pending_debts),
            'next_payments': [{
                'id': str(d['_id']),
                'concept': d['concept'],
                'amount': d['amount'],
                'due_date': d['due_date'],
                'type': d['type']
            } for d in next_payments]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/storage/user/<user_id>/projection', methods=['POST'])
def calculate_projection(user_id):
    try:
        data = request.json
        start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
        end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
        projected_monthly_income = data.get('projected_monthly_income', 0)
        
        # Obtener datos actuales
        stats_response = get_storage_stats(user_id)
        stats = stats_response[0].json
        
        months_diff = (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month)
        if months_diff < 0:
            months_diff = 0
        
        projected_income = projected_monthly_income * months_diff
        final_balance = stats['current_balance'] + projected_income
        
        return jsonify({
            'start_date': start_date,
            'end_date': end_date,
            'months': months_diff,
            'current_balance': stats['current_balance'],
            'projected_income': projected_income,
            'final_balance': final_balance
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5005, debug=True)