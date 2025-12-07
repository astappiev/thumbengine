FROM ghcr.io/puppeteer/puppeteer:latest

# Install system dependencies as root.
USER root
# Install FFmpeg, LibreOffice and GraphicsMagick to be used from thumbnailator
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg libreoffice graphicsmagick ghostscript

# Run everything after as non-privileged puppeteer user
USER $PPTRUSER_UID

# Copy files and grap dependency
WORKDIR /app
COPY --chown=$PPTRUSER_UID package.json package-lock.json ./
RUN ["npm", "install", "--production"]

# Copy the rest of the application code
COPY --chown=$PPTRUSER_UID . .

EXPOSE 3000
ENTRYPOINT ["npm", "start"]
