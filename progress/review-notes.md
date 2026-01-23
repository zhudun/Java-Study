# 复习笔记 - 正确答案汇总

**最后更新**: 2025-01-08

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


---

## 十三、异常处理

### 1. 异常体系
```
Throwable
├── Error（系统级，无法处理）
│   └── OutOfMemoryError, StackOverflowError
└── Exception（程序可处理）
    ├── RuntimeException（非受检）
    │   └── NullPointerException, ArrayIndexOutOfBoundsException
    └── 其他（受检）
        └── IOException, SQLException
```

### 2. 受检 vs 非受检异常
| 类型 | 特点 | 例子 |
|------|------|------|
| 受检异常 | 编译时必须处理 | IOException, SQLException |
| 非受检异常 | 运行时异常，可以不处理 | NullPointerException |

**记忆**：RuntimeException 及其子类是非受检，其他都是受检

### 3. throw vs throws
- `throw`：方法内部抛出异常
- `throws`：方法签名声明可能抛出的异常

---

## 十四、Java 8+ 新特性

### 1. Lambda 表达式
```java
// 匿名内部类
new Thread(new Runnable() {
    public void run() { System.out.println("Hello"); }
}).start();

// Lambda
new Thread(() -> System.out.println("Hello")).start();
```

### 2. 函数式接口
- 只有一个抽象方法的接口
- `@FunctionalInterface` 让编译器检查
- 例如：Runnable、Comparator、Consumer

### 3. Stream API
- `filter()`：过滤，保留符合条件的
- `map()`：转换/映射每个元素
- `collect()`：收集结果

### 4. Optional
- 解决 NullPointerException
- 常用方法：
  - `of()` / `ofNullable()`：创建
  - `orElse()`：为空时返回默认值
  - `ifPresent()`：不为空时执行

```java
Optional.ofNullable(user)
    .map(User::getName)
    .orElse("默认名");
```

---

## 十五、I/O 操作

### 1. 字节流 vs 字符流
| 类型 | 基类 | 场景 |
|------|------|------|
| 字节流 | InputStream/OutputStream | 图片、视频、任何文件 |
| 字符流 | Reader/Writer | 文本文件 |

### 2. 缓冲流
- 作用：减少 IO 次数，批量读写，提高效率
- 不是一个字节一个字节读，而是一次读一批到缓冲区

### 3. try-with-resources
```java
// 自动关闭资源，不用手动 close()
try (FileInputStream fis = new FileInputStream("file.txt")) {
    // 使用流
} // 自动关闭
```

### 4. 序列化
- 对象 → 字节流，用于存储或网络传输
- 实现 `Serializable` 接口
- `transient` 关键字：不参与序列化

---

## 十六、核心 API 补充

### 1. new String("abc") 创建几个对象
- 如果常量池已有 "abc"：1 个（堆中的对象）
- 如果常量池没有：2 个（常量池 + 堆）

### 2. equals 和 hashCode 关系
- HashMap/HashSet 先用 hashCode 定位桶，再用 equals 比较
- **规则**：equals 相等 → hashCode 必须相等
- 只重写 equals 不重写 hashCode 会导致 HashMap 出问题

### 3. LocalDate vs Date
| 对比 | Date | LocalDate |
|------|------|-----------|
| 版本 | 旧 API | Java 8 新 API |
| 可变性 | 可变 | 不可变 |
| 线程安全 | 不安全 | 安全 |
| API | 难用 | 友好 |

### 4. String.intern()
- 把字符串放入常量池
- 如果常量池已有，返回常量池的引用
```java
String s1 = new String("abc");
String s2 = s1.intern();  // 返回常量池中的 "abc"
s2 == "abc"  // true
```


---

## 十七、进阶知识点

### 1. ThreadLocal
- **是什么**：线程本地变量，每个线程有自己的副本
- **用途**：存储线程私有数据（如用户信息、事务上下文）
- **注意**：用完要 `remove()`，否则内存泄漏

```java
ThreadLocal<String> local = new ThreadLocal<>();
local.set("value");
local.get();
local.remove();  // 用完必须清理！
```

### 2. synchronized 锁对象
| 用法 | 锁的对象 |
|------|---------|
| 实例方法 | this（当前对象） |
| 静态方法 | Class 对象 |
| 代码块 | 指定的对象 |

```java
synchronized void method() {}        // 锁 this
static synchronized void method() {} // 锁 Class
synchronized (obj) {}                // 锁 obj
```

### 3. MVCC（多版本并发控制）
- **作用**：解决读写并发问题
- **原理**：每行数据有多个版本，读操作读取快照，不加锁
- **好处**：读不阻塞写，写不阻塞读，提高并发性能

### 4. Spring Bean 作用域
| 作用域 | 说明 |
|--------|------|
| singleton | 默认，单例 |
| prototype | 每次获取创建新实例 |
| request | 每个 HTTP 请求一个 |
| session | 每个会话一个 |

### 5. @Autowired vs @Resource
| 注解 | 来源 | 注入方式 |
|------|------|---------|
| @Autowired | Spring | 按类型 |
| @Resource | JDK | 按名称 |

### 6. Redis ZSet 底层
- **跳表（SkipList）**：支持范围查询 O(logN)
- **哈希表**：支持单个元素查找 O(1)

### 7. ArrayList 扩容
- 初始容量：**10**
- 扩容倍数：**1.5 倍**
- `newCapacity = oldCapacity + (oldCapacity >> 1)`

### 8. String == 比较
```java
String s1 = "abc";
String s2 = "ab" + "c";   // 编译期优化 → "abc"
String s3 = s + "c";      // 运行时拼接 → 堆中新对象

s1 == s2  // true（都指向常量池）
s1 == s3  // false（s3 在堆中）
```


---

## 十八、幂等性方案

### 唯一 ID + 去重表（最常用）

**流程**：
1. 客户端生成唯一请求 ID
2. 服务端查去重表，存在则返回
3. 不存在则执行业务，插入去重表

**去重表**：
```sql
CREATE TABLE request_dedupe (
    request_id VARCHAR(64) UNIQUE,  -- 唯一索引！
    created_at DATETIME
);
```

**代码**：
```java
@Transactional
public Result createOrder(String requestId, OrderDTO order) {
    if (dedupeMapper.exists(requestId)) {
        return Result.success("重复请求");
    }
    dedupeMapper.insert(requestId);
    orderService.create(order);
    return Result.success("成功");
}
```

### 方案对比
| 方案 | 优点 | 缺点 |
|------|------|------|
| 唯一 ID + 去重表 | 可靠，通用 | 需要额外表 |
| Redis SETNX | 快，简单 | 可能丢数据 |
| 数据库唯一约束 | 简单 | 只能防重复插入 |
| 状态机 | 业务语义清晰 | 需要状态字段 |

---

## 十九、场景排查

### CPU 100% 排查
```bash
1. top                    # 找 CPU 高的进程 PID
2. top -Hp PID            # 找 CPU 高的线程
3. printf '%x' 线程ID     # 转十六进制
4. jstack PID | grep 十六进制  # 看堆栈
```
常见原因：死循环、频繁 GC、锁竞争

### 接口慢排查
1. 链路追踪（Skywalking）
2. 慢 SQL 日志
3. 缓存命中率
4. 网络延迟
5. 锁等待

### 连接池满
原因：慢 SQL、事务未提交、连接泄漏
解决：优化 SQL、检查事务、增大连接池

---

## 二十、高频记忆点

| 知识点 | 答案 |
|--------|------|
| ArrayList 初始/扩容 | 10, 1.5 倍 |
| 函数式接口 | 只有一个抽象方法 |
| ThreadLocal 用完 | remove() |
| Bean 默认作用域 | singleton |
| HashMap JDK8 | 红黑树 |
| MQ 三大作用 | 异步、削峰、解耦 |
| synchronized 锁方法 | 锁 this |
| ZSet 底层 | 跳表 + 哈希表 |
| 幂等性方案 | 唯一 ID + 去重表 |


---

## 二十一、算法 - 单调队列

### 滑动窗口最大值

**场景**：求滑动窗口内的最大/最小值

**核心思路**：
1. 用 Deque 存下标（不是值）
2. 维护单调递减队列
3. 队首就是当前窗口最大值

**模板**：
```java
Deque<Integer> deque = new LinkedList<>();
for (int i = 0; i < n; i++) {
    // 1. 移除过期（超出窗口）
    while (!deque.isEmpty() && deque.peekFirst() < i - k + 1)
        deque.pollFirst();
    // 2. 维护单调（踢掉比当前小的）
    while (!deque.isEmpty() && nums[deque.peekLast()] < nums[i])
        deque.pollLast();
    // 3. 入队
    deque.offerLast(i);
    // 4. 取结果
    if (i >= k - 1)
        result[i - k + 1] = nums[deque.peekFirst()];
}
```

**记忆口诀**：过期踢头，小的踢尾，队首最大


---

## 二十二、高频面试题补充

### 1. binlog vs redo log
| 对比 | binlog | redo log |
|------|--------|----------|
| 层级 | MySQL Server 层 | InnoDB 引擎层 |
| 类型 | 逻辑日志 | 物理日志 |
| 用途 | 主从复制 | 崩溃恢复 |

### 2. CAP 理论
- **C**onsistency：一致性
- **A**vailability：可用性
- **P**artition tolerance：分区容错
- 三者只能满足两个

### 3. HashMap 并发问题
- JDK7：头插法，并发扩容可能死循环
- JDK8：尾插法，数据覆盖丢失

### 4. 线程池拒绝策略
| 策略 | 行为 |
|------|------|
| AbortPolicy | 抛异常（默认） |
| CallerRunsPolicy | 调用者线程执行 |
| DiscardPolicy | 直接丢弃 |
| DiscardOldestPolicy | 丢弃最老的 |

### 5. TCP 粘包解决
- 消息头带长度
- 分隔符
- 固定长度

### 6. 回表查询
- 二级索引 → 主键 → 回主键索引查数据
- 避免：覆盖索引（查询字段都在索引中）

### 7. 事务传播行为
- REQUIRED：有就加入，没有就新建（默认）
- REQUIRES_NEW：总是新建事务

