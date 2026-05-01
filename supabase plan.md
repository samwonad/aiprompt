# Supabase Plan - Samwon Design Generator

## 1. 왜 Supabase가 필요한가

현재 피드백 기록은 브라우저 `localStorage`에 저장된다. 이 방식은 MVP 테스트에는 빠르지만 실사용에는 한계가 있다.

문제:

- 직원마다 기록이 각자 브라우저에 흩어진다.
- 다른 컴퓨터에서 기록을 볼 수 없다.
- 레시피별 실패율을 회사 전체 기준으로 볼 수 없다.
- 이미지, 프롬프트, API 옵션, 실패 메모를 장기적으로 분석하기 어렵다.
- 관리자가 레시피 수정 전/후 성공률을 비교할 수 없다.

Supabase로 옮기는 목표는 다음이다.

```text
모든 직원의 생성/피드백 기록을 한 곳에 저장
-> 레시피별 실패율 분석
-> 반복 실패 이유 확인
-> 레시피 수정 근거 확보
-> 나중에 AI가 실패 기록을 요약하고 수정안 제안
```

## 2. 저장할 핵심 데이터

현재 앱의 `FeedbackRecord` 타입을 기준으로 저장한다.

현재 프론트 타입:

```ts
interface FeedbackRecord {
  id: string
  createdAt: string
  request: string
  recipeId: string
  recipeVersion: string
  recipeLabel: string
  context: InferredContext
  prompt: string
  apiOptions: ImageApiOptions
  imageDataUrl?: string
  feedbackId: string
  feedbackLabel: string
  feedbackKind: 'success' | 'failure'
  feedbackNote: string
  referenceImages: FeedbackReferenceImage[]
}
```

Supabase에서는 `imageDataUrl`을 그대로 DB에 넣지 않는 것이 좋다. 실제 생성 이미지가 생기면 Storage에 업로드하고 DB에는 URL/path만 저장한다.

참조 이미지도 DB에 base64로 직접 넣지 않는다. 캡처/샘플 이미지는 Storage에 올리고, DB에는 path와 메타데이터만 저장한다.

## 3. 권장 테이블 구조

### 3.1 `feedback_records`

가장 중요한 테이블이다. 직원이 생성 결과에 피드백을 남길 때마다 1행씩 저장한다.

```sql
create table feedback_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  staff_name text,
  session_id text,

  request_text text not null,

  recipe_id text not null,
  recipe_version text not null,
  recipe_label text not null,

  inferred_context jsonb not null default '{}'::jsonb,
  prompt_text text not null,
  api_options jsonb not null default '{}'::jsonb,

  generation_mode text not null default 'draft',
  image_storage_path text,
  image_public_url text,

  feedback_id text not null,
  feedback_label text not null,
  feedback_kind text not null check (feedback_kind in ('success', 'failure')),
  feedback_note text not null default '',

  is_success boolean generated always as (feedback_kind = 'success') stored
);
```

인덱스:

```sql
create index feedback_records_created_at_idx
  on feedback_records (created_at desc);

create index feedback_records_recipe_idx
  on feedback_records (recipe_id, recipe_version);

create index feedback_records_feedback_idx
  on feedback_records (feedback_kind, feedback_id);

create index feedback_records_context_gin_idx
  on feedback_records using gin (inferred_context);
```

### 3.2 `recipe_versions`

레시피가 코드에만 있으면 "언제 어떤 레시피가 실패했는지" 추적이 약하다. 처음에는 선택 사항이지만, 실사용 전에 추가하는 것이 좋다.

```sql
create table recipe_versions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  recipe_id text not null,
  recipe_version text not null,
  recipe_label text not null,

  rules jsonb not null default '[]'::jsonb,
  avoid jsonb not null default '[]'::jsonb,
  triggers jsonb not null default '[]'::jsonb,

  notes text not null default '',
  is_active boolean not null default true,

  unique (recipe_id, recipe_version)
);
```

