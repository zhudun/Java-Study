# 学习记录 - 2025-01-21

## 学习概述
- **日期**: 2025-01-21（周二）
- **时长**: 约 20 分钟
- **格式**: 代码审查和改进
- **主要主题**: SAGA + TCC 组合方案的代码健壮性改进

---

## 学习内容

### 背景

学生对 2025-01-19 学习的 SAGA + TCC 组合方案代码进行了深入思考，提出了三个非常专业的改进建议。

---

### 学生提出的三个问题

#### 问题1：catch 里的两种回滚，一个如果异常，另外不也挂了？

**原代码问题：**
```java
} catch (Exception e) {
    // 1. TCC Cancel
    paymentTccService.cancelPay(tccTxId);  // ❌ 如果这里抛异常
    
    // 2. SAGA 补偿
    compensate(sagaId, flightId, hotelId, carId);  // ❌ 这里就不会执行了！
}
```

**问题分析：**
- 如果 TCC Cancel 抛异常，SAGA 补偿就不会执行
- 导致机票、酒店、租车都没取消
- 这是一个严重的生产问题！

---

#### 问题2：是不是该在 finally 里面处理？而且针对 TCC 回滚的小 try，是不是也得加 finally？

**学生建议：**
- 使用 finally 确保回滚一定会执行
- TCC 内部也要用 finally

**这个建议非常好！** finally 确保无论是否抛异常，回滚都会执行。

---

#### 问题3：Try 方法里面，是不是没有对 Cancel 做校验？

**学生发现的问题：**
- Try 方法没有检查 Cancel 状态
- 这就是 TCC 的**悬挂问题**！

**悬挂场景：**
```
1. 协调者调用 Try（网络延迟）
2. 协调者超时，调用 Cancel
3. Cancel 执行完成（空回滚）
4. Try 请求终于到达了！
5. Try 冻结了金额，但永远不会有 Confirm/Cancel 来释放！
```

**这是 TCC 三大问题之一，学生主动发现了！** ✅

---

## 改进方案

### 改进1：分别 try-catch

```java
} catch (Exception e) {
    // 1. TCC Cancel（独立 try-catch）
    try {
        paymentTccService.cancelPay(tccTxId);
    } catch (Exception ex) {
        log.error("TCC Cancel 失败: {}", tccTxId, ex);
        saveManualTask("TCC_CANCEL_FAILED", tccTxId, ex.getMessage());
    }
    
    // 2. SAGA 补偿（独立 try-catch）
    try {
        compensate(sagaId, flightId, hotelId, carId);
    } catch (Exception ex) {
        log.error("SAGA 补偿失败: {}", sagaId, ex);
        saveManualTask("SAGA_COMPENSATE_FAILED", sagaId, ex.getMessage());
    }
    
    throw new RuntimeException("旅游预订失败", e);
}
```

**关键点：**
- 每个回滚操作独立 try-catch
- 一个失败不影响另一个
- 失败了记录到人工处理表

---

### 改进2：使用 finally（学生建议）

```java
String flightId = null;
String hotelId = null;
String carId = null;
boolean success = false;
boolean tccTrySuccess = false;

try {
    // SAGA 正向操作
    flightId = flightService.book(order);
    hotelId = hotelService.book(order);
    carId = carService.book(order);
    
    // TCC 支付
    try {
        paymentTccService.tryPay(tccTxId, order.getUserId(), order.getAmount());
        tccTrySuccess = true;
        
        paymentTccService.confirmPay(tccTxId);
        success = true;
        
    } finally {
        // 如果 Try 成功但 Confirm 失败，执行 TCC Cancel
        if (tccTrySuccess && !success) {
            try {
                paymentTccService.cancelPay(tccTxId);
            } catch (Exception ex) {
                log.error("TCC Cancel 失败", ex);
                saveManualTask("TCC_CANCEL_FAILED", tccTxId, ex.getMessage());
            }
        }
    }
    
} finally {
    // 如果整体失败，执行 SAGA 补偿
    if (!success) {
        try {
            compensate(sagaId, flightId, hotelId, carId);
        } catch (Exception ex) {
            log.error("SAGA 补偿失败", ex);
            saveManualTask("SAGA_COMPENSATE_FAILED", sagaId, ex.getMessage());
        }
    }
}
```

**关键点：**
- 使用 success 标志位判断是否成功
- finally 确保回滚一定会执行
- TCC 内部也用 finally

---

### 改进3：Try 方法检查 Cancel 状态（防悬挂）

