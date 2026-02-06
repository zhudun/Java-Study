# 学习记录 - 2026-02-01

## 学习概述
- **日期**: 2026-02-01（周六）
- **时长**: 约 60 分钟
- **格式**: 系统学习
- **主要主题**: 分布式锁详解、Record 补充

---

## 学习内容

### 1. 分布式锁详解

#### 学生基础评估

**问题1：你知道什么是锁吗？为什么需要锁？**
> "就是一个凭证，因为要控制事务数量"

✅ **理解正确** - 锁是用来控制并发的

**问题2：你用过 synchronized 吗？**
> "同步阻塞锁"

✅ **理解正确** - synchronized 是同步阻塞锁

**问题3：分布式锁和普通锁有什么区别？**
> "可以同时管理多个微服务，因为一个单体项目的普通的锁无法处理微服务这种交互跨服务事务的并发问题"

✅ **理解完全正确！** - 抓住了核心：跨服务的并发控制

**问题4：你听说过 Redis 分布式锁吗？**
> "redisson，不太清楚"

✅ **知道 Redisson** - 需要深入学习

---

#### 核心概念讲解

**为什么需要分布式锁？**

**单体应用：**
- synchronized 可以解决并发问题
- 所有请求在同一个 JVM 里

**微服务问题：**
```
用户A → 订单服务1 → 库存 = 1
用户B → 订单服务2 → 库存 = 1
用户C → 订单服务3 → 库存 = 1

结果：3 个人都下单成功！❌ 超卖了！
```

**原因：**
- 订单服务1、2、3 是不同的 JVM
- synchronized 只能锁住同一个 JVM 内的对象
- 3 个服务各自有各自的锁，互不影响

**分布式锁解决方案：**
- 把锁放在一个所有服务都能访问的地方（Redis）
- 常见实现：Redis、Zookeeper、数据库、Etcd

---

### Redis 分布式锁的演进

#### 版本1：最简单的实现（有问题）
```java
Boolean success = redisTemplate.opsForValue().setIfAbsent("lock_key", "1");
if (success) {
    // 执行业务
    redisTemplate.delete("lock_key");
}
```
**问题：** 服务宕机，锁永远不会被释放！

#### 版本2：加上过期时间（还是有问题）
```java
Boolean success = redisTemplate.opsForValue().setIfAbsent("lock_key", "1");
if (success) {
    redisTemplate.expire("lock_key", 30, TimeUnit.SECONDS);
    // 执行业务
    redisTemplate.delete("lock_key");
}
```
**问题：** 获取锁和设置过期时间不是原子操作！

#### 版本3：原子操作（基本可用）
```java
Boolean success = redisTemplate.opsForValue()
    .setIfAbsent("lock_key", "1", 30, TimeUnit.SECONDS);
if (success) {
    try {
        // 执行业务
    } finally {
        redisTemplate.delete("lock_key");
    }
}
```
**Redis 命令：** `SET lock_key 1 NX EX 30`
**问题：** 可能会释放别人的锁！

#### 版本4：防止误删（推荐）
```java
String lockValue = UUID.randomUUID().toString();
Boolean success = redisTemplate.opsForValue()
    .setIfAbsent("lock_key", lockValue, 30, TimeUnit.SECONDS);
if (success) {
    try {
        // 执行业务
    } finally {
        String currentValue = redisTemplate.opsForValue().get("lock_key");
        if (lockValue.equals(currentValue)) {
            redisTemplate.delete("lock_key");
        }
    }
}
```
**问题：** 判断和删除不是原子操作！

#### 版本5：Lua 脚本保证原子性（完美）
```java
String lockValue = UUID.randomUUID().toString();
Boolean success = redisTemplate.opsForValue()
    .setIfAbsent("lock_key", lockValue, 30, TimeUnit.SECONDS);
if (success) {
    try {
        // 执行业务
    } finally {
        String script = 
            "if redis.call('get', KEYS[1]) == ARGV[1] then " +
            "    return redis.call('del', KEYS[1]) " +
            "else " +
            "    return 0 " +
            "end";
        redisTemplate.execute(
            new DefaultRedisScript<>(script, Long.class),
            Collections.singletonList("lock_key"),
            lockValue
        );
    }
}
```
**为什么用 Lua 脚本？** Redis 保证 Lua 脚本的原子性

---

### 分布式锁的三大问题

#### 问题1：锁过期了，业务还没执行完

**场景：**
```
1. 线程A 获取锁，过期时间 30 秒
2. 线程A 执行业务，耗时 35 秒
3. 30 秒后锁自动过期
4. 线程B 获取到锁
5. 线程A 和线程B 同时执行业务 ❌
```

