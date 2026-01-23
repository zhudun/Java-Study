# 学习记录 - 2025-01-19

## 学习概述
- **日期**: 2025-01-19（周日）
- **时长**: 约 60 分钟
- **格式**: 一对一深入讨论
- **主要主题**: 分布式事务 - 最终一致性方案（本地消息表、MQ 事务消息、SAGA 模式）

---

## 学习内容

### 1. TCC 快速回顾

**学生回答：**
- ✅ TCC 三阶段：Try、Confirm、Cancel
- ✅ Try 阶段扣库存："省的别人给我抢了"（防超卖）
- ⚠️ 三大问题忘记了（幂等性、空回滚、悬挂）

**快速复习：**
- **幂等性**：网络超时重试 → 事务记录表 + 状态检查
- **空回滚**：Try 没执行，Cancel 来了 → Cancel 检查 Try 状态
- **悬挂**：Cancel 先到，Try 后到 → Try 检查 Cancel 状态

---

### 2. TCC 的优缺点

**学生理解：**
> "缺点是强一致性，就是每次都得写三阶段"

**纠正：** 强一致性是优点，不是缺点！

#### 优点
- ✅ **强一致性** - 所有服务要么都成功，要么都失败
- ✅ **性能好** - 不需要长时间锁资源
- ✅ **适合核心业务** - 订单、支付等不能出错的场景

#### 缺点
- ❌ **代码侵入性强** - 每个服务要写 Try、Confirm、Cancel 三个方法
- ❌ **开发成本高** - 还要处理幂等性、空回滚、悬挂
- ❌ **业务耦合** - 业务逻辑和事务逻辑混在一起

---

### 3. 分布式事务方案选择

**学生回答：**
> "金额的都得强一致性，不重要的最终一致接口"

✅ **完全正确！** 理解很到位。

#### 强一致性（TCC、2PC）
**必须用的场景：**
- 订单 + 扣款 + 扣库存
- 转账（A 扣钱，B 加钱）
- 支付（扣余额，生成支付记录）

**特点：** 涉及金额、库存等核心资源，不能出错！

#### 最终一致性（本地消息表、MQ 事务消息）
**可以用的场景：**
- 下单成功 → 发送短信通知
- 下单成功 → 赠送积分
- 用户注册 → 发送欢迎邮件
- 订单完成 → 更新统计数据

**特点：** 不涉及核心资源，失败了可以重试，最终成功就行！

---

### 4. 方案1：本地消息表

#### 核心思想
**把"发送消息"和"业务操作"放在同一个本地事务里！**

#### 为什么不能在事务里直接调用远程服务？

**学生回答：**
> "会拖垮主流程"

✅ **完全正确！** 这是核心原因。

**详细问题：**

1. **性能问题**
```java
@Transactional
public void createOrder(Order order) {
    orderMapper.insert(order);              // 10ms
    pointService.addPoint(...);             // 500ms（网络调用）
    notificationService.sendSMS(...);       // 300ms
    statisticsService.updateStats(...);     // 200ms
    
    // 总耗时：1010ms
    // 用户等了 1 秒才看到"下单成功"！❌
}
```

2. **可靠性问题**
```java
@Transactional
public void createOrder(Order order) {
    orderMapper.insert(order);           // ✅ 成功
    pointService.addPoint(...);          // ❌ 积分服务宕机了
    
    // 整个事务回滚，订单也没了！❌
}
```

3. **事务超时**
```java
@Transactional(timeout = 30)
public void createOrder(Order order) {
    orderMapper.insert(order);
    pointService.addPoint(...);  // 网络很慢，30 秒没响应
    
    // 事务超时，回滚，订单也没了！❌
}
```

---

#### 本地消息表实现

**步骤1：创建消息表**

```sql
CREATE TABLE local_message (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    message_id VARCHAR(64) UNIQUE,     -- 消息唯一ID
    content TEXT,                       -- 消息内容（JSON）
    status VARCHAR(20),                 -- PENDING/SUCCESS/FAILED
    retry_count INT DEFAULT 0,          -- 重试次数
    create_time DATETIME,
    update_time DATETIME
);
```

**步骤2：业务操作 + 插入消息（同一个事务）**

