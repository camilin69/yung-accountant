import requests
import json
from jose import jwt
from config import Config

class KeycloakClient:
    def __init__(self):
        self.base_url = Config.KEYCLOAK_URL
        self.realm = Config.KEYCLOAK_REALM
        self.admin = Config.KEYCLOAK_ADMIN
        self.admin_password = Config.KEYCLOAK_ADMIN_PASSWORD
    
    def _get_admin_token(self):
        """Obtener token de administración"""
        url = f"{self.base_url}/realms/master/protocol/openid-connect/token"
        data = {
            'client_id': 'admin-cli',
            'grant_type': 'password',
            'username': self.admin,
            'password': self.admin_password
        }
        response = requests.post(url, data=data)
        if response.status_code == 200:
            return response.json().get('access_token')
        return None
    
    def login(self, email, password, client_id):
        """Autenticar usuario con Keycloak"""
        client_secret = Config.get_client_secret(client_id)
        if not client_secret:
            return None, None
        
        url = f"{self.base_url}/realms/{self.realm}/protocol/openid-connect/token"
        data = {
            'client_id': client_id,
            'client_secret': client_secret,
            'grant_type': 'password',
            'username': email,
            'password': password
        }
        
        response = requests.post(url, data=data)
        if response.status_code == 200:
            tokens = response.json()
            return tokens.get('access_token'), tokens.get('refresh_token')
        return None, None
    
    def register_user(self, email, password, first_name, last_name, client_id, role, mongo_id):
        """Registrar usuario en Keycloak"""
        admin_token = self._get_admin_token()
        if not admin_token:
            return None
        
        # Crear usuario
        url = f"{self.base_url}/admin/realms/{self.realm}/users"
        headers = {
            'Authorization': f'Bearer {admin_token}',
            'Content-Type': 'application/json'
        }
        
        user_data = {
            'username': email,
            'email': email,
            'firstName': first_name,
            'lastName': last_name,
            'enabled': True,
            'emailVerified': True,
            'credentials': [{
                'type': 'password',
                'value': password,
                'temporary': False
            }],
            'attributes': {
                'mongoId': [mongo_id],
                'clientId': [client_id],
                'role': [role]
            }
        }
        
        response = requests.post(url, headers=headers, json=user_data)
        
        if response.status_code in [201, 200]:
            # Obtener el ID del usuario creado
            user_id = self._get_user_id_by_email(email)
            if user_id:
                self._assign_client_role(user_id, client_id, role, admin_token)
            return user_id
        return None
    
    def _get_user_id_by_email(self, email):
        """Obtener ID de usuario por email"""
        admin_token = self._get_admin_token()
        if not admin_token:
            return None
        
        url = f"{self.base_url}/admin/realms/{self.realm}/users"
        headers = {'Authorization': f'Bearer {admin_token}'}
        params = {'email': email}
        
        response = requests.get(url, headers=headers, params=params)
        if response.status_code == 200 and response.json():
            return response.json()[0].get('id')
        return None
    
    def _assign_client_role(self, user_id, client_id, role_name, admin_token):
        """Asignar rol al usuario dentro del cliente"""
        # Obtener UUID del cliente
        url = f"{self.base_url}/admin/realms/{self.realm}/clients"
        headers = {'Authorization': f'Bearer {admin_token}'}
        params = {'clientId': client_id}
        
        response = requests.get(url, headers=headers, params=params)
        if response.status_code != 200 or not response.json():
            return
        
        client_uuid = response.json()[0].get('id')
        
        # Obtener UUID del rol
        url = f"{self.base_url}/admin/realms/{self.realm}/clients/{client_uuid}/roles"
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            for role in response.json():
                if role.get('name') == role_name:
                    role_uuid = role.get('id')
                    # Asignar rol al usuario
                    url = f"{self.base_url}/admin/realms/{self.realm}/users/{user_id}/role-mappings/clients/{client_uuid}"
                    role_data = [{'id': role_uuid, 'name': role_name}]
                    requests.post(url, headers=headers, json=role_data)
                    break
    
    def verify_token(self, token):
        """Verificar token con Keycloak"""
        # Probar con cada cliente
        clients = ['alcaldia-duitama', 'alcaldia-sogamoso', 'alcaldia-tunja']
        
        for client_id in clients:
            client_secret = Config.get_client_secret(client_id)
            if not client_secret:
                continue
            
            url = f"{self.base_url}/realms/{self.realm}/protocol/openid-connect/token/introspect"
            data = {
                'client_id': client_id,
                'client_secret': client_secret,
                'token': token
            }
            
            response = requests.post(url, data=data)
            if response.status_code == 200:
                result = response.json()
                if result.get('active'):
                    # Extraer información del token
                    # Decodificar el token para obtener atributos
                    try:
                        # El token es JWT, podemos decodificarlo sin verificar firma
                        payload = jwt.get_unverified_claims(token)
                        return {
                            'valid': True,
                            'client_id': client_id,
                            'user_id': payload.get('sub'),
                            'email': payload.get('email'),
                            'first_name': payload.get('given_name', ''),
                            'last_name': payload.get('family_name', ''),
                            'mongo_id': payload.get('mongoId', ''),
                            'role': payload.get('role', '')
                        }
                    except:
                        return {
                            'valid': True,
                            'client_id': client_id,
                            'user_id': result.get('sub'),
                            'email': result.get('email'),
                            'username': result.get('preferred_username')
                        }
        
        return {'valid': False, 'error': 'Token inválido'}
    
    def logout(self, refresh_token):
        """Cerrar sesión"""
        url = f"{self.base_url}/realms/{self.realm}/protocol/openid-connect/logout"
        data = {
            'client_id': 'admin-cli',
            'refresh_token': refresh_token
        }
        response = requests.post(url, data=data)
        return response.status_code == 204
    
    def logout_all_sessions(self, user_id):
        """Cerrar todas las sesiones del usuario"""
        admin_token = self._get_admin_token()
        if not admin_token:
            return False
        
        url = f"{self.base_url}/admin/realms/{self.realm}/users/{user_id}/logout"
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = requests.post(url, headers=headers)
        return response.status_code == 204
    
    def delete_user(self, user_id):
        """Eliminar usuario de Keycloak"""
        admin_token = self._get_admin_token()
        if not admin_token:
            return False
        
        url = f"{self.base_url}/admin/realms/{self.realm}/users/{user_id}"
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = requests.delete(url, headers=headers)
        return response.status_code == 204
    
    def update_user(self, user_id, first_name, last_name):
        """Actualizar usuario en Keycloak"""
        admin_token = self._get_admin_token()
        if not admin_token:
            return False
        
        url = f"{self.base_url}/admin/realms/{self.realm}/users/{user_id}"
        headers = {
            'Authorization': f'Bearer {admin_token}',
            'Content-Type': 'application/json'
        }
        data = {
            'firstName': first_name,
            'lastName': last_name
        }
        response = requests.put(url, headers=headers, json=data)
        return response.status_code == 204