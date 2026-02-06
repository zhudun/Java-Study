# 学习记录 - 2026-02-03

## 学习概述
- **日期**: 2026-02-03（周二）
- **时长**: 约 30 分钟
- **格式**: 系统学习 + 深入讲解
- **主要主题**: Redis 分布式锁、Redisson 看门狗机制

---

## 学习内容

### 1. 为什么微服务需要分布式锁？

#### 学生问题
"为什么微服务需要分布式锁？synchronized 为什么不行？"

#### 核心概念讲解

**synchronized 的局限性：**
- synchronized 只能锁住单个 JVM 进程内的资源
- 微服务部署多台机器，每台机器是独立的 JVM
- 多个 JVM 之间的 synchronized 无法互斥

**问题场景：**
```
秒杀商品，库存 10 件，订单服务部署 3 台机器

单体应用（1 台服务器）：
- synchronized 可以保证 100 个线程互斥 ✅

微服务（3 台服务器）：
- JVM1、JVM2、JVM3 各自的 synchronized 无法互斥 ❌
- 三个 JVM 可能同时查询到库存 = 10
- 三个 JVM 同时扣减库存
- 结果：库存可能变成负数
```

**解决方案：**
- 使用外部存储（Redis/Zookeeper）作为锁
- 所有 JVM 都去同一个地方加锁
- 保证跨 JVM 的互斥性

**学生表现：** ✅ 理解了 synchronized 的局限性和分布式锁的必要性

---

### 2. Redis 分布式锁的基本实现

#### 学生问题
"Redis 分布式锁的基本实现是什么？"

#### 核心原理

**SETNX + 过期时间：**
- SETNX = SET if Not eXists（如果不存在才设置）
- 必须是原子操作（一条命令完成）
- 释放锁时要验证唯一标识

**正确实现：**
```java
// 加锁（原子操作）
String lockValue = UUID.randomUUID().toString();
jedis.set(key, lockValue, "NX", "EX", 30);

// 释放锁（Lua 脚本保证原子性）
String script = 
    "if redis.call('get', KEYS[1]) == ARGV[1] then " +
    "    return redis.call('del', KEYS[1]) " +
    "else " +
    "    return 0 " +
    "end";
jedis.eval(script, Collections.singletonList(key), 
           Collections.singletonList(lockValue));
```

**关键点：**
1. SETNX + 过期时间必须是原子操作
2. 释放锁时要验证是不是自己的锁（防止误删）
3. 使用 Lua 脚本保证验证和删除的原子性

**学生表现：** ✅ 理解了 Redis 分布式锁的基本实现原理

---

### 3. Redisson 的看门狗机制

#### 学生问题
"Redisson 的看门狗机制是什么？"

#### 核心概念

**问题背景：**
- 锁过期时间设置太短：业务还没执行完，锁就过期了
- 锁过期时间设置太长：服务宕机，锁要等很久才释放

**看门狗（WatchDog）机制：**
- 核心思想：自动续期
- 加锁时设置默认过期时间（30 秒）
- 启动后台线程，每 10 秒检查一次
- 如果业务还在执行，就续期到 30 秒
- 如果业务执行完了，就停止续期

**时间线：**
```
0s   ─ 加锁（过期时间 30s）
10s  ─ 续期（过期时间 30s）
20s  ─ 续期（过期时间 30s）
25s  ─ 业务执行完，释放锁，停止续期
```

**Redisson 使用示例：**
```java
RLock lock = redissonClient.getLock(lockKey);

// leaseTime = -1 表示使用看门狗机制
boolean locked = lock.tryLock(10, -1, TimeUnit.SECONDS);

// 执行业务逻辑（不用担心过期时间）
// 看门狗会自动续期

lock.unlock();  // 释放锁，自动停止看门狗
```

**学生表现：** ✅ 理解了看门狗机制的原理和作用

---

### 4. 分布式锁的三大问题

#### 学生问题
"分布式锁的三大问题是什么？"

#### 三大问题详解

**问题 1：死锁（DeadLock）**
- **场景**：服务宕机，锁没释放
- **后果**：锁永远不释放，其他服务永远拿不到锁
- **解决方案**：设置过期时间
- **实现**：`SET key value NX EX 30`

