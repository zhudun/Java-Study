# SAGA 模式学习 - 2025-01-19

## 学习内容

### 1. SAGA 模式引入

#### 场景：跨境旅游预订

**需求：**
1. 预订机票 - 调用航空公司服务
2. 预订酒店 - 调用酒店服务
3. 预订租车 - 调用租车服务
4. 扣款 - 调用支付服务

**学生回答：TCC 的问题**
> "可以是可以，但是比较慢"

✅ 部分正确，但还有更大的问题！

---

#### TCC 在长事务场景的问题

**问题1：资源锁定时间长**
```
Try 阶段：
- 机票座位冻结 5 秒
- 酒店房间冻结 5 秒
- 租车车辆冻结 5 秒
→ 其他用户无法预订 ❌
```

**问题2：第三方服务不支持 TCC**
```
第三方航空公司 API：
- 没有 try() 方法 ❌
- 没有 confirm() 方法 ❌
- 没有 cancel() 方法 ❌
- 只有 book()（直接预订）和 refund()（退款）
```

**问题3：开发成本高**
- 4 个服务 × 3 个方法 = 12 个方法要写
- 每个方法都要处理幂等性、空回滚、悬挂

---

### 2. SAGA 模式核心思想

**不要 Try-Confirm-Cancel，直接执行 + 补偿！**

```
正向流程：
1. 预订机票 ✅
2. 预订酒店 ✅
3. 预订租车 ✅
4. 扣款 ❌ (失败了)

补偿流程（反向执行）：
5. 取消租车 ✅
6. 取消酒店 ✅
7. 取消机票 ✅
```

**关键：**
- 每个服务只需要 2 个方法：**正向操作** + **补偿操作**
- 不需要冻结资源，直接执行
- 失败了就反向补偿

---

### 3. SAGA 的两种实现方式

#### 方式1：协同式 SAGA（Choreography）

**每个服务自己决定下一步做什么**

```
订单服务：
1. 创建订单 ✅
2. 发送消息："订单创建成功"

机票服务（监听消息）：
3. 收到消息，预订机票 ✅
4. 发送消息："机票预订成功"

酒店服务（监听消息）：
5. 收到消息，预订酒店 ✅
6. 发送消息："酒店预订成功"

支付服务（监听消息）：
7. 收到消息，扣款 ❌ (失败)
8. 发送消息："支付失败"

酒店服务（监听消息）：
9. 收到"支付失败"，取消酒店 ✅

机票服务（监听消息）：
10. 收到"支付失败"，取消机票 ✅
```

**特点：**
- ✅ 去中心化，服务独立
- ❌ 流程分散，难以理解和维护

---

#### 方式2：编排式 SAGA（Orchestration）- 推荐

**有一个协调者统一编排流程**

```java
@Service
public class TravelSagaOrchestrator {
    
    public void bookTravel(TravelOrder order) {
        try {
            // 1. 预订机票
            String flightId = flightService.bookFlight(order);
            
            // 2. 预订酒店
            String hotelId = hotelService.bookHotel(order);
            
            // 3. 预订租车
            String carId = carService.bookCar(order);
            
            // 4. 扣款
            paymentService.pay(order);
            
            // 全部成功！
            
        } catch (Exception e) {
            // 失败了，开始补偿
            compensate(flightId, hotelId, carId);
        }
    }
    
    private void compensate(String flightId, String hotelId, String carId) {
        // 反向补偿
        if (carId != null) {
            carService.cancelCar(carId);
        }
        if (hotelId != null) {
            hotelService.cancelHotel(hotelId);
        }
        if (flightId != null) {
            flightService.cancelFlight(flightId);
        }
    }
}
```

**特点：**
- ✅ 流程清晰，易于理解
- ✅ 集中管理，易于维护
- ✅ 适合复杂业务流程

---

### 4. SAGA 状态机实现

**为了更可靠，记录每一步的状态：**

```sql
CREATE TABLE saga_log (
    id BIGINT PRIMARY KEY,
    saga_id VARCHAR(64),
    step_name VARCHAR(100),
    status VARCHAR(20),  -- SUCCESS/FAILED/COMPENSATED
    forward_data TEXT,
    compensate_data TEXT,
    create_time DATETIME
);
```

```java
@Service
public class TravelSagaOrchestrator {
    
    public void bookTravel(TravelOrder order) {
        String sagaId = UUID.randomUUID().toString();
        
        try {
            // 步骤1：预订机票
            String flightId = flightService.bookFlight(order);
            saveSagaLog(sagaId, "BOOK_FLIGHT", "SUCCESS", flightId);
            
            // 步骤2：预订酒店
            String hotelId = hotelService.bookHotel(order);
            saveSagaLog(sagaId, "BOOK_HOTEL", "SUCCESS", hotelId);
            
            // 步骤3：预订租车
            String carId = carService.bookCar(order);
            saveSagaLog(sagaId, "BOOK_CAR", "SUCCESS", carId);
            
            // 步骤4：扣款
            paymentService.pay(order);
            saveSagaLog(sagaId, "PAYMENT", "SUCCESS", null);
            
        } catch (Exception e) {
            // 查询已完成的步骤
            List<SagaLog> logs = sagaLogMapper.selectBySagaId(sagaId);
            
            // 反向补偿
            for (int i = logs.size() - 1; i >= 0; i--) {
                compensateStep(logs.get(i));
            }
        }
    }
}
```

