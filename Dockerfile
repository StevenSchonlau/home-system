# Stage 1: Build the Angular application
FROM node:24-alpine AS build
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies cleanly
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the app for production (adjust output path if needed for your Angular version)
RUN npm run build -- --configuration=production

# Stage 2: Serve the app using Nginx
FROM nginx:alpine

# Copy built assets from the build stage 
# Note: Check your Angular version's output path (e.g., dist/home-system or dist/home-system/browser)
COPY --from=build /app/dist/home-system/browser /usr/share/nginx/html

# Optional: Custom Nginx configuration for SPA routing
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


# sudo apt update && sudo apt upgrade -y

# curl -sSL https://get.docker.com | sh


# docker build -t angular-pi5-app:latest .

#docker run -d -p 8080:80 --name home-system-app angular-pi5-app:latest