# deactivate-account 함수

이 Edge Function은 사용자 계정 탈퇴(비활성화) 처리를 담당합니다.

## 기능

1. 계정 비활성화(is_active=false로 설정)
2. 삭제 시간 기록(deleted_at 필드 업데이트)

## 입력 파라미터

```json
{
  "user_id": "사용자 ID"
}
```

## 반환 데이터

성공 시:
```json
{
  "success": true,
  "message": "Account deactivated successfully",
  "deactivated_at": "2025-05-11T12:34:56.789Z"
}
```

오류 시:
```json
{
  "error": "오류 메시지"
}
```

## 배포 방법

1. Supabase CLI가 설치되어 있는지 확인:
```bash
supabase --version
```

2. Supabase 프로젝트에 로그인:
```bash
supabase login
```

3. 함수 배포:
```bash
supabase functions deploy deactivate-account --project-ref [YOUR_PROJECT_REF]
```

4. (선택 사항) 환경 변수 설정:
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key --project-ref [YOUR_PROJECT_REF]
supabase secrets set SUPABASE_URL=your_supabase_url --project-ref [YOUR_PROJECT_REF]
```

## 보안 고려사항

- 이 함수는 사용자 계정 비활성화를 수행하므로 적절한 인증이 필요합니다.
- 클라이언트에서 호출 시 JWT 토큰을 Authorization 헤더에 포함해야 합니다.

## 참고 사항

- 이 함수 실행 후 30일이 지나면 별도의 자동화 기능을 통해 개인정보를 완전히 삭제할 예정입니다.
- 사용자의 적립 시간과 쿠폰은 즉시 소멸됩니다. 