### 8. Redis 过期删除
- 惰性删除：访问时检查
- 定期删除：定时随机抽查

### 9. BIO/NIO/AIO
| 类型 | 特点 |
|------|------|
| BIO | 同步阻塞，一连接一线程 |
| NIO | 同步非阻塞，多路复用 |
| AIO | 异步非阻塞 |

### 10. 分布式 ID 方案
- UUID：简单但无序
- 雪花算法：有序，推荐
- 数据库自增：简单但有瓶颈
- Redis 自增：高性能

### 11. 消息不丢失
| 环节 | 方案 |
|------|------|
| 生产者 | confirm 机制 |
| Broker | 持久化 |
| 消费者 | 手动 ACK |

### 12. 哈希槽
- Redis Cluster 用 16384 个哈希槽
- key 通过 CRC16 算法分配到槽


---

## 二十三、动态代理详解

### 1. 代理模式的作用
- **核心思想**：在不修改原有代码的情况下，给方法增加额外功能
- **类比**：中介帮你做额外的事（筛选、带看），但租房还是房东完成
- **应用**：Spring AOP 的 @Transactional、@Log 底层都是代理

### 2. 静态代理 vs 动态代理
| 对比 | 静态代理 | 动态代理 |
|------|---------|---------|
| 代理类 | 手写 | 运行时生成 |
| 灵活性 | 低，100个Service要写100个代理类 | 高，自动生成 |
| 时机 | 编译期 | 运行期 |

### 3. JDK 动态代理 vs CGLIB
| 对比 | JDK 动态代理 | CGLIB |
|------|-------------|-------|
| 要求 | 必须有接口 | 不需要接口 |
| 原理 | 反射 + Proxy | ASM 字节码生成 |
| 生成类 | extends Proxy implements 接口 | extends 目标类 |
| 方法调用 | 每次反射调用 Method.invoke() | 直接调用 super.xxx() |
| 创建速度 | 快 | 慢（要生成字节码） |
| 调用速度 | 慢（反射） | 快（直接调用） |

**为什么 JDK 代理必须有接口**：
- 生成的代理类 `extends Proxy`，Java 单继承
- 只能通过 `implements 接口` 和目标类建立关系

**CGLIB 流程**：
1. 反射获取目标类的方法信息
2. ASM 在内存中生成子类字节码（跳过 .java 源文件）
3. 子类重写方法，加入增强逻辑

### 4. Spring AOP 选择逻辑
- 有接口 → JDK 动态代理
- 无接口 → CGLIB

### 5. 字节码 vs 源代码
```
源代码 (.java) → javac 编译 → 字节码 (.class) → JVM 执行
     ↑                              ↑
   人写的                        机器执行的
```

ASM 直接生成字节码，跳过源代码和编译步骤。

---

## 二十四、反射原理

### 1. 反射的动机
让程序在运行时"认识"自己不认识的类。

**场景**：
- Spring 容器扫描 @Service 注解的类，自动创建对象
- JDBC 驱动 `Class.forName("com.mysql.jdbc.Driver")`
- JSON 序列化（Jackson 需要知道对象有哪些字段）

### 2. 反射的原理
- JVM 加载每个类时，创建一个 `Class` 对象
- 反射通过 `Class` 对象查询和操作类信息

```java
String className = "com.example.UserService";  // 运行时获取
Class<?> clazz = Class.forName(className);     // 获取 Class 对象
Object obj = clazz.newInstance();              // 创建实例
Method method = clazz.getMethod("save", User.class);
method.invoke(obj, user);                      // 调用方法
```

### 3. 反射 vs 反编译
| 对比 | 反射 | 反编译 |
|------|------|--------|
| 时机 | 运行时 | 离线 |
| 要求 | JVM 运行，类已加载 | 不需要 JVM |
| 原理 | 通过 Class 对象获取信息 | 解析 .class 文件格式 |

---

## 二十五、依赖注入 vs 直接 new

### 1. 直接 new 的问题
1. **依赖写死**：换实现要改代码
2. **Spring 功能不生效**：@Transactional、AOP 不生效
3. **单元测试难写**：没法注入 Mock 对象

### 2. 即使只有一个实现类
- 注入的是代理对象，new 的是裸对象
- 注入是单例，new 每次创建新对象

### 3. RestTemplate 应该注入
- 重量级对象，有连接池
- 需要统一配置（超时、拦截器）
- 方便测试

### 4. 一个接口多个实现的切换
**最推荐：@ConditionalOnProperty + 配置文件**
```yaml
pay:
  type: wechat  # 改这里就切换实现
```
```java
@Service
@ConditionalOnProperty(name = "pay.type", havingValue = "wechat")
public class WechatPayService implements PayService { }
```

---

## 二十六、Spring 容器和启动过程

### 1. Spring 容器本质
- 就是一个 `Map<String, Object>`
- 对象工厂 + 对象仓库
- 比喻：小作坊 vs 工厂

### 2. 启动过程
```
1. 加载配置，扫描类 → 找到 @Component/@Service 等
2. 创建 Bean 对象（IOC）→ 反射创建，放入容器
3. 依赖注入（DI）→ @Autowired 字段赋值
4. 初始化 → @PostConstruct、AOP 代理
```

---

## 二十七、循环依赖三级缓存（重点！）

### 1. 三级缓存定义
| 缓存 | 存储内容 | 作用 |
|------|---------|------|
| 一级 singletonObjects | 完整的 Bean | 最终使用 |
| 二级 earlySingletonObjects | 早期 Bean（已实例化，未注入） | 保证一致性 |
| 三级 singletonFactories | Bean 工厂 | 定性（决定返回原始对象还是代理） |

### 2. 完整流程（A 和 B 互相依赖）
```
1. 创建 A → 实例化 A → A 的工厂放入三级缓存
2. 注入 A 的属性 → 需要 B
3. 创建 B → 实例化 B → B 的工厂放入三级缓存
4. 注入 B 的属性 → 需要 A
5. 从三级缓存拿 A 的工厂 → 调用工厂获取早期 A → 移到二级缓存
6. B 注入 A 成功 → B 完成 → B 放入一级缓存
7. 回到 A → A 注入 B 成功 → A 完成 → A 放入一级缓存
```

### 3. 为什么需要三级缓存
- 三级缓存存工厂，可以**判断是否需要代理**
- 如果 A 有 @Transactional，工厂返回代理对象
- 保证所有地方拿到的是同一个正确的对象

### 4. 形象比喻
```
原始对象 = 素颜的人
代理对象 = 化完妆的人
工厂 = Tony + 化妆师

三级缓存（工厂）：负责定性
      ↓
二级缓存：存定性后的结果，保证一致性
      ↓
一级缓存：完全初始化好的最终对象
```

**口诀**：先过滤定性，出去就不乱了。A 不能自己给自己定性，得依赖第三方（工厂）。


---

## 二十八、反射深入理解

### 1. 反射的历史
- **起源**：1982 年 Brian Cantwell Smith 博士论文
- **早期实现**：Smalltalk（1970-80年代）
- **Java**：1996 年借鉴实现

### 2. 反射不是 Java 独有
| 语言 | 反射机制 |
|------|---------|
| Python | `getattr()`、`type()` |
| C# | `System.Reflection` |
| JavaScript | `typeof`、`Object.keys()` |
| Ruby | 天生反射型语言 |

### 3. 反射的六大应用场景

| 场景 | 核心反射操作 | 用途 |
|------|-------------|------|
| IOC 容器 | `Class.forName()` + `newInstance()` + `field.set()` | 创建 Bean、注入依赖 |
| AOP 代理 | `Method.invoke()` | 方法增强 |
| ORM 框架 | `field.set()` | 结果集映射 |
| JSON 序列化 | `field.get()` / `field.set()` | 对象与 JSON 互转 |
| 单元测试 | `setAccessible(true)` | 访问私有成员 |
| RPC 框架 | `method.invoke()` | 远程方法调用 |

### 4. 反射的视角转换

**面向对象 vs 反射**：
```java
// 面向对象：对象.属性 = 值
user.name = "张三";

// 反射：属性.set(对象, 值)
field.set(user, "张三");
```

**理解**：Field 是"字段的模板"，不属于任何具体对象，操作时要指定"主人"。

### 5. 元编程思想
- **面向对象**：在程序里写逻辑
- **反射/元编程**：在程序外操控程序
- 框架用反射"俯视"代码，动态操作它

### 6. 业务代码用反射的场景
- 加密/解密敏感字段（配合注解）
- 鉴权过滤字段
- 通用对象拷贝
- 根据配置动态调用

**原则**：能不用就不用（性能差、绕过编译检查、可读性差）

---

## 二十九、单元测试

### 1. 断言的本质
断言 = "我断定结果应该是这样"

```java
// 没有断言：人眼看
System.out.println(result);

// 有断言：自动判断
assertEquals(3, result);  // 不是 3 就报错
```

### 2. 断言写法
```java
assertEquals(期望值, 实际值);  // 期望值在前！
```

**为什么期望值在前**：报错信息更清晰
```
Expected: 3
Actual: 5
```

### 3. 常用断言
| 断言 | 用途 |
|------|------|
| `assertEquals(a, b)` | 相等 |
| `assertNotEquals(a, b)` | 不相等 |
| `assertTrue(condition)` | 为真 |
| `assertFalse(condition)` | 为假 |
| `assertNull(obj)` | 为空 |
| `assertNotNull(obj)` | 不为空 |
| `assertThrows(Exception.class, () -> ...)` | 应该抛异常 |

### 4. 单测为什么难写

| 原因 | 说明 |
|------|------|
| 依赖太多 | 要 Mock 所有依赖，设置返回值 |
| 边界情况 | 一个 if 要写多个测试用例 |
| 外部资源 | 数据库、网络、文件要特殊处理 |
| 代码耦合 | 直接 new、直接调外部接口，没法 Mock |

**结论**：单测难写 = 业务代码设计有问题。好的代码容易测。


---

## 三十、OpenAPI Specification

