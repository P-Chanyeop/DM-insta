package com.instabot.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

import java.util.concurrent.Executor;

/**
 * Async thread pool configuration for background tasks
 * (broadcast sending, sequence execution, etc.).
 */
@Slf4j
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean
    public TaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(5);
        scheduler.setThreadNamePrefix("sendit-scheduler-");
        scheduler.initialize();
        return scheduler;
    }

    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("sendit-async-");
        executor.setRejectedExecutionHandler((r, e) ->
                log.warn("Task rejected from sendit-async pool. Pool size: {}, active: {}, queued: {}",
                        e.getPoolSize(), e.getActiveCount(), e.getQueue().size()));
        executor.initialize();
        return executor;
    }
}
