# Use lightweight NGINX image
FROM nginx:alpine

# Choose environment via build ARG (default: local)
# Railway will set this to: production
ARG ENV=local

# Copy the correct nginx config based on ENV value
COPY nginx.conf.${ENV} /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]
