# Use Node.js 22.15.1 as base image
FROM node:22.15.1-alpine

# Install necessary packages for downloading and extracting
RUN apk add --no-cache \
    curl \
    unzip \
    wget \
    bash \
    python3 \
    make \
    g++

# Set working directory
WORKDIR /app

# Create directory for compactc binaries
RUN mkdir -p /usr/local/compactc

# Download and install compactc
RUN wget https://d3fazakqrumx6p.cloudfront.net/artifacts/compiler/compactc_0.24.0/compactc_v0.24.0_x86_64-unknown-linux-musl.zip -O /tmp/compactc.zip \
    && unzip /tmp/compactc.zip -d /usr/local/compactc \
    && chmod +x /usr/local/compactc/compactc.bin \
    && chmod +x /usr/local/compactc/zkir \
    && chmod +x /usr/local/compactc/compactc \
    && rm /tmp/compactc.zip

# Add compactc to PATH
ENV PATH="/usr/local/compactc:${PATH}"

# Set COMPACT_HOME environment variable
ENV COMPACT_HOME="/usr/local/compactc"

# Copy package files for workspaces
COPY package*.json ./
COPY marketplace-registry-contract/package*.json ./marketplace-registry-contract/
COPY marketplace-registry-cli/package*.json ./marketplace-registry-cli/

# Install dependencies using workspaces
RUN npm ci

# Copy the rest of the application
COPY . .

# Verify compactc installation
RUN compactc --version

# Default command to run tests by changing to the correct directory
CMD ["sh", "-c", "cd marketplace-registry-contract && npm run test:compile"]
