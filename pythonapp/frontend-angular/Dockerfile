# Etapa de desarrollo
FROM node:20-alpine AS development

# Instalar Angular CLI globalmente
RUN npm install -g @angular/cli@20

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
COPY angular.json ./
COPY tsconfig.json ./
COPY tsconfig.app.json ./
COPY tsconfig.spec.json ./

# Instalar dependencias
RUN npm install

# Copiar el código fuente
COPY . .

# Exponer el puerto de desarrollo
EXPOSE 4200

# Comando para desarrollo con live reload
CMD ["ng", "serve", "--host", "0.0.0.0", "--poll", "2000"]