**问题 2：锁误删（Wrong Delete）**
- **场景**：删除了别人的锁
- **时间线**：
  1. 服务 A 加锁（过期时间 10 秒）
  2. 服务 A 执行业务（耗时 15 秒）
  3. 10 秒后，锁自动过期
  4. 服务 B 加锁成功
  5. 服务 A 执行完，调用 unlock → 删除了服务 B 的锁
- **解决方案**：加锁时设置唯一标识，释放时验证
- **实现**：UUID + Lua 脚本

**问题 3：锁过期（Lock Expiration）**
- **场景**：业务还没执行完，锁就过期了
- **后果**：多个服务同时执行，数据错乱
- **解决方案**：Redisson 看门狗机制
- **实现**：自动续期

**完整对比表：**

| 问题 | 场景 | 解决方案 | 关键技术 |
|------|------|---------|---------|
| **死锁** | 服务宕机，锁没释放 | 设置过期时间 | `SET key value NX EX 30` |
| **锁误删** | 删除了别人的锁 | 加锁时设置唯一标识，释放时验证 | UUID + Lua 脚本 |
| **锁过期** | 业务还没执行完，锁就过期了 | 自动续期 | Redisson 看门狗 |

**学生表现：** ✅ 完整理解了分布式锁的三大问题和解决方案

---

## 提出的问题

### 问题 1: 为什么微服务需要分布式锁？
**学生的问题**: "为什么微服务需要分布式锁？synchronized 为什么不行？"

**给出的解释**: 
- synchronized 只能锁住单个 JVM 进程
- 微服务部署多台机器，每台机器是独立的 JVM
- 需要使用外部存储（Redis/Zookeeper）作为锁

**理解检查**:
- 理解水平: ✅ 高 - 理解了 synchronized 的局限性

---

### 问题 2: Redis 分布式锁的基本实现
**学生的问题**: "Redis 分布式锁的基本实现是什么？"

**给出的解释**: 
- SETNX + 过期时间（原子操作）
- 释放锁时验证唯一标识（Lua 脚本）

**理解检查**:
- 理解水平: ✅ 高 - 理解了基本实现原理

---

### 问题 3: Redisson 的看门狗机制
**学生的问题**: "Redisson 的看门狗机制是什么？"

**给出的解释**: 
- 自动续期机制
- 默认 30 秒过期，每 10 秒续期
- 业务执行完自动停止

**理解检查**:
- 理解水平: ✅ 高 - 理解了看门狗的原理和作用

---

### 问题 4: 分布式锁的三大问题
**学生的问题**: "分布式锁的三大问题是什么？"

**给出的解释**: 
- 死锁：设置过期时间
- 锁误删：UUID + Lua 脚本
- 锁过期：看门狗自动续期

**理解检查**:
- 理解水平: ✅ 高 - 完整理解了三大问题和解决方案

---

## 识别的知识薄弱点

| 主题 | 严重程度 | 备注 |
|------|----------|------|
| 无 | - | 本次学习理解良好 |

---

## 今日掌握的主题

| 主题 | 信心水平 | 备注 |
|------|----------|------|
| synchronized 局限性 | 高 | 理解了单 JVM 的限制 |
| Redis 分布式锁基本实现 | 高 | SETNX + 过期时间 + Lua 脚本 |
| Redisson 看门狗机制 | 高 | 自动续期原理清楚 |
| 分布式锁三大问题 | 高 | 死锁、锁误删、锁过期及解决方案 |

---

## 涵盖的关键概念

### 1. synchronized 的局限性
- 只能锁住单个 JVM 进程
- 微服务需要跨 JVM 的锁

### 2. Redis 分布式锁
- **SETNX + 过期时间**：`SET key value NX EX 30`
- **唯一标识**：UUID
- **Lua 脚本**：保证验证和删除的原子性

### 3. Redisson 看门狗
- **默认过期时间**：30 秒
- **续期间隔**：10 秒
- **自动停止**：业务执行完或服务宕机

### 4. 三大问题
- **死锁** → 设置过期时间
- **锁误删** → UUID + Lua 脚本
- **锁过期** → 看门狗自动续期

---

## 代码练习

### 手动实现 Redis 分布式锁

