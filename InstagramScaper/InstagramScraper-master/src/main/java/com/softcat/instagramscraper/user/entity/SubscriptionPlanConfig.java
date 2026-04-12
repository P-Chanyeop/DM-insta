package com.softcat.instagramscraper.user.entity;

import com.softcat.instagramscraper.common.entity.BaseEntity;
import com.softcat.instagramscraper.common.util.SubscriptionPlan;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 구독 플랜 설정 엔티티
 * - 관리자가 플랜별 가격, 제한, 기능을 동적으로 관리
 * - 비즈니스 정책 변경 시 DB에서 수정 가능
 */
@Entity
@Table(name = "subscription_plan_configs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SubscriptionPlanConfig extends BaseEntity {
    
    @Enumerated(EnumType.STRING)
    @Column(name = "plan_type", nullable = false, unique = true)
    private SubscriptionPlan planType;
    
    @Column(name = "display_name", nullable = false, length = 50)
    private String displayName;
    
    @Column(name = "monthly_price", nullable = false)
    private Integer monthlyPrice; // 월 요금 (원)
    
    @Column(name = "search_limit", nullable = false)
    private Integer searchLimit; // 검색 제한 (-1은 무제한)
    
    @Column(name = "features", nullable = false, length = 500)
    private String features; // 주요 기능 설명
    
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
    
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder; // 화면 표시 순서
    
    /**
     * 구독 플랜 설정 생성
     */
    @Builder
    public SubscriptionPlanConfig(SubscriptionPlan planType, String displayName, 
                                 Integer monthlyPrice, Integer searchLimit, 
                                 String features, Integer sortOrder) {
        this.planType = planType;
        this.displayName = displayName;
        this.monthlyPrice = monthlyPrice;
        this.searchLimit = searchLimit;
        this.features = features;
        this.sortOrder = sortOrder;
        this.isActive = true;
    }
    
    /**
     * 무제한 검색 여부 확인
     */
    public boolean isUnlimited() {
        return searchLimit == -1;
    }
    
    /**
     * 특정 검색 횟수가 제한 내인지 확인
     */
    public boolean canSearch(int currentSearchCount) {
        return isUnlimited() || currentSearchCount < searchLimit;
    }
    
    /**
     * 플랜 정보 업데이트 (관리자 기능)
     */
    public void updatePlanInfo(String displayName, Integer monthlyPrice, 
                              Integer searchLimit, String features) {
        this.displayName = displayName;
        this.monthlyPrice = monthlyPrice;
        this.searchLimit = searchLimit;
        this.features = features;
    }
    
    /**
     * 플랜 활성화/비활성화
     */
    public void activate() {
        this.isActive = true;
    }
    
    public void deactivate() {
        this.isActive = false;
    }
}