```java
@Transactional
public void createOrder(Order order) {
    // 1. 插入订单
    orderMapper.insert(order);
    
    // 2. 插入消息到本地消息表
    LocalMessage message = new LocalMessage();
    message.setMessageId(UUID.randomUUID().toString());
    message.setContent(JSON.toJSONString(Map.of(
        "userId", order.getUserId(),
        "points", 100
    )));
    message.setStatus("PENDING");
    messageMapper.insert(message);
    
    // 3. 提交事务
    // 订单和消息要么都成功，要么都失败！
}
```

**关键：** 订单和消息在同一个数据库事务里，保证原子性！

**步骤3：后台定时任务扫描消息表**

```java
@Scheduled(fixedDelay = 5000)  // 每 5 秒执行一次
public void sendMessage() {
    // 1. 查询待发送的消息
    List<LocalMessage> messages = messageMapper.selectPending();
    
    for (LocalMessage msg : messages) {
        try {
            // 2. 调用积分服务
            Map<String, Object> content = JSON.parseObject(msg.getContent());
            pointService.addPoint(
                (Long) content.get("userId"), 
                (Integer) content.get("points")
            );
            
            // 3. 标记为成功
            msg.setStatus("SUCCESS");
            messageMapper.update(msg);
            
        } catch (Exception e) {
            // 4. 失败了，增加重试次数
            msg.setRetryCount(msg.getRetryCount() + 1);
            
            if (msg.getRetryCount() > 10) {
                msg.setStatus("FAILED");  // 超过 10 次，标记失败
                // 发送告警，人工介入
            }
            
            messageMapper.update(msg);
        }
    }
}
```

---

#### 本地消息表的优势

| 对比项 | 直接调用 | 本地消息表 |
|--------|---------|-----------|
| **响应速度** | 慢（等所有服务） | 快（只等本地事务） |
| **可靠性** | 差（任何服务失败都回滚） | 好（后台重试） |
| **耦合度** | 高（订单依赖积分服务） | 低（异步解耦） |
| **一致性** | 强一致 | 最终一致 |

---

### 5. 方案2：MQ 事务消息（RocketMQ）

#### 核心思想
**MQ 帮你保证：发送消息和本地事务的一致性！**

#### RocketMQ 事务消息流程

```
1. 订单服务 → RocketMQ：发送"半消息"（PREPARE）
2. RocketMQ：存储半消息，但不投递给消费者
3. 订单服务：执行本地事务（插入订单）
4. 订单服务 → RocketMQ：提交消息（COMMIT）
5. RocketMQ：投递消息给积分服务
6. 积分服务：消费消息，增加积分
```

---

#### 代码实现

**步骤1：发送事务消息**

```java
@Service
public class OrderService {
    
    @Autowired
    private TransactionMQProducer producer;
    
    public void createOrder(Order order) {
        // 1. 发送事务消息
        Message message = new Message(
            "order-topic",
            JSON.toJSONString(order).getBytes()
        );
        
        producer.sendMessageInTransaction(message, order);
    }
}
```

**步骤2：实现事务监听器**

```java
@Component
public class OrderTransactionListener implements TransactionListener {
    
    @Autowired
    private OrderMapper orderMapper;
    
    // 执行本地事务
    @Override
    public LocalTransactionState executeLocalTransaction(Message msg, Object arg) {
        try {
            Order order = (Order) arg;
            
            // 执行本地事务：插入订单
            orderMapper.insert(order);
            
            // 本地事务成功，提交消息
            return LocalTransactionState.COMMIT_MESSAGE;
            
        } catch (Exception e) {
            // 本地事务失败，回滚消息
            return LocalTransactionState.ROLLBACK_MESSAGE;
        }
    }
    
    // 事务状态回查（如果 MQ 没收到 COMMIT/ROLLBACK）
    @Override
    public LocalTransactionState checkLocalTransaction(MessageExt msg) {
        // 查询订单是否存在
        String orderId = // 从消息中解析 orderId
        Order order = orderMapper.selectById(orderId);
        
        if (order != null) {
            return LocalTransactionState.COMMIT_MESSAGE;  // 订单存在，提交
        } else {
            return LocalTransactionState.ROLLBACK_MESSAGE;  // 订单不存在，回滚
        }
    }
}
```

**步骤3：消费者处理消息**

```java
@Component
@RocketMQMessageListener(topic = "order-topic", consumerGroup = "point-consumer")
public class PointConsumer implements RocketMQListener<String> {
    
    @Autowired
    private PointService pointService;
    
    @Override
    public void onMessage(String message) {
        Order order = JSON.parseObject(message, Order.class);
        
        // 增加积分
        pointService.addPoint(order.getUserId(), 100);
    }
}
```

