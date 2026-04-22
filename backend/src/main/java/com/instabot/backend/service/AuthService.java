package com.instabot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.instabot.backend.config.EncryptionUtil;
import com.instabot.backend.dto.AuthDto;
import com.instabot.backend.entity.TeamMember;
import com.instabot.backend.entity.User;
import com.instabot.backend.exception.BadRequestException;
import com.instabot.backend.exception.DuplicateEmailException;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.TeamMemberRepository;
import com.instabot.backend.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.web.client.RestTemplate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.concurrent.ThreadLocalRandom;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final EncryptionUtil encryptionUtil;
    private final InstagramApiService instagramApiService;

    private static final RestTemplate REST_TEMPLATE = new RestTemplate();
    /** Pending signup 토큰 TTL — 15분. 이메일 입력 스텝을 그 안에 마치지 않으면 재OAuth 필요. */
    private static final long PENDING_SIGNUP_TTL_MS = 15 * 60 * 1000L;
    public static final String SIGNUP_PENDING_SCOPE = "SIGNUP_PENDING";

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    private static final int CODE_EXPIRY_MINUTES = 10;

    // ─── 회원가입 ───

    @Transactional
    public AuthDto.AuthResponse signup(AuthDto.SignupRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateEmailException("이미 등록된 이메일입니다.");
        }

        String verificationCode = generateCode();

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .emailVerified(false)
                .verificationCode(verificationCode)
                .verificationCodeExpiresAt(LocalDateTime.now().plusMinutes(CODE_EXPIRY_MINUTES))
                .build();

        userRepository.save(user);

        // 팀 멤버십 자동 생성 (OWNER)
        TeamMember ownerMember = TeamMember.builder()
                .teamOwnerId(user.getId())
                .userId(user.getId())
                .role(TeamMember.Role.OWNER)
                .joinedAt(LocalDateTime.now())
                .build();
        teamMemberRepository.save(ownerMember);

        // 인증 메일 발송 (비동기)
        log.info("[DEV] 인증 코드: email={}, code={}", user.getEmail(), verificationCode);
        emailService.sendVerificationEmail(user.getEmail(), verificationCode);

        String token = generateToken(user);
        return AuthDto.AuthResponse.builder()
                .token(token)
                .email(user.getEmail())
                .name(user.getName())
                .plan(user.getPlan().name())
                .emailVerified(false)
                .onboardingCompleted(user.isOnboardingCompleted())
                .build();
    }

    // ─── 이메일 인증 ───

    @Transactional
    public AuthDto.AuthResponse verifyEmail(AuthDto.VerifyEmailRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        if (user.isEmailVerified()) {
            throw new BadRequestException("이미 인증된 이메일입니다.");
        }

        if (user.getVerificationCode() == null
                || !user.getVerificationCode().equals(request.getCode())) {
            throw new BadRequestException("인증 코드가 올바르지 않습니다.");
        }

        if (user.getVerificationCodeExpiresAt() != null
                && user.getVerificationCodeExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("인증 코드가 만료되었습니다. 재발송해주세요.");
        }

        user.setEmailVerified(true);
        user.setVerificationCode(null);
        user.setVerificationCodeExpiresAt(null);
        userRepository.save(user);

        String token = generateToken(user);
        return AuthDto.AuthResponse.builder()
                .token(token)
                .email(user.getEmail())
                .name(user.getName())
                .plan(user.getPlan().name())
                .emailVerified(true)
                .onboardingCompleted(user.isOnboardingCompleted())
                .build();
    }

    @Transactional
    public AuthDto.MessageResponse resendVerification(AuthDto.ResendVerificationRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        if (user.isEmailVerified()) {
            throw new BadRequestException("이미 인증된 이메일입니다.");
        }

        String code = generateCode();
        user.setVerificationCode(code);
        user.setVerificationCodeExpiresAt(LocalDateTime.now().plusMinutes(CODE_EXPIRY_MINUTES));
        userRepository.save(user);

        emailService.sendVerificationEmail(user.getEmail(), code);

        return AuthDto.MessageResponse.builder()
                .message("인증 코드가 재발송되었습니다.")
                .build();
    }

    // ─── 로그인 ───

    public AuthDto.AuthResponse login(AuthDto.LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("이메일 또는 비밀번호가 올바르지 않습니다."));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadRequestException("이메일 또는 비밀번호가 올바르지 않습니다.");
        }

        String token = generateToken(user);
        return AuthDto.AuthResponse.builder()
                .token(token)
                .email(user.getEmail())
                .name(user.getName())
                .plan(user.getPlan().name())
                .emailVerified(user.isEmailVerified())
                .onboardingCompleted(user.isOnboardingCompleted())
                .build();
    }

    // ─── 비밀번호 찾기 ───

    @Transactional
    public AuthDto.MessageResponse forgotPassword(AuthDto.ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);

        // 보안: 이메일 존재 여부를 노출하지 않음
        if (user == null) {
            return AuthDto.MessageResponse.builder()
                    .message("해당 이메일로 비밀번호 재설정 코드를 발송했습니다.")
                    .build();
        }

        String code = generateCode();
        user.setResetCode(code);
        user.setResetCodeExpiresAt(LocalDateTime.now().plusMinutes(CODE_EXPIRY_MINUTES));
        userRepository.save(user);

        emailService.sendPasswordResetEmail(user.getEmail(), code);

        return AuthDto.MessageResponse.builder()
                .message("해당 이메일로 비밀번호 재설정 코드를 발송했습니다.")
                .build();
    }

    @Transactional
    public AuthDto.MessageResponse resetPassword(AuthDto.ResetPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("유효하지 않은 요청입니다."));

        if (user.getResetCode() == null || !user.getResetCode().equals(request.getCode())) {
            throw new BadRequestException("재설정 코드가 올바르지 않습니다.");
        }

        if (user.getResetCodeExpiresAt() != null
                && user.getResetCodeExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("재설정 코드가 만료되었습니다. 다시 요청해주세요.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setResetCode(null);
        user.setResetCodeExpiresAt(null);
        userRepository.save(user);

        return AuthDto.MessageResponse.builder()
                .message("비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.")
                .build();
    }

    // ─── 내부 유틸 ───

    private String generateCode() {
        return String.format("%06d", ThreadLocalRandom.current().nextInt(1_000_000));
    }

    public String generateToken(User user) {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder()
                .subject(user.getEmail())
                .claim("userId", user.getId())
                .claim("name", user.getName())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(key)
                .compact();
    }

    // ─── Instagram 가입 플로우 ───

    /**
     * Instagram OAuth 후 "이메일 입력이 필요한 신규 가입자"에게 발급하는 단기 토큰.
     * scope=SIGNUP_PENDING 이므로 일반 API 인증으로는 사용 불가(JwtAuthenticationFilter 에서 거절).
     * igsid 와 암호화된 long-lived 액세스 토큰을 claim 에 싣고, 이메일 입력 후 complete-ig-signup 에서 꺼내 쓴다.
     */
    public String generatePendingSignupToken(String igsid, String encryptedIgToken, String igUsername, String igName) {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder()
                .subject(igsid)
                .claim("scope", SIGNUP_PENDING_SCOPE)
                .claim("igsid", igsid)
                .claim("igToken", encryptedIgToken)
                .claim("igUsername", igUsername != null ? igUsername : "")
                .claim("igName", igName != null ? igName : "")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + PENDING_SIGNUP_TTL_MS))
                .signWith(key)
                .compact();
    }

    private Claims parsePendingSignupToken(String token) {
        try {
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            if (!SIGNUP_PENDING_SCOPE.equals(claims.get("scope", String.class))) {
                throw new BadRequestException("유효하지 않은 가입 토큰입니다.");
            }
            return claims;
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("가입 토큰이 만료되었거나 유효하지 않습니다. Instagram 로그인부터 다시 시도해주세요.");
        }
    }

    /**
     * 이메일 입력 스텝 제출 → 실제 User 생성 + IG 계정 연결 + 정식 JWT 발급.
     *
     * 가정:
     *  - placeholder 이메일(@sendit.local) 유저는 이미 정리됨.
     *  - 이메일이 기존 실계정과 겹치면 중복 에러. (기존 계정에 IG 연결은 별도 플로우로 유도)
     *  - igsid 가 다른 User 에 이미 연결돼 있으면 차단.
     */
    @Transactional
    public AuthDto.AuthResponse completeInstagramSignup(AuthDto.CompleteIgSignupRequest request) {
        Claims claims = parsePendingSignupToken(request.getPendingToken());
        String igsid = claims.get("igsid", String.class);
        String encryptedIgToken = claims.get("igToken", String.class);
        String igUsername = claims.get("igUsername", String.class);

        if (igsid == null || encryptedIgToken == null) {
            throw new BadRequestException("가입 토큰에 필요한 정보가 없습니다.");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateEmailException(
                    "이미 가입된 이메일입니다. 이메일로 로그인한 뒤 설정에서 Instagram을 연결해주세요.");
        }

        // 동일 IGSID 가 이미 다른 User 에 연결된 경우 차단 (멀티 가입 방지)
        userRepository.findByFacebookUserId(igsid).ifPresent(u -> {
            throw new BadRequestException(
                    "이 Instagram 계정은 이미 다른 계정에 연결되어 있습니다. 기존 계정으로 로그인해주세요.");
        });

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .authProvider(User.AuthProvider.INSTAGRAM)
                .facebookUserId(igsid)
                .facebookAccessToken(encryptedIgToken)
                .facebookTokenExpiresAt(LocalDateTime.now().plusDays(60))
                // IG OAuth 를 거쳤으므로 실소유자 확인됨 → 이메일 인증은 별도 진행(코드 메일 발송).
                .emailVerified(false)
                .plan(User.PlanType.FREE)
                .build();
        String verificationCode = generateCode();
        user.setVerificationCode(verificationCode);
        user.setVerificationCodeExpiresAt(LocalDateTime.now().plusMinutes(CODE_EXPIRY_MINUTES));
        user = userRepository.save(user);

        teamMemberRepository.save(TeamMember.builder()
                .teamOwnerId(user.getId())
                .userId(user.getId())
                .role(TeamMember.Role.OWNER)
                .joinedAt(LocalDateTime.now())
                .build());

        // Instagram 계정 실제 연결 시도 (실패해도 유저는 생성됨 — 설정에서 재시도 가능)
        try {
            String longLivedToken = encryptionUtil.decrypt(encryptedIgToken);
            JsonNode igProfile = fetchInstagramProfile(longLivedToken);
            instagramApiService.connectInstagramDirect(user, longLivedToken, igProfile);
            log.info("Signup + IG 연결 성공: userId={}, igUsername={}", user.getId(), igUsername);
        } catch (Exception e) {
            log.warn("Signup 후 IG 연결 실패(유저는 생성됨): userId={}, err={}", user.getId(), e.getMessage());
        }

        // 이메일 인증 메일 발송
        try {
            emailService.sendVerificationEmail(user.getEmail(), verificationCode);
        } catch (Exception e) {
            log.warn("인증 메일 발송 실패: {}", e.getMessage());
        }

        String jwt = generateToken(user);
        return AuthDto.AuthResponse.builder()
                .token(jwt)
                .email(user.getEmail())
                .name(user.getName())
                .plan(user.getPlan().name())
                .emailVerified(false)
                .onboardingCompleted(user.isOnboardingCompleted())
                .build();
    }

    private JsonNode fetchInstagramProfile(String accessToken) {
        String url = "https://graph.instagram.com/v21.0/me"
                + "?fields=user_id,username,name,profile_picture_url,followers_count,account_type"
                + "&access_token=" + accessToken;
        return REST_TEMPLATE.getForObject(url, JsonNode.class);
    }
}