---

### 5. SAGA vs TCC 核心区别

**学生回答：**
> "操作简单，最终一致性"

✅ **完全正确！** 抓住了核心点。

| 对比项 | TCC | SAGA |
|--------|-----|------|
| **操作方式** | Try-Confirm-Cancel（三阶段） | 直接执行 + 补偿（两阶段） |
| **资源锁定** | Try 阶段冻结资源 | 不冻结，直接执行 |
| **一致性** | 强一致性 | 最终一致性 |
| **开发复杂度** | 高（每个服务 3 个方法） | 中（每个服务 2 个方法） |
| **适用场景** | 短事务、核心业务 | 长事务、跨系统 |

---

### 6. SAGA 的优势

#### 1. 操作简单

**TCC：** 每个服务 3 个方法
```java
flightService.tryBook();
flightService.confirmBook();
flightService.cancelBook();
```

**SAGA：** 每个服务 2 个方法
```java
flightService.book();
flightService.cancel();
```

**开发成本降低 33%！**

---

#### 2. 不冻结资源

**TCC：** 资源冻结，其他用户无法使用
**SAGA：** 直接执行，失败了再取消

**性能更好！**

---

#### 3. 适合第三方服务

**TCC：** 第三方服务没有 try/confirm/cancel 方法
**SAGA：** 第三方服务有 book/refund 方法就可以

---

### 7. SAGA 的缺点

#### 1. 最终一致性（不是强一致）

```
1. 预订机票 ✅ (机票已出票)
2. 预订酒店 ✅ (酒店已确认)
3. 扣款 ❌ (余额不足)
4. 取消酒店 ✅
5. 取消机票 ✅
```

**问题：** 在步骤 1-3 之间，用户可能看到"预订成功"，但最终失败了。

---

#### 2. 补偿可能失败

```
1. 预订机票 ✅
2. 预订酒店 ✅
3. 扣款 ❌
4. 取消酒店 ✅
5. 取消机票 ❌ (航空公司系统宕机)
```

**解决方案：**
- 重试（最多 10 次）
- 超过重试次数，人工介入

---

#### 3. 补偿逻辑需要幂等

```java
@Transactional
public void compensateReduceStock(String sagaId, String productId, int quantity) {
    // 1. 检查是否已经补偿过
    SagaLog log = sagaLogMapper.selectBySagaIdAndStep(sagaId, "COMPENSATE_STOCK");
    if (log != null && "COMPENSATED".equals(log.getStatus())) {
        return;  // 幂等返回
    }
    
    // 2. 执行补偿
    stockService.addStock(productId, quantity);
    
    // 3. 记录补偿日志
    saveSagaLog(sagaId, "COMPENSATE_STOCK", "COMPENSATED", null);
}
```

---

### 8. SAGA 适用场景

#### ✅ 适合 SAGA 的场景

1. **长事务**
   - 跨多个服务（3 个以上）
   - 执行时间长（几秒到几分钟）
   - 例子：旅游预订、订单履约

2. **第三方服务**
   - 无法改造成 TCC
   - 只有正向操作 + 取消/退款
   - 例子：支付宝、微信支付、第三方物流

3. **非核心业务**
   - 可以接受最终一致性
   - 中间状态不一致也没关系
   - 例子：积分兑换、优惠券发放

---

#### ❌ 不适合 SAGA 的场景

1. **核心金额业务**
   - 必须强一致性
   - 不能出现中间状态
   - 例子：转账、支付

2. **短事务**
   - 只涉及 1-2 个服务
   - 执行时间很短（几十毫秒）
   - 例子：简单的订单创建

3. **无法补偿的操作**
   - 发送短信（无法撤回）
   - 发送邮件（无法撤回）
   - 打印发票（无法撤回）

---

### 9. 方案选择练习

**学生回答：**

1. **下单 + 扣款 + 扣库存** → TCC ✅
2. **下单成功 → 赠送积分** → MQ ✅
3. **旅游套餐（机票+酒店+租车+支付）** → SAGA ✅

**全部正确！** 理解非常到位。

---

### 10. 组合使用：SAGA + TCC

**场景：** 旅游预订中，支付环节必须强一致

**学生回答：**
> "支付 TCC，外层 SAGA"

✅ **非常棒！** 这就是组合使用的精髓！

---

#### 设计思路

