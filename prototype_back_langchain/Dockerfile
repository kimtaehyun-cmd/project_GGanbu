# 베이스 이미지
FROM python:3.10-slim
# 작업 디렉토리 설정
WORKDIR /app
# 필요한 시스템 패키지 설치
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*
# 의존성 파일 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# 애플리케이션 코드 복사
COPY . .
# 환경 변수 파일 복사 (선택 사항)
# ENV 파일은 보안상 도커 이미지에 직접 포함하지 않는 것이 좋습니다.
# COPY .env /app/.env
WORKDIR /app/app
# Uvicorn 실행
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]
