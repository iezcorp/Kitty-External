FROM node:22-alpine

RUN apk add --no-cache openssl

WORKDIR /var/www/html

COPY . .

RUN if [ -f package.json ]; then npm install --omit=dev; fi

EXPOSE 3000

CMD npm start