```java
@Transactional
public void tryPay(String txId, Long userId, BigDecimal amount) {
    // ========== 1. 防悬挂：检查是否已经 Cancel ==========
    TccLog log = tccLogMapper.selectById(txId);
    if (log != null && "CANCEL".equals(log.getStatus())) {
        throw new RuntimeException("事务已取消，拒绝执行 Try");  // ✅ 学生发现的问题！
    }
    
    // ========== 2. 幂等：检查是否已经 Try 过 ==========
    if (log != null && "TRY".equals(log.getStatus())) {
        return;
    }
    
    // ========== 3. 业务逻辑：冻结金额 ==========
    Account account = accountMapper.selectById(userId);
    if (account.getBalance().compareTo(amount) < 0) {
        throw new RuntimeException("余额不足");
    }
    
    account.setFrozen(account.getFrozen().add(amount));
    accountMapper.update(account);
    
    // ========== 4. 记录状态 ==========
    if (log == null) {
        log = new TccLog();
        log.setTxId(txId);
        log.setUserId(userId);
    }
    log.setStatus("TRY");
    log.setAmount(amount);
    tccLogMapper.insertOrUpdate(log);
}
```

**关键点：**
- Try 执行前检查 Cancel 状态
- 如果已经 Cancel，拒绝执行 Try
- 防止悬挂问题

---

## 完整的改进代码

```java
@Service
public class TravelSagaOrchestrator {
    
    @Autowired
    private FlightService flightService;
    
    @Autowired
    private HotelService hotelService;
    
    @Autowired
    private CarService carService;
    
    @Autowired
    private PaymentTccService paymentTccService;
    
    @Autowired
    private SagaLogMapper sagaLogMapper;
    
    @Autowired
    private ManualTaskMapper manualTaskMapper;
    
    public void bookTravel(TravelOrder order) {
        String sagaId = UUID.randomUUID().toString();
        String tccTxId = UUID.randomUUID().toString();
        
        String flightId = null;
        String hotelId = null;
        String carId = null;
        boolean success = false;
        boolean tccTrySuccess = false;
        
        try {
            // ========== SAGA 正向操作 ==========
            flightId = flightService.book(order);
            saveSagaLog(sagaId, "BOOK_FLIGHT", "SUCCESS", flightId);
            
            hotelId = hotelService.book(order);
            saveSagaLog(sagaId, "BOOK_HOTEL", "SUCCESS", hotelId);
            
            carId = carService.book(order);
            saveSagaLog(sagaId, "BOOK_CAR", "SUCCESS", carId);
            
            // ========== TCC 支付（强一致性） ==========
            try {
                // Try: 冻结金额（带悬挂检查）
                paymentTccService.tryPay(tccTxId, order.getUserId(), order.getAmount());
                tccTrySuccess = true;
                
                // Confirm: 真正扣款
                paymentTccService.confirmPay(tccTxId);
                saveSagaLog(sagaId, "PAYMENT", "SUCCESS", null);
                
                success = true;  // 全部成功
                
            } finally {
                // 如果 Try 成功但 Confirm 失败，执行 TCC Cancel
                if (tccTrySuccess && !success) {
                    try {
                        paymentTccService.cancelPay(tccTxId);
                    } catch (Exception ex) {
                        log.error("TCC Cancel 失败: {}", tccTxId, ex);
                        saveManualTask("TCC_CANCEL_FAILED", tccTxId, ex.getMessage());
                    }
                }
            }
            
        } finally {
            // 如果整体失败，执行 SAGA 补偿
            if (!success) {
                try {
                    compensate(sagaId, flightId, hotelId, carId);
                } catch (Exception ex) {
                    log.error("SAGA 补偿失败: {}", sagaId, ex);
                    saveManualTask("SAGA_COMPENSATE_FAILED", sagaId, ex.getMessage());
                }
            }
        }
    }
    
    private void compensate(String sagaId, String flightId, String hotelId, String carId) {
        // 反向补偿（每个都独立 try-catch）
        if (carId != null) {
            try {
                carService.cancel(carId);
                saveSagaLog(sagaId, "CANCEL_CAR", "COMPENSATED", null);
            } catch (Exception e) {
                log.error("取消租车失败: {}", carId, e);
                saveManualTask("CANCEL_CAR_FAILED", carId, e.getMessage());
            }
        }
        
        if (hotelId != null) {
            try {
                hotelService.cancel(hotelId);
                saveSagaLog(sagaId, "CANCEL_HOTEL", "COMPENSATED", null);
            } catch (Exception e) {
                log.error("取消酒店失败: {}", hotelId, e);
                saveManualTask("CANCEL_HOTEL_FAILED", hotelId, e.getMessage());
            }
        }
        
        if (flightId != null) {
            try {
                flightService.cancel(flightId);
                saveSagaLog(sagaId, "CANCEL_FLIGHT", "COMPENSATED", null);
            } catch (Exception e) {
                log.error("取消机票失败: {}", flightId, e);
                saveManualTask("CANCEL_FLIGHT_FAILED", flightId, e.getMessage());
            }
        }
    }
    
    private void saveSagaLog(String sagaId, String stepName, String status, String data) {
        SagaLog log = new SagaLog();
        log.setSagaId(sagaId);
        log.setStepName(stepName);
        log.setStatus(status);
        log.setForwardData(data);
        sagaLogMapper.insert(log);
    }
    
    private void saveManualTask(String taskType, String taskId, String errorMsg) {
        ManualTask task = new ManualTask();
        task.setTaskType(taskType);
        task.setTaskId(taskId);
        task.setErrorMsg(errorMsg);
        task.setStatus("PENDING");
        manualTaskMapper.insert(task);
        
        // 发送告警
        alertService.send("分布式事务失败，需要人工介入: " + taskType);
    }
}
```

