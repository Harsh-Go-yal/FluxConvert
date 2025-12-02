FROM nginx:alpine

ARG ENV=production

COPY nginx.conf.${ENV}.template /etc/nginx/templates/nginx.conf.template

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
