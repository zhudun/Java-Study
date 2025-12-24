# 复习笔记 - 正确答案汇总

**最后更新**: 2025-12-23

这个文件记录所有测试中的正确答案，方便复习。

---

## 一、多线程和并发

### 1. Runnable vs Callable
| 对比 | Runnable | Callable |
|------|----------|----------|
| 返回值 | void | 有返回值 |
| 异常 | 不能抛受检异常 | 可以抛受检异常 |
| 方法 | run() | call() |

### 2. count++ 线程安全问题
```java
count++;  // 不是原子操作！分三步：读-改-写
```
**解决方案**：
- `synchronized` 加方法或代码块
- `Lock` 锁（ReentrantLock）
- `AtomicInteger`（无锁，CAS）

### 3. 死锁
**场景**：线程 A 持有锁 1 等锁 2，线程 B 持有锁 2 等锁 1

**避免方法**：按固定顺序获取锁

### 4. 线程池类型
| 类型 | 特点 |
|------|------|
| `newFixedThreadPool(n)` | 固定 n 个线程，任务多了排队 |
| `newCachedThreadPool` | 线程数不固定，空闲 60 秒回收 |
| `newSingleThreadExecutor` | 只有 1 个线程，保证顺序 |

**为什么用 ThreadPoolExecutor**：`Executors` 的问题是无界队列/无限线程可能 OOM

### 5. volatile
- **作用**：可见性 + 禁止重排序
- **不保证**：原子性！
- **区别**：volatile ≠ synchronized ≠ AtomicInteger

---

## 二、JVM

### 1. 内存区域 - 变量存储位置
```java
public class Test {
    private static int a = 1;  // 方法区/元空间
    private int b = 2;         // 堆（跟对象走）
    
    public void method() {
        int c = 3;             // 栈
        Object obj = new Object();  // obj引用在栈，对象在堆
    }
}
```

**记忆**：
- 静态变量 → 方法区
- 实例变量 → 堆（跟对象走）
- 局部变量 → 栈

### 2. 堆内存分代
```
新对象 → Eden → Survivor(S0/S1来回复制) → Old(年龄够了)
```

### 3. GC 算法 vs 收集器
| 类型 | 内容 |
|------|------|
| **算法（理论）** | 标记-清除、标记-整理、复制算法 |
| **收集器（实现）** | Parallel、CMS、G1、ZGC |

### 4. 双亲委派机制
加载类时先让父加载器加载，父加载器加载不了才自己加载。

**为什么**：防止核心类被篡改（比如自己写个 `java.lang.String`）

---

## 三、MySQL

### 1. 联合索引最左前缀
```sql
CREATE INDEX idx_name_age ON user(name, age);

-- 能用索引：
WHERE name = '张三'              ✅ 最左列
WHERE name = '张三' AND age = 25 ✅ 完全匹配
WHERE age = 25 AND name = '张三' ✅ 优化器调整顺序

-- 不能用索引：
WHERE age = 25                   ❌ 跳过了 name
```

### 2. 脏读/幻读/不可重复读
| 问题 | 定义 | 记忆 |
|------|------|------|
| 脏读 | 读到别人**未提交**的数据 | 脏 = 未提交 |
| 不可重复读 | 同一条数据两次读**值不同**（被改了） | 不可重复 = 被改 |
| 幻读 | 同样条件两次读**行数不同**（被增删） | 幻 = 多/少了 |

### 3. explain type 字段（从好到差）
```
const > eq_ref > ref > range > index > ALL
```

### 4. ACID 实现机制
| 特性 | 实现机制 |
|------|---------|
| 原子性 | undo log（回滚日志） |
| 持久性 | redo log（重做日志） |
| 隔离性 | 锁 + MVCC |
| 一致性 | 以上三者共同保证 |

---

## 四、Spring Cloud

### 1. Nacos vs Eureka
| 对比 | Nacos | Eureka |
|------|-------|--------|
| 功能 | 注册中心 + 配置中心 | 仅注册中心 |
| 健康检查 | 主动探测 + 心跳 | 仅心跳 |
| 一致性 | CP + AP 可切换 | AP 模式 |
| 维护状态 | 阿里活跃维护 | Netflix 停更 |

### 2. Feign 底层原理
```
接口 + @FeignClient → 动态代理 → 从注册中心获取地址 → 负载均衡 → HTTP 请求
```
本质：**动态代理 + 负载均衡 + HTTP 客户端**

### 3. Gateway 核心概念
| 概念 | 含义 |
|------|------|
| Route | 路由规则，定义请求转发到哪个服务 |
| Predicate | 断言/匹配条件（Path、Header、Method 等） |
| Filter | 过滤器，请求前后做处理 |

