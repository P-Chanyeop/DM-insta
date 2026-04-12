package com.instabot.backend.service;

import com.instabot.backend.dto.BroadcastDto;
import com.instabot.backend.entity.Broadcast;
import com.instabot.backend.entity.User;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.BroadcastRepository;
import com.instabot.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BroadcastService {

    private final BroadcastRepository broadcastRepository;
    private final UserRepository userRepository;

    public List<BroadcastDto.Response> getBroadcasts(Long userId) {
        return broadcastRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public BroadcastDto.Response createBroadcast(Long userId, BroadcastDto.CreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        Broadcast broadcast = Broadcast.builder()
                .user(user)
                .name(request.getName())
                .messageContent(request.getMessageContent())
                .segment(request.getSegment())
                .scheduledAt(request.getScheduledAt())
                .status(request.getScheduledAt() != null ? Broadcast.BroadcastStatus.SCHEDULED : Broadcast.BroadcastStatus.DRAFT)
                .build();

        return toResponse(broadcastRepository.save(broadcast));
    }

    @Transactional
    public void cancelBroadcast(Long id) {
        Broadcast broadcast = broadcastRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("브로드캐스트를 찾을 수 없습니다."));
        broadcast.setStatus(Broadcast.BroadcastStatus.CANCELLED);
        broadcastRepository.save(broadcast);
    }

    private BroadcastDto.Response toResponse(Broadcast b) {
        return BroadcastDto.Response.builder()
                .id(b.getId())
                .name(b.getName())
                .status(b.getStatus().name())
                .segment(b.getSegment())
                .sentCount(b.getSentCount())
                .openCount(b.getOpenCount())
                .clickCount(b.getClickCount())
                .openRate(b.getOpenRate())
                .clickRate(b.getClickRate())
                .scheduledAt(b.getScheduledAt())
                .sentAt(b.getSentAt())
                .createdAt(b.getCreatedAt())
                .build();
    }
}
