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
                .flowData("{\"trigger\":{\"type\":\"comment\",\"keywords\":[\"가격\",\"얼마\",\"구매\"],\"excludeKeywords\":[],\"matchType\":\"CONTAINS\",\"postTarget\":\"any\"},\"commentReply\":{\"enabled\":true,\"replies\":[\"감사합니다! DM으로 상세 정보 보내드릴게요\"]},\"openingDm\":{\"enabled\":true,\"message\":\"안녕하세요! 상품에 관심 가져주셔서 감사합니다\",\"buttonText\":\"가격표 보기\"},\"requirements\":{\"followCheck\":{\"enabled\":false,\"message\":\"\"},\"emailCollection\":{\"enabled\":false,\"message\":\"\"}},\"mainDm\":{\"message\":\"이번 주 특별 할인! 최대 30% 할인 + 무료배송\",\"links\":[{\"text\":\"지금 구매하기\",\"url\":\"https://example.com/shop\"}]},\"followUp\":{\"enabled\":true,\"delay\":60,\"unit\":\"분\",\"message\":\"혹시 상품이 마음에 드셨나요? 궁금한 점이 있으시면 편하게 물어보세요!\"}}")
                .usageCount(1240L)
                .rating(4.8)
                .build());

        templateRepository.save(Template.builder()
                .name("예약 안내 자동응답")
                .description("'예약' 키워드에 반응하여 예약 가능 시간과 예약 링크를 자동 발송합니다.")
                .category("BOOKING")
                .icon("ri-calendar-check-line")
                .gradientColors("#4ECDC4,#44B09E")
                .flowData("{\"trigger\":{\"type\":\"dm_keyword\",\"keywords\":[\"예약\",\"시간\",\"일정\"],\"excludeKeywords\":[],\"matchType\":\"CONTAINS\",\"postTarget\":\"any\"},\"commentReply\":{\"enabled\":false,\"replies\":[]},\"openingDm\":{\"enabled\":true,\"message\":\"예약 문의 감사합니다! 아래에서 원하시는 시간을 선택해주세요.\",\"buttonText\":\"예약 확인\"},\"requirements\":{\"followCheck\":{\"enabled\":false,\"message\":\"\"},\"emailCollection\":{\"enabled\":false,\"message\":\"\"}},\"mainDm\":{\"message\":\"온라인 예약 페이지에서 간편하게 예약하세요!\",\"links\":[{\"text\":\"예약 페이지\",\"url\":\"https://example.com/booking\"}]},\"followUp\":{\"enabled\":false,\"delay\":30,\"unit\":\"분\",\"message\":\"\"}}")
                .usageCount(890L)
                .rating(4.6)
                .build());

        templateRepository.save(Template.builder()
                .name("이벤트/프로모션")
                .description("이벤트 게시물에 댓글 참여 시 자동으로 참여 확인 DM과 이벤트 상세를 발송합니다.")
                .category("EVENT")
                .icon("ri-gift-line")
                .gradientColors("#F093FB,#F5576C")
                .flowData("{\"trigger\":{\"type\":\"comment\",\"keywords\":[],\"excludeKeywords\":[],\"matchType\":\"CONTAINS\",\"postTarget\":\"any\"},\"commentReply\":{\"enabled\":true,\"replies\":[\"참여 완료! DM으로 이벤트 상세 보내드릴게요!\",\"축하합니다! 참여가 확인되었어요\"]},\"openingDm\":{\"enabled\":true,\"message\":\"이벤트 참여 감사합니다! 아래 버튼을 눌러 경품을 확인하세요.\",\"buttonText\":\"경품 확인하기\"},\"requirements\":{\"followCheck\":{\"enabled\":true,\"message\":\"이벤트 참여를 위해 먼저 팔로우해 주세요!\"},\"emailCollection\":{\"enabled\":false,\"message\":\"\"}},\"mainDm\":{\"message\":\"이벤트 경품 안내 - 당첨 확률을 높이는 방법!\",\"links\":[{\"text\":\"이벤트 페이지\",\"url\":\"https://example.com/event\"}]},\"followUp\":{\"enabled\":true,\"delay\":1,\"unit\":\"일\",\"message\":\"이벤트 마감이 얼마 남지 않았어요! 아직 참여 안 하셨다면 서둘러주세요\"}}")
                .usageCount(2100L)
                .rating(4.9)
                .build());

        templateRepository.save(Template.builder()
                .name("리드 수집 (이메일)")
                .description("관심 고객에게 이메일을 요청하고, 수집된 이메일을 연락처에 자동 저장합니다.")
                .category("LEAD")
                .icon("ri-mail-add-line")
                .gradientColors("#667EEA,#764BA2")
                .flowData("{\"trigger\":{\"type\":\"comment\",\"keywords\":[\"가이드\",\"자료\",\"다운로드\"],\"excludeKeywords\":[],\"matchType\":\"CONTAINS\",\"postTarget\":\"any\"},\"commentReply\":{\"enabled\":true,\"replies\":[\"DM으로 무료 가이드 보내드릴게요!\"]},\"openingDm\":{\"enabled\":true,\"message\":\"안녕하세요! 무료 가이드를 받아보시겠어요? 이메일 주소를 알려주시면 바로 보내드릴게요!\",\"buttonText\":\"네, 받고 싶어요!\"},\"requirements\":{\"followCheck\":{\"enabled\":false,\"message\":\"\"},\"emailCollection\":{\"enabled\":true,\"message\":\"이메일 주소를 입력해 주세요.\"}},\"mainDm\":{\"message\":\"무료 가이드 다운로드 - 이메일로도 발송해드렸어요!\",\"links\":[{\"text\":\"지금 다운로드\",\"url\":\"https://example.com/guide\"}]},\"followUp\":{\"enabled\":false,\"delay\":30,\"unit\":\"분\",\"message\":\"\"}}")
                .usageCount(670L)
                .rating(4.5)
                .build());

        templateRepository.save(Template.builder()
                .name("고객 지원 자동응답")
                .description("FAQ 키워드에 자동 응답하고, 해결되지 않으면 상담원 연결을 안내합니다.")
                .category("SUPPORT")
                .icon("ri-customer-service-2-line")
                .gradientColors("#43E97B,#38F9D7")
                .flowData("{\"trigger\":{\"type\":\"dm_keyword\",\"keywords\":[\"문의\",\"도움\",\"배송\",\"환불\",\"교환\"],\"excludeKeywords\":[],\"matchType\":\"CONTAINS\",\"postTarget\":\"any\"},\"commentReply\":{\"enabled\":false,\"replies\":[]},\"openingDm\":{\"enabled\":true,\"message\":\"안녕하세요! 어떤 도움이 필요하신가요?\",\"buttonText\":\"상담 시작\"},\"requirements\":{\"followCheck\":{\"enabled\":false,\"message\":\"\"},\"emailCollection\":{\"enabled\":false,\"message\":\"\"}},\"mainDm\":{\"message\":\"자주 묻는 질문을 확인해보세요!\",\"links\":[{\"text\":\"FAQ 페이지\",\"url\":\"https://example.com/faq\"}]},\"followUp\":{\"enabled\":true,\"delay\":30,\"unit\":\"분\",\"message\":\"혹시 추가로 궁금한 점이 있으시면 편하게 말씀해주세요!\"}}")
                .usageCount(1560L)
                .rating(4.7)
                .build());

        templateRepository.save(Template.builder()
                .name("공동구매 풀사이클 자동화")
                .description("댓글 신청 → DM 캐러셀 → 옵션 선택 → 재고 확인 → 결제 링크 → 배송 안내까지 자동화합니다.")
                .category("SHOPPING")
                .icon("ri-shopping-bag-line")
                .gradientColors("#EF4444,#F97316")
                .flowData("{\"trigger\":{\"type\":\"comment\",\"keywords\":[\"신청\",\"구매\",\"공구\"],\"excludeKeywords\":[],\"matchType\":\"CONTAINS\",\"postTarget\":\"any\"},\"commentReply\":{\"enabled\":true,\"replies\":[\"신청 감사합니다! DM으로 상세 정보 보내드릴게요\",\"참여 확인! DM을 확인해주세요\"]},\"openingDm\":{\"enabled\":true,\"message\":\"공동구매에 관심 가져주셔서 감사합니다! 아래 버튼을 눌러 상품을 확인하세요.\",\"buttonText\":\"상품 보기\"},\"requirements\":{\"followCheck\":{\"enabled\":true,\"message\":\"공동구매 참여를 위해 먼저 팔로우해 주세요!\"},\"emailCollection\":{\"enabled\":false,\"message\":\"\"}},\"inventory\":{\"enabled\":true,\"groupBuyId\":null,\"soldOutMessage\":\"죄송합니다, 이번 공동구매는 매진되었습니다. 다음 공구를 기대해주세요!\"},\"mainDm\":{\"message\":\"공동구매 상품 안내입니다! 아래 링크에서 결제해주세요.\",\"links\":[{\"text\":\"결제하기\",\"url\":\"https://example.com/pay\"}]},\"carousel\":{\"enabled\":true,\"cards\":[{\"title\":\"상품명\",\"subtitle\":\"공동구매 특가\",\"imageUrl\":\"\",\"buttonText\":\"상세 보기\",\"buttonUrl\":\"https://example.com\"},{\"title\":\"옵션 A\",\"subtitle\":\"블랙 / FREE\",\"imageUrl\":\"\",\"buttonText\":\"선택\",\"buttonUrl\":\"https://example.com/a\"},{\"title\":\"옵션 B\",\"subtitle\":\"화이트 / FREE\",\"imageUrl\":\"\",\"buttonText\":\"선택\",\"buttonUrl\":\"https://example.com/b\"}]},\"followUp\":{\"enabled\":true,\"delay\":1,\"unit\":\"일\",\"message\":\"안녕하세요! 혹시 결제가 완료되셨나요? 궁금한 점이 있으시면 편하게 물어보세요!\"}}")
                .usageCount(680L)
                .rating(4.9)
                .build());

        log.info("기본 템플릿 6개 생성 완료");
    }
}
