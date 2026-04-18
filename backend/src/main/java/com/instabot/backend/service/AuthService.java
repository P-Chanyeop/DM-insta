package com.instabot.backend.service;

import com.instabot.backend.dto.AuthDto;
import com.instabot.backend.entity.TeamMember;
import com.instabot.backend.entity.User;
import com.instabot.backend.exception.BadRequestException;
import com.instabot.backend.exception.DuplicateEmailException;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.TeamMemberRepository;
import com.instabot.backend.repository.UserRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
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
}
