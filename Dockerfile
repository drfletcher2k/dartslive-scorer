FROM node:20-alpine

# openssl is required for self-signed cert generation at startup
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3180 3181

CMD ["node", "server.js"]
