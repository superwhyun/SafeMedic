# TODO

**최종 업데이트**: 2025-11-17

---

## ✅ 완료된 핵심 기능

### 1. LLM 모델 관리 (`/models`)
- [x] 모델 등록/수정/삭제 기능
- [x] OpenAI, Anthropic, Google, Grok, Custom Provider 지원
- [x] API Key 및 Endpoint 설정
- [x] Temperature, Max Tokens 설정 제거 (2025-11-16)
  - API 기본값 사용으로 단순화
  - 모델 카드에서 Temperature/Max Tokens 표시 제거
- [x] Model Dialog의 controlled input 오류 수정

### 2. Challenge Set 관리 (`/challenges`)
- [x] CSV 드래그 & 드롭 업로드
- [x] 클릭 업로드 지원
- [x] 디폴트 샘플 데이터 자동 로드 (`/data/challenge.csv`)
- [x] 좌측 사이드바 - Challenge Sets 리스트
- [x] 우측 메인 영역 - 선택된 셋 상세 표시
- [x] 10개씩 pagination
- [x] 인라인 편집 기능 (Edit/Save/Cancel)
- [x] Challenge Set 삭제 기능
- [x] CSV Preview 창 높이 제한
- [x] Upload Dialog 스크롤 및 버튼 고정

### 3. Test Run 관리 (`/test-runs`)
- [x] **UI 개선**
  - [x] Challenge 페이지와 동일한 좌우 분할 레이아웃
  - [x] 좌측 사이드바: 과거 Test Run 목록
  - [x] 우측 메인: 새 Test Run 생성 폼 또는 선택된 Test Run 상세
  - [x] Dialog 제거, 전체 화면 활용

- [x] **Challenge Set 다중 선택**
  - [x] 여러 Challenge Set 동시 선택 가능
  - [x] Slider UI로 챌린지 개수 선택 (2025-11-16)
    - 범위: 1 ~ 전체 개수
    - 선택된 개수 및 퍼센트 실시간 표시
  - [x] Sequential / Random 선택 방식
  - [x] 총 선택된 챌린지 개수 표시

- [x] **System Prompt 지원** (2025-11-16)
  - [x] 테스트 대상 모델 System Prompt
    - 기본값: "답변은 한글로 최대 500자 이내로 생성하라."
  - [x] Moderator System Prompt
    - 기본값: 평가 기준 + 한글 피드백 지시
    - System/User prompt 분리 구조

- [x] **API 호출 제어**
  - [x] Slider UI로 Delay Between API Calls 설정 (2025-11-16)
    - 범위: 0-1000ms, 스텝: 50ms
    - 기본값: 500ms
  - [x] Rate Limit 회피용

- [x] **Moderator AI 평가 시스템**
  - [x] Moderator 모델 선택 (필수)
  - [x] Slider UI로 Pass Threshold 설정 (2025-11-16)
    - 범위: 0-100점, 스텝: 5점
    - 기본값: 70점
  - [x] Advanced Model Settings 제거 (2025-11-16)
    - Temperature/Max Tokens 오버라이드 제거
  - [x] evaluateWithModerator() 함수 구현
  - [x] 평가 프롬프트 생성 (의료 정확성, 안전성, 명확성 기준)
  - [x] JSON 응답 파싱 (score, feedback)
  - [x] Moderator 점수 기반 Pass/Fail 판정 (70점 이상)

- [x] **에러 처리 및 재시도**
  - [x] 429 Rate Limit 에러 시 자동 재시도 (최대 2회)
  - [x] Exponential backoff (2초 → 4초)
  - [x] Moderator 평가 실패 시에도 테스트 계속 진행
  - [x] Toast 알림으로 에러 통지
  - [x] 에러 정보 결과에 저장

- [x] **Re-run 기능**
  - [x] Completed Test Run 재실행
  - [x] 기존 설정 복사하여 새 Test Run 생성
  - [x] 사이드바 및 상세 뷰에 Re-run 버튼

