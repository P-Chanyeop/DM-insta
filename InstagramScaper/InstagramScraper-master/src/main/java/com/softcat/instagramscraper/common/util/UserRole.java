package com.softcat.instagramscraper.common.util;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 사용자 역할 정의
 * - ADMIN: 시스템 관리자 (모든 권한)
 * - USER: 일반 사용자 (기본 권한)
 */
@Getter
@RequiredArgsConstructor
public enum UserRole {
    ADMIN("ROLE_ADMIN", "시스템 관리자"),
    USER("ROLE_USER", "일반 사용자");
    
    private final String authority;
    private final String description;
    
    /**
     * Spring Security에서 사용할 권한 문자열 반환
     */
    public String getAuthority() {
        return authority;
    }
}
