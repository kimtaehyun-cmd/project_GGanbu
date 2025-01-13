from fastapi import FastAPI, Depends, HTTPException, APIRouter, Query, Body # FastAPI 프레임워크 및 종속성 주입 도구
from fastapi.responses import FileResponse
from sqlalchemy.sql.expression import case
from sqlalchemy import select,cast,String
from sqlalchemy.sql import func
from sqlalchemy.orm import Session # SQLAlchemy 세션 관리

from database import SessionLocal, ChatRoom, Character, CharacterPrompt, Voice, ChatLog, Field as DBField, Image, ImageMapping, Tag, Image, ImageMapping, Friend

 # DB 세션과 모델 가져오기
from typing import List, Optional # 데이터 타입 리스트 지원
from pydantic import BaseModel # 데이터 검증 및 스키마 생성용 Pydantic 모델
import uuid # 고유 ID 생성을 위한 UUID 라이브러리
from datetime import datetime # 날짜 및 시간 처리
from fastapi.middleware.cors import CORSMiddleware # CORS 설정용 미들웨어
import re
import websockets
import asyncio
from pathlib import Path  # 파일 경로 조작을 위한 모듈
from fastapi.staticfiles import StaticFiles




# from auth import verify_token

# RabbitMQ 파트
import pika
import json
import time
import base64
import os

import user
import wordcloud_router
import search
import image


# FastAPI 앱 초기화
app = FastAPI()

app.include_router(user.router)
app.include_router(wordcloud_router.router, prefix="/api", tags=["WordCloud"])
app.include_router(search.router, tags=["Search"])
app.include_router(image.router, tags=["Images"])

# 이미지 경로 - OS 따라 경로 변하는 이슈로 인해 os 패키지 사용 (김민식)
UPLOAD_DIR = "./uploads/characters"
app.mount("/images", StaticFiles(directory=UPLOAD_DIR), name="images")
app.mount("/static", StaticFiles(directory=UPLOAD_DIR), name="static")

# RabbitMQ 연결 설정
# 배포용 PC 에 rabbitMQ 서버 및 GPU서버 세팅 완료 - 250102 민식 
# .env 파일 수정후 사용 (슬랙 공지 참고)
RABBITMQ_HOST = os.getenv("RBMQ_HOST")
RABBITMQ_PORT = os.getenv("RBMQ_PORT")
RABBITMQ_USER = os.getenv("RABBITMQ_USER", "guest")  # RabbitMQ 사용자 (기본값: guest)
RABBITMQ_PASSWORD = os.getenv("RABBITMQ_PASSWORD", "guest")  # RabbitMQ 비밀번호 (기본값: guest)

REQUEST_IMG_QUEUE = "image_generation_requests" # 이미지 요청
RESPONSE_IMG_QUEUE = "image_generation_responses" #
REQUEST_TTS_QUEUE = "tts_generation_requests" # TTS 요청
RESPONSE_TTS_QUEUE = "tts_generation_responses" #

CLIENT_DOMAIN = os.getenv("CLIENT_DOMAIN")
WS_SERVER_DOMAIN = os.getenv("WS_SERVER_DOMAIN")

# CORS 설정: 모든 도메인, 메서드, 헤더를 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://gganbu.9seebird.site",
        "https://gganbu.9seebird.site",
        CLIENT_DOMAIN
    ],  # http와 https 모두 허용,  # 모든 도메인 허용
    allow_credentials=True, # 자격 증명 허용 (쿠키 등)
    allow_methods=["*"], # 모든 HTTP 메서드 허용 (GET, POST 등)
    allow_headers=["*"], # 모든 HTTP 헤더 허용
    expose_headers=["*"]
)


