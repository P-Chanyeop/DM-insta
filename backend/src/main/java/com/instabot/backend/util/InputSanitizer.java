package com.instabot.backend.util;

import java.util.regex.Pattern;

/**
 * 사용자 입력 XSS 방어 유틸리티 (S22 fix)
 *
 * 정책:
 * - 스크립트 태그/이벤트 핸들러/javascript: URL 제거
 * - 일반 문자 + 이모지 + 줄바꿈은 허용 (DM 응답 메시지 특성상 자연스러운 글 보존)
 * - 백엔드 저장 직전에만 호출. 프론트 표시는 React의 기본 escape로 2차 방어.
 *
 * 주의: 서버 sanitize는 depth-in-defense 용도이며, 프론트에서 `dangerouslySetInnerHTML`
 *      사용 금지 원칙이 1차 방어선.
 */
public final class InputSanitizer {

    private static final Pattern SCRIPT_TAG = Pattern.compile(
            "<\\s*/?\\s*(script|iframe|object|embed|applet|style|link|meta|svg|math)[^>]*>",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern EVENT_HANDLER = Pattern.compile(
            "\\s*on[a-z]+\\s*=\\s*(\"[^\"]*\"|'[^']*'|[^\\s>]+)",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern JS_URL = Pattern.compile(
            "javascript\\s*:",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern DATA_HTML_URL = Pattern.compile(
            "data\\s*:\\s*text/html",
            Pattern.CASE_INSENSITIVE);

    private InputSanitizer() {}

    /**
     * 사용자 입력 문자열에서 XSS 위험 패턴 제거.
     * null-safe.
     */
    public static String sanitize(String input) {
        if (input == null || input.isEmpty()) return input;
        String result = input;
        result = SCRIPT_TAG.matcher(result).replaceAll("");
        result = EVENT_HANDLER.matcher(result).replaceAll("");
        result = JS_URL.matcher(result).replaceAll("");
        result = DATA_HTML_URL.matcher(result).replaceAll("");
        return result;
    }
}