용도:

- `cover-source-cluster.v1`이 왜 실패했는지 추적
- `v2` 수정 후 성공률 비교
- 레시피 변경 이력 보존

### 3.3 `recipe_change_notes`

레시피를 수정할 때 근거를 남긴다.

```sql
create table recipe_change_notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  recipe_id text not null,
  from_version text not null,
  to_version text not null,

  reason text not null,
  based_on_feedback_count integer not null default 0,
  changed_by text
);
```

예:

```text
cover-source-cluster.v1 -> cover-source-cluster.v2
이유: "너무 복잡함" 실패가 18건 중 9건 발생.
수정: 메인 대상 1개를 더 강하게 지정하고 보조 요소 수를 줄임.
```

### 3.4 `feedback_reference_images`

피드백에 붙인 참조 이미지 기록이다. "왜 잘못됐는지" 판단할 근거 이미지를 저장한다.

```sql
create table feedback_reference_images (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  feedback_record_id uuid not null references feedback_records(id) on delete cascade,

  storage_path text not null,
  public_url text,

  file_name text not null,
  mime_type text not null,
  width integer,
  height integer,
  original_size integer,
  stored_size integer
);

create index feedback_reference_images_record_idx
  on feedback_reference_images (feedback_record_id);
```

참조 이미지는 OpenAI API에 자동으로 보내지 않는다. 기본 목적은 관리자/디자이너가 실패 원인을 더 정확히 판단하는 것이다.

## 4. Supabase Storage 구조

이미지는 DB에 base64로 넣지 않는다. Storage bucket을 사용한다.

권장 bucket:

```text
generated-images
reference-images
```

파일 경로:

```text
generated-images/
  yyyy/
    mm/
      feedback-record-id.png

reference-images/
  yyyy/
    mm/
      feedback-record-id/
        reference-image-id.jpg
```

예:

```text
generated-images/2026/05/8f14a0e4-....png
```

DB에는 다음만 저장한다.

```text
image_storage_path
image_public_url
```

참조 이미지는 `feedback_reference_images`에 저장한다.

초기에는 public bucket으로 시작해도 된다. 다만 실제 고객 자료나 내부 자료가 들어가면 private bucket + signed URL로 바꿔야 한다.

## 5. 보안 정책 방향

초기 MVP에서는 로그인 없이 시작할 수 있다. 하지만 직원 여러 명이 쓰는 순간 최소한의 식별은 필요하다.

### 단계별 보안

#### Phase A - 내부 테스트

- Supabase anon key 사용
- insert 허용
- read는 관리자 화면에서만 쓰지만 일단 제한 약하게 시작
- 직원 이름은 선택 입력

#### Phase B - 직원 실사용

- Supabase Auth 또는 간단한 사내 비밀번호 적용
- 직원별 `staff_name` 또는 `user_id` 저장
- 일반 직원은 insert 가능
- 관리자만 전체 read 가능

#### Phase C - 관리자 운영

- RLS 활성화
- 직원은 본인 기록만 조회
- 관리자는 전체 조회
- Storage도 private 전환

## 6. RLS 초안

초기에는 너무 복잡하게 시작하지 않는다. 실사용 전 전환 기준으로 남긴다.

```sql
alter table feedback_records enable row level security;

create policy "allow authenticated insert feedback"
on feedback_records
for insert
to authenticated
with check (true);

create policy "allow authenticated read feedback"
on feedback_records
for select
to authenticated
using (true);
```

관리자/직원 권한을 나누려면 `profiles` 테이블을 추가한다.

```sql
create table profiles (
  id uuid primary key references auth.users(id),
  display_name text not null,
  role text not null default 'staff' check (role in ('staff', 'admin'))
);
```

관리자만 전체 조회하게 바꾸는 정책은 이후에 적용한다.

## 7. 프론트 코드 변경 계획

현재:

```text
src/services/feedbackStore.ts
-> localStorage 저장
```

변경 후:

