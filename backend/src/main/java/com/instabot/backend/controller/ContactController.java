package com.instabot.backend.controller;

import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.dto.ContactDto;
import com.instabot.backend.service.ContactService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
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

    /**
     * CSV 내보내기 — UTF-8 BOM 포함 (Excel 한글 호환)
     * 중요: @GetMapping("/export")를 @GetMapping("/{id}") 보다 먼저 선언해야
     *       "/contacts/export"가 Long id로 파싱되지 않는다.
     */
    @GetMapping(value = "/export", produces = "text/csv; charset=UTF-8")
    public ResponseEntity<String> exportContacts() {
        String csv = contactService.exportContactsCsv(SecurityUtils.currentUserId());
        String fileName = "contacts-" + java.time.LocalDate.now() + ".csv";
        return ResponseEntity.ok()
                .header("Content-Type", "text/csv; charset=UTF-8")
                .header("Content-Disposition", "attachment; filename=\"" + fileName + "\"")
                .body("\uFEFF" + csv); // UTF-8 BOM
    }

    @GetMapping("/{id}")
    public ResponseEntity<ContactDto.Response> getContact(@PathVariable Long id) {
        return ResponseEntity.ok(contactService.getContact(SecurityUtils.currentUserId(), id));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ContactDto.Response> updateContact(@PathVariable Long id, @Valid @RequestBody ContactDto.UpdateRequest request) {
        return ResponseEntity.ok(contactService.updateContact(SecurityUtils.currentUserId(), id, request));
    }

    /**
     * Meta Graph API로 Contact 프로필 재조회 (숫자 IGSID → 실제 username/name 복구).
     */
    @PostMapping("/{id}/refresh-profile")
    public ResponseEntity<ContactDto.Response> refreshProfile(@PathVariable Long id) {
        return ResponseEntity.ok(contactService.refreshProfile(SecurityUtils.currentUserId(), id));
    }

    @PostMapping("/bulk-delete")
    public ResponseEntity<Void> deleteContacts(@RequestBody java.util.List<Long> ids) {
        contactService.deleteContacts(SecurityUtils.currentUserId(), ids);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/import")
    public ResponseEntity<ContactDto.ImportResult> importContacts(@RequestBody java.util.List<ContactDto.ImportRequest> requests) {
        return ResponseEntity.ok(contactService.importContacts(SecurityUtils.currentUserId(), requests));
    }
}