**解决方案：看门狗机制（Redisson）**

```java
RLock lock = redisson.getLock("lock_key");
lock.lock();  // 不指定过期时间，启动看门狗
try {
    // 执行业务
    // 看门狗会自动续期，默认 30 秒，每 10 秒续期一次
} finally {
    lock.unlock();
}
```

**看门狗原理：**
```
1. 获取锁，过期时间 30 秒
2. 启动后台线程，每 10 秒检查一次
3. 如果锁还在，续期到 30 秒
4. 业务执行完，主动释放锁，停止看门狗
```

**优势：**
- 业务执行多久，锁就持有多久
- 业务执行完，立即释放锁
- 服务宕机，30 秒后锁自动过期

---

#### 问题2：获取锁失败怎么办？

**方案1：直接返回失败**
```java
if (!success) {
    throw new RuntimeException("系统繁忙，请稍后重试");
}
```

**方案2：自旋重试**
```java
for (int i = 0; i < retryTimes; i++) {
    Boolean success = redisTemplate.opsForValue()
        .setIfAbsent("lock_key", lockValue, 30, TimeUnit.SECONDS);
    if (success) return true;
    Thread.sleep(100);
}
```

**方案3：Redisson 的 tryLock**
```java
boolean success = lock.tryLock(10, 30, TimeUnit.SECONDS);
// 最多等待 10 秒，锁定 30 秒后自动释放
```

---

#### 问题3：Redis 主从切换导致锁丢失

**场景：**
```
1. 线程A 在 Redis 主节点获取锁
2. 主节点宕机，还没来得及同步到从节点
3. 从节点升级为主节点
4. 线程B 在新主节点获取到锁
5. 线程A 和线程B 同时持有锁 ❌
```

**解决方案：RedLock（红锁）**
- 在多个独立的 Redis 实例上获取锁
- 如果在 3 个以上实例获取成功，认为获取锁成功
- 实际很少用（复杂，性能差）

---

### Redisson 详解

#### 什么是 Redisson？
- Redisson = Redis + -son（儿子）
- Redis 官方推荐的 Java 客户端
- 封装了分布式锁、分布式集合等功能
- 自动处理看门狗、重试、Lua 脚本等

#### 基本使用

**添加依赖：**
```xml
<dependency>
    <groupId>org.redisson</groupId>
    <artifactId>redisson-spring-boot-starter</artifactId>
    <version>3.20.0</version>
</dependency>
```

**使用：**
```java
@Service
public class OrderService {
    @Autowired
    private RedissonClient redisson;
    
    public void createOrder() {
        RLock lock = redisson.getLock("order_lock");
        lock.lock();  // 阻塞等待
        try {
            // 执行业务
        } finally {
            lock.unlock();
        }
    }
}
```

#### 常用方法

| 方法 | 说明 |
|------|------|
| `lock()` | 阻塞等待，启动看门狗 |
| `lock(long leaseTime, TimeUnit unit)` | 指定过期时间，不启动看门狗 |
| `tryLock()` | 尝试获取锁，立即返回 |
| `tryLock(long waitTime, long leaseTime, TimeUnit unit)` | 等待 + 过期时间 |
| `unlock()` | 释放锁 |
| `isLocked()` | 是否被锁定 |
| `isHeldByCurrentThread()` | 是否被当前线程持有 |

#### 看门狗机制

**默认配置：**
- 锁过期时间：30 秒
- 续期间隔：30 / 3 = 10 秒

**启动看门狗的条件：**
```java
// ✅ 启动看门狗（不指定过期时间）
lock.lock();

// ❌ 不启动看门狗（指定过期时间）
lock.lock(30, TimeUnit.SECONDS);
```

---

### 分布式锁的实际应用

#### 场景1：秒杀扣库存
```java
@Service
public class SeckillService {
    @Autowired
    private RedissonClient redisson;
    
    public boolean seckill(Long productId, Long userId) {
        String lockKey = "seckill_lock_" + productId;
        RLock lock = redisson.getLock(lockKey);
        
        boolean success = lock.tryLock();
        if (!success) return false;
        
        try {
            // 查询库存
            Stock stock = stockMapper.selectById(productId);
            if (stock.getQuantity() <= 0) return false;
            
            // 扣减库存
            stock.setQuantity(stock.getQuantity() - 1);
            stockMapper.updateById(stock);
            
            return true;
        } finally {
            lock.unlock();
        }
    }
}
```

