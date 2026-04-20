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
        String logoUrl = baseUrl + "/images/sendit_04_full_gradient.png";
        String body = buildVerificationTemplate(code, logoUrl);
        sendHtmlEmail(to, subject, body);
    }

    /**
     * 비밀번호 재설정 코드 발송
     */
    @Async
    public void sendPasswordResetEmail(String to, String code) {
        String subject = "[센드잇] 비밀번호 재설정 코드";
        String logoUrl = baseUrl + "/images/sendit_04_full_gradient.png";
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
                      <img src="%s" alt="센드잇" height="72" style="display:inline-block; margin-bottom:12px;" />
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
                      <img src="%s" alt="센드잇" height="72" style="display:inline-block; margin-bottom:12px;" />
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

    /**
     * 1:1 고객지원 문의 이메일 발송 (관리자에게)
     */
    @Async
    public void sendSupportEmail(String adminEmail, String inquiryType, String title, String content) {
        String subject = "[센드잇 1:1문의] " + inquiryType + " - " + title;
        String logoUrl = baseUrl + "/images/sendit_04_full_gradient.png";
        String body = buildSupportTemplate(inquiryType, title, content, logoUrl);
        sendHtmlEmail(adminEmail, subject, body);
    }

    private String buildSupportTemplate(String type, String title, String content, String logoUrl) {
        return """
            <!DOCTYPE html>
            <html lang="ko">
            <head><meta charset="UTF-8"></head>
            <body style="margin:0; padding:0; background:#F5F5F5; font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#F5F5F5; padding:40px 20px;">
                <tr><td align="center">
                  <table width="520" cellpadding="0" cellspacing="0" style="background:#FFFFFF; border-radius:12px; border:1px solid #E8E8E8;">
                    <tr><td style="padding:40px 32px 0; text-align:center;">
                      <img src="%s" alt="센드잇" height="72" style="margin-bottom:12px;" />
                      <p style="color:#999; font-size:12px; margin:0;">1:1 고객지원 문의</p>
                    </td></tr>
                    <tr><td style="padding:32px;">
                      <table width="100%%" cellpadding="0" cellspacing="0" style="font-size:14px; color:#333;">
                        <tr><td style="padding:8px 0; color:#888; width:100px;">문의 유형</td><td style="padding:8px 0; font-weight:500;">%s</td></tr>
                        <tr><td style="padding:8px 0; color:#888;">제목</td><td style="padding:8px 0; font-weight:500;">%s</td></tr>
                      </table>
                      <div style="border-top:1px solid #F0F0F0; margin:20px 0;"></div>
                      <p style="color:#888; font-size:12px; margin:0 0 8px;">문의 내용</p>
                      <div style="background:#F8F8FA; border:1px solid #E5E5EA; border-radius:8px; padding:16px; font-size:14px; color:#333; line-height:1.8; white-space:pre-wrap;">%s</div>
                    </td></tr>
                    <tr><td style="background:#FAFAFA; border-top:1px solid #F0F0F0; padding:16px 32px; text-align:center;">
                      <p style="color:#CCC; font-size:10px; margin:0;">&copy; 2026 센드잇</p>
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(logoUrl, type, title, content);
    }

    /**
     * 비즈니스 플랜 문의 이메일 발송 (관리자에게)
     */
    @Async
    public void sendInquiryEmail(String adminEmail, String senderName, String senderEmail,
                                  String company, String phone, String message) {
        String subject = "[센드잇] 비즈니스 플랜 문의 - " + senderName;
        String logoUrl = baseUrl + "/images/sendit_04_full_gradient.png";
        String body = buildInquiryTemplate(senderName, senderEmail, company, phone, message, logoUrl);
        sendHtmlEmail(adminEmail, subject, body);
    }

    private String buildInquiryTemplate(String name, String email, String company,
                                         String phone, String message, String logoUrl) {
        return """
            <!DOCTYPE html>
            <html lang="ko">
            <head><meta charset="UTF-8"></head>
            <body style="margin:0; padding:0; background:#F5F5F5; font-family:'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#F5F5F5; padding:40px 20px;">
                <tr><td align="center">
                  <table width="520" cellpadding="0" cellspacing="0" style="background:#FFFFFF; border-radius:12px; border:1px solid #E8E8E8; overflow:hidden;">
                    <tr><td style="padding:40px 32px 0; text-align:center;">
                      <img src="%s" alt="센드잇" height="72" style="display:inline-block; margin-bottom:12px;" />
                      <p style="color:#999; font-size:12px; margin:0;">비즈니스 플랜 문의</p>
                    </td></tr>
                    <tr><td style="padding:32px 32px 36px;">
                      <div style="border-top:1px solid #F0F0F0; margin:0 0 28px;"></div>
                      <table width="100%%" cellpadding="0" cellspacing="0" style="font-size:14px; color:#333;">
                        <tr><td style="padding:8px 0; color:#888; width:100px;">이름</td><td style="padding:8px 0; font-weight:500;">%s</td></tr>
                        <tr><td style="padding:8px 0; color:#888;">이메일</td><td style="padding:8px 0;"><a href="mailto:%s" style="color:#4F46E5;">%s</a></td></tr>
                        <tr><td style="padding:8px 0; color:#888;">회사명</td><td style="padding:8px 0;">%s</td></tr>
                        <tr><td style="padding:8px 0; color:#888;">연락처</td><td style="padding:8px 0;">%s</td></tr>
                      </table>
                      <div style="border-top:1px solid #F0F0F0; margin:20px 0;"></div>
                      <p style="color:#888; font-size:12px; margin:0 0 8px;">문의 내용</p>
                      <div style="background:#F8F8FA; border:1px solid #E5E5EA; border-radius:8px; padding:16px; font-size:14px; color:#333; line-height:1.8; white-space:pre-wrap;">%s</div>
                    </td></tr>
                    <tr><td style="background:#FAFAFA; border-top:1px solid #F0F0F0; padding:16px 32px; text-align:center;">
                      <p style="color:#CCC; font-size:10px; margin:0;">&copy; 2026 센드잇 &middot; 소프트캣</p>
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(logoUrl, name, email, email, company, phone, message);
    }

    /**
     * 범용 알림 이메일 발송
     */
    @Async
    public void sendNotificationEmail(String to, String subject, String title, String content,
                                       String ctaText, String ctaUrl) {
        String logoUrl = baseUrl + "/images/sendit_04_full_gradient.png";
        String fullCtaUrl = ctaUrl.startsWith("http") ? ctaUrl : baseUrl + ctaUrl;
        String body = buildNotificationTemplate(title, content, ctaText, fullCtaUrl, logoUrl);
        sendHtmlEmail(to, "[센드잇] " + subject, body);
    }

    /**
     * 일일 리포트 이메일
     */
    @Async
    public void sendDailyReportEmail(String to, long sentCount, long newContacts, double openRate) {
        String logoUrl = baseUrl + "/images/sendit_04_full_gradient.png";
        String content = String.format(
                "어제 발송 DM: %d건\n새 연락처: %d명\n열림률: %.1f%%",
                sentCount, newContacts, openRate);
        String body = buildNotificationTemplate("일일 리포트", content, "대시보드 확인", baseUrl + "/app/dashboard", logoUrl);
        sendHtmlEmail(to, "[센드잇] 일일 리포트", body);
    }

    /**
     * 주간 리포트 이메일
     */
    @Async
    public void sendWeeklyReportEmail(String to, long sentCount, long newContacts,
                                       long flowRuns, double openRate, double clickRate) {
        String logoUrl = baseUrl + "/images/sendit_04_full_gradient.png";
        String content = String.format(
                "지난 주 발송 DM: %d건\n새 연락처: %d명\n플로우 실행: %d회\n열림률: %.1f%%\n클릭률: %.1f%%",
                sentCount, newContacts, flowRuns, openRate, clickRate);
        String body = buildNotificationTemplate("주간 리포트", content, "대시보드 확인", baseUrl + "/app/dashboard", logoUrl);
        sendHtmlEmail(to, "[센드잇] 주간 리포트", body);
    }

    private String buildNotificationTemplate(String title, String content, String ctaText, String ctaUrl, String logoUrl) {
        String escapedContent = content.replace("\n", "<br>");
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
                      <img src="%s" alt="센드잇" height="72" style="display:inline-block; margin-bottom:12px;" />
                      <p style="color:#999; font-size:12px; margin:0;">%s</p>
                    </td></tr>

                    <!-- 본문 -->
                    <tr><td style="padding:32px 32px 36px;">
                      <div style="border-top:1px solid #F0F0F0; margin:0 0 28px;"></div>
                      <p style="color:#333; font-size:14px; line-height:1.8; margin:0 0 28px; text-align:center;">
                        %s
                      </p>

                      <!-- CTA 버튼 -->
                      <table width="100%%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:28px;">
                        <a href="%s" style="display:inline-block; background:linear-gradient(135deg,#667eea 0%%,#764ba2 100%%); color:#FFF; text-decoration:none; font-size:14px; font-weight:600; padding:14px 32px; border-radius:8px;">
                          %s
                        </a>
                      </td></tr></table>

                      <div style="border-top:1px solid #F0F0F0; margin:0 0 20px;"></div>
                      <p style="color:#BBB; font-size:11px; line-height:1.7; margin:0; text-align:center;">
                        이 알림은 센드잇 알림 설정에 따라 발송되었습니다.<br>
                        알림 설정은 설정 > 알림에서 변경할 수 있습니다.
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
            """.formatted(logoUrl, title, escapedContent, ctaUrl, ctaText);
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
