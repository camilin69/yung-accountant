FROM node:16-alpine

WORKDIR /app

RUN npm install -g http-server

COPY . .

EXPOSE 3000

CMD ["http-server", "-p", "3000", "-o"]