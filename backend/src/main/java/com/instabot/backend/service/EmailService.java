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

    /**
     * 이메일 인증 코드 발송
     */
    @Async
    public void sendVerificationEmail(String to, String code) {
        String subject = "[센드잇] 이메일 인증 코드";
        String body = """
                <div style="font-family: 'Noto Sans KR', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                  <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="color: #6366F1; font-size: 24px; margin: 0;">센드잇</h1>
                    <p style="color: #6B7280; font-size: 14px; margin-top: 4px;">Instagram DM 자동화 플랫폼</p>
                  </div>
                  <div style="background: #F9FAFB; border-radius: 12px; padding: 32px; text-align: center;">
                    <p style="color: #374151; font-size: 16px; margin: 0 0 24px;">이메일 인증 코드입니다.</p>
                    <div style="background: #FFFFFF; border: 2px solid #E5E7EB; border-radius: 8px; padding: 16px; display: inline-block;">
                      <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111827;">%s</span>
                    </div>
                    <p style="color: #9CA3AF; font-size: 13px; margin-top: 24px;">이 코드는 10분 후 만료됩니다.</p>
                  </div>
                  <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 24px;">본인이 요청하지 않았다면 이 이메일을 무시해주세요.</p>
                </div>
                """.formatted(code);

        sendHtmlEmail(to, subject, body);
    }

    /**
     * 비밀번호 재설정 코드 발송
     */
    @Async
    public void sendPasswordResetEmail(String to, String code) {
        String subject = "[센드잇] 비밀번호 재설정 코드";
        String body = """
                <div style="font-family: 'Noto Sans KR', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                  <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="color: #6366F1; font-size: 24px; margin: 0;">센드잇</h1>
                    <p style="color: #6B7280; font-size: 14px; margin-top: 4px;">비밀번호 재설정</p>
                  </div>
                  <div style="background: #F9FAFB; border-radius: 12px; padding: 32px; text-align: center;">
                    <p style="color: #374151; font-size: 16px; margin: 0 0 24px;">비밀번호 재설정 코드입니다.</p>
                    <div style="background: #FFFFFF; border: 2px solid #E5E7EB; border-radius: 8px; padding: 16px; display: inline-block;">
                      <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111827;">%s</span>
                    </div>
                    <p style="color: #9CA3AF; font-size: 13px; margin-top: 24px;">이 코드는 10분 후 만료됩니다.</p>
                  </div>
                  <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 24px;">본인이 요청하지 않았다면 이 이메일을 무시해주세요.</p>
                </div>
                """.formatted(code);

        sendHtmlEmail(to, subject, body);
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
