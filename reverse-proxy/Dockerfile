FROM nginx:alpine

ARG ENV=local

# Copy template into correct folder for envsubst
COPY nginx.conf.${ENV}.template /etc/nginx/templates/nginx.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
