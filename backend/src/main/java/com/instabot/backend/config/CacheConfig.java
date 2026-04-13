package com.instabot.backend.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Configuration;

/**
 * Enables Spring Cache abstraction.
 * Caffeine cache backend is configured via application.yml.
 */
@Configuration
@EnableCaching
public class CacheConfig {
}