---

#### 关键机制：事务回查

**场景：** 订单服务执行完本地事务，准备返回 COMMIT，但网络故障，RocketMQ 没收到。

**怎么办？**

**RocketMQ 会主动回查：** "订单到底插入成功了吗？"

```java
@Override
public LocalTransactionState checkLocalTransaction(MessageExt msg) {
    // 查询数据库，订单是否存在
    Order order = orderMapper.selectById(orderId);
    
    if (order != null) {
        return COMMIT_MESSAGE;  // 订单存在，说明本地事务成功了
    } else {
        return ROLLBACK_MESSAGE;  // 订单不存在，说明本地事务失败了
    }
}
```

**这就是 RocketMQ 的强大之处！** 自动保证一致性。

---

## 学生表现评估

### 优点
1. ✅ **理解准确**：能区分强一致性和最终一致性的适用场景
2. ✅ **抓住核心**："会拖垮主流程" - 一针见血
3. ✅ **记忆牢固**：TCC 的核心点（Try 阶段扣库存）记得很清楚

### 需要加强
1. ⚠️ **细节记忆**：TCC 三大问题需要复习
2. ⚠️ **对比思考**：本地消息表 vs MQ 事务消息的区别（未回答）

---

## 知识点掌握情况

### ✅ 已掌握
- **TCC 核心概念**（高信心）
  - Try-Confirm-Cancel 三阶段
  - Try 阶段扣库存防超卖
  - 优缺点理解清晰

- **分布式事务方案选择**（高信心）
  - 强一致性：金额、库存等核心资源
  - 最终一致性：积分、通知等非核心业务

- **本地消息表原理**（中高信心）
  - 核心思想：业务操作 + 插入消息在同一事务
  - 优势：快速响应、解耦、可靠性
  - 为什么不能直接调用远程服务

- **MQ 事务消息原理**（中信心）
  - 半消息机制
  - 事务回查机制
  - 代码实现流程

### ⚠️ 需要加强
- **TCC 三大问题**（需要复习）
  - 幂等性、空回滚、悬挂

- **本地消息表 vs MQ 事务消息对比**（需要学习）
  - 各自的优缺点
  - 适用场景

---

## 下次学习建议

1. **复习 TCC 三大问题**
   - 幂等性、空回滚、悬挂的场景和解决方案

2. **对比学习**
   - 本地消息表 vs MQ 事务消息
   - TCC vs 2PC vs SAGA

3. **实战练习**
   - 手写一个本地消息表的完整示例
   - 模拟网络故障、服务宕机等异常场景

4. **学习 SAGA 模式**
   - 长事务场景
   - 补偿机制

---

## 学生提出的好问题

1. ✅ "缺点是强一致性，就是每次都得写三阶段"
   - 纠正：强一致性是优点，代码侵入性强是缺点

2. ✅ "金额的都得强一致性，不重要的最终一致接口"
   - 完全正确的理解

3. ✅ "会拖垮主流程"
   - 一针见血，抓住了本地消息表的核心优势

---

## 关键记忆点

### 分布式事务方案选择

| 场景 | 方案 | 原因 |
|------|------|------|
| 订单 + 扣款 + 扣库存 | TCC | 涉及金额，必须强一致 |
| 下单 + 赠送积分 | 本地消息表/MQ | 积分失败不影响订单 |
| 下单 + 发送短信 | 本地消息表/MQ | 短信失败可以重试 |

### 本地消息表流程

```
1. 开启事务
2. 插入订单 ✅
3. 插入消息（PENDING）✅
4. 提交事务
5. 后台定时任务扫描消息
6. 调用积分服务
   - 成功 → 标记 SUCCESS
   - 失败 → 重试（最多 10 次）
```

### RocketMQ 事务消息流程

```
1. 发送半消息（PREPARE）
2. 执行本地事务
   - 成功 → 返回 COMMIT
   - 失败 → 返回 ROLLBACK
3. RocketMQ 投递消息
4. 如果没收到响应 → 回查事务状态
```

---

## 总结

今天学习了分布式事务的最终一致性方案，重点是本地消息表和 MQ 事务消息。学生能够准确区分强一致性和最终一致性的适用场景，理解了为什么不能在事务里直接调用远程服务（"会拖垮主流程"）。掌握了本地消息表的核心思想和实现流程，了解了 RocketMQ 事务消息的半消息机制和事务回查机制。下次学习可以对比各种方案的优缺点，并进行实战练习。
