from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
import hashlib
import os
from User import User
from keycloak_client import KeycloakClient
from config import Config

app = Flask(__name__)
CORS(app)

# Configuración MongoDB
client = MongoClient(Config.MONGO_URI)
db = client[Config.MONGO_DB]
users_collection = db['users']

# Inicializar Keycloak client
keycloak = KeycloakClient()

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def verify_token(token):
    """Middleware para verificar token"""
    if not token:
        return None, jsonify({'error': 'Token requerido'}), 401
    
    result = keycloak.verify_token(token)
    if not result.get('valid'):
        return None, jsonify({'error': result.get('error', 'Token inválido')}), 401
    
    return result, None, None

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'service': 'auth-service'}), 200

@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.json
        email = data['email']
        password = data['password']
        first_name = data.get('firstName', data.get('name', ''))
        last_name = data.get('lastName', '')
        user_type = data.get('userType', data.get('tipo_cliente', ''))
        client_id = data.get('clientId', '')
        
        # Validar clientId
        if client_id not in ['alcaldia-duitama', 'alcaldia-sogamoso', 'alcaldia-tunja']:
            return jsonify({'error': 'clientId inválido'}), 400
        
        # Validar user_type/role
        if user_type not in ['ama-de-casa', 'estudiante', 'trabajador']:
            return jsonify({'error': 'userType inválido'}), 400
        
        # Verificar si el usuario ya existe en MongoDB
        if users_collection.find_one({'email': email}):
            return jsonify({'error': 'El correo ya está registrado'}), 400
        
        # 1. Crear usuario en MongoDB primero para obtener el ID
        user = User(
            name=first_name + ' ' + last_name,
            email=email,
            user_type=user_type,
            password=hash_password(password)
        )
        
        result = users_collection.insert_one(user.to_dict())
        mongo_id = str(result.inserted_id)
        
        # 2. Registrar en Keycloak
        keycloak_id = keycloak.register_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            client_id=client_id,
            role=user_type,
            mongo_id=mongo_id
        )
        
        if not keycloak_id:
            # Rollback: eliminar usuario de MongoDB
            users_collection.delete_one({'_id': ObjectId(mongo_id)})
            return jsonify({'error': 'Error registrando usuario en Keycloak'}), 500
        
        # 3. Actualizar keycloak_id en MongoDB
        users_collection.update_one(
            {'_id': ObjectId(mongo_id)},
            {'$set': {'keycloak_id': keycloak_id}}
        )
        
        return jsonify({
            'message': 'Usuario registrado exitosamente',
            'userId': mongo_id,
            'keycloakId': keycloak_id,
            'email': email,
            'clientId': client_id,
            'role': user_type
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data['email']
        password = data['password']
        client_id = data.get('clientId', '')
        
        if not client_id:
            return jsonify({'error': 'clientId requerido'}), 400
        
        # Autenticar con Keycloak
        access_token, refresh_token = keycloak.login(email, password, client_id)
        
        if not access_token:
            return jsonify({'error': 'Credenciales inválidas'}), 401
        
        # Buscar usuario en MongoDB
        user = users_collection.find_one({'email': email})
        
        if not user:
            return jsonify({'error': 'Usuario no registrado en el sistema'}), 404
        
        # Verificar clientId
        if user.get('user_type') != data.get('userType', ''):
            # Si no se envió userType, se puede omitir esta validación
            pass
        
        return jsonify({
            'message': 'Login exitoso',
            'token': access_token,
            'refreshToken': refresh_token,
            'userId': str(user['_id']),
            'email': user['email'],
            'firstName': user['name'].split()[0] if user['name'] else '',
            'lastName': ' '.join(user['name'].split()[1:]) if user['name'] else '',
            'clientId': client_id,
            'role': user.get('user_type', '')
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    try:
        data = request.json
        refresh_token = data.get('refreshToken')
        
        if not refresh_token:
            return jsonify({'error': 'refreshToken requerido'}), 400
        
        # Obtener token del header
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header.startswith('Bearer ') else ''
        
        if token:
            # Verificar token para obtener user_id
            result = keycloak.verify_token(token)
            if result.get('valid'):
                keycloak.logout_all_sessions(result.get('user_id'))
        
        # Invalidar refresh token
        keycloak.logout(refresh_token)
        
        return jsonify({'message': 'Logout exitoso'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/verify', methods=['GET'])
def verify_user():
    try:
        # Obtener token del header
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header.startswith('Bearer ') else ''
        
        if not token:
            return jsonify({'valid': False, 'error': 'Token requerido'}), 401
        
        result = keycloak.verify_token(token)
        
        if not result.get('valid'):
            return jsonify({'valid': False, 'error': result.get('error', 'Token inválido')}), 401
        
        # Buscar usuario en MongoDB por email o mongo_id
        user = None
        if result.get('mongo_id'):
            user = users_collection.find_one({'_id': ObjectId(result['mongo_id'])})
        elif result.get('email'):
            user = users_collection.find_one({'email': result['email']})
        
        if not user:
            return jsonify({'valid': True, 'user': {
                'email': result.get('email'),
                'firstName': result.get('first_name', ''),
                'lastName': result.get('last_name', ''),
                'clientId': result.get('client_id', ''),
                'role': result.get('role', '')
            }}), 200
        
        return jsonify({
            'valid': True,
            'user': {
                'id': str(user['_id']),
                'name': user['name'],
                'email': user['email'],
                'user_type': user.get('user_type', ''),
                'clientId': result.get('client_id', ''),
                'role': result.get('role', '')
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/me', methods=['GET'])
def get_me():
    try:
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header.startswith('Bearer ') else ''
        
        if not token:
            return jsonify({'error': 'Token requerido'}), 401
        
        result = keycloak.verify_token(token)
        
        if not result.get('valid'):
            return jsonify({'error': 'Token inválido'}), 401
        
        user = users_collection.find_one({'email': result.get('email')})
        
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        return jsonify({
            'id': str(user['_id']),
            'email': user['email'],
            'name': user['name'],
            'user_type': user.get('user_type', ''),
            'created_at': user.get('created_at').isoformat() if user.get('created_at') else None
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/me', methods=['PUT'])
def update_me():
    try:
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header.startswith('Bearer ') else ''
        
        if not token:
            return jsonify({'error': 'Token requerido'}), 401
        
        result = keycloak.verify_token(token)
        
        if not result.get('valid'):
            return jsonify({'error': 'Token inválido'}), 401
        
        data = request.json
        first_name = data.get('firstName', '')
        last_name = data.get('lastName', '')
        
        # Actualizar en Keycloak
        if result.get('user_id'):
            keycloak.update_user(result['user_id'], first_name, last_name)
        
        # Actualizar en MongoDB
        name = f"{first_name} {last_name}".strip()
        users_collection.update_one(
            {'email': result.get('email')},
            {'$set': {'name': name}}
        )
        
        return jsonify({
            'message': 'Usuario actualizado exitosamente',
            'firstName': first_name,
            'lastName': last_name
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/me', methods=['DELETE'])
def delete_me():
    try:
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header.startswith('Bearer ') else ''
        
        if not token:
            return jsonify({'error': 'Token requerido'}), 401
        
        result = keycloak.verify_token(token)
        
        if not result.get('valid'):
            return jsonify({'error': 'Token inválido'}), 401
        
        # Eliminar de Keycloak
        if result.get('user_id'):
            keycloak.delete_user(result['user_id'])
        
        # Eliminar de MongoDB
        users_collection.delete_one({'email': result.get('email')})
        
        return jsonify({'message': 'Usuario eliminado exitosamente'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)