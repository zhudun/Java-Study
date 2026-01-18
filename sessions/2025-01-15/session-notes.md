# 学习笔记 - 2025-01-15

## 学习概述
- **日期**: 2025-01-15
- **时长**: 约 90 分钟
- **主题**: AOP 五种通知、线程池七参数、@Async、同步异步、回调、分布式事务

## 学习内容

### 1. AOP 五种通知

| 通知 | 注解 | 执行时机 |
|------|------|---------|
| 前置 | @Before | 方法执行前 |
| 后置 | @After | 方法执行后（finally，无论成功失败） |
| 返回后 | @AfterReturning | 方法正常返回后 |
| 异常后 | @AfterThrowing | 方法抛异常后 |
| 环绕 | @Around | 包裹整个方法，可控制是否执行 |

**方法抛异常时执行的通知**：@Before、@After、@AfterThrowing、@Around（4个）

**@Around 的特点**：相当于 前置 + 后置 + 完全控制权

### 2. 线程池七参数

```java
new ThreadPoolExecutor(
    corePoolSize,      // 核心线程数
    maximumPoolSize,   // 最大线程数
    keepAliveTime,     // 空闲存活时间
    TimeUnit,          // 时间单位
    workQueue,         // 任务队列
    threadFactory,     // 线程工厂
    handler            // 拒绝策略
);
```

**执行流程**：核心线程忙 → 入队 → 队列满 → 创建新线程 → 到最大 → 拒绝

**配置建议**：
- CPU 密集型：核心线程数 = CPU 核数 + 1
- IO 密集型：核心线程数 = CPU 核数 * 2

**拒绝策略**：AbortPolicy、CallerRunsPolicy、DiscardPolicy、DiscardOldestPolicy

**为什么不用 Executors**：无界队列/无限线程会 OOM

### 3. @Async 异步

**使用场景**：发送通知、日志记录、数据统计、文件处理

**配置方式**：
- 全局配置：实现 AsyncConfigurer
- 指定线程池：@Async("beanName")

**异常处理**：
- @ControllerAdvice 捕获不到异步异常
- 需要 AsyncUncaughtExceptionHandler 或方法内 try-catch

### 4. 同步 vs 异步

**同步**：顺序执行，阻塞，简单，适合核心业务
**异步**：不阻塞，响应快，复杂，适合辅助功能

**原则**：核心业务同步，辅助功能异步

### 5. 回调接口

**定义**：把代码传给别人，别人在合适时调用

**应用**：支付回调、第三方接口回调、异步任务通知

### 6. 分布式事务

**问题**：跨服务、跨数据库的数据一致性

**解决方案**：
- TCC：Try/Confirm/Cancel，手动补偿
- Saga：长事务，事件驱动
- 本地消息表、MQ 事务消息

**框架**：Seata（AT 模式最常用）

## 学生表现
- 对线程池执行流程理解深入，能提出队列优先级、核心/非核心线程区别等问题
- 理解同步异步的本质区别
- 能联系实际场景思考问题（业务顺序、异常处理）