```text
src/services/feedbackStore.ts
-> 저장소 인터페이스만 유지

src/services/localFeedbackStore.ts
-> localStorage 구현

src/services/supabaseFeedbackStore.ts
-> Supabase 구현

src/services/supabaseClient.ts
-> Supabase 클라이언트
```

권장 인터페이스:

```ts
export interface FeedbackStore {
  list(): Promise<FeedbackRecord[]>
  create(record: FeedbackRecord): Promise<FeedbackRecord>
  clearLocalCache?(): Promise<void>
}
```

초기에는 기존 함수 이름을 유지해도 된다.

```ts
loadFeedbackRecords()
saveFeedbackRecord(record)
exportFeedbackRecords(records)
```

단, Supabase로 가면 `saveFeedbackRecords(records)`처럼 전체를 덮어쓰는 방식은 버려야 한다. 피드백은 한 건씩 `insert`해야 한다.

## 8. Netlify Function 변경 계획

현재 이미지 생성은:

```text
netlify/functions/generate-design.mjs
-> OpenAI 호출
-> base64 imageDataUrl 반환
```

Supabase Storage를 붙이면:

```text
1. OpenAI gpt-image-2 호출
2. base64 PNG 수신
3. Supabase Storage에 PNG 업로드
4. public URL 또는 signed URL 생성
5. 프론트에는 image URL 반환
```

함수에서 필요한 환경변수:

```text
OPENAI_API_KEY
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_IMAGE_SIZE=1536x1024
OPENAI_IMAGE_QUALITY=high

SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET=generated-images
SUPABASE_REFERENCE_BUCKET=reference-images
```

중요:

- `SUPABASE_SERVICE_ROLE_KEY`는 브라우저에 절대 노출하면 안 된다.
- Storage 업로드는 Netlify Function에서 처리한다.
- 브라우저에는 anon key만 사용한다.
- 참조 이미지를 AI 분석에 자동 전송하지 않는다. 분석 비용이 생기는 작업은 관리자 수동 실행으로 둔다.

## 9. 통계 쿼리 예시

### 레시피별 실패율

```sql
select
  recipe_id,
  recipe_version,
  recipe_label,
  count(*) as total_count,
  count(*) filter (where feedback_kind = 'failure') as failure_count,
  round(
    count(*) filter (where feedback_kind = 'failure')::numeric / nullif(count(*), 0),
    3
  ) as failure_rate
from feedback_records
group by recipe_id, recipe_version, recipe_label
order by failure_count desc, failure_rate desc;
```

### 실패 이유 TOP

```sql
select
  recipe_id,
  feedback_id,
  feedback_label,
  count(*) as count
from feedback_records
where feedback_kind = 'failure'
group by recipe_id, feedback_id, feedback_label
order by count desc;
```

### 최근 실패 메모

```sql
select
  created_at,
  request_text,
  recipe_label,
  feedback_label,
  feedback_note
from feedback_records
where feedback_kind = 'failure'
order by created_at desc
limit 50;
```

### 레시피 버전 전후 비교

```sql
select
  recipe_id,
  recipe_version,
  count(*) as total_count,
  count(*) filter (where feedback_kind = 'success') as success_count,
  count(*) filter (where feedback_kind = 'failure') as failure_count
from feedback_records
group by recipe_id, recipe_version
order by recipe_id, recipe_version;
```

## 10. 구현 순서

### Step 1 - Supabase 프로젝트 생성

- 새 Supabase 프로젝트 생성
- DB password 안전하게 보관
- Project URL, anon key, service role key 확인

### Step 2 - 테이블 생성

SQL Editor에서 아래 순서로 생성:

```text
feedback_records
recipe_versions
recipe_change_notes
feedback_reference_images
indexes
```

### Step 3 - Storage bucket 생성

```text
bucket name: generated-images
bucket name: reference-images
```

초기 테스트:

- public bucket 가능
- 실사용 전 private 검토

### Step 4 - 환경변수 추가

