package com.softcat.instagramscraper.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * JPA 설정
 * - JPA Auditing 활성화 (BaseEntity의 @CreatedDate, @LastModifiedDate 동작)
 */
@Configuration
@EnableJpaAuditing
public class JpaConfig {
}
