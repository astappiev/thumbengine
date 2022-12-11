FROM node:lts-alpine

# Installs latest Chromium package, to be used from Puppeteer
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install FFmpeg, LibreOffice and GraphicsMagick to be used from thumbnailator
RUN apk add --no-cache ffmpeg libreoffice graphicsmagick ghostscript

# Add user so we don't need --no-sandbox.
RUN addgroup -S appuser && adduser -S -G appuser appuser \
    && mkdir -p /home/appuser/Downloads \
    && chown -R appuser:appuser /home/appuser

# Run everything after as non-privileged user.
USER appuser

# Copy files and grap dependency
WORKDIR /app
COPY --chown=appuser . .
RUN ["npm", "install", "--production"]
EXPOSE 3000

# Start the app
CMD npm run start