```
外层 SAGA（长事务）：
1. 预订机票 ✅ (SAGA 正向操作)
2. 预订酒店 ✅ (SAGA 正向操作)
3. 预订租车 ✅ (SAGA 正向操作)
4. 支付 → 内层 TCC（强一致性）
   ├─ Try: 冻结金额
   ├─ Confirm: 真正扣款
   └─ Cancel: 释放金额

如果支付失败：
5. TCC Cancel: 释放金额 ✅
6. SAGA 补偿: 取消所有预订 ✅
```

---

#### 代码实现

```java
@Service
public class TravelSagaOrchestrator {
    
    @Autowired
    private PaymentTccService paymentTccService;
    
    public void bookTravel(TravelOrder order) {
        String sagaId = UUID.randomUUID().toString();
        String tccTxId = UUID.randomUUID().toString();
        
        String flightId = null;
        String hotelId = null;
        String carId = null;
        
        try {
            // ========== SAGA 正向操作 ==========
            flightId = flightService.book(order);
            saveSagaLog(sagaId, "BOOK_FLIGHT", "SUCCESS", flightId);
            
            hotelId = hotelService.book(order);
            saveSagaLog(sagaId, "BOOK_HOTEL", "SUCCESS", hotelId);
            
            carId = carService.book(order);
            saveSagaLog(sagaId, "BOOK_CAR", "SUCCESS", carId);
            
            // ========== TCC 支付（强一致性） ==========
            paymentTccService.tryPay(tccTxId, order.getUserId(), order.getAmount());
            paymentTccService.confirmPay(tccTxId);
            saveSagaLog(sagaId, "PAYMENT", "SUCCESS", null);
            
        } catch (Exception e) {
            // TCC Cancel
            paymentTccService.cancelPay(tccTxId);
            
            // SAGA 补偿
            compensate(sagaId, flightId, hotelId, carId);
        }
    }
}
```

---

#### 为什么这样设计？

**优势1：支付强一致**
- 不会出现"扣了钱但没预订成功"的情况

**优势2：预订灵活**
- 不需要改造成 TCC
- 可以对接第三方 API

**优势3：性能好**
- TCC 只用在支付环节，金额冻结时间短
- SAGA 用在预订环节，不冻结资源

---

## 学生表现评估

### 优点
1. ✅ **理解准确**：能快速识别 TCC 在长事务场景的问题
2. ✅ **抓住核心**："操作简单，最终一致性"
3. ✅ **方案选择**：三个场景全部答对（TCC/MQ/SAGA）
4. ✅ **深入思考**："支付 TCC，外层 SAGA" - 组合使用的精髓
5. ✅ **举一反三**：能够根据不同场景选择合适的方案

### 需要加强
1. ⚠️ **细节理解**：SAGA 补偿失败的处理（重试、人工介入）
2. ⚠️ **实战经验**：需要实际项目中应用这些方案

---

## 知识点掌握情况

### ✅ 已掌握
- **SAGA 核心思想**（高信心）
  - 直接执行 + 补偿
  - 不冻结资源
  - 最终一致性

- **SAGA vs TCC**（高信心）
  - 操作简单（2 个方法 vs 3 个方法）
  - 不冻结资源 vs 冻结资源
  - 最终一致 vs 强一致

- **方案选择**（高信心）
  - TCC：短事务、核心业务
  - MQ：非核心业务、高并发
  - SAGA：长事务、第三方服务

- **组合使用**（高信心）
  - 支付 TCC + 外层 SAGA
  - 根据不同环节选择合适方案

### ⚠️ 需要加强
- **SAGA 实战细节**
  - 补偿失败的处理
  - 幂等性保证
  - 状态机设计

---

## 分布式事务方案总结

| 方案 | 一致性 | 性能 | 复杂度 | 适用场景 |
|------|--------|------|--------|---------|
| **TCC** | 强一致 | 高 | 高 | 短事务、核心业务（订单+支付） |
| **SAGA** | 最终一致 | 高 | 中 | 长事务、第三方服务（旅游预订） |
| **本地消息表** | 最终一致 | 中 | 低 | 简单异步场景（积分、通知） |
| **MQ 事务消息** | 最终一致 | 高 | 中 | 高并发异步场景（秒杀、大促） |

---

## 方案选择决策树

```
是否涉及金额/库存？
├─ 是 → 是否短事务（1-3个服务）？
│   ├─ 是 → TCC（强一致性）
│   └─ 否 → SAGA（长事务）
│
└─ 否 → 是否高并发？
    ├─ 是 → MQ 事务消息
    └─ 否 → 本地消息表
```

---

## 总结

今天完整学习了分布式事务的四种方案（TCC、本地消息表、MQ 事务消息、SAGA），学生表现出色，能够准确理解每种方案的核心思想和适用场景，并能够根据具体业务选择合适的方案。特别是提出了"支付 TCC，外层 SAGA"的组合使用方案，说明已经深刻理解了分布式事务的本质。下次学习可以进行实战练习，或者学习其他高级主题。
