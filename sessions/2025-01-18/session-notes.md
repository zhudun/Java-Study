# 学习记录 - 2025-01-18

## 学习概述
- **日期**: 2025-01-18（周六）
- **时长**: 约 60 分钟
- **格式**: 一对一深入讨论
- **主要主题**: 分布式事务（TCC 模式）

---

## 学习内容

### 1. ACID 特性复习

**学生初始理解：**
- 原子性、连续性（应为一致性）、隔离性、持久性
- 理解分布式事务的核心问题：跨服务、跨数据库

**详细讲解内容：**

#### A - Atomicity（原子性）
- 核心：要么全做，要么全不做
- 实现：undo log（回滚日志）
- 例子：转账两步操作，任何一步失败都回滚

#### C - Consistency（一致性）
- 核心：数据从一个合法状态到另一个合法状态
- 包括：约束一致性（数据库层面）+ 业务一致性（应用层面）
- 例子：转账前后总金额不变、余额不能为负

#### I - Isolation（隔离性）
- 核心：并发事务互不干扰
- 三种读问题：
  - **脏读**：读到未提交的数据
  - **不可重复读**：同一事务内，两次读同一行数据不一致
  - **幻读**：同一事务内，两次读同一范围，行数变化
- MySQL 默认隔离级别：Repeatable Read（防脏读 + 不可重复读）

**学生关键提问：**
> "所以三种读的问题的前提是同一事务下吧？"

✅ 正确理解：都是在一个事务内，受其他并发事务影响

#### D - Durability（持久性）
- 核心：提交后，数据永久保存
- 实现：redo log（重做日志）
- 流程：写 redo log（磁盘）→ 写内存 → 返回成功 → 后台刷盘
- 断电后：读取 redo log 恢复数据

**学生关键提问：**
> "持久性我觉得这不是理所当然的吗？怎么该作为属性单独列出来了？"

**解答：** 持久性不是理所当然的，是数据库通过 redo log 精心设计的结果。早期数据库面临"立即写磁盘（慢）vs 先写内存（不安全）"的矛盾，redo log 解决了这个问题。

---

### 2. 事务传播机制（简要讨论）

**学生提问：**
> "隔离级别考的多，传播机制是不是考的少？为什么？还有传播机制的作用是什么？"

**解答：**
- **为什么考得少：**
  - 隔离级别：数据库层面，所有数据库都有
  - 传播机制：Spring 框架概念，只在 Java Spring 项目中有
  - 大部分场景用默认的 REQUIRED 就够了

- **传播机制作用：**
  - 解决：一个有事务的方法调用另一个有事务的方法时，事务如何处理
  - 常见类型：
    - REQUIRED（默认）：加入外层事务
    - REQUIRES_NEW：创建新事务
    - NESTED：嵌套事务

---

### 3. 分布式事务 - TCC 模式（核心内容）

#### 3.1 为什么需要分布式事务？

**场景：电商下单**
```
订单服务（订单DB）→ 创建订单
库存服务（库存DB）→ 扣减库存
账户服务（账户DB）→ 扣减余额
```

**问题：** 如果账户扣款失败，订单和库存已经在不同数据库里了，`@Transactional` 管不到！

---

#### 3.2 TCC 模式详解

**TCC = Try - Confirm - Cancel**

##### Try 阶段（预留资源）
```java
// 库存服务
tryReduceStock() {
    stock.available -= 10;  // 真正扣库存（防超卖）
    stock.frozen += 10;     // 标记冻结
}

// 账户服务
tryDeduct() {
    account.frozen += 100;  // 冻结金额
}
```

**关键点：Try 阶段就要真正扣减 available，否则会超卖！**

##### Confirm 阶段（确认执行）
```java
confirmReduceStock() {
    stock.frozen -= 10;  // 释放冻结标记
    // available 不变（Try 阶段已经扣了）
}

confirmDeduct() {
    account.balance -= 100;  // 真正扣款
    account.frozen -= 100;   // 释放冻结
}
```

##### Cancel 阶段（回滚）
```java
cancelReduceStock() {
    stock.available += 10;  // 加回库存
    stock.frozen -= 10;     // 释放冻结
}

cancelDeduct() {
    account.frozen -= 100;  // 释放冻结
}
```