### 1. OpenAPI 是什么
用标准格式（YAML/JSON）描述 API 接口的规范，以前叫 Swagger Specification。

### 2. 解决的问题
- 前后端对接时接口文档不同步
- 手写文档维护成本高，容易过时
- 接口变更容易遗漏通知

### 3. OpenAPI 能做什么

| 功能 | 说明 |
|------|------|
| 自动生成文档 | Swagger UI 可视化接口文档 |
| 自动生成代码 | 前端 SDK、后端 Controller 骨架 |
| 接口测试 | 直接在文档页面调用接口 |
| Mock 服务 | 前端不用等后端，先用假数据开发 |
| 契约校验 | 检查接口是否符合规范 |

### 4. Java 集成（SpringDoc）

**添加依赖**：
```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.3.0</version>
</dependency>
```

**常用注解**：
| 注解 | 用途 |
|------|------|
| `@Tag` | 接口分组 |
| `@Operation` | 描述接口 |
| `@Parameter` | 描述参数 |
| `@Schema` | 描述实体类字段 |

**访问文档**：
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`

### 5. 两种模式
- **代码优先**：先写代码，自动生成文档（常用）
- **契约优先**：先写 OpenAPI 文档，生成代码骨架

---

## 三十一、RPC 框架

### 1. RPC 是什么
RPC = Remote Procedure Call（远程过程调用）

**核心思想**：像调用本地方法一样，调用远程服务器上的方法。

### 2. RPC 原理

```
客户端调用 
    ↓
动态代理拦截
    ↓
序列化：{类名, 方法名, 参数}
    ↓
网络传输（TCP/HTTP）
    ↓
服务端接收
    ↓
反序列化
    ↓
反射调用真实方法
    ↓
返回结果 → 序列化 → 网络传输 → 客户端反序列化
```

**核心技术**：动态代理 + 网络通信 + 序列化

### 3. RPC vs HTTP

| 对比 | RPC | HTTP/REST |
|------|-----|-----------|
| 调用方式 | 像本地方法 | 手动发请求 |
| 协议 | 自定义（如 Dubbo）或 gRPC | HTTP |
| 序列化 | 二进制（快） | JSON（慢） |
| 性能 | 高 | 相对低 |
| 学习成本 | 高 | 低 |

### 4. 常见 RPC 框架

| 框架 | 特点 |
|------|------|
| Dubbo | 阿里开源，Java 生态，高性能 |
| gRPC | Google 开源，跨语言，基于 HTTP/2 |
| Thrift | Facebook 开源，跨语言 |
| Feign | Spring Cloud，基于 HTTP |

---

## 三十二、Dubbo vs Feign

### 1. 核心区别

| 对比 | Dubbo | Feign |
|------|-------|-------|
| **定位** | RPC 框架 | HTTP 客户端 |
| **协议** | Dubbo 协议（TCP） | HTTP/REST |
| **序列化** | Hessian/Protobuf（二进制） | JSON |
| **性能** | 高 | 相对低 |
| **生态** | 阿里系，独立生态 | Spring Cloud 全家桶 |
| **学习成本** | 高 | 低 |
| **跨语言** | 支持但麻烦 | 天然支持（HTTP） |

### 2. Dubbo 特点

**优势**：
- 性能高（二进制序列化 + TCP 长连接）
- 功能强大（负载均衡、服务降级、流量控制）
- 服务治理完善（监控、路由、版本管理）

**劣势**：
- 重（需要注册中心：Nacos/Zookeeper）
- 学习成本高（概念多，配置复杂）
- 跨语言麻烦（主要是 Java 生态）

**使用场景**：
- 内部微服务，性能要求高
- 服务数量多，需要完善的治理能力
- 纯 Java 技术栈

**代码示例**：
```java
// 提供者
@DubboService(version = "1.0.0", timeout = 3000)
public class UserServiceImpl implements UserService { }

// 消费者
@DubboReference(version = "1.0.0")
private UserService userService;
```

### 3. Feign 特点

**优势**：
- 简单（声明式调用，写个接口就行）
- Spring Cloud 集成好（和 Eureka、Ribbon、Hystrix 无缝集成）
- 跨语言友好（基于 HTTP，任何语言都能调）
- 调试方便（抓包就能看到请求内容）

**劣势**：
- 性能低（JSON 序列化 + HTTP 短连接）
- 功能简单（主要靠 Spring Cloud 其他组件补充）

**使用场景**：
- Spring Cloud 微服务
- 对性能要求不极致
- 需要跨语言调用
- 快速开发，简单场景

**代码示例**：
```java
@FeignClient(name = "user-service")
public interface UserClient {
    @GetMapping("/users/{id}")
    User getById(@PathVariable Long id);
}
```

### 4. 性能对比

| 框架 | 序列化 | 传输 | QPS |
|------|--------|------|-----|
| Dubbo | Hessian 二进制 | TCP 长连接 | 单机几万 |
| Feign | JSON 文本 | HTTP 短连接 | 单机几千 |

**差距**：Dubbo 比 Feign 快 **2-5 倍**

### 5. 技术选型建议

**选 Dubbo**：
- 内部系统，性能要求高
- 服务调用频繁（每秒上千次）
- 需要复杂的服务治理
- 团队熟悉 Dubbo

**选 Feign**：
- Spring Cloud 技术栈
- 对外提供 API（HTTP 更通用）
- 快速开发，简单场景
- 性能够用就行

### 6. 混合使用

很多公司：
- **内部核心服务**：Dubbo（高性能）
- **边缘服务/网关**：Feign/HTTP（对外接口）

```
前端 → API 网关(HTTP) → 订单服务(Feign) → 用户服务(Dubbo) → 数据库
```

**一句话总结**：
- Dubbo = 高性能 RPC，适合内部调用
- Feign = 简单 HTTP 客户端，适合快速开发


---

## 三十三、服务雪崩

### 1. 什么是服务雪崩
微服务之间的连锁故障：一个服务慢了 → 调用它的服务线程堆积 → 线程池耗尽 → 也挂了 → 像多米诺骨牌一样整个链路崩溃

**注意**：服务雪崩 ≠ 缓存雪崩
- 缓存雪崩：大量缓存 key 同时过期，请求打到 DB
- 服务雪崩：微服务之间的连锁故障

### 2. 四种解决方案

| 手段 | 作用 | 实现 |
|------|------|------|
| 超时 | 快速失败，不无限等待 | 设置调用超时时间 |
| 熔断 | 故障时直接拒绝，不再调用 | 失败率超阈值就打开熔断器 |
| 线程隔离 | 故障不扩散到其他服务 | 线程池隔离/信号量隔离 |
| 降级 | 返回兜底数据，保证可用 | fallback 方法 |

### 3. 熔断器状态

```
关闭状态（正常）
    ↓ 失败率超过阈值
打开状态（拒绝请求）
    ↓ 等待一段时间
半开状态（试探）
    ↓ 成功 → 关闭 / 失败 → 打开
```

### 4. 线程隔离的两种方式

| 方式 | 原理 | 优点 | 缺点 |
|------|------|------|------|
| 线程池隔离 | 每个服务独立线程池 | 完全隔离，可超时 | 线程切换开销 |
| 信号量隔离 | 计数器限制并发数 | 轻量，无切换 | 不能超时 |

**信号量隔离类比**：停车场车位，满了就不让进

### 5. 常用框架
- Sentinel（阿里）
- Resilience4j
- Hystrix（Netflix，已停更）

---

## 三十四、协程/虚拟线程

### 1. 协程解决的问题
线程开销大：1MB 栈内存、内核态切换、数量受限

### 2. 协程 vs 线程

| 对比 | 线程 | 协程 |
|------|------|------|
| 调度者 | 操作系统 | 程序自己（JVM） |
| 内存占用 | 1MB 左右 | 几 KB |
| 切换成本 | 高（内核态切换） | 低（用户态切换） |
| 数量 | 几千个就吃力 | 轻松几十万 |

### 3. Java 虚拟线程（Java 21）

```java
// 传统线程池 - 要纠结参数
new ThreadPoolExecutor(10, 50, 60, TimeUnit.SECONDS, queue);

// 虚拟线程 - 不用纠结
Executors.newVirtualThreadPerTaskExecutor();
```

### 4. 协程的原理
JVM 自动识别阻塞点（IO、sleep、锁等），阻塞时自动让出真实线程，IO 完成后恢复执行。

**代码不用改**，JVM 自动处理。

### 5. 协程 vs 熔断
- 协程解决：资源利用率（不浪费线程）
- 熔断解决：快速失败（保护系统）
- **它们是互补的，应该一起用**

### 6. 什么时候用协程
- IO 密集型（网络请求、数据库查询）
- 高并发场景（几千上万并发）
- Java 21+ 项目

---

## 三十五、消息幂等性

### 1. 什么是幂等性
同一个操作执行一次和执行多次，结果一样。

```
幂等：查询用户、设置密码
非幂等：扣款、库存减 1
```

### 2. 为什么需要幂等
MQ 只保证"至少投递一次"，重复消费必然发生：
- ACK 丢失
- 消费超时
- 网络重试
- 故障恢复

### 3. 解决方案

| 方案 | 实现 | 适用场景 |
|------|------|---------|
| 唯一 ID + 去重表 | 消息带 msgId，处理前查表 | 通用，最常用 |
| 数据库唯一约束 | 唯一索引，重复插入报错 | 有唯一业务字段 |
| Redis SETNX | setIfAbsent 判断是否处理过 | 高并发，快速判断 |
| 状态机 | 只有特定状态才能流转 | 有状态流转的业务 |

### 4. 唯一 ID + 去重表示例

```java
public void consume(Message msg) {
    // 1. 查去重表
    if (dedupeTable.exists(msg.getMsgId())) {
        return;  // 处理过了
    }
    
    // 2. 执行业务
    accountService.deduct(msg.getAmount());
    
    // 3. 记录到去重表
    dedupeTable.insert(msg.getMsgId());
}
```

**核心思路**：处理前先判断是否已处理过 = 去重


---

## 三十六、Redisson 看门狗机制

### 1. 分布式锁的问题

**基本实现**：
```bash
SET lock_key unique_value NX EX 30
```

**问题**：业务执行超过过期时间
- 锁提前过期，别人抢到锁
- 释放了别人的锁
- 并发冲突

### 2. 看门狗机制

**作用**：锁快过期时自动续期，保证业务执行完之前锁不会过期

**参数**：
- 默认锁过期时间：30 秒
- 续期间隔：30 / 3 = 10 秒

**时间线**：
```
0s  - 加锁，过期时间 30s，启动看门狗
10s - 续期，过期时间重置为 30s
20s - 续期，过期时间重置为 30s
35s - 业务完成，释放锁，看门狗停止
```

### 3. 代码使用

```java
// ✅ 启用看门狗（不指定过期时间）
lock.lock();