---

## 学生提出的三个建议总结

| 建议 | 问题 | 改进方案 | 重要性 |
|------|------|---------|--------|
| **1. catch 里的两种回滚** | 一个异常，另一个不执行 | 分别 try-catch 或使用 finally | ⭐⭐⭐ 生产问题 |
| **2. TCC 回滚加 finally** | Confirm 失败，Cancel 不执行 | TCC 内部也用 finally | ⭐⭐⭐ 生产问题 |
| **3. Try 检查 Cancel** | 悬挂问题 | Try 方法检查 Cancel 状态 | ⭐⭐⭐ TCC 三大问题 |

---

## 学生表现评估

### 优点
1. ✅ **代码审查能力强**：能发现原代码的健壮性问题
2. ✅ **深入思考**：从"理解概念"进入到"考虑实战细节"
3. ✅ **主动发现问题**：自己发现了 TCC 悬挂问题
4. ✅ **提出改进方案**：建议使用 finally 确保回滚执行
5. ✅ **生产意识**：考虑异常处理的健壮性

### 评价
**学生已经从"学习者"进入到"工程师"的思维模式！**

这三个问题都是生产环境的真实问题：
- 异常处理的健壮性
- finally 的正确使用
- TCC 悬挂问题

说明学生不仅理解了概念，还能考虑实际应用中的细节和边界情况。

---

## 知识点掌握情况

### ✅ 已掌握
- **异常处理健壮性**（高信心）
  - 独立 try-catch 防止一个失败影响另一个
  - finally 确保回滚一定执行
  - 失败记录到人工处理表

- **TCC 三大问题**（高信心）
  - 幂等性：重复调用
  - 空回滚：Try 没执行，Cancel 来了
  - 悬挂：Cancel 先到，Try 后到（主动发现）

- **代码健壮性设计**（高信心）
  - 使用标志位（success、tccTrySuccess）
  - 嵌套 finally 处理不同层级的回滚
  - 每个补偿操作独立 try-catch

---

## 关键改进点

### 1. 异常处理的独立性

**原则：** 一个回滚失败不能影响另一个回滚

```java
// ❌ 错误做法
try {
    operation1();  // 如果抛异常
    operation2();  // 这里不会执行
} catch (Exception e) {
    // ...
}

// ✅ 正确做法
try {
    operation1();
} catch (Exception e) {
    // 处理
}

try {
    operation2();
} catch (Exception e) {
    // 处理
}
```

---

### 2. finally 的正确使用

**原则：** 使用 finally 确保清理代码一定执行

```java
boolean success = false;

try {
    // 业务逻辑
    doSomething();
    success = true;
    
} finally {
    if (!success) {
        // 清理逻辑一定会执行
        cleanup();
    }
}
```

---

### 3. TCC 悬挂问题的防范

**原则：** Try 执行前检查 Cancel 状态

```java
public void tryPay(String txId) {
    // 1. 检查是否已经 Cancel（防悬挂）
    TccLog log = tccLogMapper.selectById(txId);
    if (log != null && "CANCEL".equals(log.getStatus())) {
        throw new RuntimeException("事务已取消，拒绝执行");
    }
    
    // 2. 执行业务逻辑
    // ...
}
```

---

## 总结

今天学生对 SAGA + TCC 组合方案的代码进行了深入审查，提出了三个非常专业的改进建议，都是生产环境的真实问题。这说明学生已经从"理解概念"进入到"考虑实战细节"的阶段，具备了工程师的思维模式。

**三个关键改进：**
1. 异常处理的独立性（分别 try-catch）
2. finally 确保回滚执行（使用标志位）
3. TCC 悬挂问题防范（Try 检查 Cancel 状态）

这些改进让代码更加健壮，能够应对生产环境的各种异常情况。