`.env`:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=generated-images
SUPABASE_REFERENCE_BUCKET=reference-images
```

Netlify 배포 환경에도 같은 값을 넣는다.

### Step 5 - 클라이언트 저장소 구현

추가 파일:

```text
src/services/supabaseClient.ts
src/services/supabaseFeedbackStore.ts
```

기존 `feedbackStore.ts`는 localStorage fallback 또는 export 전용으로 유지한다.

### Step 6 - 생성 함수에서 이미지 업로드

`netlify/functions/generate-design.mjs` 수정:

```text
OpenAI 응답 base64
-> Buffer 변환
-> Supabase Storage upload
-> URL 반환
```

참조 이미지는 별도 저장 흐름을 둔다.

```text
피드백에 첨부된 참조 이미지
-> 브라우저에서 축소/압축
-> reference-images Storage upload
-> feedback_reference_images insert
```

비용 원칙:

```text
참조 이미지 저장만으로는 OpenAI API 비용이 발생하지 않는다.
참조 이미지를 AI에게 분석시키는 기능은 관리자 수동 실행으로만 만든다.
자동 분석은 기본값으로 켜지 않는다.
```

### Step 7 - 관리자 통계 화면 연결

현재 `DataPanel`은 브라우저 메모리 records만 본다.

변경 후:

```text
앱 시작 시 Supabase에서 최근 records 로드
피드백 저장 시 Supabase insert
DataPanel은 Supabase records 기준으로 통계 표시
```

### Step 8 - 테스트

필수 테스트:

```text
npm run build
npm run lint
npm run test:analyzer
npm run test:e2e
```

추가 수동 테스트:

```text
피드백 저장 후 Supabase Table Editor에서 행 확인
이미지 생성 후 Storage에 png 파일 확인
DataPanel 통계 반영 확인
기록 내보내기 JSON 확인
```

## 11. 첫 Supabase 버전의 완료 기준

```text
직원 1명이 앱에서 생성 요청을 한다.
결과에 피드백을 남긴다.
feedback_records에 행이 생긴다.
이미지가 있으면 Storage에 png가 저장된다.
참조 이미지가 있으면 reference-images bucket과 feedback_reference_images에 저장된다.
관리자 화면에서 레시피별 실패 우선순위가 보인다.
JSON 내보내기도 계속 가능하다.
```

## 12. 주의할 점

- 이미지 base64를 DB에 직접 저장하지 않는다.
- 참조 이미지 base64도 DB에 직접 저장하지 않는다.
- service role key를 브라우저에 노출하지 않는다.
- 참조 이미지를 AI 분석에 자동으로 보내지 않는다.
- 처음부터 로그인/권한을 과하게 만들지 않는다.
- 하지만 실사용 전에는 최소한 직원 식별과 관리자 조회 권한은 정해야 한다.
- 피드백은 "자동 학습"이 아니라 "레시피 개선 근거"다.
- Supabase 전환 후에도 `localStorage` fallback을 당분간 남겨두면 장애 대응이 쉽다.

## 13. 나중에 AI 분석에 쓸 데이터 형태

나중에 AI에게 레시피 수정안을 시킬 때는 아래처럼 묶어서 보낸다.

```text
레시피: cover-source-cluster.v1
총 생성: 80건
성공: 31건
실패: 49건

실패 TOP:
1. 너무 복잡함 18건
2. 원하는 소스가 아님 11건
3. 배경이 생김 8건

대표 실패 메모:
- 표지 소스가 아니라 농촌 풍경처럼 나옴
- 농기계와 바구니가 너무 작아 안 보임
- 포스터처럼 꽉 찬 배경 이미지가 됨

현재 rules:
...

요청:
이 실패를 줄이기 위해 v2 레시피 rules/avoid 수정안을 제안해줘.
```

이 구조가 쌓이면 감으로 고치는 것이 아니라, 실패 기록을 근거로 레시피를 개선할 수 있다.
