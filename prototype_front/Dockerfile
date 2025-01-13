# Build React App
FROM node:alpine3.18 as build
# 작업 디렉토리 설정
WORKDIR /app
# 패키지 파일 복사
COPY package.json package-lock.json ./
# 패키지 설치 (npm ci 사용 및 캐싱 활용)
RUN npm ci --cache /npm-cache && rm -rf /npm-cache
# 나머지 소스코드 복사
COPY . .
# 빌드
RUN npm run build
# Nginx 이미지
FROM nginx:1.23-alpine
# Nginx 작업 디렉토리 설정
WORKDIR /usr/share/nginx/html
# React 빌드 파일 복사
COPY --from=build /app/build /usr/share/nginx/html
# Nginx 설정 파일 복사
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
# Nginx 포트 노출
EXPOSE 80
# Nginx 실행
ENTRYPOINT [ "nginx", "-g", "daemon off;" ]