// ❌ 不启用看门狗（指定过期时间）
lock.lock(10, TimeUnit.SECONDS);
```

**关键**：不指定过期时间，才会启动看门狗

### 4. 推荐写法

```java
RLock lock = redisson.getLock("task_lock");
if (lock.tryLock(0, TimeUnit.SECONDS)) {
    try {
        // 执行业务
    } finally {
        lock.unlock();  // 主动释放
    }
}
```

**好处**：
- 任务完成立刻释放锁
- 任务执行中自动续期
- 服务挂了，30 秒后锁自动过期

### 5. 内部机制

```java
// 加锁成功后，启动定时任务
scheduleExpirationRenewal() {
    timer.schedule(new TimerTask() {
        void run() {
            if (锁还持有) {
                redis.expire("lock_key", 30, TimeUnit.SECONDS);
                scheduleExpirationRenewal();  // 递归调度
            }
        }
    }, 10, TimeUnit.SECONDS);
}
```

**为什么提前续期**：留足余量，防止网络延迟导致锁过期


---

## 三十七、联合索引最左前缀

### 1. 核心规则
查询时必须从索引的最左列开始，不能跳过。

**口诀**：左边不能跳，中间不能断

### 2. 索引 (a, b, c) 查询情况

| 查询 | 能用索引？ | 用到哪些列 |
|------|-----------|-----------|
| `WHERE a = 1` | ✅ | a |
| `WHERE b = 2` | ❌ | 无（跳过了 a） |
| `WHERE a = 1 AND c = 3` | ✅ | 只有 a（b 断了） |
| `WHERE a = 1 AND b = 2 AND c = 3` | ✅ | a, b, c |
| `WHERE c = 3 AND b = 2 AND a = 1` | ✅ | a, b, c（优化器调整顺序） |

### 3. 为什么中间不能断？

联合索引排序规则：**先按 a 排序，a 相同按 b 排序，b 相同按 c 排序**

```
a    b    c
-----------
1    1    1
1    1    2    ← a=1, b=1 时，c 有序
1    2    1
1    2    3    ← a=1, b=2 时，c 有序
2    1    5
```

单独看 c 列：`1, 2, 1, 3, 5` —— 是乱的！

只有 a、b 都确定后，c 才有序。

### 4. 索引本质

索引 = **排好序的数据结构**（B+Tree）

- 没索引：一行行扫描（全表扫描）
- 有索引：二分查找快速定位

**MySQL 显示 BTREE 实际是 B+Tree**（历史命名问题）


---

## 三十八、explain type 字段

### 1. 从好到差的顺序（面试必背）

```
const > eq_ref > ref > range > index > ALL
```

### 2. 各类型含义

| type | 含义 | 场景 |
|------|------|------|
| **const** | 主键/唯一索引等值，最多1行 | 单表 `WHERE id = 1` |
| **eq_ref** | JOIN 用主键/唯一索引关联 | `JOIN ON a.id = b.user_id` |
| **ref** | 普通索引等值，可能多行 | 单表或 JOIN 都行 |
| **range** | 索引范围查询 | `WHERE age > 18`、`IN (1,2,3)` |
| **index** | 扫描整个索引树 | 查询列都在索引里，但没筛选条件 |
| **ALL** | 全表扫描，最差 | 没用到任何索引 |

### 3. 区分要点

| 对比 | const | eq_ref | ref |
|------|-------|--------|-----|
| 场景 | 单表 | JOIN | 单表或 JOIN |
| 索引 | 主键/唯一 | 主键/唯一 | 普通索引 |
| 行数 | 最多 1 行 | 每次关联最多 1 行 | 可能多行 |

**记忆**：
- const 只在单表
- eq_ref 只在 JOIN
- ref 两边都行
- eq_ref 是唯一（一对一），ref 是普通（一对多）

### 4. index vs ALL

| 对比 | index | ALL |
|------|-------|-----|
| 扫描对象 | 索引树 | 整个表 |
| 数据量 | 小（只有索引列） | 大（所有列） |
| 速度 | 稍快 | 最慢 |

两者都是扫描，都要避免。


---

## 三十九、Feign 原理

### 1. 四步流程

```
1. 动态代理：为接口生成代理对象
      ↓
2. 解析注解：@GetMapping → GET，路径 → URL
      ↓
3. 服务发现：从 Nacos 获取地址（或直接用 URL）
      ↓