# DB 세션 관리
def get_db():
    """
    데이터베이스 세션을 생성하고 반환.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ====== Pydantic 스키마 ======
## 스키마 사용 이유





# 채팅방 생성 요청 스키마
class CreateRoomSchema(BaseModel):
    """
    채팅방 생성을 위한 Pydantic 스키마
    """
    user_idx: int
    character_id: int
    user_unique_name: Optional[str] = None
    user_introduction: Optional[str] = None

    class Config:
        orm_mode = True


# 메시지 전송 스키마
class MessageSchema(BaseModel):
    """
    메시지 전송을 위한 Pydantic 스키마.
    클라이언트가 전송해야 하는 필드를 정의
    """
    sender: str # 메세지 전송자 ( user 또는 캐릭터 이름 )
    content: str # 메세지 내용

# 캐릭터 생성 스키마
class CreateCharacterSchema(BaseModel):
    """
    캐릭터 등록을 위한 Pydantic 스키마.
    """
    character_owner: int
    field_idx: int
    voice_idx: str
    char_name: str
    char_description: str
    nicknames: Optional[dict] = {30: "stranger", 70: "friend", 100: "best friend"}
    character_appearance: str
    character_personality: str
    character_background: str
    character_speech_style: str
    example_dialogues: Optional[List[dict]] = None
    tags: Optional[List[dict]] = None

# 캐릭터 응답 스키마
class CharacterResponseSchema(BaseModel):
    """
    클라이언트에 반환되는 캐릭터 정보 스키마.
    """
    char_idx: int
    char_name: str
    char_description: str
    created_at: str
    nicknames: dict
    character_appearance: str
    character_personality: str
    character_background: str
    character_speech_style: str
    example_dialogues: Optional[List[dict]] = None

    class Config:
        orm_mode = True  # SQLAlchemy 객체 변환 지원
        json_encoders = {
            datetime: lambda v: v.isoformat()  # datetime 문자열로 변환
        }

# 캐릭터 카드 응답 스키마
class CharacterCardResponseSchema(BaseModel):
    """
    클라이언트에 반환되는 캐릭터 정보 스키마.
    """
    char_idx: int
    char_name: str
    character_owner: int
    char_description: str
    character_image: str
    created_at: datetime  # datetime으로 선언 (Pydantic이 자동으로 변환)

    class Config:
        orm_mode = True  # SQLAlchemy 객체 변환 지원
        json_encoders = {
            datetime: lambda v: v.isoformat()  # datetime 문자열로 변환
        }


# 이미지 생성 요청 스키마
class ImageRequest(BaseModel):
    prompt: str
    negative_prompt: str = "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry"
    width: int = 512
    height: int = 512
    guidance_scale: float = 12.0
    num_inference_steps: int = 60

# TTS 생성 요청 스키마
class TTSRequest(BaseModel):
    # TTS 관련 파라미터들
    # id: str
    text: str
    speaker: str = "paimon"
    language: str
    speed: float = 1.0

# image, tts 큐 분리하기위한 코드 추가 - 1230 민식 
def get_rabbitmq_channel(req_que, res_que):
    """
    RabbitMQ 연결 및 채널 반환
    """

    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASSWORD)  # ID와 PW 설정

    connection = pika.BlockingConnection(
        pika.ConnectionParameters(
            host=RABBITMQ_HOST, 
            port=RABBITMQ_PORT, 
            credentials=credentials,
            heartbeat=6000)
    )
    channel = connection.channel()
    channel.queue_declare(queue=req_que, durable=True)
    channel.queue_declare(queue=res_que, durable=True)
    return connection, channel


# ====== API 엔드포인트 ======

from fastapi import File, UploadFile, Form, Request
from fastapi.staticfiles import StaticFiles

UPLOAD_DIR = "./uploads/characters/"  # 캐릭터 이미지 파일 저장 경로
os.makedirs(UPLOAD_DIR, exist_ok=True) # 디렉토리 생성
app.mount("/static", StaticFiles(directory=UPLOAD_DIR), name="static")


# 채팅방 생성 API
@app.post("/api/chat-room/", response_model=dict)
def create_chat_room(room: CreateRoomSchema, db: Session = Depends(get_db)):
    try:
        # 트랜잭션 시작
        with db.begin():
            # 각 캐릭터에 대한 최신 char_prompt_id를 가져오는 subquery
            subquery = (
                select(
                    CharacterPrompt.char_idx,
                    func.max(CharacterPrompt.created_at).label("latest_created_at")
                )
                .group_by(CharacterPrompt.char_idx)
                .subquery()
            )
            # 캐릭터 정보 가져오기
            character_data = (
                db.query(Character, CharacterPrompt)
                .join(subquery, subquery.c.char_idx == Character.char_idx)
                .join(
                    CharacterPrompt,
                    (CharacterPrompt.char_idx == subquery.c.char_idx) &
                    (CharacterPrompt.created_at == subquery.c.latest_created_at)
                )
                .filter(
                    Character.char_idx == room.character_id, 
                    Character.is_active == True
                )
                .first()
            )
            
            if not character_data:
                raise HTTPException(status_code=404, detail="해당 캐릭터를 찾을 수 없습니다.")
            
            character, prompt = character_data

            # 기존 대화방이 있는지 확인
            existing_room = (
                db.query(ChatRoom)
                .filter(
                    ChatRoom.user_idx == room.user_idx,
                    ChatRoom.char_prompt_id == prompt.char_prompt_id,
                    ChatRoom.is_active == True
                )
                .first()
            )
            
            if existing_room:
                return {
                    "room_id": existing_room.chat_id,
                    "user_idx": existing_room.user_idx,
                    "character_idx": character.char_idx,
                    "char_prompt_id": existing_room.char_prompt_id,
                    "created_at": existing_room.created_at,
                    "user_unique_name": existing_room.user_unique_name,
                    "user_introduction": existing_room.user_introduction,
                    "chat_exists": True
                }
            
            # 채팅방 ID 생성
            room_id = str(uuid.uuid4())

            # 채팅방 생성
            new_room = ChatRoom(
                chat_id=room_id,
                user_idx=room.user_idx,
                char_prompt_id=prompt.char_prompt_id,
                user_unique_name=room.user_unique_name,
                user_introduction=room.user_introduction,
            )
            
            db.add(new_room)
        
        # 트랜잭션 커밋 (with 블록 종료 시 자동으로 커밋됨)
        db.commit()

        return {
            "room_id": new_room.chat_id,
            "user_idx": new_room.user_idx,
            "character_idx": character.char_idx,
            "char_prompt_id": new_room.char_prompt_id,
            "created_at": new_room.created_at,
            "user_unique_name": new_room.user_unique_name,
            "user_introduction": new_room.user_introduction,
            "chat_exists": False
        }
    except Exception as e:
        print(f"Error creating chat room: {str(e)}")  # 에러 로깅
        db.rollback()  # 트랜잭션 롤백
        raise HTTPException(status_code=500, detail=f"채팅방 생성 중 오류가 발생했습니다: {str(e)}")

# 채팅방 목록 조회 API
@app.get("/api/chat-room/", response_model=List[dict])
def get_all_chat_rooms(request: Request, db: Session = Depends(get_db)):
    """
    모든 채팅방 목록을 반환하는 API 엔드포인트.
    각 채팅방에 연결된 캐릭터 정보 및 이미지를 포함.
    """
    rooms = (
        db.query(ChatRoom, Character, CharacterPrompt, Image.file_path)
        .join(CharacterPrompt, CharacterPrompt.char_prompt_id == ChatRoom.char_prompt_id)
        .join(Character, Character.char_idx == CharacterPrompt.char_idx)
        .outerjoin(ImageMapping, ImageMapping.char_idx == Character.char_idx)
        .outerjoin(Image, Image.img_idx == ImageMapping.img_idx)
        .filter(Character.is_active == True, ChatRoom.is_active == True)
        .all()
    )

    base_url = f"{request.base_url.scheme}://{request.base_url.netloc}"
    result = []
    for room, character, prompt, image_path in rooms:
        # 이미지 경로를 URL로 변환
        image_url = f"{base_url}/static/{os.path.basename(image_path)}" if image_path else None
        result.append({
            "room_id": room.chat_id,
            "character_name": character.char_name,
            "char_description": character.char_description,
            "character_appearance": prompt.character_appearance,
            "character_personality": prompt.character_personality,
            "character_background": prompt.character_background,
            "character_speech_style": prompt.character_speech_style,
            "room_created_at": room.created_at,
            "character_image": image_url,  # 전체 URL 반환
        })
    return result


# 특정 유저가 생성한 채팅방 목록 조회 API
@app.get("/api/chat-room/user/{user_idx}", response_model=List[dict])
def get_user_chat_rooms(user_idx: int, request: Request, db: Session = Depends(get_db)):
    """
    특정 사용자가 생성한 채팅방 목록을 반환하는 API 엔드포인트.
    각 채팅방에 연결된 캐릭터 정보 및 이미지를 포함.
    """
    rooms = (
        db.query(ChatRoom, Character, CharacterPrompt, Image.file_path)
        .join(CharacterPrompt, CharacterPrompt.char_prompt_id == ChatRoom.char_prompt_id)
        .join(Character, Character.char_idx == CharacterPrompt.char_idx)
        .outerjoin(ImageMapping, ImageMapping.char_idx == Character.char_idx)
        .outerjoin(Image, Image.img_idx == ImageMapping.img_idx)
        .filter(ChatRoom.user_idx == user_idx, Character.is_active == True, ChatRoom.is_active == True)
        .all()
    )

    base_url = f"{request.base_url.scheme}://{request.base_url.netloc}"
    result = []
    for room, character, prompt, image_path in rooms:
        # 이미지 경로를 URL로 변환
        image_url = f"{base_url}/static/{os.path.basename(image_path)}" if image_path else None
        result.append({
            "room_id": room.chat_id,
            "character_name": character.char_name,
            "char_description": character.char_description,
            "character_appearance": prompt.character_appearance,
            "character_personality": prompt.character_personality,
            "character_background": prompt.character_background,
            "character_speech_style": prompt.character_speech_style,
            "room_created_at": room.created_at,
            "character_image": image_url,  # 이미지 URL 반환
        })
    return result


# 채팅 메시지 불러오기
@app.get("/api/chat/{room_id}")
def get_chat_logs(room_id: str, db: Session = Depends(get_db)):
    """
    특정 채팅방의 메시지 로그를 반환하는 API 엔드포인트.
    """
    logs = (
        db.query(ChatLog)
        .filter(ChatLog.chat_id == room_id)
        .order_by(ChatLog.start_time)
        .all()
    )
    return [
        {
            "session_id": log.session_id,
            "log": log.log,
            "start_time": log.start_time,
            "end_time": log.end_time,
        }
        for log in logs
    ]

# 채팅방에서 캐릭터 정보 불러오기
@app.get("/api/chat-room-info/{room_id}")
def get_chat_room_info(room_id: str, db: Session = Depends(get_db)):
    """
    특정 채팅방에 연결된 캐릭터 및 Voice 정보를 반환하는 API 엔드포인트.
    """
    try:
        chat_data = (
            db.query(ChatRoom, CharacterPrompt, Character, Voice)
            .join(CharacterPrompt, ChatRoom.char_prompt_id == CharacterPrompt.char_prompt_id)
            .join(Character, CharacterPrompt.char_idx == Character.char_idx)
            .join(Voice, Character.voice_idx == Voice.voice_idx)
            .filter(ChatRoom.chat_id == room_id, ChatRoom.is_active == True)
            .first()
        )

        if not chat_data:
            raise HTTPException(status_code=404, detail="해당 채팅방 정보를 찾을 수 없습니다.")
        
        chat, prompt, character, voice = chat_data

        return {
            "chat_id": chat.chat_id,
            "user_idx": chat.user_idx,
            "favorability": chat.favorability,
            "user_unique_name": chat.user_unique_name,
            "user_introduction": chat.user_introduction,
            "room_created_at": chat.created_at.isoformat(),
            "char_idx": character.char_idx,
            "char_name": character.char_name,
            "char_description": character.char_description,
            "character_appearance": prompt.character_appearance,
            "character_personality": prompt.character_personality,
            "character_background": prompt.character_background,
            "character_speech_style": prompt.character_speech_style,
            "example_dialogues": prompt.example_dialogues,
            "voice_path": voice.voice_path,
            "voice_speaker": voice.voice_speaker,
        }
    except Exception as e:
        print(f"Error fetching chat room info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"채팅방 정보를 가져오는 중 오류가 발생했습니다: {str(e)}")

# ----------------------------------------------------------------------------------------
# ----------------------------------------확인 필요----------------------------------------
# 채팅 전송 및 캐릭터 응답 - LangChain 서버 이용

def get_chat_history(db: Session, room_id: str, limit: int = 10) -> str:
    """
    채팅방의 최근 대화 내역을 가져옵니다.
    """
    logs = db.query(ChatLog).filter(
        ChatLog.chat_id == room_id
    ).order_by(ChatLog.end_time.desc()).limit(limit).all()
    
    # 시간순으로 정렬
    logs = logs[::-1]
    
    # 대화 내역을 문자열로 포맷팅
    history = ""
    for log in logs:
        # ChatLog의 log 필드에서 대화 내용 파싱
        log_lines = log.log.split('\n')
        for line in log_lines:
            if 'user:' in line or 'chatbot:' in line:
                history += line + '\n'
    
    return history

async def send_to_langchain(request_data: dict, room_id: str):
    """
    LangChain WebSocket 서버에 데이터를 전송하고 응답을 반환.
    """
    try:
        uri = f"{WS_SERVER_DOMAIN}/ws/generate/?room_id={room_id}"
        async with websockets.connect(uri) as websocket:
            # 요청 데이터 전송
            await websocket.send(json.dumps(request_data))
            
            # 서버 응답 수신
            response = await websocket.recv()
            return json.loads(response)
    except asyncio.TimeoutError:
        print("WebSocket 응답 시간이 초과되었습니다.")
        raise HTTPException(status_code=504, detail="LangChain 서버 응답 시간 초과.")
    except websockets.exceptions.ConnectionClosedError as e:
        print(f"WebSocket closed with error: {str(e)}")
        raise HTTPException(status_code=500, detail="WebSocket 연결이 닫혔습니다.")
    except Exception as e:
        print(f"Error in send_to_langchain: {str(e)}")
        raise HTTPException(status_code=500, detail="LangChain 서버와 통신 중 오류가 발생했습니다.")

# ----------------------------------------------------------------------------------------
@app.post("/api/chat/{room_id}")
async def query_langchain(room_id: str, message: MessageSchema, db: Session = Depends(get_db)):
    """
    LangChain 서버에 요청을 보내고 응답을 처리합니다.
    """
    try:
        chat_data = (
            db.query(ChatRoom, CharacterPrompt, Character)
            .join(CharacterPrompt, ChatRoom.char_prompt_id == CharacterPrompt.char_prompt_id)
            .join(Character, CharacterPrompt.char_idx == Character.char_idx)
            .filter(ChatRoom.chat_id == room_id, ChatRoom.is_active == True)
            .first()
        )

        if not chat_data:
            raise HTTPException(status_code=404, detail="해당 채팅방 정보를 찾을 수 없습니다.")
        
        chat, prompt, character = chat_data

        if prompt:
            example_dialogues = [json.loads(clean_json_string(dialogue)) if dialogue else {} for dialogue in prompt.example_dialogues] if prompt.example_dialogues else []
            nicknames = json.loads(character.nicknames) if character.nicknames else {'30': '', '70': '', '100': ''}
        else:
            # 기본값 설정
            example_dialogues = []
            nicknames = {'30': '', '70': '', '100': ''}

        # --------------------대화 내역 가져오기--------------------
        chat_history = get_chat_history(db, room_id)
        print("Chat History being sent to LangChain:", chat_history)

        # LangChain 서버로 보낼 요청 데이터 준비
        request_data = {
            "user_message": message.content,
            "character_name": character.char_name, # 캐릭터 이름
            "nickname": nicknames, # 호감도에 따른 호칭 명
            "user_unique_name": chat.user_unique_name, # 캐릭터가 사용자에게 부르는 이름 (nickname보다 우선순위)
            "user_introduction": chat.user_introduction, # 캐릭터한테 사용자를 소개하는 글
            "favorability": chat.favorability, # 호감도
            "character_appearance": prompt.character_appearance, # 캐릭터 외형
            "character_personality": prompt.character_personality, # 캐릭터 성격
            "character_background": prompt.character_background, # 캐릭터 배경
            "character_speech_style": prompt.character_speech_style, # 캐릭터 말투
            "example_dialogues": example_dialogues, # 예시 대화
            "chat_history": chat_history # 채팅 기록
        }
        print("Full request data:", request_data)  # 로그 추가

        print("Sending request to LangChain:", request_data)  # 디버깅용

        # LangChain 서버와 WebSocket 통신
        response_data = await send_to_langchain(request_data, room_id)

        bot_response_text = response_data.get("text", "openai_api 에러가 발생했습니다.")
        predicted_emotion = response_data.get("emotion", "Neutral")
        updated_favorability = response_data.get("favorability", chat.favorability)

        # 캐릭터 상태 업데이트
        chat.favorability = updated_favorability
        # 데이터베이스에 업데이트된 호감도 반영
        db.commit()
        # room.character_emotion = predicted_emotion (기분은 어떻게???)

        return {
            "user": message.content,
            "bot": bot_response_text,
            "updated_favorability": updated_favorability,
            "emotion": predicted_emotion
        }

    except Exception as e:
        print(f"Error in query_langchain: {str(e)}")  # 디버깅용
        raise HTTPException(status_code=500, detail=str(e))

# 캐릭터 생성 api
@app.post("/api/characters/", response_model=CharacterResponseSchema)
async def create_character(
    character_image: UploadFile = File(...),
    character_data: str = Form(...),
    db: Session = Depends(get_db)
):
    try:
        with db.begin():
            print("Received character data:", character_data)  # 디버깅용 로그
            character_dict = json.loads(character_data)
            character = CreateCharacterSchema(**character_dict)

            # 새 캐릭터 객체 생성
            new_character = Character(
                character_owner=character.character_owner,
                field_idx=character.field_idx,
                voice_idx=character.voice_idx,
                char_name=character.char_name,
                char_description=character.char_description,
                nicknames=json.dumps(character.nicknames)
            )
            db.add(new_character)
            db.flush()  # `new_character.char_idx`를 사용하기 위해 flush 실행
            
            # 캐릭터 프롬프트 생성
            new_prompt = CharacterPrompt(
                char_idx=new_character.char_idx,
                character_appearance=character.character_appearance,
                character_personality=character.character_personality,
                character_background=character.character_background,
                character_speech_style=character.character_speech_style,
                example_dialogues=(
                    [json.dumps(dialogue, ensure_ascii=False) for dialogue in character.example_dialogues]
                    if character.example_dialogues else None
                ),
            )

            db.add(new_prompt)

            # 이미지 파일 저장
            file_extension = character_image.filename.split(".")[-1]
            timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
            unique_filename = f"{timestamp}_{uuid.uuid4().hex}.{file_extension}"
            file_path = os.path.join(UPLOAD_DIR, unique_filename)

            # 파일 저장
            with open(file_path, "wb") as f:
                f.write(await character_image.read())

             # 이미지 테이블에 저장
            new_image = Image(file_path=file_path)
            db.add(new_image)
            db.flush()  # `new_image.img_idx` 사용하기 위해 flush 실행
            
            # 이미지와 캐릭터 매핑
            image_mapping = ImageMapping(
                char_idx=new_character.char_idx,
                img_idx=new_image.img_idx
            )
            db.add(image_mapping)

            if character.tags:
                for tag in character.tags:
                    new_tag = Tag(
                        char_idx=new_character.char_idx,
                        tag_name=tag["tag_name"],
                        tag_description=tag["tag_description"]
                    )
                    db.add(new_tag)

        # 트랜잭션 커밋 (with 블록 종료 시 자동으로 커밋됨, 명시적으로 작성)
        db.commit()

        return CharacterResponseSchema(
            char_idx=new_character.char_idx,
            char_name=new_character.char_name,
            char_description=new_character.char_description,
            created_at=new_character.created_at.isoformat(),
            nicknames=json.loads(new_character.nicknames),
            character_appearance=new_prompt.character_appearance,
            character_personality=new_prompt.character_personality,
            character_background=new_prompt.character_background,
            character_speech_style=new_prompt.character_speech_style,
            example_dialogues=[
                json.loads(dialogue) for dialogue in new_prompt.example_dialogues
            ] if new_prompt.example_dialogues else None,
            character_image=file_path
        )
    except Exception as e:
        print(f"Error in create_character: {str(e)}")
        db.rollback() # 트랜잭션 롤백
        raise HTTPException(status_code=500, detail=str(e))

def clean_json_string(json_string):
    if not json_string:
        return json_string
    return re.sub(r'[\x00-\x1F\x7F]', '', json_string)

# 캐릭터 목록 조회 API
@app.get("/api/characters/", response_model=List[dict])
def get_characters(db: Session = Depends(get_db), request: Request = None):
    # 각 캐릭터에 대한 최신 char_prompt_id를 가져오는 subquery
    subquery = (
        select(
            CharacterPrompt.char_idx,
            func.max(CharacterPrompt.created_at).label("latest_created_at")
        )
        .group_by(CharacterPrompt.char_idx)
        .subquery()
    )

    # 캐릭터를 최신 프롬프트와 join하고 이미지 정보를 포함하는 query
    query = (
        db.query(Character, CharacterPrompt, Image.file_path)
        .join(subquery, subquery.c.char_idx == Character.char_idx)
        .join(
            CharacterPrompt,
            (CharacterPrompt.char_idx == subquery.c.char_idx) &
            (CharacterPrompt.created_at == subquery.c.latest_created_at)
        )
        .outerjoin(ImageMapping, ImageMapping.char_idx == Character.char_idx)
        .outerjoin(Image, Image.img_idx == ImageMapping.img_idx)
        .filter(Character.is_active == True)  # is_active가 True인 캐릭터만 가져오기
    )

    characters_info = query.all()
    base_url = f"{request.base_url.scheme}://{request.base_url.netloc}" if request else ""
    results = []

    for char, prompt, image_path in characters_info:

        follower_count = (
            db.query(func.count(Friend.friend_idx))
            .filter(Friend.char_idx == char.char_idx, Friend.is_active == True)
            .scalar()
        )
        print(f"Character: {char.char_name}, field_idx: {char.field_idx}, type: {type(char.field_idx)}")
        if prompt:
            example_dialogues = [json.loads(clean_json_string(dialogue)) if dialogue else {} for dialogue in prompt.example_dialogues] if prompt.example_dialogues else []
            nicknames = json.loads(char.nicknames) if char.nicknames else {'30': '', '70': '', '100': ''}
        else:
            # 기본값 설정
            example_dialogues = []
            nicknames = {'30': '', '70': '', '100': ''}

        # 이미지 URL 생성
        image_url = f"{base_url}/static/{os.path.basename(image_path)}" if image_path else None

        tags = db.query(Tag).filter(
            Tag.char_idx == char.char_idx,
            Tag.is_deleted == False
        ).all()
        
        tag_list = [{"tag_name": tag.tag_name, "tag_description": tag.tag_description} for tag in tags]

        results.append({
            "char_idx": char.char_idx,
            "char_name": char.char_name,
            "char_description": char.char_description,
            "created_at": char.created_at.isoformat(),
            "nicknames": nicknames,
            "character_appearance": prompt.character_appearance if prompt else "",
            "character_personality": prompt.character_personality if prompt else "",
            "character_background": prompt.character_background if prompt else "",
            "character_speech_style": prompt.character_speech_style if prompt else "",
            "example_dialogues": example_dialogues,
            "tags": tag_list,
            "character_image": image_url,
            "field_idx": char.field_idx,
            "follower_count": follower_count
        })

    return results

# 특정 유저가 생성한 캐릭터 목록 조회 API
@app.get("/api/characters/user/{user_id}", response_model=List[dict])
def get_characters(user_id: int, db: Session = Depends(get_db), request: Request = None):
    # 각 캐릭터에 대한 최신 char_prompt_id를 가져오는 subquery
    subquery = (
        select(
            CharacterPrompt.char_idx,
            func.max(CharacterPrompt.created_at).label("latest_created_at")
        )
        .group_by(CharacterPrompt.char_idx)
        .subquery()
    )

    # 캐릭터를 최신 프롬프트와 join하고 이미지 정보를 포함하는 query
    query = (
        db.query(Character, CharacterPrompt, Image.file_path)
        .join(subquery, subquery.c.char_idx == Character.char_idx)
        .join(
            CharacterPrompt,
            (CharacterPrompt.char_idx == subquery.c.char_idx) &
            (CharacterPrompt.created_at == subquery.c.latest_created_at)
        )
        .outerjoin(ImageMapping, ImageMapping.char_idx == Character.char_idx)
        .outerjoin(Image, Image.img_idx == ImageMapping.img_idx)
        .filter(
            Character.is_active == True,
            Character.character_owner == user_id
        )
    )

    characters_info = query.all()

    base_url = f"{request.base_url.scheme}://{request.base_url.netloc}" if request else ""
    results = []
    for char, prompt, image_path in characters_info:
        if prompt:
            example_dialogues = [json.loads(clean_json_string(dialogue)) if dialogue else {} for dialogue in prompt.example_dialogues] if prompt.example_dialogues else []
            nicknames = json.loads(char.nicknames) if char.nicknames else {'30': '', '70': '', '100': ''}
        else:
            # 기본값 설정
            example_dialogues = []
            nicknames = {'30': '', '70': '', '100': ''}

        # 이미지 URL 생성
        image_url = f"{base_url}/static/{os.path.basename(image_path)}" if image_path else None

        results.append({
            "char_idx": char.char_idx,
            "char_name": char.char_name,
            "char_description": char.char_description,
            "created_at": char.created_at.isoformat(),
            "nicknames": nicknames,
            "character_appearance": prompt.character_appearance if prompt else "",
            "character_personality": prompt.character_personality if prompt else "",
            "character_background": prompt.character_background if prompt else "",
            "character_speech_style": prompt.character_speech_style if prompt else "",
            "example_dialogues": example_dialogues,
            "character_image": image_url,
        })
    return results

# 캐릭터 필터링할때 사용하는 Query 파라미터
def parse_fields(fields: Optional[str] = Query(default=None)):
    """
    쉼표로 구분된 문자열을 List[int]로 변환
    """
    if fields:
        try:
            return [int(field.strip()) for field in fields.split(",")]
        except ValueError:
            raise ValueError("fields 값은 쉼표로 구분된 정수 리스트여야 합니다.")
    return None



# 캐릭터 목록 조회 API - 필드 기준 조회
@app.get("/api/characters/field", response_model=List[CharacterCardResponseSchema])
def get_characters_by_field(
    fields: Optional[List[int]] = Depends(parse_fields),
    limit: int = Query(default=10),
    db: Session = Depends(get_db),
    request: Request = None
):
    """
    필드 컬럼 값이 없으면 전체 데이터를 반환합니다.
    fields가 주어지면 해당 필드에 해당하는 캐릭터만 반환합니다.
    limit 값은 기본적으로 10개입니다.
    """
    # 기본 쿼리 작성
    query = (
        db.query(Character, Image.file_path)
        .outerjoin(ImageMapping, ImageMapping.char_idx == Character.char_idx)
        .outerjoin(Image, Image.img_idx == ImageMapping.img_idx)
        .filter(Character.is_active == True)
    )

    # fields 필터링 적용
    if fields:
        query = query.filter(Character.field_idx.in_(fields))

    # limit 적용 및 데이터 가져오기
    characters_info = query.limit(limit).all()

    # 요청 URL로부터 base URL 생성
    base_url = f"{request.base_url.scheme}://{request.base_url.netloc}" if request else ""

    # 결과 리스트 생성
    results = []
    for char, image_path in characters_info:
        # 이미지 URL 생성
        image_url = f"{base_url}/static/{os.path.basename(image_path)}" if image_path else None

        # 결과에 추가
        results.append({
            "char_idx": char.char_idx,
            "char_name": char.char_name,
            "char_description": char.char_description,
            "created_at": char.created_at.isoformat(),
            "field_idx": char.field_idx,
            "character_owner": char.character_owner,
            "character_image": image_url,
        })

    return results


# 캐릭터 목록 조회 API - 태그 기준 조회
@app.get("/api/characters/tag", response_model=List[CharacterCardResponseSchema])
def get_characters_by_tag(
    tags: Optional[List[str]] = Depends(parse_fields), 
    limit: int = Query(default=10),
    db: Session = Depends(get_db)):
    """
    태그 값이 없으면 전체 데이터를 반환합니다.
    """
    query = db.query(Character).filter(Character.is_active == True)
    if tags:  # 태그 값이 주어지면 필터링
        query = query.join(Character.tags).filter(Tag.name.in_(tags))
    characters = query.limit(limit).all()  # limit 적용

    return characters

# 캐릭터 목록 조회 API - 최근 생성 순 조회
@app.get("/api/characters/new", response_model=List[CharacterCardResponseSchema])
def get_new_characters(limit: Optional[int] = 10, db: Session = Depends(get_db)):
    """
    최근 생성된 캐릭터를 조회합니다.
    limit 값이 없으면 기본적으로 10개의 데이터를 반환합니다.
    """
    characters = db.query(Character).filter(Character.is_active == True).order_by(Character.created_at.desc()).limit(limit).all()
    
    return characters

# 캐릭터 삭제 API
@app.delete("/api/characters/{char_idx}")
def delete_character(char_idx: int, db: Session = Depends(get_db)):
    """
    특정 캐릭터를 삭제(숨김처리)하는 API 엔드포인트.
    캐릭터의 is_active 필드를 False로 변경합니다.
    """
    # 캐릭터 인덱스를 기준으로 데이터베이스에서 검색
    character = db.query(Character).filter(Character.char_idx == char_idx).first()
    if not character:
        raise HTTPException(status_code=404, detail="해당 캐릭터를 찾을 수 없습니다.")

    # 캐릭터 숨김 처리
    character.is_active = False
    db.commit()
    return {"message": f"캐릭터 {char_idx}이(가) 성공적으로 삭제되었습니다."}

# 이미지 생성 요청 API
@app.post("/generate-image/")
def send_to_queue(request: ImageRequest):
    """
    RabbitMQ 큐에 이미지 생성 요청을 추가하고, 결과를 대기.
    """
    try:
        # RabbitMQ 연결
        # connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
        connection, channel = get_rabbitmq_channel(REQUEST_IMG_QUEUE, RESPONSE_IMG_QUEUE)
        request_id = str(uuid.uuid4())

        # 요청 메시지 작성
        message = {
            "id": request_id,
            "prompt": request.prompt,
            "negative_prompt": request.negative_prompt,
            "width": request.width,
            "height": request.height,
            "guidance_scale": request.guidance_scale,
            "num_inference_steps": request.num_inference_steps,
        }

        # 메시지를 요청 큐에 추가
        channel.basic_publish(
            exchange="",
            routing_key=REQUEST_IMG_QUEUE,
            body=json.dumps(message),
            properties=pika.BasicProperties(delivery_mode=1),
        )
        print(f"이미지 생성 요청 전송: {request_id}")

        # 응답 큐에서 결과 대기
        for _ in range(6000):  # 최대 600초 대기 ( 100분 )
            method, properties, body = channel.basic_get(RESPONSE_IMG_QUEUE, auto_ack=True)
            if body:
                response = json.loads(body)
                if response["id"] == request_id:
                    connection.close()
                    return {"image": response["image"]}
            time.sleep(1)

        connection.close()
        raise HTTPException(status_code=504, detail="응답 시간 초과")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 
# TTS 생성 요청 API
@app.post("/generate-tts/")
def send_to_queue(request: TTSRequest):
    try:
        connection, channel = get_rabbitmq_channel(REQUEST_TTS_QUEUE, RESPONSE_TTS_QUEUE)
        request_id = str(uuid.uuid4())
        message = {
            "id": request_id,
            "text": request.text,
            "speaker": request.speaker,
            "language": request.language,
            "speed": request.speed,
        }

        channel.basic_publish(
            exchange="",
            routing_key=REQUEST_TTS_QUEUE,
            body=json.dumps(message),
            properties=pika.BasicProperties(delivery_mode=1),
        )
        print(f"TTS 요청 데이터: {message}")

        for _ in range(6000):  # 최대 600초 대기
            method, properties, body = channel.basic_get(RESPONSE_TTS_QUEUE, auto_ack=True)
            if body:
                response = json.loads(body)
                print(f"TTS 응답 데이터: {response}")
                if response["id"] == request_id:
                    connection.close()
                    if response["status"] == "success":
                        audio_base64 = response["audio_base64"]
                        # print("audio_base64 ", audio_base64)
                        audio_data = base64.b64decode(audio_base64)

                        output_path = f"temp_audio/{request_id}.wav"
                        with open(output_path, "wb") as f:
                            f.write(audio_data)

                        return FileResponse(
                            path=output_path,
                            media_type="audio/wav",
                            filename="output_audio.wav"
                        )
                    else:
                        raise HTTPException(status_code=500, detail=response["error"])

        connection.close()
        raise HTTPException(status_code=504, detail="응답 시간 초과")
    except Exception as e:
        print(f"Exception 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# TTS 모델 정보 조회 API
@app.get("/api/ttsmodel/{room_id}")
def get_tts_model(room_id: str, db: Session = Depends(get_db)):
    """
    특정 채팅방에 연결된 캐릭터 및 TTS 모델 정보를 반환하는 API 엔드포인트.
    """
    # 채팅방 ID를 기준으로 데이터베이스에서 채팅방 검색
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id, ChatRoom.is_active == True).first()
    if not room:
        raise HTTPException(status_code=404, detail="채팅방을 찾을 수 없습니다.")
    
    # 채팅방에 연결된 캐릭터 검색
    character = db.query(Character).filter(Character.character_index == room.character_id).first()
    if not character:
        raise HTTPException(status_code=404, detail="캐릭터를 찾을 수 없습니다.")
    
    # `voice` 테이블에서 character_id와 연결된 TTS 정보 검색
    voice_info = db.query(Voice).filter(Voice.voice_idx == room.character_voice).first()
    if not voice_info:
        raise HTTPException(status_code=404, detail="TTS 정보를 찾을 수 없습니다.")
    
    # 캐릭터 및 TTS 정보를 반환
    return {
        "character_name": character.character_name,
        "character_prompt": character.character_prompt,
        "character_image": character.character_image,
        "voice_path": voice_info.voice_path,
        "voice_speaker": voice_info.voice_speaker,
    }

@app.get("/api/voices/")
def get_voices(db: Session = Depends(get_db)):
    voices = db.query(Voice).all()
    return [{"voice_idx": str(voice.voice_idx), "voice_speaker": voice.voice_speaker} for voice in voices]


# 필드 항목 가져오기 API
@app.get("/api/fields/")
def get_fields(db: Session = Depends(get_db)):
    """
    필드 항목을 반환하는 API 엔드포인트.
    """
    try:
        fields = db.query(DBField).all()  # DBField로 변경
        return [{"field_idx": field.field_idx, "field_category": field.field_category} for field in fields]
    except Exception as e:
        print(f"Error in get_fields: {str(e)}")  # 에러 로깅 추가
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/tags")
def get_tags(db: Session = Depends(get_db)):
    tags = db.query(Tag).distinct(Tag.tag_name).all()
    return [{"tag_idx": tag.tag_idx, "tag_name": tag.tag_name} for tag in tags]

@app.get("/api/fields/")
def get_fields(db: Session = Depends(get_db)):
    """
    필드 항목을 반환하는 API 엔드포인트.
    """
    try:
        fields = db.query(DBField).all()  # DBField는 필드 정보를 저장하는 테이블
        return [{"field_idx": field.field_idx, "field_category": field.field_category} for field in fields]
    except Exception as e:
        print(f"Error in get_fields: {str(e)}")  # 에러 로그
        raise HTTPException(status_code=500, detail="필드 데이터를 불러오는 중 오류가 발생했습니다.")
    
@app.post("/api/friends/follow", response_model=dict)
def follow_character(
    user_idx: int = Body(...),
    char_idx: int = Body(...),
    db: Session = Depends(get_db)
):
    try:
        # 이미 팔로우 중인지 확인
        existing_follow = db.query(Friend).filter(
            Friend.user_idx == user_idx,
            Friend.char_idx == char_idx,
            Friend.is_active == True
        ).first()

        if existing_follow:
            raise HTTPException(status_code=400, detail="이미 팔로우한 캐릭터입니다.")

        # 새로운 팔로우 관계 생성
        new_follow = Friend(
            user_idx=user_idx,
            char_idx=char_idx
        )
        db.add(new_follow)
        db.commit()
        return {"message": "성공적으로 팔로우했습니다."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/friends/unfollow/{user_idx}/{char_idx}", response_model=dict)
def unfollow_character(
    user_idx: int,
    char_idx: int,
    db: Session = Depends(get_db)
):
    try:
        follow = db.query(Friend).filter(
            Friend.user_idx == user_idx,
            Friend.char_idx == char_idx,
            Friend.is_active == True
        ).first()

        if not follow:
            raise HTTPException(status_code=404, detail="팔로우 관계를 찾을 수 없습니다.")

        follow.is_active = False
        db.commit()
        return {"message": "성공적으로 언팔로우했습니다."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/friends/check/{user_idx}/{char_idx}")
def check_follow(user_idx: int, char_idx: int, db: Session = Depends(get_db)):
    follow = db.query(Friend).filter(
        Friend.user_idx == user_idx,
        Friend.char_idx == char_idx,
        Friend.is_active == True
    ).first()
    return {"is_following": bool(follow)}

@app.get("/api/friends/{user_idx}/characters", response_model=List[dict])
def get_followed_characters(user_idx: int, db: Session = Depends(get_db), request: Request = None):
    """
    특정 사용자가 팔로우한 캐릭터 목록을 반환하는 API 엔드포인트.
    """
    subquery = (
        select(
            CharacterPrompt.char_idx,
            func.max(CharacterPrompt.created_at).label("latest_created_at")
        )
        .group_by(CharacterPrompt.char_idx)
        .subquery()
    )

    # Friend 테이블을 사용하여 특정 사용자가 팔로우한 캐릭터 조회
    query = (
        db.query(Character, CharacterPrompt, Image.file_path)
        .join(subquery, subquery.c.char_idx == Character.char_idx)
        .join(
            CharacterPrompt,
            (CharacterPrompt.char_idx == subquery.c.char_idx) &
            (CharacterPrompt.created_at == subquery.c.latest_created_at)
        )
        .outerjoin(ImageMapping, ImageMapping.char_idx == Character.char_idx)
        .outerjoin(Image, Image.img_idx == ImageMapping.img_idx)
        .join(Friend, Friend.char_idx == Character.char_idx)
        .filter(
            Friend.user_idx == user_idx,
            Friend.is_active == True,
            Character.is_active == True  # 활성화된 캐릭터만 조회
        )
    )

    followed_characters = query.all()
    base_url = f"{request.base_url.scheme}://{request.base_url.netloc}" if request else ""
    results = []

    for char, prompt, image_path in followed_characters:
        image_url = f"{base_url}/static/{os.path.basename(image_path)}" if image_path else None

        results.append({
            "char_idx": char.char_idx,
            "character_owner": char.character_owner,
            "char_name": char.char_name,
            "char_description": char.char_description,
            "created_at": char.created_at.isoformat(),
            "character_appearance": prompt.character_appearance if prompt else "",
            "character_personality": prompt.character_personality if prompt else "",
            "character_background": prompt.character_background if prompt else "",
            "character_speech_style": prompt.character_speech_style if prompt else "",
            "character_image": image_url,
        })

    return results

# 특정 캐릭터 조회
@app.get("/api/characters/{char_idx}", response_model=dict)
def get_character_by_id(char_idx: int, db: Session = Depends(get_db), request: Request = None):
    """
    특정 캐릭터 정보를 반환하는 API 엔드포인트 (이미지, 호칭, 필드값 포함).
    """
    character_data = (
        db.query(Character, CharacterPrompt, Image.file_path, DBField.field_category)
        .join(CharacterPrompt, Character.char_idx == CharacterPrompt.char_idx)
        .outerjoin(ImageMapping, ImageMapping.char_idx == Character.char_idx)
        .outerjoin(Image, Image.img_idx == ImageMapping.img_idx)
        .join(DBField, DBField.field_idx == Character.field_idx)
        .filter(Character.char_idx == char_idx, Character.is_active == True)
        .first()
    )

    follower_count = db.query(Friend).filter(Friend.char_idx == char_idx, Friend.is_active == True).count()

    if not character_data:
        raise HTTPException(status_code=404, detail="해당 캐릭터를 찾을 수 없습니다.")
    
    character, prompt, image_path, field_category = character_data

    # 이미지 URL 생성
    base_url = f"{request.base_url.scheme}://{request.base_url.netloc}" if request else ""
    image_url = f"{base_url}/static/{os.path.basename(image_path)}" if image_path else None

    # JSON으로 저장된 호칭을 파싱
    nicknames = json.loads(character.nicknames) if character.nicknames else {}

    return {
        "char_idx": character.char_idx,
        "char_name": character.char_name,
        "char_description": character.char_description,
        "created_at": character.created_at.isoformat(),
        "character_appearance": prompt.character_appearance,
        "character_personality": prompt.character_personality,
        "character_background": prompt.character_background,
        "character_speech_style": prompt.character_speech_style,
        "example_dialogues": prompt.example_dialogues,
        "tags": [
            {"tag_name": tag.tag_name, "tag_description": tag.tag_description}
            for tag in db.query(Tag).filter(Tag.char_idx == character.char_idx, Tag.is_deleted == False).all()
        ],
        "character_image": image_url,
        "field_idx": character.field_idx,  # 필드 카테고리 추가
        "nicknames": nicknames,  # 호칭 정보 추가
        "follower_count": follower_count
    }

# 특정 캐릭터 수정
# -------------- user_idx 확인해야 함 --------------------------
@app.put("/api/characters/{char_idx}")
async def update_character(
    char_idx: int,
    character_image: Optional[UploadFile] = None,
    character_data: str = Form(...),
    db: Session = Depends(get_db)
):
    try:
        print(f"Received character data for update: {character_data}")  # 로깅 추가
        with db.begin():
            character_dict = json.loads(character_data)
            print(f"Parsed character dict: {character_dict}")  # 로깅 추가
            
            # 필수 필드 확인
            required_fields = ['character_owner', 'field_idx', 'voice_idx', 'char_name', 'char_description']
            for field in required_fields:
                if field not in character_dict:
                    raise ValueError(f"Missing required field: {field}")
            
            # Pydantic 스키마 검증
            character = CreateCharacterSchema(**character_dict)
            print(f"Created schema object: {character}")  # 로깅 추가

            # 기존 캐릭터 조회
            existing_character = db.query(Character).filter(Character.char_idx == char_idx).first()
            if not existing_character:
                raise HTTPException(status_code=404, detail="캐릭터를 찾을 수 없습니다.")

            print(f"Found existing character: {existing_character.char_idx}")  # 로깅 추가

            # 캐릭터 기본 정보 업데이트
            existing_character.field_idx = character.field_idx
            existing_character.voice_idx = character.voice_idx
            existing_character.char_name = character.char_name
            existing_character.char_description = character.char_description
            existing_character.nicknames = json.dumps(character.nicknames)

            # 새로운 프롬프트 생성
            new_prompt = CharacterPrompt(
                char_idx=char_idx,
                character_appearance=character.character_appearance,
                character_personality=character.character_personality,
                character_background=character.character_background,
                character_speech_style=character.character_speech_style,
                example_dialogues=(
                    [json.dumps(dialogue, ensure_ascii=False) for dialogue in character.example_dialogues]
                    if character.example_dialogues else None
                ),
            )
            db.add(new_prompt)
            print("Added new prompt")  # 로깅 추가

            # 이미지 업데이트 로직
            if character_image:
                print("Updating character image...")  # 로깅 추가

                # 기존 이미지 매핑 및 이미지 가져오기
                existing_image_mapping = db.query(ImageMapping).filter(
                    ImageMapping.char_idx == char_idx,
                    ImageMapping.is_active == True
                ).first()

                if existing_image_mapping:
                    # 기존 이미지 레코드를 가져옴
                    existing_image = db.query(Image).filter(
                        Image.img_idx == existing_image_mapping.img_idx
                    ).first()

                    if existing_image:
                        # 새 이미지 파일 저장
                        file_extension = character_image.filename.split(".")[-1]
                        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
                        unique_filename = f"{timestamp}_{uuid.uuid4().hex}.{file_extension}"
                        file_path = os.path.join(UPLOAD_DIR, unique_filename)

                        # 파일 저장
                        with open(file_path, "wb") as f:
                            f.write(await character_image.read())

                        # 기존 이미지 경로 교체
                        existing_image.file_path = file_path
                        print("Image file path updated successfully.")  # 로깅 추가

                else:
                    # 기존 이미지가 없는 경우 새 이미지 레코드를 생성
                    file_extension = character_image.filename.split(".")[-1]
                    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
                    unique_filename = f"{timestamp}_{uuid.uuid4().hex}.{file_extension}"
                    file_path = os.path.join(UPLOAD_DIR, unique_filename)

                    # 파일 저장
                    with open(file_path, "wb") as f:
                        f.write(await character_image.read())

                    new_image = Image(file_path=file_path)
                    db.add(new_image)
                    db.flush()

                    # 새로운 이미지 매핑 추가
                    new_mapping = ImageMapping(
                        char_idx=char_idx,
                        img_idx=new_image.img_idx,
                        is_active=True
                    )
                    db.add(new_mapping)

            # 태그 업데이트
            if character.tags:
                print("Updating tags")  # 로깅 추가

                # 기존 태그 비활성화
                existing_tags = db.query(Tag).filter(Tag.char_idx == char_idx).all()
                for tag in existing_tags:
                    tag.is_deleted = True

                # 새로운 태그 추가
                for tag in character.tags:
                    new_tag = Tag(
                        char_idx=char_idx,
                        tag_name=tag["tag_name"],
                        tag_description=tag["tag_description"]
                    )
                    db.add(new_tag)
                print("Successfully updated tags")  # 로깅 추가

        db.commit()
        return {"message": "캐릭터가 성공적으로 업데이트되었습니다."}

    except Exception as e:
        print(f"Detailed error in update_character: {str(e)}")  # 상세 에러 로깅
        print(f"Error type: {type(e)}")  # 에러 타입 출력
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")  # 전체 스택 트레이스 출력
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    
@app.delete("/api/chat-room/{room_id}")
def delete_chat_room(room_id: str, db: Session = Depends(get_db)):
    try:
        # `chat_rooms`의 is_active를 False로 변경
        room = db.query(ChatRoom).filter(ChatRoom.chat_id == room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="해당 채팅방을 찾을 수 없습니다.")
        
        # is_active 업데이트
        room.is_active = False
        db.commit()
        return {"message": "채팅방이 성공적으로 비활성화되었습니다."}
    except Exception as e:
        db.rollback()
        print(f"Error deleting chat room: {str(e)}")
        raise HTTPException(status_code=500, detail=f"채팅방 삭제 중 오류: {str(e)}")
    
@app.get("/api/characters/top3/{user_idx}")
def get_top3_characters(user_idx: int, db: Session = Depends(get_db), request: Request = None):
    try:
        # 기본 쿼리 설정
        query = (
            db.query(
                Character.char_idx,
                Character.char_name,
                func.count(ChatLog.session_id).label("log_count"),
                Image.file_path
            )
            .join(ChatRoom, ChatRoom.char_prompt_id == Character.char_idx)
            .join(ChatLog, ChatLog.chat_id == ChatRoom.chat_id)
            .outerjoin(ImageMapping, ImageMapping.char_idx == Character.char_idx)
            .outerjoin(Image, Image.img_idx == ImageMapping.img_idx)
            .filter(Character.character_owner == user_idx)
            .group_by(Character.char_idx, Character.char_name, Image.file_path)
            .order_by(func.count(ChatLog.session_id).desc())
            .limit(3)
        )

        # 쿼리 결과 가져오기
        results = query.all()

        if not results:
            return {"message": "사용 기록이 있는 캐릭터가 없습니다."}

        # 요청 URL에서 base URL 생성
        base_url = f"{request.base_url.scheme}://{request.base_url.netloc}" if request else ""

        # 결과 처리
        top_characters = []
        for char_idx, char_name, log_count, image_path in results:
            # 이미지 경로 처리
            image_url = f"{base_url}/static/{os.path.basename(image_path)}" if image_path else None
            top_characters.append({
                "char_idx": char_idx,
                "char_name": char_name,
                "log_count": log_count,
                "character_image": image_url,
            })

        return top_characters

    except Exception as e:
        print(f"Error fetching top characters: {e}")
        raise HTTPException(status_code=500, detail="캐릭터 데이터를 가져오는 중 오류가 발생했습니다.")

@app.get("/api/fields/top3/{user_idx}")
def get_top3_fields(user_idx: int, db: Session = Depends(get_db)):
    """
    특정 사용자가 생성한 캐릭터들이 속한 필드 TOP 3를 반환하는 API.
    """
    try:
        # 필드별 캐릭터 수 집계 쿼리
        query = (
            db.query(
                DBField.field_idx,
                DBField.field_category,
                func.count(Character.char_idx).label("char_count")
            )
            .join(Character, Character.field_idx == DBField.field_idx)
            .filter(Character.character_owner == user_idx)
            .group_by(DBField.field_idx, DBField.field_category)
            .order_by(func.count(Character.char_idx).desc())
            .limit(3)
        )

        # 쿼리 실행
        results = query.all()

        # 결과가 없을 때 메시지 처리
        if not results:
            return {"message": "사용자가 생성한 캐릭터가 속한 필드가 없습니다."}

        # 결과 리스트 생성
        top_fields = [
            {"field_idx": field_idx, "field_category": field_category, "char_count": char_count}
            for field_idx, field_category, char_count in results
        ]

        return {"top_fields": top_fields}

    except Exception as e:
        print(f"Error fetching top fields: {e}")
        raise HTTPException(status_code=500, detail="필드 데이터를 가져오는 중 오류가 발생했습니다.")

@app.get("/api/tags/top3/{user_idx}", response_model=dict)
def get_top3_tags(user_idx: int, db: Session = Depends(get_db)):
    """
    특정 사용자가 생성한 캐릭터들의 태그 TOP 3를 반환하는 API.
    """
    try:
        # 태그별 사용 횟수 집계 쿼리
        query = (
            db.query(
                Tag.tag_name,
                func.count(Tag.tag_idx).label("tag_count")
            )
            .join(Character, Character.char_idx == Tag.char_idx)
            .filter(Character.character_owner == user_idx, Tag.is_deleted == False)
            .group_by(Tag.tag_name)
            .order_by(func.count(Tag.tag_idx).desc())
            .limit(3)
        )

        # 쿼리 실행
        results = query.all()

        # 결과가 없을 때 메시지 처리
        if not results:
            return {"message": "사용자가 생성한 캐릭터에 연결된 태그가 없습니다."}

        # 결과 리스트 생성
        top_tags = [{"tag_name": tag_name, "tag_count": tag_count} for tag_name, tag_count in results]

        return {"top_tags": top_tags}

    except Exception as e:
        print(f"Error fetching top tags: {e}")
        raise HTTPException(status_code=500, detail="태그 데이터를 가져오는 중 오류가 발생했습니다.")

@app.get("/")
async def root():
    return {"message": "Hello World"}

# uvicorn main:app --reload --log-level debug --port 8000
