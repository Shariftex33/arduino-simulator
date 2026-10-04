FROM node:24-alpine
WORKDIR /app
COPY server/package.json server/package.json
RUN npm install --prefix server --omit=dev
COPY . .
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server/src/index.js"]
