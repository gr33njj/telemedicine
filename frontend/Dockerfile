FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG REACT_APP_API_URL=https://doclink.it-mydoc.ru/api/v1
ARG REACT_APP_WS_URL=wss://doclink.it-mydoc.ru
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV REACT_APP_WS_URL=${REACT_APP_WS_URL}

RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

RUN npm install -g serve

COPY --from=build /app/build ./build

EXPOSE 3000
ENV PORT=3000

CMD ["serve", "-s", "build", "-l", "3000"]

