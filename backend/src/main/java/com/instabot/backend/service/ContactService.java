package com.instabot.backend.service;

import com.instabot.backend.dto.ContactDto;
import com.instabot.backend.entity.Contact;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.ContactRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ContactService {

    private final ContactRepository contactRepository;

    public Page<ContactDto.Response> getContacts(Long userId, Pageable pageable) {
        return contactRepository.findByUserId(userId, pageable).map(this::toResponse);
    }

    public ContactDto.Response getContact(Long id) {
        return toResponse(contactRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("연락처를 찾을 수 없습니다.")));
    }

    @Transactional
    public ContactDto.Response updateContact(Long id, ContactDto.UpdateRequest request) {
        Contact contact = contactRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("연락처를 찾을 수 없습니다."));

        if (request.getTags() != null) contact.setTags(request.getTags());
        if (request.getMemo() != null) contact.setMemo(request.getMemo());
        if (request.getCustomFields() != null) contact.setCustomFields(request.getCustomFields());

        return toResponse(contactRepository.save(contact));
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
