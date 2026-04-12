package com.instabot.backend.service;

import com.instabot.backend.dto.SequenceDto;
import com.instabot.backend.entity.Sequence;
import com.instabot.backend.entity.SequenceStep;
import com.instabot.backend.entity.User;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.SequenceRepository;
import com.instabot.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SequenceService {

    private final SequenceRepository sequenceRepository;
    private final UserRepository userRepository;

    public List<SequenceDto.Response> getSequences(Long userId) {
        return sequenceRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public SequenceDto.Response createSequence(Long userId, SequenceDto.CreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        Sequence seq = Sequence.builder()
                .user(user)
                .name(request.getName())
                .description(request.getDescription())
                .build();

        if (request.getSteps() != null) {
            for (SequenceDto.StepRequest sr : request.getSteps()) {
                SequenceStep step = SequenceStep.builder()
                        .sequence(seq)
                        .stepOrder(sr.getStepOrder())
                        .name(sr.getName())
                        .messageContent(sr.getMessageContent())
                        .delayMinutes(sr.getDelayMinutes())
                        .type(sr.getType() != null ? SequenceStep.StepType.valueOf(sr.getType()) : SequenceStep.StepType.MESSAGE)
                        .build();
                seq.getSteps().add(step);
            }
        }

        return toResponse(sequenceRepository.save(seq));
    }

    @Transactional
    public SequenceDto.Response toggleSequence(Long id) {
        Sequence seq = sequenceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("시퀀스를 찾을 수 없습니다."));
        seq.setActive(!seq.isActive());
        return toResponse(sequenceRepository.save(seq));
    }

    @Transactional
    public void deleteSequence(Long id) {
        sequenceRepository.deleteById(id);
    }

    private SequenceDto.Response toResponse(Sequence seq) {
        return SequenceDto.Response.builder()
                .id(seq.getId())
                .name(seq.getName())
                .description(seq.getDescription())
                .active(seq.isActive())
                .activeSubscribers(seq.getActiveSubscribers())
                .completionRate(seq.getCompletionRate())
                .steps(seq.getSteps().stream().map(s -> SequenceDto.StepResponse.builder()
                        .id(s.getId())
                        .stepOrder(s.getStepOrder())
                        .name(s.getName())
                        .messageContent(s.getMessageContent())
                        .delayMinutes(s.getDelayMinutes())
                        .type(s.getType().name())
                        .openRate(s.getOpenRate())
                        .clickRate(s.getClickRate())
                        .build()).toList())
                .createdAt(seq.getCreatedAt())
                .build();
    }
}
