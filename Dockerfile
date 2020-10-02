FROM node:latest
LABEL version="0.1"
LABEL description="This is custom Docker Image for \
Zoom Closed Captions."
RUN npm i
RUN npm run build
COPY . /dist
CMD ["node ./dist/serverBuild/server.js"]
EXPOSE 80 443