#### 场景2：防止重复下单
```java
public void createOrder(Long userId, Long productId) {
    String lockKey = "order_lock_" + userId;
    RLock lock = redisson.getLock(lockKey);
    
    boolean success = lock.tryLock(3, TimeUnit.SECONDS);
    if (!success) {
        throw new RuntimeException("请勿重复下单");
    }
    
    try {
        // 检查是否已下单
        Order existOrder = orderMapper.selectByUserIdAndProductId(userId, productId);
        if (existOrder != null) {
            throw new RuntimeException("已经下过单了");
        }
        
        // 创建订单
        Order order = new Order();
        order.setUserId(userId);
        order.setProductId(productId);
        orderMapper.insert(order);
    } finally {
        lock.unlock();
    }
}
```

#### 场景3：定时任务防止重复执行
```java
@Component
public class ScheduledTask {
    @Autowired
    private RedissonClient redisson;
    
    @Scheduled(cron = "0 0 1 * * ?")  // 每天凌晨 1 点
    public void dailyTask() {
        RLock lock = redisson.getLock("daily_task_lock");
        
        boolean success = lock.tryLock();
        if (!success) {
            System.out.println("任务正在执行中，跳过");
            return;
        }
        
        try {
            // 执行定时任务
            System.out.println("执行每日任务...");
        } finally {
            lock.unlock();
        }
    }
}
```

---

### 2. Record 补充（昨天未完成部分）

#### 学生反馈
"场景2：方法返回多个值，这个没有回答完，你就中断了"

✅ **反馈正确** - 昨天确实没有讲完这部分

#### 场景2：方法返回多个值

**之前的做法（繁琐）：**
```java
// 需要单独创建一个类
public class Result {
    private int sum;
    private int count;
    
    public Result(int sum, int count) {
        this.sum = sum;
        this.count = count;
    }
    
    public int getSum() { return sum; }
    public int getCount() { return count; }
    
    @Override
    public boolean equals(Object o) { ... }
    @Override
    public int hashCode() { ... }
    @Override
    public String toString() { ... }
}

// 使用
public Result calculate(List<Integer> numbers) {
    int sum = numbers.stream().mapToInt(Integer::intValue).sum();
    int count = numbers.size();
    return new Result(sum, count);
}
```
**需要写 20+ 行代码！**

**Java 17 的做法（简洁）：**
```java
// 只需要 1 行
public record Result(int sum, int count) { }

// 使用（完全一样）
public Result calculate(List<Integer> numbers) {
    int sum = numbers.stream().mapToInt(Integer::intValue).sum();
    int count = numbers.size();
    return new Result(sum, count);
}

// 调用
Result result = calculate(List.of(1, 2, 3, 4, 5));
System.out.println(result.sum());    // 15
System.out.println(result.count());  // 5
```
**只需要 1 行代码！** ✅

#### 更多例子

**例子1：返回分页数据**
```java
public record PageResult<T>(List<T> data, long total, int pageNum, int pageSize) { }

public PageResult<User> getUsers(int pageNum, int pageSize) {
    List<User> users = userMapper.selectPage(pageNum, pageSize);
    long total = userMapper.count();
    return new PageResult<>(users, total, pageNum, pageSize);
}
```

**例子2：返回统计结果**
```java
public record Statistics(int min, int max, double avg) { }

public Statistics analyze(List<Integer> numbers) {
    int min = numbers.stream().min(Integer::compareTo).orElse(0);
    int max = numbers.stream().max(Integer::compareTo).orElse(0);
    double avg = numbers.stream().mapToInt(Integer::intValue).average().orElse(0);
    return new Statistics(min, max, avg);
}
```

**例子3：返回坐标**
```java
public record Point(int x, int y) { }

public Point getMousePosition() {
    return new Point(100, 200);
}
```

#### Record 的优势总结

| 场景 | 之前 | Java 17 Record |
|------|------|----------------|
| **代码量** | 20+ 行 | 1 行 |
| **可读性** | 低（太多模板代码） | 高（一眼看出字段） |
| **维护性** | 差（改字段要改很多地方） | 好（只改一行） |
| **不可变性** | 需要手动保证 | 自动保证（final） |

---

## 学生表现评估

### 优点
1. ✅ **基础理解正确**：对锁的概念、synchronized、分布式锁的必要性理解准确
2. ✅ **知识储备**：知道 Redisson，有一定的基础
3. ✅ **细心认真**：发现了昨天 Record 讲解不完整的问题
4. ✅ **学习态度好**：主动要求学习分布式锁

### 需要加强
1. ⚠️ **实践经验**：建议多写代码，实际使用 Redisson
2. ⚠️ **深度理解**：对分布式锁的三大问题需要深入理解
3. ⚠️ **主动回答**：讲解后没有主动回答检查问题

---

## 知识点掌握情况

### ✅ 已掌握

**分布式锁基础（中信心）**
- 为什么需要分布式锁
- synchronized 在微服务中失效的原因
- 分布式锁的常见实现方式