---

#### 3.3 TCC 的三大难题及解决方案

**学生评价：**
> "你说的这几个问题也是我想到的"

##### 问题1：幂等性 - 重复调用怎么办？

**场景：** 网络超时导致重试

**解决方案：事务记录表**
```java
// 事务记录表
CREATE TABLE tcc_transaction (
    tx_id VARCHAR(64) PRIMARY KEY,
    status VARCHAR(20),  -- TRY/CONFIRM/CANCEL
    amount INT,
    create_time DATETIME
);

// Confirm 方法改造
@Transactional
public void confirmDeduct(String txId) {
    // 1. 检查是否已经执行过
    TccTransaction record = transactionMapper.selectById(txId);
    if (record != null && "CONFIRM".equals(record.getStatus())) {
        return;  // 幂等返回
    }
    
    // 2. 执行业务逻辑
    account.balance -= 100;
    account.frozen -= 100;
    
    // 3. 记录状态
    record.setStatus("CONFIRM");
    transactionMapper.update(record);
}
```

##### 问题2：空回滚 - Try 没执行，Cancel 却来了

**场景：** Try 请求丢失，协调者超时调用 Cancel

**解决方案：Cancel 检查 Try 状态**
```java
@Transactional
public void cancelDeduct(String txId) {
    // 1. 检查 Try 是否执行过
    TccTransaction record = transactionMapper.selectById(txId);
    if (record == null) {
        // 空回滚：记录 Cancel 状态，防止 Try 延迟到达
        record = new TccTransaction();
        record.setTxId(txId);
        record.setStatus("CANCEL");
        transactionMapper.insert(record);
        return;
    }
    
    // 2. 正常回滚
    account.frozen -= record.getAmount();
    record.setStatus("CANCEL");
}
```

##### 问题3：悬挂 - Cancel 先到，Try 后到

**场景：** Try 请求延迟，Cancel 先执行（空回滚），Try 后到达

**问题：** Try 冻结了金额，但永远不会有 Confirm/Cancel 来释放

**解决方案：Try 检查 Cancel 状态**
```java
@Transactional
public void tryDeduct(String txId, int amount) {
    // 1. 防悬挂：检查是否已经 Cancel
    TccTransaction record = transactionMapper.selectById(txId);
    if (record != null && "CANCEL".equals(record.getStatus())) {
        throw new RuntimeException("事务已取消，拒绝执行");
    }
    
    // 2. 幂等检查
    if (record != null && "TRY".equals(record.getStatus())) {
        return;
    }
    
    // 3. 业务逻辑
    account.frozen += amount;
    
    // 4. 记录状态
    record.setStatus("TRY");
}
```

---

#### 3.4 学生关键提问

**提问1：**
> "我先说下我的疑惑，confirm 中已经释放了冻结，为何 cancel 里面再次释放冻结？"

**解答：** Confirm 和 Cancel 是互斥的，只会执行其中一个。
- Try 都成功 → 执行 Confirm
- 任何 Try 失败 → 执行 Cancel
- 不会同时执行两个

**状态机：**
```
初始状态
   ↓
[TRY]
   ↓
   ├─→ [CONFIRM] (不可逆)
   └─→ [CANCEL] (不可逆)
```

**提问2：**
> "那如果 confirm 重试过程中库存没了，咋办？"

**解答：** 这不应该发生！因为：
- Try 阶段：`available -= 10`（真正扣库存）
- Confirm 阶段：`frozen -= 10`（只是释放冻结标记）
- Confirm 重试时不需要再扣库存，只是改状态

**提问3：**
> "为什么 Try 阶段就要扣库存，而不是 Confirm 阶段才扣？"

**学生回答：**
> "会有突然发现前后读取数据不一样的情况"

✅ 方向正确！

**详细解答：** 如果 Confirm 才扣库存，会导致超卖：
```
1. 用户A Try：available 还是 100，frozen += 10
2. 用户B Try：available 还是 100，frozen += 95
3. 用户A Confirm：available = 90
4. 用户B Confirm：available = -5 ❌ 超卖了！
```

**正确做法：** Try 阶段就扣 available，防止超卖。

---

## 学生表现评估