### 4. 熔断/降级/限流
| 概念 | 含义 |
|------|------|
| 熔断 | 下游故障时快速失败，不再调用 |
| 降级 | 返回兜底数据，保证核心功能 |
| 限流 | 控制请求速率，防止过载 |

### 5. 服务雪崩处理
**问题**：服务 B 慢 → 线程被占用 → 服务 A 线程池耗尽 → 雪崩

**解决**：
1. 超时设置
2. 熔断
3. 线程隔离
4. 降级

---

## 五、Redis

### 1. 五种数据结构
String、List、Hash、Set、ZSet(Sorted Set)

### 2. RDB vs AOF
| 对比 | RDB | AOF |
|------|-----|-----|
| 方式 | 快照（全量） | 追加日志（增量） |
| 恢复速度 | 快 | 慢 |
| 数据安全 | 可能丢几分钟 | 最多丢 1 秒 |
| 文件大小 | 小 | 大 |

### 3. 缓存穿透/击穿/雪崩
| 问题 | 定义 | 解决方案 |
|------|------|---------|
| 穿透 | 查询**不存在的数据** | 布隆过滤器、缓存空值 |
| 击穿 | **热点 key 过期** | 不过期、互斥锁 |
| 雪崩 | **大量 key 同时过期** | 分散过期时间 |

### 4. 分布式锁
```bash
SET key value NX EX 30  # 不存在才设置，30秒过期
```

**看门狗机制**：Redisson 默认锁 30 秒，后台线程每 10 秒自动续期

### 5. 缓存一致性方案
| 方案 | 做法 |
|------|------|
| Cache Aside | 先更新 DB，再删缓存（最常用） |
| 延迟双删 | 删缓存 → 更新 DB → 延迟再删缓存 |
| 消息队列 | 更新 DB 后发消息，异步更新缓存 |

---

## 六、Spring/Spring Boot

### 1. IOC vs DI
- **IOC（控制反转）**：思想/原则，对象创建权交给容器
- **DI（依赖注入）**：IOC 的实现方式

### 2. AOP 五种通知类型
| 通知 | 执行时机 |
|------|---------|
| @Before | 方法执行前 |
| @After | 方法执行后（finally） |
| @AfterReturning | 方法正常返回后 |
| @AfterThrowing | 方法抛异常后 |
| @Around | 环绕，可控制是否执行 |

### 3. Bean 生命周期
```
实例化 → 属性赋值 → @PostConstruct → 使用 → @PreDestroy → 销毁
```

### 4. 事务失效 - 内部调用
```java
@Transactional
public void methodA() {
    methodB();  // ❌ 内部调用不走代理，事务失效！
}

@Transactional(propagation = REQUIRES_NEW)
public void methodB() { }
```

**解决**：拆分 Service 或注入自己

### 5. @SpringBootApplication = 三个注解
1. `@SpringBootConfiguration` - 配置类
2. `@EnableAutoConfiguration` - 自动配置核心
3. `@ComponentScan` - 扫描组件

**自动配置原理**：读取 `META-INF/spring.factories` + `@Conditional` 条件判断

---

## 七、消息队列

### 1. MQ 三大作用
- **异步**：不用等待，提高响应速度
- **解耦**：服务之间不直接依赖
- **削峰**：流量高峰时缓冲请求

### 2. RabbitMQ 消息流转
```
Producer → Exchange → (Routing Key 匹配) → Queue → Consumer
```

### 3. 消息丢失处理
| 环节 | 解决方案 |
|------|---------|
| Producer → Broker | confirm 机制 |
| Broker 存储 | 持久化 |
| Broker → Consumer | 手动 ACK |

### 4. 幂等性方案
- 唯一 ID + 去重表
- 数据库唯一约束
- Redis SETNX
- 状态机

---

## 快速记忆口诀

1. **幻读 vs 不可重复读**：不可重复 = 被改，幻 = 多/少
2. **explain type**：const > eq_ref > ref > range > index > ALL
3. **缓存三兄弟**：穿透=不存在，击穿=热点过期，雪崩=大量过期
4. **事务失效**：内部调用不走代理
5. **volatile**：可见性 + 禁止重排，不保证原子性


---

## 八、计算机网络

### 1. HTTP vs HTTPS
| 对比 | HTTP | HTTPS |
|------|------|-------|
| 端口 | 80 | 443 |
| 安全 | 明文传输，不安全 | 加密传输，安全 |
| 证书 | 不需要 | 需要 SSL/TLS 证书 |

**HTTPS 如何保证安全**：
1. 非对称加密交换密钥（RSA）
2. 对称加密传输数据（AES）
3. 数字证书验证服务器身份

