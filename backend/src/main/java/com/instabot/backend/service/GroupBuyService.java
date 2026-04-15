package com.instabot.backend.service;

import com.instabot.backend.dto.GroupBuyDto;
import com.instabot.backend.entity.*;
import com.instabot.backend.exception.BadRequestException;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * 공동구매 서비스
 * - CRUD + 상태 관리
 * - 참여자 관리 (신청/상태변경/운송장)
 * - 재고 카운터 (자동 매진 처리)
 */
@Service
@RequiredArgsConstructor
public class GroupBuyService {

    private final GroupBuyRepository groupBuyRepository;
    private final GroupBuyParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final FlowRepository flowRepository;
    private final ContactRepository contactRepository;

    // ═══════════════════════════════════════════════════════════
    // 공동구매 CRUD
    // ═══════════════════════════════════════════════════════════

    public List<GroupBuyDto.Response> getGroupBuys(Long userId) {
        return groupBuyRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    public GroupBuyDto.Response getGroupBuy(Long userId, Long id) {
        GroupBuy gb = findByIdAndUser(id, userId);
        return toResponse(gb);
    }

    @Transactional
    public GroupBuyDto.Response createGroupBuy(Long userId, GroupBuyDto.CreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        GroupBuy gb = GroupBuy.builder()
                .user(user)
                .title(request.getTitle())
                .description(request.getDescription())
                .maxQuantity(request.getMaxQuantity())
                .price(request.getPrice())
                .paymentLink(request.getPaymentLink())
                .imageUrl(request.getImageUrl())
                .options(request.getOptions())
                .build();

        if (request.getFlowId() != null) {
            Flow flow = flowRepository.findById(request.getFlowId())
                    .orElseThrow(() -> new ResourceNotFoundException("플로우를 찾을 수 없습니다."));
            gb.setFlow(flow);
        }

        return toResponse(groupBuyRepository.save(gb));
    }

    @Transactional
    public GroupBuyDto.Response updateGroupBuy(Long userId, Long id, GroupBuyDto.UpdateRequest request) {
        GroupBuy gb = findByIdAndUser(id, userId);

        if (request.getTitle() != null) gb.setTitle(request.getTitle());
        if (request.getDescription() != null) gb.setDescription(request.getDescription());
        if (request.getMaxQuantity() >= 0) gb.setMaxQuantity(request.getMaxQuantity());
        if (request.getPrice() != null) gb.setPrice(request.getPrice());
        if (request.getPaymentLink() != null) gb.setPaymentLink(request.getPaymentLink());
        if (request.getImageUrl() != null) gb.setImageUrl(request.getImageUrl());
        if (request.getOptions() != null) gb.setOptions(request.getOptions());

        if (request.getFlowId() != null) {
            Flow flow = flowRepository.findById(request.getFlowId())
                    .orElseThrow(() -> new ResourceNotFoundException("플로우를 찾을 수 없습니다."));
            gb.setFlow(flow);
        }

        return toResponse(groupBuyRepository.save(gb));
    }

    @Transactional
    public GroupBuyDto.Response updateStatus(Long userId, Long id, String statusStr) {
        GroupBuy gb = findByIdAndUser(id, userId);
        GroupBuy.GroupBuyStatus newStatus = GroupBuy.GroupBuyStatus.valueOf(statusStr);

        // 상태 전이 검증
        validateStatusTransition(gb.getStatus(), newStatus);

        gb.setStatus(newStatus);
        if (newStatus == GroupBuy.GroupBuyStatus.OPEN) {
            gb.setOpenedAt(LocalDateTime.now());
        } else if (newStatus == GroupBuy.GroupBuyStatus.CLOSED || newStatus == GroupBuy.GroupBuyStatus.COMPLETED) {
            gb.setClosedAt(LocalDateTime.now());
        }

        return toResponse(groupBuyRepository.save(gb));
    }

    @Transactional
    public void deleteGroupBuy(Long userId, Long id) {
        GroupBuy gb = findByIdAndUser(id, userId);
        groupBuyRepository.delete(gb);
    }

    // ═══════════════════════════════════════════════════════════
    // 참여자 관리
    // ═══════════════════════════════════════════════════════════

    public List<GroupBuyDto.ParticipantResponse> getParticipants(Long userId, Long groupBuyId) {
        findByIdAndUser(groupBuyId, userId); // 권한 확인
        return participantRepository.findByGroupBuyIdOrderByAppliedAtDesc(groupBuyId).stream()
                .map(this::toParticipantResponse)
                .toList();
    }

    /**
     * 참여자 추가 (플로우 실행 시 호출)
     * - 재고 확인 후 참여 등록
     * - 매진 시 자동 마감
     */
    @Transactional
    public GroupBuyParticipant addParticipant(Long groupBuyId, Long contactId, String selectedOption, int quantity) {
        GroupBuy gb = groupBuyRepository.findById(groupBuyId)
                .orElseThrow(() -> new ResourceNotFoundException("공동구매를 찾을 수 없습니다."));

        if (gb.getStatus() != GroupBuy.GroupBuyStatus.OPEN) {
            throw new BadRequestException("현재 신청을 받지 않는 공동구매입니다.");
        }

        // 중복 참여 확인
        if (participantRepository.findByGroupBuyIdAndContactId(groupBuyId, contactId).isPresent()) {
            throw new BadRequestException("이미 참여한 공동구매입니다.");
        }

        // 재고 확인
        if (!gb.hasStock()) {
            throw new BadRequestException("매진된 상품입니다.");
        }

        Contact contact = contactRepository.findById(contactId)
                .orElseThrow(() -> new ResourceNotFoundException("연락처를 찾을 수 없습니다."));

        GroupBuyParticipant participant = GroupBuyParticipant.builder()
                .groupBuy(gb)
                .contact(contact)
                .selectedOption(selectedOption)
                .quantity(quantity)
                .build();

        participant = participantRepository.save(participant);

        // 재고 차감
        gb.setCurrentCount(gb.getCurrentCount() + quantity);
        if (gb.getMaxQuantity() > 0 && gb.getCurrentCount() >= gb.getMaxQuantity()) {
            gb.setStatus(GroupBuy.GroupBuyStatus.SOLD_OUT);
        }
        groupBuyRepository.save(gb);

        return participant;
    }

    @Transactional
    public GroupBuyDto.ParticipantResponse updateParticipant(Long userId, Long groupBuyId, Long participantId,
                                                              GroupBuyDto.UpdateParticipantRequest request) {
        findByIdAndUser(groupBuyId, userId); // 권한 확인

        GroupBuyParticipant participant = participantRepository.findById(participantId)
                .orElseThrow(() -> new ResourceNotFoundException("참여자를 찾을 수 없습니다."));

        if (request.getStatus() != null) {
            GroupBuyParticipant.ParticipantStatus newStatus =
                    GroupBuyParticipant.ParticipantStatus.valueOf(request.getStatus());
            participant.setStatus(newStatus);

            // 타임스탬프 자동 설정
            switch (newStatus) {
                case PAID -> participant.setPaidAt(LocalDateTime.now());
                case SHIPPING -> participant.setShippedAt(LocalDateTime.now());
                case DELIVERED -> participant.setDeliveredAt(LocalDateTime.now());
                default -> {}
            }
        }
        if (request.getTrackingNumber() != null) {
            participant.setTrackingNumber(request.getTrackingNumber());
        }
        if (request.getMemo() != null) {
            participant.setMemo(request.getMemo());
        }

        return toParticipantResponse(participantRepository.save(participant));
    }

    public GroupBuyDto.Stats getStats(Long userId, Long groupBuyId) {
        findByIdAndUser(groupBuyId, userId);
        List<Object[]> rawCounts = participantRepository.countByGroupBuyIdGroupByStatus(groupBuyId);

        Map<GroupBuyParticipant.ParticipantStatus, Long> counts = new EnumMap<>(GroupBuyParticipant.ParticipantStatus.class);
        for (Object[] row : rawCounts) {
            counts.put((GroupBuyParticipant.ParticipantStatus) row[0], (Long) row[1]);
        }

        long total = counts.values().stream().mapToLong(Long::longValue).sum();

        return GroupBuyDto.Stats.builder()
                .total(total)
                .applied(counts.getOrDefault(GroupBuyParticipant.ParticipantStatus.APPLIED, 0L)
                        + counts.getOrDefault(GroupBuyParticipant.ParticipantStatus.OPTION_SELECTED, 0L)
                        + counts.getOrDefault(GroupBuyParticipant.ParticipantStatus.PAYMENT_SENT, 0L))
                .paid(counts.getOrDefault(GroupBuyParticipant.ParticipantStatus.PAID, 0L))
                .shipping(counts.getOrDefault(GroupBuyParticipant.ParticipantStatus.SHIPPING, 0L))
                .delivered(counts.getOrDefault(GroupBuyParticipant.ParticipantStatus.DELIVERED, 0L)
                        + counts.getOrDefault(GroupBuyParticipant.ParticipantStatus.REVIEWED, 0L))
                .cancelled(counts.getOrDefault(GroupBuyParticipant.ParticipantStatus.CANCELLED, 0L))
                .build();
    }

    // ═══════════════════════════════════════════════════════════
    // 내부 유틸
    // ═══════════════════════════════════════════════════════════

    private GroupBuy findByIdAndUser(Long id, Long userId) {
        GroupBuy gb = groupBuyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("공동구매를 찾을 수 없습니다."));
        if (!gb.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("공동구매를 찾을 수 없습니다.");
        }
        return gb;
    }

