FROM node:14.16.0-alpine3.12

ENV TZ=Asia/Seoul
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
RUN mkdir -p /dist
ADD ./dist /dist
COPY package.json package.json
COPY package-lock.json package-lock.json
RUN npm install

CMD ["node", "./dist/app.js"]
