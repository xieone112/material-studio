package com.example.studio.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

@Configuration
public class TaskExecutorConfig {

    /**
     * 后台任务执行线程池：任务在池内排队或并行执行，与 Web 请求线程解耦。
     * 这里使用少量线程即可满足演示要求（题目不要求真正并行）。
     */
    @Bean(name = "taskExecutor")
    public ExecutorService taskExecutor() {
        ThreadFactory factory = new ThreadFactory() {
            private final AtomicInteger seq = new AtomicInteger();

            @Override
            public Thread newThread(Runnable r) {
                Thread t = new Thread(r, "task-worker-" + seq.incrementAndGet());
                t.setDaemon(false);
                return t;
            }
        };
        return new ThreadPoolExecutor(2, 2, 60, TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(1000), factory,
                new ThreadPoolExecutor.CallerRunsPolicy());
    }

    @Bean
    public TransactionTemplate transactionTemplate(PlatformTransactionManager txManager) {
        return new TransactionTemplate(txManager);
    }
}