4. 发送请求：负载均衡 + HTTP 请求
```

**一句话**：Feign = 动态代理 + 注解解析 + 服务发现 + HTTP 客户端

### 2. 为什么必须用动态代理？

```java
@FeignClient(name = "user-service")
public interface UserClient {  // 只有接口，没有实现类！
    User getById(Long id);
}
```

接口不能直接 new，动态代理在运行时生成实现类，把方法调用转成 HTTP 请求。

### 3. 两种用法

| 方式 | 配置 | 场景 |
|------|------|------|
| 服务名 | `@FeignClient(name = "user-service")` | 内部微服务 |
| URL | `@FeignClient(url = "https://api.xxx.com")` | 第三方 API |

### 4. Feign vs Dubbo

| 对比 | Feign | Dubbo |
|------|-------|-------|
| 协议 | HTTP + JSON | TCP + 二进制 |
| 性能 | 较慢 | 快 2-5 倍 |
| 适用 | 快速开发、调第三方 | 内部高频调用 |

**常见做法**：内部核心用 Dubbo，边缘/第三方用 Feign


---

## 四十、Gateway 核心概念

### 1. 三个核心

| 概念 | 英文 | 作用 |
|------|------|------|
| **Route** | 路由 | 定义转发规则：去哪个服务 |
| **Predicate** | 断言 | 匹配条件：路径、Header、参数等 |
| **Filter** | 过滤器 | 请求前后处理：加 Header、鉴权 |

### 2. 配置示例

```yaml
routes:
  - id: user-route
    uri: lb://user-service          # Route：转发到哪
    predicates:
      - Path=/api/user/**           # Predicate：匹配条件
    filters:
      - AddRequestHeader=X-Token, abc  # Filter：处理请求
```

### 3. Predicate vs Filter

| 对比 | Predicate | Filter |
|------|-----------|--------|
| 目的 | 判断走不走这条路由 | 处理请求/响应 |
| 结果 | true/false | 修改请求或响应 |
| 时机 | 路由匹配阶段 | 匹配成功后执行 |

**一句话**：Predicate 决定"要不要"，Filter 决定"怎么做"

### 4. 常见 Predicate 类型

| 断言 | 含义 |
|------|------|
| Path | 路径匹配 `/api/**` |
| Method | 请求方法 GET/POST |
| Header | 请求头匹配 |
| Query | 参数匹配 |

### 5. Nginx vs Gateway

| 对比 | Nginx | Gateway |
|------|-------|---------|
| 层级 | 最外层，面向公网 | 内部，面向微服务 |
| 擅长 | 静态资源、SSL、负载均衡 | 动态路由、鉴权、限流 |
| 性能 | C 写的，极高 | Java 写的，相对低 |

**典型架构**：用户 → Nginx → Gateway → 微服务

**分工**：Nginx 扛流量，Gateway 管业务


---

## 四十一、限流方式对比

| 方式 | 层级 | 特点 |
|------|------|------|
| **Semaphore** | 代码级 | 单机，控制并发数 |
| **RateLimiter** | 代码级 | 单机，按速率限流（Guava） |
| **Gateway 限流** | 网关级 | 分布式，按 QPS/IP |
| **Sentinel** | 服务级 | 分布式，功能丰富 |
| **Nginx** | 入口级 | 高性能，简单限流 |

### Semaphore 示例
```java
Semaphore semaphore = new Semaphore(10);  // 最多 10 并发
semaphore.acquire();  // 获取许可
try {
    // 业务逻辑
} finally {
    semaphore.release();  // 释放
}
```

### RateLimiter 示例
```java
RateLimiter limiter = RateLimiter.create(100);  // 每秒 100 个
limiter.acquire();  // 获取令牌
```


---

## 四十二、Seata 分布式事务

### 解决的问题
微服务下跨服务的数据一致性：
```
下单 → 订单服务（扣库存）→ 支付服务（扣余额）→ 积分服务（加积分）
```
任何一步失败，都要回滚。

### 四种模式

| 模式 | 特点 |
|------|------|
| **AT** | 自动补偿，侵入性低（最常用） |
| **TCC** | 手动写 Try/Confirm/Cancel |
| **SAGA** | 长事务，最终一致 |
| **XA** | 强一致，性能差 |

**一句话**：Seata = 跨服务的事务管理器


---

## 四十三、AOP 五种通知

### 1. 五种通知类型

| 通知 | 注解 | 执行时机 |
|------|------|---------|
| **前置** | @Before | 方法执行前 |
| **后置** | @After | 方法执行后（finally，无论成功失败） |
| **返回后** | @AfterReturning | 方法正常返回后 |
| **异常后** | @AfterThrowing | 方法抛异常后 |
| **环绕** | @Around | 包裹整个方法，可控制是否执行 |

### 2. @After vs @AfterReturning

| 对比 | @After | @AfterReturning |
|------|--------|-----------------|
| 执行时机 | 无论成功失败都执行 | 只有正常返回才执行 |
| 类比 | finally | return 后 |

### 3. 方法抛异常时哪些通知执行？

**执行**：@Before、@After、@AfterThrowing、@Around（4个）
**不执行**：@AfterReturning

### 4. @Around 的特点

```java
@Around("pointcut()")
public Object around(ProceedingJoinPoint pjp) throws Throwable {
    // 前置逻辑
    Object result = pjp.proceed();  // 执行目标方法
    // 后置逻辑
    return result;
}
```

**能力**：
- 控制是否执行目标方法（可以不调 proceed()）
- 修改参数
- 修改返回值
- 处理异常

**一句话**：@Around = 前置 + 后置 + 完全控制权


---

## 四十四、线程池七参数

### 1. ThreadPoolExecutor 构造参数

```java
new ThreadPoolExecutor(
    corePoolSize,      // 1. 核心线程数
    maximumPoolSize,   // 2. 最大线程数
    keepAliveTime,     // 3. 空闲线程存活时间
    TimeUnit,          // 4. 时间单位
    workQueue,         // 5. 任务队列
    threadFactory,     // 6. 线程工厂
    handler            // 7. 拒绝策略
);
```

### 2. 各参数详解

| 参数 | 含义 | 说明 |
|------|------|------|
| corePoolSize | 核心线程数 | 一直存活，不会被回收 |
| maximumPoolSize | 最大线程数 | 忙时扩容到这个数 |
| keepAliveTime | 空闲存活时间 | 非核心线程空闲多久被回收 |
| TimeUnit | 时间单位 | SECONDS、MILLISECONDS 等 |
| workQueue | 任务队列 | 核心线程忙时任务排队 |
| threadFactory | 线程工厂 | 创建线程，可自定义线程名 |
| handler | 拒绝策略 | 队列满了怎么办 |

### 3. 执行流程（重要！）

```
任务来了
    ↓
核心线程有空？→ 是 → 执行
    ↓ 否
队列没满？→ 是 → 入队等待
    ↓ 否
没到最大线程？→ 是 → 创建新线程执行
    ↓ 否
执行拒绝策略
```

**关键点**：核心线程忙时，先入队，队列满了才创建新线程！

### 4. 常见队列类型

| 队列 | 特点 |
|------|------|
| ArrayBlockingQueue | 有界队列，固定大小 |
| LinkedBlockingQueue | 无界队列（默认 Integer.MAX_VALUE） |
| SynchronousQueue | 不存储，直接交给线程 |
| PriorityBlockingQueue | 优先级队列 |

### 5. 四种拒绝策略

| 策略 | 行为 |
|------|------|
| AbortPolicy | 抛异常（默认） |
| CallerRunsPolicy | 调用者线程执行 |
| DiscardPolicy | 直接丢弃 |
| DiscardOldestPolicy | 丢弃最老的任务 |

### 6. 配置建议

**CPU 密集型**：核心线程数 = CPU 核数 + 1
**IO 密集型**：核心线程数 = CPU 核数 * 2

**队列大小**：不要用无界队列（会 OOM），建议有界队列

**拒绝策略**：根据业务选择，重要任务用 CallerRunsPolicy


---

## 四十五、@Async 异步编程

### 1. 使用场景

| 场景 | 例子 |
|------|------|
| 发送通知 | 邮件、短信、推送 |
| 日志记录 | 操作日志、审计日志 |
| 数据统计 | 访问量、用户行为 |
| 文件处理 | 图片压缩、视频转码 |
| 第三方调用 | 不紧急的接口调用 |

### 2. 配置方式

**全局配置**：
```java
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {
    @Override
    public Executor getAsyncExecutor() {
        return new ThreadPoolExecutor(...);
    }
}
```

**指定线程池**：
```java
@Async("emailExecutor")
public void sendEmail() { }
```

### 3. 异常处理

**@ControllerAdvice 捕获不到异步异常！**

**解决方案**：
1. 方法内 try-catch
2. AsyncUncaughtExceptionHandler

```java
@Override
public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
    return (ex, method, params) -> {
        log.error("异步任务异常: {}", method.getName(), ex);
    };
}
```

### 4. 注意事项

- 必须加 @EnableAsync
- 不能在同一个类内部调用（代理失效）
- 异常不会抛到主线程


---

## 四十六、同步 vs 异步

### 1. 核心区别

| 对比 | 同步 | 异步 |
|------|------|------|
| 执行方式 | 顺序执行，等待结果 | 提交后立刻返回 |
| 阻塞 | 阻塞主线程 | 不阻塞 |
| 响应速度 | 慢 | 快 |
| 复杂度 | 简单 | 复杂 |

### 2. 应用场景

**同步**：核心业务逻辑、需要返回值、事务操作
**异步**：发送通知、日志记录、数据统计、耗时操作

### 3. 选择原则

**一句话**：核心业务同步，辅助功能异步


---

## 四十七、回调接口

### 1. 定义

把一段代码传给别人，别人在合适时调用它。

**核心思想**："别调我，我调你"

### 2. 示例

```java
interface Callback {
    void onSuccess(String result);
    void onError(Exception e);
}

public void asyncTask(Callback callback) {
    new Thread(() -> {
        try {
            String result = doSomething();
            callback.onSuccess(result);
        } catch (Exception e) {
            callback.onError(e);
        }
    }).start();
}

// 使用
asyncTask(new Callback() {
    public void onSuccess(String result) {
        System.out.println("成功: " + result);
    }
    public void onError(Exception e) {
        System.out.println("失败: " + e);
    }
});
```

### 3. 实际场景

- 支付回调：支付宝调用你的接口通知支付结果
- 第三方接口回调：上传文件后通知处理结果
- 异步任务通知：任务完成后回调


---

## 四十八、分布式事务

### 1. 问题场景

```
下单流程：
订单服务（扣库存）→ 支付服务（扣余额）→ 积分服务（加积分）
```

**问题**：扣余额成功，加积分失败，怎么保证一致性？

### 2. 解决方案对比

| 方案 | 特点 | 一致性 | 性能 |
|------|------|--------|------|
| 2PC | 强一致，阻塞 | 强 | 差 |
| TCC | 手动补偿 | 最终 | 中 |
| Saga | 长事务，事件驱动 | 最终 | 好 |
| 本地消息表 | 消息保证 | 最终 | 好 |
| MQ 事务消息 | RocketMQ 支持 | 最终 | 好 |

### 3. TCC 模式（最常用）

**三个阶段**：
- **Try**：预留资源（冻结库存、冻结余额）
- **Confirm**：确认提交（真正扣除）
- **Cancel**：回滚（释放冻结）

```java
// Try：冻结库存
public void tryReduceStock(Long productId, int count) {
    // 库存 - count，冻结库存 + count
}

// Confirm：确认扣除
public void confirmReduceStock(Long productId, int count) {
    // 冻结库存 - count
}

// Cancel：回滚
public void cancelReduceStock(Long productId, int count) {
    // 库存 + count，冻结库存 - count
}
```

### 4. Seata 框架

阿里开源的分布式事务框架

| 模式 | 特点 |
|------|------|
| **AT** | 自动补偿，侵入性低（最常用） |
| **TCC** | 手动写 Try/Confirm/Cancel |
| **Saga** | 长事务 |
| **XA** | 强一致，性能差 |


---

## 分布式事务

### ACID 特性详解

| 特性 | 核心思想 | 实现机制 | 例子 |
|------|---------|---------|------|
| **A - 原子性** | 要么全做，要么全不做 | undo log（回滚日志） | 转账两步操作，任何一步失败都回滚 |
| **C - 一致性** | 数据从一个合法状态到另一个合法状态 | 约束一致性 + 业务一致性 | 转账前后总金额不变、余额不能为负 |
| **I - 隔离性** | 并发事务互不干扰 | 隔离级别 + MVCC + 锁 | 防止脏读、不可重复读、幻读 |
| **D - 持久性** | 提交后，数据永久保存 | redo log（重做日志） | 断电后用 redo log 恢复数据 |

**记忆口诀：**
- **原子性** = 做不做的问题（全做或全不做）
- **一致性** = 对不对的问题（数据合不合理）
- **隔离性** = 干扰不干扰的问题（并发事务影响）
- **持久性** = 丢不丢的问题（提交后不丢失）

---

### 三种读问题对比

| 问题 | 定义 | 例子 | 前提 |
|------|------|------|------|
| **脏读** | 读到未提交的数据 | 事务A读到事务B未提交的修改，B回滚了 | 同一事务内 |
| **不可重复读** | 同一行数据两次读不一样 | 事务A两次读张三余额，中间被事务B修改了 | 同一事务内 |
| **幻读** | 同一范围行数变化 | 事务A两次查询余额>500的账户，行数变了 | 同一事务内 |

**关键理解：** 三种读问题都是在**一个事务内**，受**其他并发事务**影响。

---

### MySQL 隔离级别

| 隔离级别 | 脏读 | 不可重复读 | 幻读 | 性能 |
|---------|------|-----------|------|------|
| Read Uncommitted | ❌ | ❌ | ❌ | 最高 |
| Read Committed | ✅ | ❌ | ❌ | 高 |
| Repeatable Read | ✅ | ✅ | ⚠️ 部分防止 | 中 |
| Serializable | ✅ | ✅ | ✅ | 最低 |

**MySQL 默认：Repeatable Read**

**记忆技巧：** 级别越高，防护越强，性能越差。

---

### 持久性实现原理

**问题：** 如何做到既快又安全？

**方案A：立即写磁盘**
- 优点：数据安全
- 缺点：太慢（随机写，几十毫秒）

**方案B：先写内存**
- 优点：快
- 缺点：断电丢失

**MySQL 的巧妙方案：redo log**

```
1. 写 redo log 到磁盘（顺序写，快）
2. 写数据到内存
3. 返回"提交成功"
4. 后台慢慢把内存刷到数据文件

断电后：
- redo log 在磁盘上
- 重启时读取 redo log 恢复数据
```

**关键：** redo log 是顺序写，比数据文件的随机写快得多！

---

### 事务传播机制

**核心问题：** 一个有事务的方法调用另一个有事务的方法，事务怎么处理？

| 传播机制 | 行为 | 使用场景 |
|---------|------|---------|
| **REQUIRED**（默认） | 加入外层事务 | 普通业务，保持一致性 |
| **REQUIRES_NEW** | 创建新事务 | 日志记录、积分赠送（失败不影响主业务） |
| **NESTED** | 嵌套事务 | 子事务可以独立回滚 |

**为什么考得少？**
- 隔离级别：数据库层面，所有数据库都有
- 传播机制：Spring 框架特有，大部分场景用默认的 REQUIRED 就够了

---

### TCC 模式详解

**TCC = Try - Confirm - Cancel**

#### 三阶段对比

| 阶段 | 作用 | 库存服务 | 账户服务 |
|------|------|---------|---------|
| **Try** | 预留资源 | `available -= 10; frozen += 10;` | `frozen += 100;` |
| **Confirm** | 确认执行 | `frozen -= 10;` | `balance -= 100; frozen -= 100;` |
| **Cancel** | 回滚 | `available += 10; frozen -= 10;` | `frozen -= 100;` |

**关键设计：**
- ✅ Try 阶段就要真正扣 `available`（防超卖）
- ✅ Confirm 阶段只是释放 `frozen` 标记
- ✅ Confirm 和 Cancel 互斥，只会执行其中一个

---

#### TCC 三大问题及解决方案

| 问题 | 场景 | 后果 | 解决方案 |
|------|------|------|---------|
| **幂等性** | 网络超时导致重试 | 重复扣款 | 事务记录表 + 状态检查 |
| **空回滚** | Try 没执行，Cancel 来了 | Cancel 操作不存在的数据 | Cancel 检查 Try 状态 |
| **悬挂** | Cancel 先到，Try 后到 | 资源永远被冻结 | Try 检查 Cancel 状态 |

**核心解决方案：事务记录表**

```sql
CREATE TABLE tcc_transaction (
    tx_id VARCHAR(64) PRIMARY KEY,    -- 全局事务ID
    status VARCHAR(20),                -- TRY/CONFIRM/CANCEL
    amount INT,                        -- 金额
    create_time DATETIME
);
```

---

#### 幂等性解决方案

```java
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

**关键：** 整个过程在一个本地事务里，保证原子性。

---

#### 空回滚解决方案

```java
@Transactional
public void cancelDeduct(String txId) {
    // 1. 检查 Try 是否执行过
    TccTransaction record = transactionMapper.selectById(txId);
    
    // 2. 空回滚：Try 没执行
    if (record == null) {
        // 记录 Cancel 状态，防止 Try 延迟到达
        record = new TccTransaction();
        record.setTxId(txId);
        record.setStatus("CANCEL");
        transactionMapper.insert(record);
        return;  // 直接返回，不做任何操作
    }
    
    // 3. 正常回滚
    account.frozen -= record.getAmount();
    record.setStatus("CANCEL");
}
```

**关键：** 记录 Cancel 状态，防止 Try 延迟到达。

---

#### 悬挂解决方案

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

**关键：** Try 执行前检查是否已经 Cancel。

---

#### TCC 状态机

```
初始状态
   ↓
[TRY] ← 预留资源
   ↓
   ├─→ [CONFIRM] ← 所有 Try 成功（不可逆）
   └─→ [CANCEL] ← 任何 Try 失败（不可逆）
```

**关键规则：**
- TRY → CONFIRM（不可逆）
- TRY → CANCEL（不可逆）
- **CONFIRM 和 CANCEL 互斥**

---

### 为什么 Try 阶段要真正扣库存？

**错误设计（Confirm 才扣库存）：**

```
1. 用户A Try：available 还是 100，frozen += 10
2. 用户B Try：available 还是 100，frozen += 95
3. 用户A Confirm：available = 90
4. 用户B Confirm：available = -5 ❌ 超卖了！
```

**正确设计（Try 阶段就扣库存）：**

```
1. 用户A Try：available = 90, frozen = 10
2. 用户B Try：available 只有 90，失败！
3. 用户A Confirm：available = 90（不变）, frozen = 0
✅ 不会超卖！
```

**记忆口诀：** Try 阶段预留资源，Confirm 阶段只是"确认"，不是"执行"。

---

### TCC vs 其他分布式事务方案

| 方案 | 一致性 | 性能 | 复杂度 | 适用场景 |
|------|--------|------|--------|---------|
| **TCC** | 强一致 | 高 | 高（需要写3个方法） | 核心业务（订单、支付） |
| **2PC** | 强一致 | 低 | 中 | 传统分布式数据库 |
| **SAGA** | 最终一致 | 高 | 中 | 长事务 |
| **本地消息表** | 最终一致 | 高 | 低 | 非核心业务 |
| **MQ 事务消息** | 最终一致 | 高 | 低 | 异步场景 |

**选择建议：**
- 核心业务（订单、支付）→ TCC
- 非核心业务（积分、通知）→ 最终一致性方案
- 长事务（跨多个服务）→ SAGA

---

### 常见面试题

**Q1: ACID 中的一致性和原子性有什么区别？**

A: 
- **原子性**：关注操作是否完整（要么全做，要么全不做）
- **一致性**：关注数据是否正确（符合约束和业务规则）
- 例子：转账操作，原子性保证两步都执行或都不执行，一致性保证总金额不变

**Q2: 为什么持久性要单独列出来？**

A: 持久性不是理所当然的，是数据库通过 redo log 精心设计的结果。早期数据库面临"立即写磁盘（慢）vs 先写内存（不安全）"的矛盾，redo log 通过顺序写解决了这个问题。

**Q3: MySQL 默认隔离级别是什么？能防止哪些问题？**

A: Repeatable Read（可重复读），能防止脏读和不可重复读，部分防止幻读（通过 MVCC + 间隙锁）。

**Q4: TCC 的三大问题是什么？如何解决？**

A: 
1. **幂等性**：网络超时导致重试 → 事务记录表 + 状态检查
2. **空回滚**：Try 没执行，Cancel 来了 → Cancel 检查 Try 状态
3. **悬挂**：Cancel 先到，Try 后到 → Try 检查 Cancel 状态

**Q5: 为什么 Try 阶段要真正扣库存，而不是 Confirm 阶段才扣？**

A: 如果 Confirm 才扣库存，会导致超卖。因为多个 Try 都看到相同的库存数量，都认为有货，但 Confirm 时库存不够了。Try 阶段就扣库存，可以防止超卖。

**Q6: Confirm 和 Cancel 会同时执行吗？**

A: 不会。Confirm 和 Cancel 是互斥的，只会执行其中一个。所有 Try 成功 → 执行 Confirm；任何 Try 失败 → 执行 Cancel。

**Q7: 如果 Confirm 执行到一半失败了怎么办？**

A: 重试 Confirm，不会调用 Cancel。因为 Try 阶段已经成功了，资源已经预留了，只是 Confirm 执行失败，重试就好。幂等性保证重试不会重复执行。


---

## 分布式事务 - 最终一致性方案

### 方案选择对比

| 场景类型 | 推荐方案 | 原因 | 例子 |
|---------|---------|------|------|
| **核心资源** | TCC、2PC | 必须强一致 | 订单+扣款+扣库存、转账 |
| **非核心业务** | 本地消息表、MQ | 可以最终一致 | 积分、短信、邮件、统计 |

**记忆口诀：** 金额的都得强一致性，不重要的最终一致接口。

---

### 为什么不能在事务里直接调用远程服务？

**核心原因：会拖垮主流程！**

#### 问题1：性能问题
```java
@Transactional
public void createOrder(Order order) {
    orderMapper.insert(order);              // 10ms
    pointService.addPoint(...);             // 500ms（网络调用）
    notificationService.sendSMS(...);       // 300ms
    
    // 总耗时：810ms
    // 用户等了快 1 秒才看到"下单成功"！❌
}
```

#### 问题2：可靠性问题
```java
@Transactional
public void createOrder(Order order) {
    orderMapper.insert(order);           // ✅ 成功
    pointService.addPoint(...);          // ❌ 积分服务宕机
    
    // 整个事务回滚，订单也没了！❌
}
```

#### 问题3：事务超时
```java
@Transactional(timeout = 30)
public void createOrder(Order order) {
    orderMapper.insert(order);
    pointService.addPoint(...);  // 网络很慢，30 秒没响应
    
    // 事务超时，回滚，订单也没了！❌
}
```

---

### 方案1：本地消息表

#### 核心思想
**把"发送消息"和"业务操作"放在同一个本地事务里！**

#### 实现步骤

**步骤1：创建消息表**
```sql
CREATE TABLE local_message (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    message_id VARCHAR(64) UNIQUE,
    content TEXT,                       -- 消息内容（JSON）
    status VARCHAR(20),                 -- PENDING/SUCCESS/FAILED
    retry_count INT DEFAULT 0,
    create_time DATETIME
);
```

**步骤2：业务操作 + 插入消息（同一事务）**
```java
@Transactional
public void createOrder(Order order) {
    // 1. 插入订单
    orderMapper.insert(order);
    
    // 2. 插入消息
    LocalMessage message = new LocalMessage();
    message.setContent(JSON.toJSONString(Map.of(
        "userId", order.getUserId(),
        "points", 100
    )));
    message.setStatus("PENDING");
    messageMapper.insert(message);
    
    // 3. 提交事务（订单和消息要么都成功，要么都失败）
}
```

**步骤3：后台定时任务扫描**
```java
@Scheduled(fixedDelay = 5000)  // 每 5 秒
public void sendMessage() {
    List<LocalMessage> messages = messageMapper.selectPending();
    
    for (LocalMessage msg : messages) {
        try {
            // 调用积分服务
            pointService.addPoint(...);
            msg.setStatus("SUCCESS");
        } catch (Exception e) {
            msg.setRetryCount(msg.getRetryCount() + 1);
            if (msg.getRetryCount() > 10) {
                msg.setStatus("FAILED");  // 告警
            }
        }
        messageMapper.update(msg);
    }
}
```

#### 流程图
```
1. 开启事务
2. 插入订单 ✅
3. 插入消息（PENDING）✅
4. 提交事务
5. 立即返回"下单成功"（15ms）
6. 后台定时任务扫描消息
7. 调用积分服务
   - 成功 → 标记 SUCCESS
   - 失败 → 重试（最多 10 次）
```

---

### 方案2：MQ 事务消息（RocketMQ）

#### 核心思想
**MQ 帮你保证：发送消息和本地事务的一致性！**

#### 关键机制

**1. 半消息（PREPARE）**
- 消息发送到 MQ，但不投递给消费者
- 等待本地事务执行结果

**2. 事务回查**
- 如果 MQ 没收到 COMMIT/ROLLBACK
- MQ 主动回查："本地事务到底成功了吗？"

#### 实现步骤

**步骤1：发送事务消息**
```java
@Service
public class OrderService {
    @Autowired
    private TransactionMQProducer producer;
    
    public void createOrder(Order order) {
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
    
    // 执行本地事务
    @Override
    public LocalTransactionState executeLocalTransaction(Message msg, Object arg) {
        try {
            Order order = (Order) arg;
            orderMapper.insert(order);  // 插入订单
            return LocalTransactionState.COMMIT_MESSAGE;  // 提交消息
        } catch (Exception e) {
            return LocalTransactionState.ROLLBACK_MESSAGE;  // 回滚消息
        }
    }
    
    // 事务回查
    @Override
    public LocalTransactionState checkLocalTransaction(MessageExt msg) {
        // 查询订单是否存在
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
    
    @Override
    public void onMessage(String message) {
        Order order = JSON.parseObject(message, Order.class);
        pointService.addPoint(order.getUserId(), 100);  // 增加积分
    }
}
```

#### 流程图
```
1. 发送半消息（PREPARE）→ RocketMQ
2. RocketMQ 存储半消息（不投递）
3. 执行本地事务（插入订单）
   - 成功 → 返回 COMMIT
   - 失败 → 返回 ROLLBACK
4. RocketMQ 收到 COMMIT → 投递消息给消费者

如果网络故障，RocketMQ 没收到响应：
5. RocketMQ 回查事务状态
6. 查询订单是否存在
   - 存在 → 返回 COMMIT
   - 不存在 → 返回 ROLLBACK
```

---

### 本地消息表 vs MQ 事务消息

| 对比项 | 本地消息表 | MQ 事务消息 |
|--------|-----------|------------|
| **实现复杂度** | 简单（自己写定时任务） | 中等（需要 MQ 支持） |
| **可靠性** | 中（依赖定时任务） | 高（MQ 保证） |
| **性能** | 中（定时扫描有延迟） | 高（实时投递） |
| **消息顺序** | 不保证 | 可以保证（顺序消息） |
| **适用场景** | 小项目、简单场景 | 大项目、高并发场景 |

**选择建议：**
- 小项目、学习阶段 → 本地消息表
- 生产环境、高并发 → MQ 事务消息

---

### 直接调用 vs 本地消息表 vs MQ 事务消息

| 对比项 | 直接调用 | 本地消息表 | MQ 事务消息 |
|--------|---------|-----------|------------|
| **响应速度** | 慢（1秒+） | 快（15ms） | 快（20ms） |
| **可靠性** | 差 | 好 | 最好 |
| **耦合度** | 高 | 低 | 低 |
| **一致性** | 强一致 | 最终一致 | 最终一致 |
| **实现复杂度** | 简单 | 中等 | 中等 |

---

### 常见面试题

**Q1: 为什么不能在事务里直接调用远程服务？**

A: 三个原因：
1. **性能问题**：网络调用慢，拖垮主流程，用户体验差
2. **可靠性问题**：远程服务失败导致整个事务回滚，订单也没了
3. **事务超时**：网络延迟可能导致事务超时回滚

**Q2: 本地消息表的核心思想是什么？**

A: 把"发送消息"和"业务操作"放在同一个本地事务里，保证原子性。后台定时任务扫描消息表，异步调用远程服务，失败了可以重试。

**Q3: RocketMQ 事务消息的半消息是什么？**

A: 半消息是指消息已经发送到 MQ，但不投递给消费者，等待本地事务执行结果。如果本地事务成功，提交消息；如果失败，回滚消息。

**Q4: RocketMQ 的事务回查机制是什么？**

A: 如果 MQ 没收到 COMMIT/ROLLBACK（网络故障），MQ 会主动回查本地事务状态。通过查询数据库判断本地事务是否成功，然后决定提交还是回滚消息。

**Q5: 本地消息表 vs MQ 事务消息，如何选择？**

A: 
- 小项目、学习阶段 → 本地消息表（简单）
- 生产环境、高并发 → MQ 事务消息（可靠、高性能）

**Q6: 哪些业务适合用最终一致性方案？**

A: 不涉及核心资源的业务，失败了可以重试：
- 下单 → 赠送积分
- 下单 → 发送短信
- 注册 → 发送欢迎邮件
- 订单完成 → 更新统计数据

**记忆口诀：** 金额的都得强一致性，不重要的最终一致接口。

**Q7: 本地消息表如何保证消息不丢失？**

A: 
1. 消息和业务操作在同一个本地事务里，保证原子性
2. 后台定时任务扫描 PENDING 消息，失败了重试
3. 超过重试次数，标记 FAILED，发送告警，人工介入

**Q8: RocketMQ 事务消息如何保证消息不丢失？**

A:
1. 半消息机制：消息先存储，等本地事务结果
2. 事务回查：网络故障时 MQ 主动回查本地事务状态
3. 消息持久化：MQ 保证消息不丢失


---

## SAGA 模式

### 核心思想

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

### TCC 在长事务场景的问题

| 问题 | 描述 | 影响 |
|------|------|------|
| **资源锁定时间长** | Try 阶段冻结资源（机票、酒店、车辆） | 其他用户无法预订，性能下降 |
| **第三方服务不支持** | 第三方 API 没有 try/confirm/cancel 方法 | 无法使用 TCC |
| **开发成本高** | 每个服务 3 个方法 + 幂等性/空回滚/悬挂 | 开发和维护成本高 |

---

### SAGA vs TCC

| 对比项 | TCC | SAGA |
|--------|-----|------|
| **操作方式** | Try-Confirm-Cancel（三阶段） | 直接执行 + 补偿（两阶段） |
| **资源锁定** | Try 阶段冻结资源 | 不冻结，直接执行 |
| **一致性** | 强一致性 | 最终一致性 |
| **开发复杂度** | 高（每个服务 3 个方法） | 中（每个服务 2 个方法） |
| **适用场景** | 短事务、核心业务 | 长事务、跨系统 |

**记忆口诀：** 操作简单，最终一致性。

---

### SAGA 的两种实现方式

#### 1. 协同式 SAGA（Choreography）

**特点：** 每个服务自己决定下一步做什么（通过消息）

```
订单服务 → 发消息："订单创建成功"
机票服务 → 监听消息 → 预订机票 → 发消息："机票预订成功"
酒店服务 → 监听消息 → 预订酒店 → 发消息："酒店预订成功"
支付服务 → 监听消息 → 扣款失败 → 发消息："支付失败"
酒店服务 → 监听消息 → 取消酒店
机票服务 → 监听消息 → 取消机票
```

**优点：** 去中心化，服务独立
**缺点：** 流程分散，难以理解和维护

---

#### 2. 编排式 SAGA（Orchestration）- 推荐

**特点：** 有一个协调者统一编排流程

```java
@Service
public class TravelSagaOrchestrator {
    
    public void bookTravel(TravelOrder order) {
        try {
            // 正向操作
            String flightId = flightService.bookFlight(order);
            String hotelId = hotelService.bookHotel(order);
            String carId = carService.bookCar(order);
            paymentService.pay(order);
            
        } catch (Exception e) {
            // 补偿操作（反向）
            compensate(flightId, hotelId, carId);
        }
    }
}
```

**优点：** 流程清晰，易于理解和维护
**缺点：** 协调者是单点（可以通过集群解决）

---

### SAGA 状态机

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
public void bookTravel(TravelOrder order) {
    String sagaId = UUID.randomUUID().toString();
    
    try {
        // 步骤1
        String flightId = flightService.bookFlight(order);
        saveSagaLog(sagaId, "BOOK_FLIGHT", "SUCCESS", flightId);
        
        // 步骤2
        String hotelId = hotelService.bookHotel(order);
        saveSagaLog(sagaId, "BOOK_HOTEL", "SUCCESS", hotelId);
        
        // ...
        
    } catch (Exception e) {
        // 查询已完成的步骤
        List<SagaLog> logs = sagaLogMapper.selectBySagaId(sagaId);
        
        // 反向补偿
        for (int i = logs.size() - 1; i >= 0; i--) {
            compensateStep(logs.get(i));
        }
    }
}
```

---

### SAGA 的优势

| 优势 | 说明 |
|------|------|
| **操作简单** | 每个服务 2 个方法（正向 + 补偿），开发成本降低 33% |
| **不冻结资源** | 直接执行，不影响其他用户，性能好 |
| **适合第三方服务** | 只需要 book/refund 方法，不需要改造成 TCC |

---

### SAGA 的缺点

| 缺点 | 说明 | 解决方案 |
|------|------|---------|
| **最终一致性** | 中间状态可能不一致 | 适用于非核心业务 |
| **补偿可能失败** | 网络故障、服务宕机 | 重试 + 人工介入 |
| **补偿逻辑复杂** | 需要保证幂等性 | 记录补偿日志，检查状态 |

---

### SAGA 适用场景

#### ✅ 适合 SAGA

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

#### ❌ 不适合 SAGA

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

### 组合使用：SAGA + TCC

**场景：** 旅游预订中，支付环节必须强一致

**设计：支付 TCC，外层 SAGA**

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

**优势：**
1. **支付强一致** - 不会出现"扣了钱但没预订成功"
2. **预订灵活** - 不需要改造成 TCC，可以对接第三方 API
3. **性能好** - TCC 只用在支付环节，金额冻结时间短

---

### 分布式事务方案总结

| 方案 | 一致性 | 性能 | 复杂度 | 适用场景 |
|------|--------|------|--------|---------|
| **TCC** | 强一致 | 高 | 高 | 短事务、核心业务（订单+支付） |
| **SAGA** | 最终一致 | 高 | 中 | 长事务、第三方服务（旅游预订） |
| **本地消息表** | 最终一致 | 中 | 低 | 简单异步场景（积分、通知） |
| **MQ 事务消息** | 最终一致 | 高 | 中 | 高并发异步场景（秒杀、大促） |

---

### 方案选择决策树

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

### 常见面试题

**Q1: SAGA 和 TCC 的核心区别是什么？**

A: 
- **操作方式**：SAGA 是直接执行 + 补偿（2 个方法），TCC 是 Try-Confirm-Cancel（3 个方法）
- **资源锁定**：SAGA 不冻结资源，TCC 在 Try 阶段冻结资源
- **一致性**：SAGA 是最终一致性，TCC 是强一致性
- **适用场景**：SAGA 适合长事务、第三方服务，TCC 适合短事务、核心业务

**Q2: SAGA 适合什么场景？**

A: 
1. **长事务**：跨多个服务，执行时间长（旅游预订、订单履约）
2. **第三方服务**：无法改造成 TCC，只有 book/refund 方法
3. **非核心业务**：可以接受最终一致性，中间状态不一致也没关系

**Q3: SAGA 的缺点是什么？如何解决？**

A:
1. **最终一致性**：中间状态可能不一致 → 适用于非核心业务
2. **补偿可能失败**：网络故障、服务宕机 → 重试 + 人工介入
3. **补偿逻辑复杂**：需要保证幂等性 → 记录补偿日志，检查状态

**Q4: 如何组合使用 SAGA 和 TCC？**

A: **支付 TCC，外层 SAGA**
- 预订环节用 SAGA（直接执行，不冻结资源）
- 支付环节用 TCC（强一致性，不能出错）
- 如果支付失败，TCC Cancel 释放金额，SAGA 补偿取消所有预订

**Q5: 编排式 SAGA 和协同式 SAGA 的区别？**

A:
- **编排式**：有一个协调者统一编排流程，流程清晰，易于维护（推荐）
- **协同式**：每个服务自己决定下一步，通过消息通信，去中心化但难以维护

**Q6: 下单+扣款+扣库存 用什么方案？**

A: **TCC**
- 涉及金额和库存，必须强一致
- 短事务，只涉及 3 个服务
- 不能出现"扣了钱但没扣库存"的情况

**Q7: 旅游套餐（机票+酒店+租车+支付）用什么方案？**

A: **SAGA**
- 长事务，涉及 4 个服务
- 第三方服务（航空公司、酒店）无法改造成 TCC
- 可以接受最终一致性，预订失败了可以取消

**Q8: 下单成功 → 赠送积分 用什么方案？**

A: **MQ 事务消息**
- 非核心业务，积分失败不影响订单
- 异步解耦，不能拖垮下单流程
- 高并发场景，MQ 性能好


---

## SAGA + TCC 代码健壮性改进

### 三个关键问题

| 问题 | 描述 | 后果 | 改进方案 |
|------|------|------|---------|
| **异常处理不独立** | catch 里两个回滚，一个异常另一个不执行 | SAGA 补偿不执行，资源泄漏 | 分别 try-catch |
| **缺少 finally** | Confirm 失败，Cancel 不执行 | TCC 资源冻结无法释放 | 使用 finally + 标志位 |
| **Try 未检查 Cancel** | 悬挂问题：Cancel 先到，Try 后到 | 资源永远被冻结 | Try 检查 Cancel 状态 |

---

### 改进1：异常处理的独立性

**原则：** 一个回滚失败不能影响另一个回滚

**错误做法：**
```java
} catch (Exception e) {
    paymentTccService.cancelPay(tccTxId);  // ❌ 如果抛异常
    compensate(sagaId, flightId, hotelId, carId);  // ❌ 不会执行
}
```

**正确做法：**
```java
} catch (Exception e) {
    // 1. TCC Cancel（独立 try-catch）
    try {
        paymentTccService.cancelPay(tccTxId);
    } catch (Exception ex) {
        log.error("TCC Cancel 失败", ex);
        saveManualTask("TCC_CANCEL_FAILED", tccTxId, ex.getMessage());
    }
    
    // 2. SAGA 补偿（独立 try-catch）
    try {
        compensate(sagaId, flightId, hotelId, carId);
    } catch (Exception ex) {
        log.error("SAGA 补偿失败", ex);
        saveManualTask("SAGA_COMPENSATE_FAILED", sagaId, ex.getMessage());
    }
}
```

---

### 改进2：使用 finally 确保回滚执行

**原则：** 使用 finally + 标志位确保清理代码一定执行

```java
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
        // TCC 内部 finally：如果 Try 成功但 Confirm 失败
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
    // 外层 finally：如果整体失败，执行 SAGA 补偿
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
- 使用 `success` 标志位判断是否成功
- 使用 `tccTrySuccess` 标志位判断 Try 是否成功
- 嵌套 finally 处理不同层级的回滚
- finally 确保回滚一定会执行

---

### 改进3：TCC 悬挂问题防范

**原则：** Try 执行前检查 Cancel 状态

**悬挂场景：**
```
1. 协调者调用 Try（网络延迟）
2. 协调者超时，调用 Cancel
3. Cancel 执行完成（空回滚）
4. Try 请求终于到达了！
5. Try 冻结了金额，但永远不会有 Confirm/Cancel 来释放！❌
```

**改进后的 Try 方法：**
```java
@Transactional
public void tryPay(String txId, Long userId, BigDecimal amount) {
    // ========== 1. 防悬挂：检查是否已经 Cancel ==========
    TccLog log = tccLogMapper.selectById(txId);
    if (log != null && "CANCEL".equals(log.getStatus())) {
        throw new RuntimeException("事务已取消，拒绝执行 Try");  // ✅ 防止悬挂
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

---

### 完整的健壮代码

```java
@Service
public class TravelSagaOrchestrator {
    
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
                
                success = true;
                
            } finally {
                // TCC 内部 finally
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
            // 外层 finally
            if (!success) {
                try {
                    compensate(sagaId, flightId, hotelId, carId);
                } catch (Exception ex) {
                    log.error("SAGA 补偿失败", ex);
                    saveManualTask("SAGA_COMPENSATE_FAILED", sagaId, ex.getMessage());
                }
            }
        }
    }
    
    private void compensate(String sagaId, String flightId, String hotelId, String carId) {
        // 每个补偿操作独立 try-catch
        if (carId != null) {
            try {
                carService.cancel(carId);
                saveSagaLog(sagaId, "CANCEL_CAR", "COMPENSATED", null);
            } catch (Exception e) {
                log.error("取消租车失败", e);
                saveManualTask("CANCEL_CAR_FAILED", carId, e.getMessage());
            }
        }
        
        if (hotelId != null) {
            try {
                hotelService.cancel(hotelId);
                saveSagaLog(sagaId, "CANCEL_HOTEL", "COMPENSATED", null);
            } catch (Exception e) {
                log.error("取消酒店失败", e);
                saveManualTask("CANCEL_HOTEL_FAILED", hotelId, e.getMessage());
            }
        }
        
        if (flightId != null) {
            try {
                flightService.cancel(flightId);
                saveSagaLog(sagaId, "CANCEL_FLIGHT", "COMPENSATED", null);
            } catch (Exception e) {
                log.error("取消机票失败", e);
                saveManualTask("CANCEL_FLIGHT_FAILED", flightId, e.getMessage());
            }
        }
    }
}
```

---

### 代码健壮性设计原则

| 原则 | 说明 | 实现方式 |
|------|------|---------|
| **异常隔离** | 一个操作失败不影响其他操作 | 独立 try-catch |
| **清理保证** | 确保清理代码一定执行 | finally + 标志位 |
| **状态检查** | 执行前检查状态，防止重复或冲突 | 查询状态表 |
| **失败记录** | 失败了记录到人工处理表 | saveManualTask() |
| **告警通知** | 关键失败发送告警 | alertService.send() |

---

### 常见面试题

**Q1: 为什么 catch 里的两个回滚要分别 try-catch？**

A: 因为如果第一个回滚抛异常，第二个回滚就不会执行了。分别 try-catch 确保一个失败不影响另一个，保证所有回滚都会尝试执行。

**Q2: 为什么要用 finally 而不是 catch？**

A: 
- **finally** 无论是否抛异常都会执行，确保清理代码一定运行
- **catch** 只有抛异常才执行，如果没有异常但业务失败（如 return），catch 不会执行
- 使用 finally + 标志位（success）可以准确判断是否需要回滚

**Q3: TCC 的悬挂问题是什么？如何防范？**

A: 
- **悬挂场景**：Cancel 先到（空回滚），Try 后到，导致资源永远被冻结
- **防范方法**：Try 执行前检查 Cancel 状态，如果已经 Cancel，拒绝执行 Try
- **代码实现**：
```java
TccLog log = tccLogMapper.selectById(txId);
if (log != null && "CANCEL".equals(log.getStatus())) {
    throw new RuntimeException("事务已取消，拒绝执行");
}
```

**Q4: 如何处理回滚失败的情况？**

A: 
1. **记录日志**：log.error() 记录详细错误信息
2. **人工处理表**：saveManualTask() 记录到数据库
3. **发送告警**：alertService.send() 通知运维人员
4. **定时重试**：后台定时任务扫描人工处理表，自动重试
5. **人工介入**：超过重试次数，人工处理

**Q5: 为什么要用嵌套 finally？**

A: 
- **外层 finally**：处理 SAGA 补偿（取消机票、酒店、租车）
- **内层 finally**：处理 TCC Cancel（释放冻结金额）
- 两个层级的回滚逻辑不同，需要分别处理
- 嵌套 finally 确保两个层级的回滚都会执行

**Q6: 标志位 success 和 tccTrySuccess 的作用是什么？**

A:
- **success**：标记整体是否成功，用于外层 finally 判断是否需要 SAGA 补偿
- **tccTrySuccess**：标记 TCC Try 是否成功，用于内层 finally 判断是否需要 TCC Cancel
- 使用标志位比捕获异常更准确，因为有些失败不会抛异常（如业务校验失败）
