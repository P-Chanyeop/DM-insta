package com.instabot.backend.exception;

/**
 * 플랜 할당량 초과 시 발생하는 예외
 */
public class QuotaExceededException extends RuntimeException {
    private final String resource;
    private final int limit;

    public QuotaExceededException(String resource, int limit) {
        super(String.format("%s 할당량을 초과했습니다. (현재 플랜 제한: %d개)", resource, limit));
        this.resource = resource;
        this.limit = limit;
    }

    public QuotaExceededException(String resource) {
        super(String.format("현재 플랜에서 %s 기능을 사용할 수 없습니다. 업그레이드가 필요합니다.", resource));
        this.resource = resource;
        this.limit = 0;
    }

    public String getResource() { return resource; }
    public int getLimit() { return limit; }
}
