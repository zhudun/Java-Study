# 学习记录 - 2026-01-25

## 学习概述
- **日期**: 2026-01-25（周日）
- **时长**: 约 30 分钟
- **格式**: 复习 + 新知识学习
- **主要主题**: 分布式事务复习 + Seata 框架（AT 模式）

---

## 学习内容

### 1. 分布式事务快速复习

#### 学生回答评价

**问题1：TCC 三阶段**
> "try 锁定库存，confirm 真正对库存进行操作，cancel 取消"

✅ **核心理解正确**

**补充：** Try 阶段不只是"锁定"，而是**真正扣减 available**（防超卖），同时增加 frozen 标记。

---

**问题2：SAGA vs TCC**
> "一个更加效率好维护，一个比较繁冗，一个是最终一致性，一个是强一致性"

✅ **完全正确**

- SAGA：效率好、易维护、最终一致性、直接执行 + 补偿（2个方法）
- TCC：繁冗、强一致性、Try-Confirm-Cancel（3个方法）

---

**问题3：本地消息表**
> "就是记录但先不执行，之后同步，保证最终一致性"

✅ **核心理解正确**

**补充：** 核心是把"插入消息"和"业务操作"放在**同一个本地事务**里，保证原子性。

---

**问题4 & 5：未回答**

**补充答案：**

**为什么不能在事务里直接调用远程服务？**
- 会拖垮主流程（性能问题、可靠性问题、事务超时）

**旅游预订支付强一致怎么设计？**
- 支付 TCC，外层 SAGA

---

### 2. Seata 框架介绍

#### 手写 TCC 的痛点

**学生回答：**
> "AOP"

✅ **思路正确**，但 Seata 的解决方案更强大。

---

#### Seata 是什么？

**Seata = Simple Extensible Autonomous Transaction Architecture**

阿里开源的分布式事务框架，支持多种事务模式：
1. **AT 模式** - 自动补偿（最简单，推荐）
2. **TCC 模式** - 手动补偿（灵活，复杂）
3. **SAGA 模式** - 长事务
4. **XA 模式** - 强一致性（性能差）

---

### 3. AT 模式详解

#### 核心思想

**你只需要写正常的业务代码，Seata 自动帮你做 TCC！**

```java
// 订单服务
@GlobalTransactional  // 只需要加一个注解！
public void createOrder(Order order) {
    // 1. 插入订单（正常写法）
    orderMapper.insert(order);
    
    // 2. 调用库存服务（正常写法）
    stockService.reduce(order.getProductId(), order.getQuantity());
    
    // 3. 调用账户服务（正常写法）
    accountService.deduct(order.getUserId(), order.getAmount());
}

// 库存服务
public void reduce(Long productId, int quantity) {
    // 正常的业务代码
    stockMapper.reduce(productId, quantity);
}
```

**就这么简单！** 不需要写 try、confirm、cancel 方法！

---

#### Seata 的角色

```
TC (Transaction Coordinator) - 事务协调者
├─ 管理全局事务
├─ 协调分支事务
└─ 决定提交还是回滚

TM (Transaction Manager) - 事务管理器
├─ 开启全局事务
└─ 提交或回滚全局事务

RM (Resource Manager) - 资源管理器
├─ 管理分支事务
├─ 注册分支事务
└─ 执行分支提交或回滚
```

---

#### AT 模式执行流程

**阶段一：执行业务 SQL**

```
1. TM 向 TC 申请开启全局事务
2. TC 返回全局事务 ID (XID)
3. RM 执行业务 SQL 前，记录 undo_log（前镜像）
4. RM 执行业务 SQL
5. RM 执行业务 SQL 后，记录 undo_log（后镜像）
6. RM 向 TC 注册分支事务
7. RM 提交本地事务（业务数据 + undo_log）
```

**例子：扣减库存**

