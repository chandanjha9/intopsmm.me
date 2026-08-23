# ---------- Dockerfile for Render (option 1) ----------
FROM node:24-bookworm-slim

# Install build tools and ODBC libraries required by msnodesqlv8
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3 make g++ gcc clang curl \
        unixodbc unixodbc-dev libodbc1 && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and install dependencies (npm works with node-gyp)
COPY package*.json ./
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build step if you have one (uncomment if needed)
# RUN npm run build

# Expose the port your app listens on (adjust if different)
EXPOSE 3000

# Start the app – adjust command if you use a different entry point
CMD [ npm, run, dev]
