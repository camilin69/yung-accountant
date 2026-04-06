from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
import os
from Goal import Goal

app = Flask(__name__)
CORS(app)

# Configuración MongoDB
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
MONGO_DB = os.getenv('MONGO_DB', 'cuenta_confiable')

client = MongoClient(MONGO_URI)
db = client[MONGO_DB]
goals_collection = db['goals']

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'}), 200

@app.route('/api/goals', methods=['GET'])
def get_goals():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id es requerido'}), 400
        
        goals = list(goals_collection.find({'user_id': user_id}).sort('created_at', -1))
        
        for goal in goals:
            goal['_id'] = str(goal['_id'])
        
        return jsonify(goals), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/goals/<goal_id>', methods=['GET'])
def get_goal(goal_id):
    try:
        goal = goals_collection.find_one({'_id': ObjectId(goal_id)})
        
        if not goal:
            return jsonify({'error': 'Meta no encontrada'}), 404
        
        goal['_id'] = str(goal['_id'])
        return jsonify(goal), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/goals', methods=['POST'])
def create_goal():
    try:
        data = request.json
        
        goal = Goal(
            user_id=data['user_id'],
            title=data['title'],
            description=data['description'],
            target_amount=data['target_amount'],
            current_amount=data['current_amount'],
            start_date=datetime.fromisoformat(data['start_date'].replace('Z', '+00:00')),
            end_date=datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
        )
        
        result = goals_collection.insert_one(goal.to_dict())
        
        return jsonify({
            'message': 'Meta creada exitosamente',
            'id': str(result.inserted_id)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/goals/<goal_id>', methods=['PUT'])
def update_goal(goal_id):
    try:
        data = request.json
        data['updated_at'] = datetime.now()
        
        if 'start_date' in data:
            data['start_date'] = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
        if 'end_date' in data:
            data['end_date'] = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
        
        result = goals_collection.update_one(
            {'_id': ObjectId(goal_id)},
            {'$set': data}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'Meta no encontrada'}), 404
        
        return jsonify({'message': 'Meta actualizada exitosamente'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/goals/<goal_id>', methods=['DELETE'])
def delete_goal(goal_id):
    try:
        result = goals_collection.delete_one({'_id': ObjectId(goal_id)})
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Meta no encontrada'}), 404
        
        return jsonify({'message': 'Meta eliminada exitosamente'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/goals/user/<user_id>/recent', methods=['GET'])
def get_recent_goals(user_id):
    try:
        goals = list(goals_collection.find({'user_id': user_id})
                    .sort('created_at', -1)
                    .limit(3))
        
        for goal in goals:
            goal['_id'] = str(goal['_id'])
        
        return jsonify(goals), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/goals/user/<user_id>/stats', methods=['GET'])
def get_goal_stats(user_id):
    try:
        goals = list(goals_collection.find({'user_id': user_id}))
        
        active_goals = sum(1 for g in goals if g['end_date'] > datetime.now())
        total_target = sum(g['target_amount'] for g in goals)
        total_current = sum(g['current_amount'] for g in goals)
        
        return jsonify({
            'total_goals': len(goals),
            'active_goals': active_goals,
            'total_target': total_target,
            'total_current': total_current,
            'overall_progress': (total_current / total_target * 100) if total_target > 0 else 0
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)