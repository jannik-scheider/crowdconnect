# Basis-Image
FROM node:18

# Arbeitsverzeichnis im Container
WORKDIR /app

# Kopiere Package-Dateien und installiere Abhängigkeiten
COPY package*.json ./
RUN npm install

# Kopiere den Rest des Anwendungscodes
COPY . .

# Exponiere Port 3000
EXPOSE 3000

# Startbefehl
CMD ["node", "server.js"]