### 优点
1. ✅ **思维敏锐**：能主动发现问题（幂等性、空回滚、悬挂）
2. ✅ **深入思考**：提出"持久性为什么要单独列出"等深层问题
3. ✅ **逻辑清晰**：理解 Confirm 和 Cancel 互斥关系
4. ✅ **举一反三**：能从超卖问题理解 Try 阶段扣库存的必要性

### 需要加强
1. ⚠️ **概念混淆**：初始时把一致性说成"连续性"
2. ⚠️ **细节理解**：对 Confirm 重试时的状态变化需要更多练习

---

## 知识点掌握情况

### ✅ 已掌握
- **ACID 特性**（高信心）
  - 原子性：要么全做，要么全不做
  - 一致性：数据符合约束和业务规则
  - 隔离性：三种读问题（脏读、不可重复读、幻读）
  - 持久性：redo log 保证数据不丢失

- **TCC 模式核心概念**（中高信心）
  - Try-Confirm-Cancel 三阶段
  - Try 阶段预留资源（真正扣库存）
  - Confirm 和 Cancel 互斥
  - 三大问题：幂等性、空回滚、悬挂

### ⚠️ 需要加强
- **TCC 实战细节**
  - 事务记录表的完整设计
  - 异步补偿机制
  - 人工介入流程

- **其他分布式事务方案**
  - 2PC（两阶段提交）
  - SAGA
  - 本地消息表
  - MQ 事务消息

---

## 下次学习建议

1. **TCC 实战练习**
   - 手写一个完整的 TCC 示例
   - 模拟网络超时、服务宕机等异常场景

2. **对比其他分布式事务方案**
   - 2PC vs TCC
   - SAGA 适用场景
   - 最终一致性方案

3. **分布式事务框架**
   - Seata 框架使用
   - AT 模式 vs TCC 模式

---

## 学生提出的好问题

1. ✅ "所以三种读的问题的前提是同一事务下吧？"
2. ✅ "持久性我觉得这不是理所当然的吗？"
3. ✅ "隔离级别考的多，传播机制是不是考的少？为什么？"
4. ✅ "confirm 中已经释放了冻结，为何 cancel 里面再次释放冻结？"
5. ✅ "那如果 confirm 重试过程中库存没了，咋办？"
6. ✅ "为什么 Try 阶段就要扣库存？"

---

## 代码示例

### 完整的 TCC 实现（账户服务）

```java
@Service
public class AccountTccService {
    
    @Autowired
    private AccountMapper accountMapper;
    
    @Autowired
    private TccTransactionMapper transactionMapper;
    
    // ========== Try 阶段 ==========
    @Transactional
    public void tryDeduct(String txId, Long userId, int amount) {
        // 1. 防悬挂：检查是否已经 Cancel
        TccTransaction record = transactionMapper.selectById(txId);
        if (record != null && "CANCEL".equals(record.getStatus())) {
            throw new RuntimeException("事务已取消");
        }
        
        // 2. 幂等：检查是否已经 Try 过
        if (record != null && "TRY".equals(record.getStatus())) {
            return;
        }
        
        // 3. 业务逻辑：冻结金额
        Account account = accountMapper.selectById(userId);
        if (account.getBalance() < amount) {
            throw new RuntimeException("余额不足");
        }
        account.setFrozen(account.getFrozen() + amount);
        accountMapper.update(account);
        
        // 4. 记录状态
        if (record == null) {
            record = new TccTransaction();
            record.setTxId(txId);
            record.setUserId(userId);
        }
        record.setStatus("TRY");
        record.setAmount(amount);
        transactionMapper.insertOrUpdate(record);
    }
    
    // ========== Confirm 阶段 ==========
    @Transactional
    public void confirmDeduct(String txId) {
        // 1. 幂等：检查是否已经 Confirm
        TccTransaction record = transactionMapper.selectById(txId);
        if (record != null && "CONFIRM".equals(record.getStatus())) {
            return;
        }
        
        // 2. 业务逻辑：真正扣款
        Account account = accountMapper.selectById(record.getUserId());
        account.setBalance(account.getBalance() - record.getAmount());
        account.setFrozen(account.getFrozen() - record.getAmount());
        accountMapper.update(account);
        
        // 3. 记录状态
        record.setStatus("CONFIRM");
        transactionMapper.update(record);
    }
    
    // ========== Cancel 阶段 ==========
    @Transactional
    public void cancelDeduct(String txId) {
        // 1. 检查 Try 是否执行过
        TccTransaction record = transactionMapper.selectById(txId);
        
        // 2. 空回滚：Try 没执行
        if (record == null) {
            record = new TccTransaction();
            record.setTxId(txId);
            record.setStatus("CANCEL");
            transactionMapper.insert(record);
            return;
        }
        
        // 3. 幂等：已经 Cancel 过
        if ("CANCEL".equals(record.getStatus())) {
            return;
        }
        
        // 4. 业务逻辑：释放冻结
        Account account = accountMapper.selectById(record.getUserId());
        account.setFrozen(account.getFrozen() - record.getAmount());
        accountMapper.update(account);
        
        // 5. 记录状态
        record.setStatus("CANCEL");
        transactionMapper.update(record);
    }
}
```