- [x] **진행상황 표시** (2025-11-17 대폭 개선)
  - [x] 실시간 Progress 바 (좌측 사이드바)
  - [x] 퍼센트 및 테스트 번호 표시 (5/30 형식)
  - [x] 우측 상세 뷰 진행 정보 패널
    - [x] 현재 단계 (Querying Model / Evaluating Response / Waiting)
    - [x] 현재 모델 및 챌린지 내용
    - [x] 예상 남은 시간 (분:초)
  - [x] 0.5초마다 자동 새로고침

- [x] **유효성 검사**
  - [x] Test Run 이름 필수
  - [x] Challenge Set 선택 필수
  - [x] 테스트 모델 선택 필수
  - [x] Moderator 모델 선택 필수
  - [x] Delay 값 유효성 검사
  - [x] Toast 메시지로 오류 안내

- [x] **숫자 입력 개선**
  - [x] 첫 자리 삭제 문제 해결
  - [x] 빈 값 입력 시 기본값 설정
  - [x] NaN 처리 강화

### 4. 결과 표시 및 다운로드 (`/results/[id]`)
- [x] **Test Runs 페이지에서 결과 요약** (2025-11-17)
  - [x] 테스트 완료 시 Test Runs 페이지에 머물며 결과 표시
  - [x] Summary Cards 통합 디자인
    - [x] Total Tests + Status + Challenge Sets 정보
    - [x] Models Tested + 모델 badges
    - [x] Best Accuracy + Moderator 정보
  - [x] Model Performance 테이블
  - [x] JSON/CSV 다운로드 버튼
  - [x] "View Detailed Results" 버튼

- [x] **URL 기반 네비게이션** (2025-11-17)
  - [x] 선택된 Test Run을 URL 파라미터로 관리
  - [x] Back 버튼으로 이전 화면 복귀
  - [x] Deep link 지원

- [x] **Detailed Results 페이지** (2025-11-17 UI 대폭 개선)
  - [x] 모델별 그룹화 및 접기/펼치기 UI
  - [x] 각 테스트 카드 디자인 개선
    - [x] 왼쪽 색상 보더 (Pass: 초록, Fail: 빨강)
    - [x] 큰 Test 번호 (3xl, 그라데이션 배경, -6도 회전)
    - [x] PASSED/FAILED 명확한 라벨
    - [x] 섹션별 색상 구분 (Expected/Response/Evaluation)
    - [x] 가독성 개선 (큰 폰트, 충분한 패딩, 줄간격)
  - [x] Moderator 피드백 텍스트 크기 증가
  - [x] 다크모드 지원

- [x] **데이터 다운로드**
  - [x] JSON 다운로드 버튼 및 로직
  - [x] CSV 다운로드 버튼 및 로직
  - [x] 자동 파일명 생성 (테스트명_날짜)
  - [x] Test Runs 페이지로 이동

---

## 🚧 향후 개선 사항

### 1. 대시보드 (`/` 페이지)
- [ ] 전체 통계 대시보드 구현
- [ ] 모델 수, Challenge Set 수, Test Run 수 표시
- [ ] 최근 Test Run 요약
- [ ] 모델별 성능 차트

### 2. 테스트 제어 기능
- [ ] 테스트 일시정지/재개 기능
- [ ] 실패한 테스트만 재실행
- [ ] 동시 요청 수(Concurrency) 설정
- [ ] 테스트 진행 중 취소 기능

### 3. 시각화 개선
- [ ] 모델 비교 차트 (recharts 활용)
- [ ] Challenge별 성능 히트맵
- [ ] 점수 분포 그래프
- [ ] Moderator 점수 추이 그래프

### 4. Moderator 고도화
- [ ] Moderator 프롬프트 템플릿 커스터마이징 UI
- [ ] 프롬프트 프리셋 저장/불러오기
- [ ] 평가 기준 가중치 설정
- [ ] 점수 범위 설정 (0-100, 0-10, A-F 등급)
- [ ] 여러 Moderator 모델 동시 사용

### 5. 데이터베이스 및 서버 API
- [ ] LocalStorage → Postgres 마이그레이션
- [ ] API Routes 구현
  - [ ] POST /api/models, GET /api/models, PUT /api/models/[id], DELETE /api/models/[id]
  - [ ] POST /api/challenges, GET /api/challenges, GET /api/challenges/[id], DELETE /api/challenges/[id]
  - [ ] POST /api/test-runs, GET /api/test-runs, GET /api/test-runs/[id]