```sql
-- 1. 记录前镜像（执行前的数据）
SELECT * FROM stock WHERE product_id = 1;
-- 结果：{product_id: 1, quantity: 100}

-- 2. 执行业务 SQL
UPDATE stock SET quantity = quantity - 10 WHERE product_id = 1;

-- 3. 记录后镜像（执行后的数据）
SELECT * FROM stock WHERE product_id = 1;
-- 结果：{product_id: 1, quantity: 90}

-- 4. 保存 undo_log
INSERT INTO undo_log (xid, branch_id, rollback_info) VALUES (
    'global-tx-001',
    'branch-001',
    '{
        "beforeImage": {"quantity": 100},
        "afterImage": {"quantity": 90},
        "sql": "UPDATE stock SET quantity = 90 WHERE product_id = 1"
    }'
);

-- 5. 提交本地事务
COMMIT;
```

---

**阶段二：提交或回滚**

**如果全部成功：**
```
1. TM 通知 TC 提交全局事务
2. TC 通知所有 RM 提交分支事务
3. RM 删除 undo_log
4. 完成
```

**如果任何一个失败：**
```
1. TM 通知 TC 回滚全局事务
2. TC 通知所有 RM 回滚分支事务
3. RM 根据 undo_log 生成反向 SQL
4. RM 执行反向 SQL（自动回滚）
5. RM 删除 undo_log
6. 完成
```

---

#### 自动回滚的原理

**学生回答：**
> "根据 undo_log 里面的记载来回滚的"

✅ **完全正确！**

**详细流程：**

**undo_log 记录的内容：**
```json
{
    "xid": "global-tx-001",
    "branchId": "branch-001",
    "tableName": "stock",
    "beforeImage": {
        "product_id": 1,
        "quantity": 100
    },
    "afterImage": {
        "product_id": 1,
        "quantity": 90
    },
    "sqlType": "UPDATE"
}
```

**回滚步骤：**
```
1. TC 通知 RM 回滚
2. RM 读取 undo_log
3. RM 根据 beforeImage 生成反向 SQL
   UPDATE stock SET quantity = 100 WHERE product_id = 1;
4. RM 执行反向 SQL
5. RM 删除 undo_log
6. 提交
```

**数据恢复到原来的状态！** ✅

---

### 4. AT 模式 vs 手写 TCC

**学生回答：**
> "前者有 undo_log 后者不需要，但是前者开发成本低，后者高"

✅ **完全正确！** 抓住了核心！

| 对比项 | Seata AT 模式 | 手写 TCC |
|--------|--------------|----------|
| **回滚方式** | undo_log 自动生成反向 SQL | 手动写 Cancel 方法 |
| **开发成本** | 低（只加注解） | 高（每个服务 3 个方法） |
| **代码侵入** | 低（正常业务代码） | 高（业务代码 + 事务代码） |
| **性能** | 中（需要记录 undo_log） | 高（不需要 undo_log） |
| **灵活性** | 低（只支持关系型数据库） | 高（支持任何资源） |
| **幂等性** | Seata 自动处理 | 手动处理 |
| **空回滚** | Seata 自动处理 | 手动处理 |
| **悬挂** | Seata 自动处理 | 手动处理 |

---

#### 一句话总结

**AT 模式：** 用 undo_log 换开发效率（自动回滚，零侵入）

**手写 TCC：** 用开发成本换性能和灵活性（手动回滚，精细控制）

---

### 5. AT 模式的优缺点

#### 优点

1. **零侵入**
   - 只需要加 @GlobalTransactional 注解
   - 正常写业务代码

2. **自动处理 TCC 三大问题**
   - 幂等性：通过 xid + branchId 保证
   - 空回滚：检查 undo_log 是否存在
   - 悬挂：Try 执行前检查是否已经 Cancel

3. **开发成本低**
   - 不需要写 try、confirm、cancel 方法
   - 不需要写事务记录表

---

#### 缺点

1. **性能开销**
   - 每次执行业务 SQL 都要：
     - 查询前镜像（SELECT）
     - 执行业务 SQL（UPDATE）
     - 查询后镜像（SELECT）
     - 插入 undo_log（INSERT）
   - 比手写 TCC 多了 3 次数据库操作

2. **只支持关系型数据库**
   - 依赖 SQL 解析、undo_log 表、数据库事务
   - 不支持 NoSQL（MongoDB、Redis）
   - 不支持消息队列（RabbitMQ、Kafka）
   - 不支持第三方 API

