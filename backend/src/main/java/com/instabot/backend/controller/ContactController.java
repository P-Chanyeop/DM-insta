package com.instabot.backend.controller;

import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.dto.ContactDto;
import com.instabot.backend.service.ContactService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/contacts")
@RequiredArgsConstructor
public class ContactController {

    private final ContactService contactService;

    @GetMapping
    public ResponseEntity<Page<ContactDto.Response>> getContacts(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(contactService.getContacts(SecurityUtils.currentUserId(), pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ContactDto.Response> getContact(@PathVariable Long id) {
        return ResponseEntity.ok(contactService.getContact(id));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ContactDto.Response> updateContact(@PathVariable Long id, @Valid @RequestBody ContactDto.UpdateRequest request) {
        return ResponseEntity.ok(contactService.updateContact(id, request));
    }
}
