FROM node:latest
LABEL version="0.1"
LABEL description="This is custom Docker Image for Zoom Closed Captions."
WORKDIR /usr/src/app
COPY /dist/ .
COPY package*.json .
RUN npm i 
ENTRYPOINT npm start
EXPOSE 3000
