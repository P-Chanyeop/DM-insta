package com.instabot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.instabot.backend.dto.ContactDto;
import com.instabot.backend.entity.Contact;
import com.instabot.backend.entity.InstagramAccount;
import com.instabot.backend.entity.User;
import com.instabot.backend.exception.BadRequestException;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.ContactRepository;
import com.instabot.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContactService {

    private final ContactRepository contactRepository;
    private final UserRepository userRepository;
    private final QuotaService quotaService;
    private final InstagramApiService instagramApiService;

    @Transactional(readOnly = true)
    public Page<ContactDto.Response> getContacts(Long userId, Pageable pageable) {
        return contactRepository.findByUserId(userId, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
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
        // email/phone 은 빈 문자열 입력 시 NULL 로 저장해 UI "—" 처리와 일관성 유지.
        if (request.getEmail() != null) {
            contact.setEmail(request.getEmail().isBlank() ? null : request.getEmail().trim());
        }
        if (request.getPhone() != null) {
            contact.setPhone(request.getPhone().isBlank() ? null : request.getPhone().trim());
        }

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

    /**
     * Meta Graph API로 Contact의 프로필(name, username, profile_pic)을 재조회하여 DB 갱신.
     * 기존에 숫자 IGSID가 username으로 저장된 "알 수 없음" 상태 Contact를 복구할 때 사용.
     */
    @Transactional
    public ContactDto.Response refreshProfile(Long userId, Long contactId) {
        Contact contact = contactRepository.findById(contactId)
                .orElseThrow(() -> new ResourceNotFoundException("연락처를 찾을 수 없습니다."));
        if (!contact.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("연락처를 찾을 수 없습니다.");
        }
        InstagramAccount igAccount = instagramApiService.getConnectedAccount(userId);
        if (igAccount == null) {
            throw new BadRequestException("연결된 Instagram 계정이 없습니다.");
        }
        String token = instagramApiService.getDecryptedToken(igAccount);
        JsonNode profile = instagramApiService.fetchUserProfile(contact.getIgUserId(), token);
        if (profile == null) {
            throw new BadRequestException(
                "프로필 조회 권한이 없거나 실패했습니다. (App Review 검수 미통과 가능성)");
        }
        String newUsername = profile.path("username").asText(null);
        String newName = profile.path("name").asText(null);
        String newPic = profile.path("profile_pic").asText(null);
        boolean changed = false;
        if (newUsername != null && !newUsername.isBlank()) {
            contact.setUsername(newUsername); changed = true;
        }
        if (newName != null && !newName.isBlank()) {
            contact.setName(newName); changed = true;
        }
        if (newPic != null && !newPic.isBlank()) {
            contact.setProfilePictureUrl(newPic); changed = true;
        }
        if (!changed) {
            throw new BadRequestException("Meta가 빈 프로필을 반환했습니다. 권한/개인정보 설정 확인 필요.");
        }
        log.info("Contact 프로필 갱신: id={}, username={}, name={}",
                contact.getId(), newUsername, newName);
        return toResponse(contactRepository.save(contact));
    }

    /**
     * CSV 내보내기 — 사용자의 전체 연락처를 RFC 4180 CSV 문자열로 반환.
     * 쉼표/따옴표/줄바꿈 포함 시 이스케이프.
     */
    @Transactional(readOnly = true)
    public String exportContactsCsv(Long userId) {
        List<Contact> contacts = contactRepository.findAllByUserId(userId);
        StringBuilder sb = new StringBuilder();
        sb.append("id,username,name,tags,memo,messageCount,active,subscribedAt,lastActiveAt\n");
        for (Contact c : contacts) {
            sb.append(c.getId()).append(',');
            sb.append(csvEscape(c.getUsername())).append(',');
            sb.append(csvEscape(c.getName())).append(',');
            sb.append(csvEscape(c.getTags() == null ? "" : String.join("|", c.getTags()))).append(',');
            sb.append(csvEscape(c.getMemo())).append(',');
            sb.append(c.getMessageCount()).append(',');
            sb.append(c.isActive()).append(',');
            sb.append(c.getSubscribedAt() == null ? "" : c.getSubscribedAt()).append(',');
            sb.append(c.getLastActiveAt() == null ? "" : c.getLastActiveAt()).append('\n');
        }
        return sb.toString();
    }

    private String csvEscape(String s) {
        if (s == null) return "";
        boolean needQuote = s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r");
        String escaped = s.replace("\"", "\"\"");
        return needQuote ? "\"" + escaped + "\"" : escaped;
    }

    private ContactDto.Response toResponse(Contact c) {
        // B2 추가 fix: tags는 @ElementCollection Lazy (Set<String>).
        // 트랜잭션 안에서 HashSet으로 즉시 복사하지 않으면
        // 응답 직렬화 시점(Jackson)에는 트랜잭션이 종료돼 LazyInitializationException 발생.
        java.util.Set<String> tagsCopy = c.getTags() == null
                ? null
                : new java.util.HashSet<>(c.getTags());
        return ContactDto.Response.builder()
                .id(c.getId())
                .igUserId(c.getIgUserId())
                .username(c.getUsername())
                .name(c.getName())
                .profilePictureUrl(c.getProfilePictureUrl())
                .messageCount(c.getMessageCount())
                .active(c.isActive())
                .tags(tagsCopy)
                .memo(c.getMemo())
                .email(c.getEmail())
                .phone(c.getPhone())
                .followerCount(c.getFollowerCount())
                .subscribedAt(c.getSubscribedAt())
                .lastActiveAt(c.getLastActiveAt())
                .firstMessageAt(c.getFirstMessageAt())
                .build();
    }
}
