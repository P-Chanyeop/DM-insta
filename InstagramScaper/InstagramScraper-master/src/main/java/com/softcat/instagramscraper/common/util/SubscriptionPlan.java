package com.softcat.instagramscraper.common.util;

/**
 * 구독 플랜 타입 정의
 * 실제 가격, 제한, 기능은 SubscriptionPlanConfig 엔티티에서 관리
 */
public enum SubscriptionPlan {
    FREE,       // 무료 플랜
    BASIC,      // 베이직 플랜  
    PRO,        // 프로 플랜
    ENTERPRISE  // 엔터프라이즈 플랜
}
