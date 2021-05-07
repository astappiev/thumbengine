LABEL filepreview="0.0.1-alpha"
FROM node:15-buster

RUN apt-get update && apt-get upgrade -y

RUN apt-get install -y \
    libreoffice \
    ffmpeg \
    graphicsmagick \
    redis-server

COPY . /home/filepreview/app
RUN cd /home/filepreview/app && npm install
EXPOSE 3000

WORKDIR /home/filepreview/app
CMD npm run start
