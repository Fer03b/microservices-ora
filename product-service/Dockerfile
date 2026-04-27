FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

# Code source + proto partagé
COPY src ./src
COPY proto ./proto

EXPOSE 3000 50051

USER node

CMD ["node", "src/index.js"]
