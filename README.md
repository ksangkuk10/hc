# README.md - HealthCare Web Prototype

## 구조 및 개념

- server/  → Express 기반 API 서버
- db/      → LevelDB adapter(추후 mongo, mysql 등 DB로 pluggable 변경 간편)
- client/  → 단순 웹 UI(향후 React 등 적용 가능)

### 주요 특징
- 모든 DB 접근은 db/index.js 통해 추상화
- LevelDB는 node.js 환경에서 간편하게 local KV 저장 담당
- DB 변경시 db/adapter만 바꿔 붙이면 API/로직 코드 수정 최소화

## 실행 예시
1. npm install express body-parser cors level
2. node server/index.js
3. client/index.html 실행 (simple prototype)

---

health_care_doc.txt, health_care_ui.txt 문서 참고해서 주요 API, 데이터, UI는 점차 확장 예정