3. **数据隔离问题**
   - 分支事务提交后，其他事务可能读到中间状态
   - 如果全局事务回滚，其他事务读到的是脏数据
   - 解决方案：Seata 提供全局锁机制

---

### 6. 实际项目中如何选择？

#### 选择 Seata AT 模式

✅ **适合场景：**
- 业务简单，只涉及数据库操作
- 团队经验不足，不想手写 TCC
- 快速开发，降低成本

**例子：**
- 订单 + 库存 + 账户（都是数据库操作）
- 内部系统，可控性强

---

#### 选择手写 TCC

✅ **适合场景：**
- 涉及非关系型数据库（Redis、MongoDB）
- 涉及第三方 API（支付宝、微信支付）
- 需要精细控制（如库存预留策略）
- 性能要求极高

**例子：**
- 秒杀系统（Redis 扣库存）
- 支付系统（调用第三方支付 API）
- 旅游预订（第三方航空公司 API）

---

#### 混合使用

✅ **实际项目中：**
```
订单服务 + 库存服务 → Seata AT 模式（数据库操作）
支付服务 → 手写 TCC（调用支付宝 API）
```

**灵活组合，发挥各自优势！**

---

## 学生表现评估

### 优点
1. ✅ **复习效果好**：核心概念都记得（TCC、SAGA、本地消息表）
2. ✅ **理解准确**：能准确区分 AT 模式和手写 TCC 的区别
3. ✅ **抓住核心**："undo_log"、"开发成本"
4. ✅ **思维活跃**：提出用 AOP 简化 TCC

### 需要加强
1. ⚠️ **细节记忆**：Try 阶段的具体实现（真正扣 available）
2. ⚠️ **完整性**：部分问题未回答（问题4、5）

---

## 知识点掌握情况

### ✅ 已掌握
- **分布式事务核心概念**（高信心）
  - TCC 三阶段
  - SAGA vs TCC 区别
  - 本地消息表原理

- **Seata AT 模式**（中高信心）
  - 核心思想：零侵入，自动回滚
  - undo_log 原理：记录前后镜像，生成反向 SQL
  - AT vs TCC：用 undo_log 换开发效率

### ⚠️ 需要加强
- **AT 模式实战**
  - 如何配置 Seata
  - 如何处理数据隔离问题
  - 全局锁机制

- **Seata 其他模式**
  - TCC 模式（Seata 版本）
  - SAGA 模式（状态机引擎）
  - XA 模式

---

## 关键记忆点

### AT 模式核心流程

```
阶段一：执行业务 SQL
1. 记录前镜像（SELECT）
2. 执行业务 SQL（UPDATE）
3. 记录后镜像（SELECT）
4. 保存 undo_log（INSERT）
5. 提交本地事务（COMMIT）

阶段二：提交或回滚
- 成功：删除 undo_log
- 失败：根据 undo_log 生成反向 SQL，执行回滚
```

### AT 模式 vs 手写 TCC

| 对比项 | AT 模式 | 手写 TCC |
|--------|---------|----------|
| **回滚方式** | undo_log 自动 | 手动 Cancel |
| **开发成本** | 低 | 高 |
| **性能** | 中 | 高 |
| **灵活性** | 低 | 高 |

**记忆口诀：** AT 模式用 undo_log 换开发效率。

---

## 总结

今天学习了 Seata 框架的 AT 模式，这是阿里开源的分布式事务解决方案。AT 模式通过 undo_log 实现自动回滚，开发者只需要写正常的业务代码，加上 @GlobalTransactional 注解即可。相比手写 TCC，AT 模式大大降低了开发成本，但性能略低，且只支持关系型数据库。实际项目中可以根据场景灵活选择：数据库操作用 AT 模式，第三方 API 用手写 TCC。

学生对分布式事务的核心概念掌握良好，能够准确理解 AT 模式的原理和优缺点。下次学习可以继续深入 Seata 的其他模式，或者学习分布式锁等其他分布式系统主题。
