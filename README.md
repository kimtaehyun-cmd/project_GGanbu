# 캐릭터 챗봇 서비스 (GGANBU)

### 👨‍🏫프로젝트 소개
---
__GGANBU__ 는 사용자가 캐릭터의 성격, 말투, 이미지 등을 직접 커스터마이징, 생성하여 자유롭게 소통할 수 있는 서브컬쳐 챗봇 서비스 입니다.

### 🔧개발 환경
---
- Front : React
- Back : FastAPI
- 버전 및 이슈관리 : Github, Jira
- 협업 툴 : Notion, Jira, slack
- 서비스 배포 환경 : Jenkins
- 디자인 : Figma

### 🔍주요 기능
---
### __1. 챗봇 캐릭터 제작__
- __캐릭터 생성__:  캐릭터 정보를 입력하여 나만의 AI 캐릭터 제작
<P align="left">
  <img width="60%" height="500px" alt="캐릭터 생성" src="https://github.com/user-attachments/assets/3488021f-7d79-41fe-807b-294733851d30">
</P>

- __프롬프트 작성__:  캐릭터의 성격, 배경, 말투 등을 설정
<P align="left">
  <img width="60%" height="500px" alt="프롬프트 작성" src="https://github.com/user-attachments/assets/99735202-13e5-46ef-8522-f2484f4049d2">
</P>

- __미리보기&캐릭터 음성(TTS)선택__:  작성된 프롬프트를 기반으로한 캐릭터와의 채팅 미리보기 기능 및 캐릭터 TTS모델 선택
<P align="left">
  <img width="60%" height="600px" alt="미리보기&음성 선택" src="https://github.com/user-attachments/assets/363d9da0-4a4c-408b-836b-602c253a8d27">
</P>

---

### __2. 캐릭터 이미지 생성__
- 이미지 퀄리티 향상을 위한 **개발자 관리용 프롬프트**와 **사용자 입력 프롬프트**를 나눠 사용자들에게는 카테고리별 프롬프트 템플릿을 제공하여 이미지 제작 난이도를 낮췄습니다.
<P align="left">
  <img width="100%" height="500px" alt="미리보기&음성 선택" src="https://github.com/user-attachments/assets/8341a51d-cb85-4af2-ade5-05136ccbcdc8">
</P>

--- 

### __3. 캐릭터와의 채팅__
- **websocket** 방식을 이용하여 실시간 통신이 가능하도록 하였고 이를 **LLM**과 통합하여 캐릭터의 개성을 반영한 응답을 생성하도록 구현하였습니다.
- 채팅로그를 남겨 대화맥락 파악에 중점을 뒀습니다. 
