package com.instabot.backend.config;

import com.instabot.backend.entity.Template;
import com.instabot.backend.repository.TemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * 기본 템플릿 시드 데이터 — 앱 시작 시 템플릿이 없으면 자동 생성
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TemplateSeedData implements CommandLineRunner {

    private final TemplateRepository templateRepository;

    @Override
    public void run(String... args) {
        if (templateRepository.count() > 0) return;

        log.info("기본 템플릿 시드 데이터 생성 중...");

        templateRepository.save(Template.builder()
                .name("쇼핑몰 상품 안내")
                .description("댓글에 '가격' 키워드 입력 시 자동으로 상품 링크와 할인 쿠폰을 DM으로 발송합니다.")
                .category("SHOPPING")
                .icon("ri-shopping-bag-line")
                .gradientColors("#FF6B9D,#C44AFF")
                .flowData("{\"steps\":[{\"type\":\"comment_reply\",\"messages\":[\"감사합니다! DM으로 상세 정보 보내드릴게요 ✨\"]},{\"type\":\"opening_dm\",\"text\":\"안녕하세요! 상품에 관심 가져주셔서 감사합니다 😊\",\"buttons\":[{\"title\":\"가격표 보기\"},{\"title\":\"할인 쿠폰 받기\"}]},{\"type\":\"main_dm\",\"title\":\"이번 주 특별 할인\",\"subtitle\":\"최대 30% 할인 + 무료배송\",\"buttons\":[{\"title\":\"지금 구매하기\",\"url\":\"https://example.com/shop\"}]}]}")
                .usageCount(1240L)
                .rating(4.8)
                .build());

        templateRepository.save(Template.builder()
                .name("예약 안내 자동응답")
                .description("'예약' 키워드에 반응하여 예약 가능 시간과 예약 링크를 자동 발송합니다.")
                .category("BOOKING")
                .icon("ri-calendar-check-line")
                .gradientColors("#4ECDC4,#44B09E")
                .flowData("{\"steps\":[{\"type\":\"opening_dm\",\"text\":\"예약 문의 감사합니다! 🙏\\n아래에서 원하시는 시간을 선택해주세요.\",\"buttons\":[{\"title\":\"오전 예약\"},{\"title\":\"오후 예약\"},{\"title\":\"주말 예약\"}]},{\"type\":\"main_dm\",\"title\":\"온라인 예약하기\",\"subtitle\":\"간편하게 예약하세요\",\"buttons\":[{\"title\":\"예약 페이지\",\"url\":\"https://example.com/booking\"}]}]}")
                .usageCount(890L)
                .rating(4.6)
                .build());

        templateRepository.save(Template.builder()
                .name("이벤트/프로모션")
                .description("이벤트 게시물에 댓글 참여 시 자동으로 참여 확인 DM과 이벤트 상세를 발송합니다.")
                .category("EVENT")
                .icon("ri-gift-line")
                .gradientColors("#F093FB,#F5576C")
                .flowData("{\"steps\":[{\"type\":\"comment_reply\",\"messages\":[\"참여 완료! 🎉 DM으로 이벤트 상세 보내드릴게요!\",\"축하합니다! 참여가 확인되었어요 🎊\"]},{\"type\":\"opening_dm\",\"text\":\"이벤트 참여 감사합니다! 🎁\\n아래 버튼을 눌러 경품을 확인하세요.\",\"buttons\":[{\"title\":\"경품 확인하기\"}]},{\"type\":\"main_dm\",\"title\":\"🎉 이벤트 경품 안내\",\"subtitle\":\"당첨 확률을 높이는 방법!\",\"buttons\":[{\"title\":\"이벤트 페이지\",\"url\":\"https://example.com/event\"}]}]}")
                .usageCount(2100L)
                .rating(4.9)
                .build());

        templateRepository.save(Template.builder()
                .name("리드 수집 (이메일)")
                .description("관심 고객에게 이메일을 요청하고, 수집된 이메일을 연락처에 자동 저장합니다.")
                .category("LEAD")
                .icon("ri-mail-add-line")
                .gradientColors("#667EEA,#764BA2")
                .flowData("{\"steps\":[{\"type\":\"opening_dm\",\"text\":\"안녕하세요! 무료 가이드를 받아보시겠어요? 📚\\n이메일 주소를 알려주시면 바로 보내드릴게요!\",\"buttons\":[{\"title\":\"네, 받고 싶어요!\"}]},{\"type\":\"email_collect\"},{\"type\":\"main_dm\",\"title\":\"무료 가이드 다운로드\",\"subtitle\":\"이메일로도 발송해드렸어요!\",\"buttons\":[{\"title\":\"지금 다운로드\",\"url\":\"https://example.com/guide\"}]}]}")
                .usageCount(670L)
                .rating(4.5)
                .build());

        templateRepository.save(Template.builder()
                .name("고객 지원 자동응답")
                .description("FAQ 키워드에 자동 응답하고, 해결되지 않으면 상담원 연결을 안내합니다.")
                .category("SUPPORT")
                .icon("ri-customer-service-2-line")
                .gradientColors("#43E97B,#38F9D7")
                .flowData("{\"steps\":[{\"type\":\"opening_dm\",\"text\":\"안녕하세요! 어떤 도움이 필요하신가요? 😊\",\"buttons\":[{\"title\":\"배송 문의\"},{\"title\":\"교환/환불\"},{\"title\":\"상담원 연결\"}]},{\"type\":\"follow_up\",\"delayMinutes\":30,\"text\":\"혹시 추가로 궁금한 점이 있으시면 편하게 말씀해주세요!\"}]}")
                .usageCount(1560L)
                .rating(4.7)
                .build());

        log.info("기본 템플릿 5개 생성 완료");
    }
}