```java
@Service
public class OrderService {
    
    @Autowired
    private StringRedisTemplate redisTemplate;
    
    public void createOrder(Long productId) {
        String lockKey = "product_lock:" + productId;
        String lockValue = UUID.randomUUID().toString();
        
        try {
            // 加锁（30 秒过期）
            Boolean locked = redisTemplate.opsForValue()
                .setIfAbsent(lockKey, lockValue, 30, TimeUnit.SECONDS);
            
            if (Boolean.TRUE.equals(locked)) {
                // 执行业务逻辑
                int stock = productService.getStock(productId);
                if (stock > 0) {
                    productService.decreaseStock(productId);
                    orderMapper.insert(order);
                }
            } else {
                throw new RuntimeException("系统繁忙，请稍后重试");
            }
        } finally {
            // 释放锁（Lua 脚本）
            String script = 
                "if redis.call('get', KEYS[1]) == ARGV[1] then " +
                "    return redis.call('del', KEYS[1]) " +
                "else " +
                "    return 0 " +
                "end";
            redisTemplate.execute(
                new DefaultRedisScript<>(script, Long.class),
                Collections.singletonList(lockKey), 
                lockValue
            );
        }
    }
}
```

### Redisson 实现（推荐）

```java
@Service
public class OrderService {
    
    @Autowired
    private RedissonClient redissonClient;
    
    public void createOrder(Long productId) {
        String lockKey = "product_lock:" + productId;
        RLock lock = redissonClient.getLock(lockKey);
        
        try {
            // 加锁（看门狗自动续期）
            boolean locked = lock.tryLock(10, -1, TimeUnit.SECONDS);
            
            if (locked) {
                // 执行业务逻辑
                int stock = productService.getStock(productId);
                if (stock > 0) {
                    productService.decreaseStock(productId);
                    orderMapper.insert(order);
                }
            } else {
                throw new RuntimeException("系统繁忙，请稍后重试");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            // 释放锁
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }
}
```

---

## 关键记忆点

### 为什么需要分布式锁？
```
synchronized 只能锁单个 JVM
微服务有多个 JVM → 需要分布式锁
```

### Redis 分布式锁基本实现
```
SETNX + 过期时间（原子操作）
释放锁时验证唯一标识（Lua 脚本）
```

### Redisson 看门狗
```
默认 30 秒过期
每 10 秒自动续期
业务执行完自动停止
```

### 三大问题
```
1. 死锁 → 设置过期时间
2. 锁误删 → UUID + Lua 脚本
3. 锁过期 → 看门狗自动续期
```

---

## 下次学习的行动项

- [ ] 实践：写代码实现 Redis 分布式锁
- [ ] 实践：使用 Redisson 实现分布式锁
- [ ] 深入：学习 Redis 集群模式下的分布式锁（RedLock）
- [ ] 深入：学习 Zookeeper 分布式锁
- [ ] 继续：Redis 其他知识点（缓存一致性、集群模式）

---

## 备注

### 学生表现评估

**优点：**
1. ✅ **问题意识强**：提出了 4 个核心问题，覆盖了分布式锁的关键知识点
2. ✅ **理解能力好**：能快速理解 synchronized 的局限性和分布式锁的必要性
3. ✅ **系统思维**：从问题（为什么需要）→ 实现（怎么做）→ 优化（看门狗）→ 问题（三大问题）
4. ✅ **学习主动性强**：主动提出深入的技术问题

**本次学习特点：**
- 学习效率高，30 分钟掌握了 4 个核心知识点
- 理解深度好，不仅知道"是什么"，还理解"为什么"
- 适合继续深入学习 Redis 和分布式系统相关知识

---

## 总结

今天系统学习了 Redis 分布式锁的核心知识：
1. ✅ 理解了为什么微服务需要分布式锁（synchronized 的局限性）
2. ✅ 掌握了 Redis 分布式锁的基本实现（SETNX + 过期时间 + Lua 脚本）
3. ✅ 理解了 Redisson 看门狗机制（自动续期）
4. ✅ 掌握了分布式锁的三大问题和解决方案（死锁、锁误删、锁过期）

学生表现优秀，理解深入，建议下次学习：
- 实践：写代码实现分布式锁
- 深入：学习 Redis 集群模式、缓存一致性等高级主题

**学习时长：** 约 30 分钟  
**掌握主题：** 4 个  
**信心水平：** 高

继续保持这个学习节奏！💪

