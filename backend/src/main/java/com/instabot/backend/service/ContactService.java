package com.instabot.backend.service;

import com.instabot.backend.dto.ContactDto;
import com.instabot.backend.entity.Contact;
import com.instabot.backend.entity.User;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.ContactRepository;
import com.instabot.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ContactService {

    private final ContactRepository contactRepository;
    private final UserRepository userRepository;
    private final QuotaService quotaService;

    public Page<ContactDto.Response> getContacts(Long userId, Pageable pageable) {
        return contactRepository.findByUserId(userId, pageable).map(this::toResponse);
    }

    public ContactDto.Response getContact(Long userId, Long id) {
        Contact contact = contactRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("연락처를 찾을 수 없습니다."));
        if (!contact.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("연락처를 찾을 수 없습니다.");
        }
        return toResponse(contact);
    }

    @Transactional
    public ContactDto.Response updateContact(Long userId, Long id, ContactDto.UpdateRequest request) {
        Contact contact = contactRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("연락처를 찾을 수 없습니다."));
        if (!contact.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("연락처를 찾을 수 없습니다.");
        }

        if (request.getTags() != null) contact.setTags(request.getTags());
        if (request.getMemo() != null) contact.setMemo(request.getMemo());
        if (request.getCustomFields() != null) contact.setCustomFields(request.getCustomFields());

        return toResponse(contactRepository.save(contact));
    }

    @Transactional
    public void deleteContacts(Long userId, List<Long> ids) {
        for (Long id : ids) {
            Contact contact = contactRepository.findById(id).orElse(null);
            if (contact != null && contact.getUser().getId().equals(userId)) {
                contactRepository.delete(contact);
            }
        }
    }

    @Transactional
    public ContactDto.ImportResult importContacts(Long userId, List<ContactDto.ImportRequest> requests) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        // 플랜별 연락처 할당량 검증
        quotaService.checkContactQuota(user, requests.size());

        int imported = 0;
        int skipped = 0;

        for (ContactDto.ImportRequest req : requests) {
            String username = req.getUsername();
            if (username == null || username.isBlank()) {
                skipped++;
                continue;
            }

            // 중복 체크: 같은 유저의 같은 username이면 스킵
            boolean exists = contactRepository.findByUserIdAndIgUserId(userId, username).isPresent();
            if (exists) {
                skipped++;
                continue;
            }

            Contact contact = Contact.builder()
                    .user(user)
                    .igUserId(username)
                    .username(username)
                    .name(req.getName())
                    .memo(req.getMemo())
                    .build();

            contactRepository.save(contact);
            imported++;
        }

        return ContactDto.ImportResult.builder()
                .imported(imported)
                .skipped(skipped)
                .total(requests.size())
                .build();
    }

    public long getCount(Long userId) {
        return contactRepository.countByUserId(userId);
    }

    private ContactDto.Response toResponse(Contact c) {
        return ContactDto.Response.builder()
                .id(c.getId())
                .igUserId(c.getIgUserId())
                .username(c.getUsername())
                .name(c.getName())
                .profilePictureUrl(c.getProfilePictureUrl())
                .messageCount(c.getMessageCount())
                .active(c.isActive())
                .tags(c.getTags())
                .memo(c.getMemo())
                .subscribedAt(c.getSubscribedAt())
                .lastActiveAt(c.getLastActiveAt())
                .build();
    }
}