### 2. TCP 三次握手
```
客户端 → 服务端：SYN（你好呀）
服务端 → 客户端：SYN+ACK（你也好呀）
客户端 → 服务端：ACK（好的我知道你好了）
```

**为什么三次**：确认双方的发送和接收能力都正常
- 第一次：服务端知道客户端能发
- 第二次：客户端知道服务端能收能发
- 第三次：服务端知道客户端能收

### 3. TCP 四次挥手
```
客户端 → 服务端：FIN（我要走了）
服务端 → 客户端：ACK（你要走了吗）
服务端 → 客户端：FIN（是的，我也准备好了）
客户端 → 服务端：ACK（好吧）
```

**为什么四次不能三次**：
- 服务端收到 FIN 后，可能还有数据没发完
- 需要先 ACK 确认，等数据发完再发 FIN
- 所以 ACK 和 FIN 不能合并

### 4. GET vs POST
| 对比 | GET | POST |
|------|-----|------|
| 参数位置 | URL | Body |
| 参数长度 | 有限制 | 无限制 |
| 安全性 | 参数暴露 | 相对安全 |
| 缓存 | 可缓存 | 不可缓存 |
| 幂等性 | 幂等 | 非幂等 |
| 语义 | 获取数据 | 提交数据 |

### 5. HTTP 状态码
| 状态码 | 含义 | 记忆 |
|--------|------|------|
| 200 | 成功 | OK |
| 301 | 永久重定向 | 搬家了 |
| 302 | 临时重定向 | 暂时不在 |
| 400 | 请求错误 | 你的问题 |
| 401 | 未认证 | 没登录 |
| 403 | 禁止访问 | 没权限 |
| 404 | 未找到 | 不存在 |
| 500 | 服务器错误 | 我的问题 |
| 502 | 网关错误 | 上游挂了 |
| 503 | 服务不可用 | 太忙了 |

**记忆口诀**：
- 2xx = 成功
- 3xx = 重定向
- 4xx = 客户端错误（你的问题）
- 5xx = 服务端错误（我的问题）


---

## 九、设计模式

### 1. 单例模式（五种实现）

| 方式 | 特点 | 推荐度 |
|------|------|--------|
| 饿汉式 | 类加载就创建，线程安全，可能浪费内存 | ⭐⭐ |
| 懒汉式 | 用时才创建，需要 synchronized，性能差 | ⭐ |
| 双重检查锁 | 懒加载 + 高性能，需要 volatile | ⭐⭐⭐ |
| 静态内部类 | 懒加载 + 线程安全 | ⭐⭐⭐⭐ |
| 枚举 | 最简单，防反射和序列化破坏 | ⭐⭐⭐⭐⭐ |

**双重检查锁写法**：
```java
public class Singleton {
    private static volatile Singleton instance;  // 必须 volatile！
    
    private Singleton() {}
    
    public static Singleton getInstance() {
        if (instance == null) {                  // 第一次检查
            synchronized (Singleton.class) {
                if (instance == null) {          // 第二次检查
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}
```

**静态内部类写法**（推荐）：
```java
public class Singleton {
    private Singleton() {}
    
    private static class Holder {
        private static final Singleton INSTANCE = new Singleton();
    }
    
    public static Singleton getInstance() {
        return Holder.INSTANCE;
    }
}
```

**枚举写法**（最推荐）：
```java
public enum Singleton {
    INSTANCE;
    
    public void doSomething() { }
}
```

### 2. 工厂模式（三种区别）

| 类型 | 特点 | 场景 |
|------|------|------|
| **简单工厂** | 一个工厂类，根据参数创建不同对象 | 对象种类少且固定 |
| **工厂方法** | 每种产品一个工厂类 | 需要扩展新产品 |
| **抽象工厂** | 创建一系列相关产品 | 产品族（如不同品牌的手机+电脑） |

**简单工厂**：
```java
class CarFactory {
    public static Car create(String type) {
        if ("benz".equals(type)) return new Benz();
        if ("bmw".equals(type)) return new BMW();
        return null;
    }
}
```

**工厂方法**：
```java
interface CarFactory {
    Car create();
}
class BenzFactory implements CarFactory {
    public Car create() { return new Benz(); }
}
class BMWFactory implements CarFactory {
    public Car create() { return new BMW(); }
}
```

### 3. 策略模式

**解决问题**：消除大量 if-else，让算法可以互换

**优势**：
- 符合开闭原则（新增策略不改原代码）
- 算法独立，易于测试和维护

