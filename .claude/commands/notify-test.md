---
description: Slack·Telegram 알림 훅 테스트 메시지 발송
argument-hint: [dry-run]
allowed-tools: Bash(node:*)
---

알림 훅을 테스트한다.

1. `$ARGUMENTS` 가 `dry-run` 이면 `NOTIFY_DRY_RUN=1` 을 붙여 실행한다 (전송 없이 메시지만 출력).
2. 아니면 그대로 실행한다.

실행 명령:

`echo '{"hook_event_name":"Notification","message":"테스트 알림","cwd":"'"$PWD"'"}' | node .claude/hooks/notify.mjs`

실행 후 결과를 보고한다:
- 어떤 채널(Slack / Telegram)에 전송됐는지
- stderr 에 `notify ... failed` 가 있으면 원인과 해결 방법 (환경변수 누락, 토큰·chat_id 오류)
