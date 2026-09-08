export const DEFAULT_PUSH_CALL_TERMS = `Push/Call logging (DevTools)

By accepting, you allow this on-device DevTools panel to capture sanitized notification and call pipeline events for QA debugging:

• Outcomes such as received, shown, failed, or skipped
• Truncated notification titles/bodies and ids (conversation_id, room_id)
• CallKit / CallKeep lifecycle event names

The following are never written into DevTools logs: push/device/auth tokens, SDP offer/answer, phone numbers, passwords, or credentials.

Logs stay on this device unless you use Export, Copy, or Share. You can Deactivate anytime to revoke logging and clear the buffer. Logging starts only after you Accept.`;