### 库存服务 TCC 实现

```java
@Service
public class StockTccService {
    
    // ========== Try 阶段 ==========
    @Transactional
    public void tryReduceStock(String txId, Long productId, int quantity) {
        // 防悬挂 + 幂等检查（同上）
        
        // 业务逻辑：真正扣库存（防超卖）
        Stock stock = stockMapper.selectById(productId);
        if (stock.getAvailable() < quantity) {
            throw new RuntimeException("库存不足");
        }
        stock.setAvailable(stock.getAvailable() - quantity);  // 真正扣
        stock.setFrozen(stock.getFrozen() + quantity);        // 标记冻结
        stockMapper.update(stock);
        
        // 记录状态
        record.setStatus("TRY");
        transactionMapper.insertOrUpdate(record);
    }
    
    // ========== Confirm 阶段 ==========
    @Transactional
    public void confirmReduceStock(String txId) {
        // 幂等检查
        
        // 业务逻辑：释放冻结标记
        Stock stock = stockMapper.selectById(record.getProductId());
        stock.setFrozen(stock.getFrozen() - record.getQuantity());
        stockMapper.update(stock);
        // 注意：available 不变！Try 阶段已经扣了
        
        // 记录状态
        record.setStatus("CONFIRM");
        transactionMapper.update(record);
    }
    
    // ========== Cancel 阶段 ==========
    @Transactional
    public void cancelReduceStock(String txId) {
        // 空回滚 + 幂等检查
        
        // 业务逻辑：恢复库存
        Stock stock = stockMapper.selectById(record.getProductId());
        stock.setAvailable(stock.getAvailable() + record.getQuantity());  // 加回去
        stock.setFrozen(stock.getFrozen() - record.getQuantity());
        stockMapper.update(stock);
        
        // 记录状态
        record.setStatus("CANCEL");
        transactionMapper.update(record);
    }
}
```

---

## 关键记忆点

### TCC 三大问题解决方案

| 问题 | 场景 | 解决方案 |
|------|------|---------|
| **幂等性** | 网络超时导致重试 | 事务记录表 + 状态检查 |
| **空回滚** | Try 没执行，Cancel 来了 | Cancel 检查 Try 状态 |
| **悬挂** | Cancel 先到，Try 后到 | Try 检查 Cancel 状态 |

### TCC 状态转换

```
初始状态
   ↓
[TRY] ← 预留资源
   ↓
   ├─→ [CONFIRM] ← 确认执行（不可逆）
   └─→ [CANCEL] ← 回滚（不可逆）
```

### Try 阶段的关键设计

```java
// 库存服务 Try 阶段
tryReduceStock() {
    stock.available -= 10;  // ✅ 真正扣库存（防超卖）
    stock.frozen += 10;     // ✅ 标记冻结
}

// 如果 Confirm 才扣库存，会导致超卖！
```

---

## 总结

今天深入学习了分布式事务的 TCC 模式，从 ACID 基础到 TCC 的三大难题，学生表现出色，能够主动发现问题并深入思考。TCC 的核心思想是"先预留，再确认"，通过事务记录表解决幂等性、空回滚、悬挂三大问题。下次学习可以进行 TCC 实战练习，并对比其他分布式事务方案。
