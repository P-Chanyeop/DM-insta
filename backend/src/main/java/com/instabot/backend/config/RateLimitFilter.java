package com.instabot.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Simple in-memory per-IP rate limiter.
 * <ul>
 *     <li>General endpoints: 100 requests / minute</li>
 *     <li>Auth endpoints (/api/auth/**): 10 requests / minute</li>
 * </ul>
 * Returns HTTP 429 with a JSON body when the limit is exceeded.
 * Expired entries are cleaned up every 5 minutes.
 */
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int GENERAL_LIMIT = 100;
    private static final int AUTH_LIMIT = 10;
    private static final long WINDOW_MS = 60_000; // 1 minute

    private final ConcurrentHashMap<String, RateBucket> generalBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, RateBucket> authBuckets = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final ScheduledExecutorService cleanupExecutor;

    public RateLimitFilter() {
        // Periodically clean up expired entries
        cleanupExecutor = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "rate-limit-cleanup");
            t.setDaemon(true);
            return t;
        });
        cleanupExecutor.scheduleAtFixedRate(this::cleanup, 5, 5, TimeUnit.MINUTES);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String clientIp = getClientIp(request);
        String path = request.getRequestURI();

        // Check auth-specific rate limit
        if (path.startsWith("/api/auth")) {
            if (!isAllowed(authBuckets, clientIp, AUTH_LIMIT)) {
                writeRateLimitResponse(response, AUTH_LIMIT);
                return;
            }
        }

        // Check general rate limit
        if (!isAllowed(generalBuckets, clientIp, GENERAL_LIMIT)) {
            writeRateLimitResponse(response, GENERAL_LIMIT);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isAllowed(ConcurrentHashMap<String, RateBucket> buckets, String key, int limit) {
        long now = System.currentTimeMillis();
        RateBucket bucket = buckets.compute(key, (k, existing) -> {
            if (existing == null || now - existing.windowStart > WINDOW_MS) {
                return new RateBucket(now);
            }
            return existing;
        });
        return bucket.counter.incrementAndGet() <= limit;
    }

    private void writeRateLimitResponse(HttpServletResponse response, int limit) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        Map<String, Object> body = Map.of(
                "status", 429,
                "error", "Too Many Requests",
                "message", "Rate limit exceeded. Maximum " + limit + " requests per minute."
        );

        response.getWriter().write(objectMapper.writeValueAsString(body));
        log.warn("Rate limit exceeded: limit={}", limit);
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private void cleanup() {
        long now = System.currentTimeMillis();
        generalBuckets.entrySet().removeIf(e -> now - e.getValue().windowStart > WINDOW_MS * 2);
        authBuckets.entrySet().removeIf(e -> now - e.getValue().windowStart > WINDOW_MS * 2);
    }

    @Override
    public void destroy() {
        cleanupExecutor.shutdownNow();
    }

    private static class RateBucket {
        final long windowStart;
        final AtomicInteger counter;

        RateBucket(long windowStart) {
            this.windowStart = windowStart;
            this.counter = new AtomicInteger(0);
        }
    }
}
