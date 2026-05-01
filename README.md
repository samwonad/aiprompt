# Samwon Design Generator

직원이 긴 프롬프트나 디자인 용어를 몰라도 짧은 요청을 입력하고, 앱이 내부 제작 레시피에 맞춰 방향을 제안한 뒤 생성 결과의 실패 데이터를 축적하는 도구입니다.

## 구조

- `src/domain`: 제작 분류, 추천 로직, 프롬프트 조립
- `src/components`: 화면 컴포넌트
- `src/services`: 생성 API 호출, 피드백 저장/내보내기
- `netlify/functions`: OpenAI `gpt-image-2` 이미지 생성 서버리스 함수

## 실행

```bash
npm install
npm run dev
```

## 테스트

```bash
npm run build
npm run lint
npm run test:analyzer
npm run test:e2e
```

이미지 API까지 테스트하려면 Netlify Functions 환경에서 실행하고 `.env`에 키를 넣습니다.

```bash
cp .env.example .env
# OPENAI_API_KEY=...
npx netlify dev
```

## 현재 MVP 범위

- 짧은 한국어 입력
- 제작 방향 3개 추천
- 내부 프롬프트/이미지 API 옵션 구성
- OpenAI API 키가 없을 때 드래프트 모드
- 최종 이미지 생성 기본 모델: `gpt-image-2`
- 결과 피드백 기록
- 실패 판단 근거용 참조 이미지 업로드/붙여넣기
- 기록 JSON 내보내기

## 다음 단계

1. 실제 실패 사례 30개 입력
2. 레시피별 실패 유형 확인
3. 반복 실패가 많은 레시피부터 문구/구성 규칙 수정
4. OpenAI API 키 연결 후 실제 생성 결과 검증
