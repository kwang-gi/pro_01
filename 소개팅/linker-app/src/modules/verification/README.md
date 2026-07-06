# verification 모듈

가입 인증 블럭. 여성 신청자는 `MockSmsVerification`(즉시 활성화 모의),
남성 신청자·주선자는 `MockRegisteredMail`(등기 발송 대기 → 관리자 승인 후 활성화)을 사용합니다.

## 진짜 블럭으로 교체하는 법
- SMS: `MockSmsVerification`을 실제 SMS 발송사(알리고, NHN Cloud 등) API 연동 클래스로 교체하고
  `index.ts`의 `smsVerification` export만 바꾸면 됨.
- 등기: `MockRegisteredMail`을 우체국 등기 API 또는 수기 프로세스 연동 로직으로 교체.
  관리자 승인 흐름(`approveRegisteredMail`)은 그대로 유지 가능.
