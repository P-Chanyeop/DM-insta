package com.instabot.backend.repository;

import com.instabot.backend.entity.PaymentEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PaymentEventRepository extends JpaRepository<PaymentEvent, Long> {

    /** 유저 결제 내역 — 최신순 페이지네이션. */
    Page<PaymentEvent> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    /** 특정 주문의 이벤트 조회 — 웹훅 멱등성 체크용. */
    Optional<PaymentEvent> findFirstByTossOrderIdAndEventType(String tossOrderId, PaymentEvent.EventType eventType);

    /** 유저 전체 결제 이벤트 수 (대시보드/통계용). */
    long countByUserId(Long userId);
}
