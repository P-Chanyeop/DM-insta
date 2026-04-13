package com.instabot.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@sendit.kr}")
    private String fromEmail;

    @Value("${app.base-url:http://localhost:5173}")
    private String baseUrl;

    /**
     * 이메일 인증 코드 발송
     */
    @Async
    public void sendVerificationEmail(String to, String code) {
        String subject = "[센드잇] 이메일 인증 코드";
        String logoUrl = baseUrl + "/images/logo-icon.png";
        String body = buildVerificationTemplate(code, logoUrl);
        sendHtmlEmail(to, subject, body);
    }

    /**
     * 비밀번호 재설정 코드 발송
     */
    @Async
    public void sendPasswordResetEmail(String to, String code) {
        String subject = "[센드잇] 비밀번호 재설정 코드";
        String logoUrl = baseUrl + "/images/logo-icon.png";
        String body = buildResetTemplate(code, logoUrl);
        sendHtmlEmail(to, subject, body);
    }

    private String buildVerificationTemplate(String code, String logoUrl) {
        return """
            <!DOCTYPE html>
            <html lang="ko">
            <head><meta charset="UTF-8"></head>
            <body style="margin:0; padding:0; background:#F5F5F5; font-family:'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#F5F5F5; padding:40px 20px;">
                <tr><td align="center">
                  <table width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF; border-radius:12px; border:1px solid #E8E8E8; overflow:hidden;">
                    <!-- 헤더 -->
                    <tr><td style="padding:40px 32px 0; text-align:center;">
                      <img src="%s" alt="센드잇" width="48" height="48" style="display:inline-block; margin-bottom:16px;" />
                      <p style="color:#111; font-size:15px; font-weight:700; margin:0 0 4px; letter-spacing:-0.5px;">센드잇</p>
                      <p style="color:#999; font-size:12px; margin:0;">이메일 인증</p>
                    </td></tr>

                    <!-- 본문 -->
                    <tr><td style="padding:32px 32px 36px;">
                      <div style="border-top:1px solid #F0F0F0; margin:0 0 28px;"></div>
                      <p style="color:#333; font-size:14px; line-height:1.8; margin:0 0 4px; text-align:center; font-weight:500;">
                        안녕하세요, 센드잇에 가입해 주셔서 감사합니다.
                      </p>
                      <p style="color:#888; font-size:13px; line-height:1.6; margin:0 0 28px; text-align:center;">
                        아래 인증 코드를 입력해 주세요.
                      </p>

                      <!-- 인증코드 -->
                      <table width="100%%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:28px;">
                        <div style="display:inline-block; background:#F8F8FA; border:1px solid #E5E5EA; border-radius:10px; padding:20px 36px;">
                          <span style="font-size:32px; font-weight:700; letter-spacing:10px; color:#111; font-family:'SF Mono','Courier New',monospace;">%s</span>
                        </div>
                      </td></tr></table>

                      <!-- 만료 안내 -->
                      <table width="100%%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:28px;">
                        <span style="display:inline-block; background:#F8F8FA; color:#888; font-size:12px; padding:6px 14px; border-radius:6px;">
                          10분 내로 입력해 주세요
                        </span>
                      </td></tr></table>

                      <div style="border-top:1px solid #F0F0F0; margin:0 0 20px;"></div>
                      <p style="color:#BBB; font-size:11px; line-height:1.7; margin:0; text-align:center;">
                        본인이 요청하지 않았다면 이 메일을 무시해 주세요.<br>
                        인증 코드를 타인에게 알려주지 마세요.
                      </p>
                    </td></tr>

                    <!-- 푸터 -->
                    <tr><td style="background:#FAFAFA; border-top:1px solid #F0F0F0; padding:16px 32px; text-align:center;">
                      <p style="color:#CCC; font-size:10px; margin:0;">&copy; 2026 센드잇 &middot; 소프트캣</p>
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(logoUrl, code);
    }

    private String buildResetTemplate(String code, String logoUrl) {
        return """
            <!DOCTYPE html>
            <html lang="ko">
            <head><meta charset="UTF-8"></head>
            <body style="margin:0; padding:0; background:#F5F5F5; font-family:'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#F5F5F5; padding:40px 20px;">
                <tr><td align="center">
                  <table width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF; border-radius:12px; border:1px solid #E8E8E8; overflow:hidden;">
                    <!-- 헤더 -->
                    <tr><td style="padding:40px 32px 0; text-align:center;">
                      <img src="%s" alt="센드잇" width="48" height="48" style="display:inline-block; margin-bottom:16px;" />
                      <p style="color:#111; font-size:15px; font-weight:700; margin:0 0 4px; letter-spacing:-0.5px;">센드잇</p>
                      <p style="color:#999; font-size:12px; margin:0;">비밀번호 재설정</p>
                    </td></tr>

                    <!-- 본문 -->
                    <tr><td style="padding:32px 32px 36px;">
                      <div style="border-top:1px solid #F0F0F0; margin:0 0 28px;"></div>
                      <p style="color:#333; font-size:14px; line-height:1.8; margin:0 0 4px; text-align:center; font-weight:500;">
                        비밀번호 재설정을 요청하셨습니다.
                      </p>
                      <p style="color:#888; font-size:13px; line-height:1.6; margin:0 0 28px; text-align:center;">
                        아래 코드를 입력해 새 비밀번호를 설정해 주세요.
                      </p>

                      <!-- 리셋코드 -->
                      <table width="100%%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:28px;">
                        <div style="display:inline-block; background:#F8F8FA; border:1px solid #E5E5EA; border-radius:10px; padding:20px 36px;">
                          <span style="font-size:32px; font-weight:700; letter-spacing:10px; color:#111; font-family:'SF Mono','Courier New',monospace;">%s</span>
                        </div>
                      </td></tr></table>

                      <!-- 만료 안내 -->
                      <table width="100%%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:28px;">
                        <span style="display:inline-block; background:#F8F8FA; color:#888; font-size:12px; padding:6px 14px; border-radius:6px;">
                          10분 내로 입력해 주세요
                        </span>
                      </td></tr></table>

                      <!-- 경고 -->
                      <div style="background:#FFF8F0; border:1px solid #FFE8CC; border-radius:8px; padding:12px 16px; margin-bottom:24px;">
                        <p style="color:#B8860B; font-size:12px; line-height:1.6; margin:0; text-align:center;">
                          본인이 요청하지 않았다면, 누군가 회원님의<br>계정에 접근을 시도했을 수 있습니다.
                        </p>
                      </div>

                      <div style="border-top:1px solid #F0F0F0; margin:0 0 20px;"></div>
                      <p style="color:#BBB; font-size:11px; line-height:1.7; margin:0; text-align:center;">
                        인증 코드를 타인에게 알려주지 마세요.
                      </p>
                    </td></tr>

                    <!-- 푸터 -->
                    <tr><td style="background:#FAFAFA; border-top:1px solid #F0F0F0; padding:16px 32px; text-align:center;">
                      <p style="color:#CCC; font-size:10px; margin:0;">&copy; 2026 센드잇 &middot; 소프트캣</p>
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(logoUrl, code);
    }

    private void sendHtmlEmail(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("이메일 발송 완료: to={}", to);
        } catch (MessagingException e) {
            log.error("이메일 발송 실패: to={}, error={}", to, e.getMessage());
        }
    }
}