**实现**：
```java
// 策略接口
interface PayStrategy {
    void pay(double amount);
}

// 具体策略
class WechatPay implements PayStrategy {
    public void pay(double amount) { System.out.println("微信支付: " + amount); }
}
class AliPay implements PayStrategy {
    public void pay(double amount) { System.out.println("支付宝支付: " + amount); }
}

// 上下文
class PayContext {
    private PayStrategy strategy;
    
    public void setStrategy(PayStrategy strategy) {
        this.strategy = strategy;
    }
    
    public void pay(double amount) {
        strategy.pay(amount);
    }
}
```

### 4. 代理模式

| 对比 | JDK 动态代理 | CGLIB |
|------|-------------|-------|
| 要求 | 必须有接口 | 不需要接口 |
| 原理 | 反射 | 字节码生成（继承） |
| 性能 | 稍慢 | 稍快 |

**Spring AOP 选择**：
- 有接口 → JDK 动态代理
- 无接口 → CGLIB

### 5. 设计模式分类

| 类型 | 模式 |
|------|------|
| **创建型** | 单例、工厂、建造者、原型 |
| **结构型** | 代理、适配器、装饰器、外观 |
| **行为型** | 策略、观察者、模板方法、责任链 |


---

## 十、Java 基础

### 1. 八种基本数据类型
`byte` `short` `int` `long` `float` `double` `char` `boolean`

### 2. int vs Integer
| 对比 | int | Integer |
|------|-----|---------|
| 类型 | 基本类型 | 包装类 |
| 默认值 | 0 | null |
| 缓存池 | - | -128~127 |

### 3. == vs equals
- `==`：比较地址（基本类型比较值）
- `equals()`：比较内容

### 4. String 两种创建
```java
String s1 = "abc";           // 字符串常量池
String s2 = new String("abc"); // 堆中新建

s1 == s2;      // false（地址不同）
s1.equals(s2); // true（内容相同）
```

### 5. final 关键字
| 修饰 | 作用 |
|------|------|
| 变量 | 不可修改 |
| 方法 | 不可重写 |
| 类 | 不可继承 |

### 6. 方法重载规则
- 方法名相同
- 参数列表不同（类型/个数/顺序）
- **返回值可以不同**（不是必须相同）
- 重载只看方法签名（方法名+参数），不看返回值

---

## 十一、面向对象

### 1. 三大特性
封装、继承、多态

### 2. 访问修饰符
| 修饰符 | 本类 | 同包 | 子类 | 其他 |
|--------|------|------|------|------|
| private | ✅ | ❌ | ❌ | ❌ |
| default | ✅ | ✅ | ❌ | ❌ |
| protected | ✅ | ✅ | ✅ | ❌ |
| public | ✅ | ✅ | ✅ | ✅ |

**记忆**：default 没有子类权限，protected 才有

### 3. 抽象类 vs 接口
| 对比 | 抽象类 | 接口 |
|------|--------|------|
| 继承 | 单继承 | 多实现 |
| 方法 | 可以有实现 | Java 8 后可以有 default |
| 变量 | 可以有普通变量 | 只能有常量 |

### 4. 多态
```java
Parent p = new Child();
p.show();  // 输出 Child
```
**口诀**：编译看左边，运行看右边

### 5. 构造方法
- 不能被继承
- 不能被重写
- 可以被重载

---

## 十二、集合框架

### 1. ArrayList vs LinkedList
| 对比 | ArrayList | LinkedList |
|------|-----------|------------|
| 底层 | 数组 | 链表 |
| 查询 | 快 O(1) | 慢 O(n) |
| 增删 | 慢 O(n) | 快 O(1) |

### 2. HashMap 底层（JDK 8）
数组 + 链表 + 红黑树
- 链表长度 > 8 且数组长度 >= 64 时转红黑树

### 3. HashMap vs Hashtable
| 对比 | HashMap | Hashtable |
|------|---------|-----------|
| 线程安全 | 否 | 是 |
| null key | 允许一个 | 不允许 |
| 效率 | 高 | 低 |

### 4. HashSet 去重原理
底层用 HashMap，元素作为 key
- 先比较 `hashCode()`
- hashCode 相同再比较 `equals()`

### 5. ConcurrentHashMap（JDK 8）
- CAS + synchronized（锁单个桶）
- 不是锁整个表，粒度更细

### 6. Comparable vs Comparator
| 对比 | Comparable | Comparator |
|------|------------|------------|
| 类型 | 接口 | 接口 |
| 位置 | 类自己实现 | 外部定义 |
| 方法 | compareTo() | compare() |
| 用途 | 自然排序 | 定制排序 |

```java
// Comparable - 类自己实现
class Person implements Comparable<Person> {
    public int compareTo(Person o) {
        return this.age - o.age;
    }
}

// Comparator - 外部传入
list.sort((a, b) -> a.getAge() - b.getAge());
```