    private void validateStatusTransition(GroupBuy.GroupBuyStatus current, GroupBuy.GroupBuyStatus next) {
        boolean valid = switch (current) {
            case DRAFT -> next == GroupBuy.GroupBuyStatus.OPEN;
            case OPEN -> next == GroupBuy.GroupBuyStatus.CLOSED || next == GroupBuy.GroupBuyStatus.SOLD_OUT;
            case SOLD_OUT -> next == GroupBuy.GroupBuyStatus.OPEN || next == GroupBuy.GroupBuyStatus.CLOSED
                    || next == GroupBuy.GroupBuyStatus.COMPLETED;
            case CLOSED -> next == GroupBuy.GroupBuyStatus.OPEN || next == GroupBuy.GroupBuyStatus.COMPLETED;
            case COMPLETED -> false;
        };
        if (!valid) {
            throw new BadRequestException(
                    String.format("'%s' 상태에서 '%s'로 변경할 수 없습니다.", current, next));
        }
    }

    private GroupBuyDto.Response toResponse(GroupBuy gb) {
        long participantCount = participantRepository.countByGroupBuyId(gb.getId());
        return GroupBuyDto.Response.builder()
                .id(gb.getId())
                .title(gb.getTitle())
                .description(gb.getDescription())
                .maxQuantity(gb.getMaxQuantity())
                .currentCount(gb.getCurrentCount())
                .remainingStock(gb.getRemainingStock())
                .price(gb.getPrice())
                .paymentLink(gb.getPaymentLink())
                .imageUrl(gb.getImageUrl())
                .options(gb.getOptions())
                .status(gb.getStatus().name())
                .flowId(gb.getFlow() != null ? gb.getFlow().getId() : null)
                .flowName(gb.getFlow() != null ? gb.getFlow().getName() : null)
                .participantCount((int) participantCount)
                .openedAt(gb.getOpenedAt())
                .closedAt(gb.getClosedAt())
                .createdAt(gb.getCreatedAt())
                .build();
    }

    private GroupBuyDto.ParticipantResponse toParticipantResponse(GroupBuyParticipant p) {
        return GroupBuyDto.ParticipantResponse.builder()
                .id(p.getId())
                .contactId(p.getContact().getId())
                .contactName(p.getContact().getName())
                .contactUsername(p.getContact().getUsername())
                .selectedOption(p.getSelectedOption())
                .quantity(p.getQuantity())
                .amount(p.getAmount())
                .trackingNumber(p.getTrackingNumber())
                .memo(p.getMemo())
                .status(p.getStatus().name())
                .appliedAt(p.getAppliedAt())
                .paidAt(p.getPaidAt())
                .shippedAt(p.getShippedAt())
                .deliveredAt(p.getDeliveredAt())
                .build();
    }
}
