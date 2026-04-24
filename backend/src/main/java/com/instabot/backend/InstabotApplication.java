package com.instabot.backend;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;

@SpringBootApplication
public class InstabotApplication {
    public static void main(String[] args) {
        SpringApplication.run(InstabotApplication.class, args);
    }

    // LocalDateTime.now() / new Date() 등 JVM 기본 TZ 에 의존하는 코드를 모두 KST 로 고정.
    // DB 에 저장되는 createdAt, sentAt, lastMessageAt 이 서버 OS 시간대에 따라 흔들리는 문제 방지.
    // (Jackson 직렬화 타임존은 application.yml 의 spring.jackson.time-zone 에서 별도 지정.)
    @PostConstruct
    public void setDefaultTimeZone() {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"));
    }
}