**Redis 分布式锁演进（中信心）**
- 5 个版本的演进过程
- 每个版本的问题和解决方案
- Lua 脚本保证原子性

**Redisson 基础（中信心）**
- Redisson 是什么
- 基本使用方法
- 常用 API

**Record 补充（高信心）**
- 方法返回多个值的场景
- Record 的优势
- 实际应用例子

### ⚠️ 需要加强

**分布式锁三大问题（需要深入）**
- 锁过期问题的解决方案
- 获取锁失败的处理策略
- Redis 主从切换问题

**Redisson 看门狗机制（需要深入）**
- 看门狗的工作原理
- 启动看门狗的条件
- 看门狗的配置

**分布式锁实战（需要实践）**
- 秒杀场景的实现
- 防止重复下单
- 定时任务防重复

---

## 关键记忆点

### 为什么需要分布式锁？

**单体应用：**
- synchronized 可以解决
- 所有请求在同一个 JVM

**微服务问题：**
- 多个服务实例 = 多个 JVM
- synchronized 只能锁住同一个 JVM
- 需要一个所有服务都能访问的锁（Redis）

---

### Redis 分布式锁演进

| 版本 | 实现 | 问题 |
|------|------|------|
| V1 | `SETNX` | 服务宕机，锁永远不释放 |
| V2 | `SETNX` + `EXPIRE` | 不是原子操作 |
| V3 | `SET NX EX` | 可能释放别人的锁 |
| V4 | `SET NX EX` + UUID | 判断和删除不是原子操作 |
| V5 | `SET NX EX` + UUID + Lua | ✅ 完美 |

**记忆口诀：** 原子操作 + 唯一值 + Lua 脚本

---

### 分布式锁三大问题

| 问题 | 场景 | 解决方案 |
|------|------|---------|
| **锁过期** | 业务执行时间 > 锁过期时间 | 看门狗机制（Redisson） |
| **获取失败** | 高并发下获取不到锁 | 直接返回 / 自旋重试 / tryLock |
| **主从切换** | 主节点宕机，锁丢失 | RedLock（很少用） |

---

### Redisson 看门狗机制

**默认配置：**
- 锁过期时间：30 秒
- 续期间隔：10 秒

**工作流程：**
```
0s  - 获取锁，过期时间 30s，启动看门狗
10s - 续期，过期时间重置为 30s
20s - 续期，过期时间重置为 30s
25s - 业务完成，释放锁，停止看门狗
```

**启动条件：**
```java
// ✅ 启动看门狗
lock.lock();

// ❌ 不启动看门狗
lock.lock(30, TimeUnit.SECONDS);
```

**记忆口诀：** 不指定过期时间，才启动看门狗

---

### Redisson 常用方法

```java
RLock lock = redisson.getLock("lock_key");

// 阻塞等待，启动看门狗
lock.lock();

// 尝试获取锁，立即返回
boolean success = lock.tryLock();

// 等待 10 秒，锁定 30 秒
boolean success = lock.tryLock(10, 30, TimeUnit.SECONDS);

// 释放锁
lock.unlock();
```

---

## 下次学习建议

### 高优先级

1. **实践分布式锁**
   - 写代码实现秒杀场景
   - 测试看门狗机制
   - 测试锁过期问题

2. **深入理解三大问题**
   - 锁过期的各种场景
   - 获取锁失败的处理策略
   - Redis 主从切换的影响

3. **回答检查问题**
   - 为什么微服务需要分布式锁？
   - Redis 分布式锁的基本实现是什么？
   - Redisson 的看门狗机制是什么？
   - 分布式锁的三大问题是什么？

### 中优先级

4. **继续学习 Redis**
   - 缓存一致性方案
   - 集群模式
   - 内存淘汰策略

5. **学习核心 API**
   - String/StringBuilder/StringBuffer
   - 包装类
   - 日期时间 API

---

## 总结

今天学习了分布式锁的核心内容，包括：
1. ✅ 为什么需要分布式锁
2. ✅ Redis 分布式锁的 5 个演进版本
3. ✅ 分布式锁的三大问题
4. ✅ Redisson 的使用和看门狗机制
5. ✅ 分布式锁的实际应用场景
6. ✅ Record 补充（方法返回多个值）

学生对分布式锁的基础概念理解正确，知道 Redisson，但需要深入理解三大问题和看门狗机制。建议下次学习多写代码实践，加深理解。

**学习时长：** 约 60 分钟  
**掌握主题：** 2 个（分布式锁、Record 补充）  
**新增知识点：** Redis 分布式锁、Redisson、看门狗机制

继续保持学习节奏！💪
