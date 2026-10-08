# notify 모듈

지인 동의 알림 블럭. 실제 카카오 알림톡 대신 `MockAlimtalk`이 DB 상태(`acquaintances.consent_status`)만
바꾸고, 주선자 화면의 "동의됨으로 처리" 버튼이 `respondConsent`를 호출해 지인이 동의한 것처럼 흉내낸다.

## 진짜 블럭으로 교체하는 법
- 카카오 알림톡/비즈니스 API 연동 클래스를 만들어 `sendConsentRequest`에서 실제 발송하고,
  콜백/웹훅으로 `respondConsent`를 호출하도록 변경. `index.ts`의 export만 교체하면 나머지 코드는 그대로.