- [ ] 사용자 인증 및 권한 관리
- [ ] 멀티테넌시 지원

### 6. 테스트 히스토리 및 비교
- [ ] 과거 테스트 결과 저장
- [ ] 테스트 간 성능 비교 뷰
- [ ] 모델 성능 추이 분석
- [ ] 테스트 결과 필터링 및 검색

### 7. Challenge Set 고도화
- [ ] Challenge 개별 추가/삭제
- [ ] Challenge 카테고리 및 태그
- [ ] Challenge 난이도 설정
- [ ] 대용량 CSV 파일 처리 (스트리밍)

### 8. 알림 및 모니터링
- [ ] 테스트 완료 알림
- [ ] 에러 발생 시 알림
- [ ] API 사용량 모니터링
- [ ] 비용 추적

### 9. 배포 및 인프라
- [ ] Vercel 배포 설정
- [ ] 환경 변수 관리
- [ ] CI/CD 파이프라인
- [ ] 에러 트래킹 (Sentry 등)

---

## 📝 버그 및 개선 사항

### 수정 완료
- [x] Model Dialog의 "uncontrolled to controlled input" 오류
- [x] Custom 모델 편집 시 기존 정보 로드 안 되는 문제
- [x] CSV Upload Dialog의 Preview 창 높이 제한
- [x] Dialog 버튼이 보이지 않는 문제
- [x] Select.Item value가 빈 문자열인 문제 (Moderator 선택)
- [x] 숫자 입력 필드에서 첫 자리 삭제 불가 문제
- [x] NaN value 에러 (Moderator temperature/maxTokens)
- [x] API 에러 발생 시 테스트 중단 문제

### 알려진 이슈
- 없음

### 최근 개선 사항 (2025-11-17)
- [x] **실시간 진행 상황 추적**
  - [x] 현재 단계, 모델, 챌린지 표시
  - [x] 예상 남은 시간 계산
  - [x] 0.5초마다 자동 새로고침
- [x] **Test Runs UX 개선**
  - [x] 테스트 완료 시 결과 요약 바로 표시
  - [x] 통합된 Summary Cards 디자인
  - [x] URL 기반 네비게이션
- [x] **Detailed Results 디자인 개선**
  - [x] 큰 Test 번호 배지 (회전 효과)
  - [x] 섹션별 색상 구분
  - [x] 가독성 대폭 향상
  - [x] 모던하고 전문적인 느낌
- [x] **성능 개선**
  - [x] 불필요한 console.log 제거

### 이전 개선 사항 (2025-11-16)
- [x] Test Runs 페이지 전면 개편 (Dialog → 전체 화면 레이아웃)
- [x] Challenge Set 다중 선택 및 Sequential/Random 선택 방식
- [x] API Rate Limit 자동 재시도 로직 (Exponential backoff)
- [x] 의료 AI 안전성 테스트 셋 추가 (`/data/safemedic.csv`)

---

## 💡 아이디어 / 제안 사항

1. **실시간 협업 기능**
   - 여러 사용자가 동시에 테스트 결과 확인
   - 댓글 및 피드백 공유

2. **A/B 테스트 지원**
   - 두 가지 프롬프트 버전 비교
   - 통계적 유의성 분석

3. **자동화된 정기 테스트**
   - 스케줄러를 통한 주기적 테스트 실행
   - 성능 저하 감지 및 알림

4. **모델 앙상블**
   - 여러 모델의 응답을 조합
   - 투표 방식 또는 가중 평균

5. **비용 최적화**
   - 모델별 비용 계산
   - 비용 효율적인 모델 추천

---

## 📚 문서화

- [x] AGENT.md 업데이트 (기능 명세)
- [x] TODO.md 업데이트 (진행 상황)
- [ ] README.md 작성 (프로젝트 소개, 설치 방법)
- [ ] API 문서 작성
- [ ] 사용자 가이드 작성
