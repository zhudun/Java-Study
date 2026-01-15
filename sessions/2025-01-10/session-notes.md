# 学习笔记 - 2025-01-10

## 学习概述
- **日期**: 2025-01-10
- **时长**: 约 45 分钟
- **主题**: 联合索引最左前缀、explain type、Feign 原理、Gateway 概念

## 学习内容

### 1. 联合索引最左前缀

**核心规则**：查询时必须从索引的最左列开始，不能跳过。

**索引 `(a, b, c)` 的查询情况**：
| 查询 | 能用索引？ | 用到哪些列 |
|------|-----------|-----------|
| `WHERE a = 1` | ✅ | a |
| `WHERE b = 2` | ❌ | 无 |
| `WHERE a = 1 AND c = 3` | ✅ | 只有 a |
| `WHERE a = 1 AND b = 2 AND c = 3` | ✅ | a, b, c |

**为什么中间不能断**：
- 联合索引排序规则：先按 a 排序，a 相同按 b 排序，b 相同按 c 排序
- 跳过 b 直接查 c 时，c 没有全局顺序，只能遍历

**延伸知识**：
- 索引本质是排好序的数据结构（B+Tree）
- MySQL 显示的 BTREE 实际是 B+Tree
- Collation（排序规则）不一致会导致 JOIN 失败
- ALTER TABLE 修改 Collation 会重建索引

### 2. explain type 字段

**从好到差的顺序**（面试重点）：
```
const > eq_ref > ref > range > index > ALL
```

| type | 含义 | 场景 |
|------|------|------|
| const | 主键/唯一索引等值，最多1行 | 单表 `WHERE id = 1` |
| eq_ref | JOIN 用主键/唯一索引 | `JOIN ON a.id = b.user_id` |
| ref | 普通索引等值，可能多行 | 单表或 JOIN |
| range | 索引范围查询 | `WHERE age > 18` |
| index | 扫描整个索引树 | 查询列都在索引里 |
| ALL | 全表扫描，最差 | 没用到索引 |

**区分要点**：
- const 只在单表，eq_ref 只在 JOIN
- ref 单表和 JOIN 都行
- eq_ref 是唯一索引（一对一），ref 是普通索引（一对多）
- index 和 ALL 都是扫描，但 index 扫索引（数据量小），ALL 扫全表

### 3. Feign 原理

**四步流程**：
```
1. 动态代理：为接口生成代理对象
      ↓
2. 解析注解：@GetMapping → GET 请求，路径 → URL
      ↓
3. 服务发现：从 Nacos 获取真实地址（或直接用 URL）
      ↓
4. 发送请求：负载均衡选实例，发 HTTP 请求
```

**一句话**：Feign = 动态代理 + 注解解析 + 服务发现 + HTTP 客户端

**两种用法**：
- 服务名：`@FeignClient(name = "user-service")` - 配合注册中心
- URL：`@FeignClient(url = "https://api.example.com")` - 调第三方

**Feign vs Dubbo**：
- Feign：HTTP + JSON，简单，适合快速开发
- Dubbo：TCP + 二进制，快 2-5 倍，适合内部高频调用
- 可以混用：内部核心用 Dubbo，边缘/第三方用 Feign

### 4. Gateway 核心概念

**三个核心**：
| 概念 | 作用 |
|------|------|
| Route（路由） | 定义转发规则：去哪个服务 |
| Predicate（断言） | 匹配条件：路径、Header、参数等 |
| Filter（过滤器） | 请求前后处理：加 Header、鉴权、限流 |

**Predicate vs Filter**：
- Predicate：判断走不走这条路由（true/false）
- Filter：匹配成功后对请求做处理

**Nginx vs Gateway**：
| 对比 | Nginx | Gateway |
|------|-------|---------|
| 层级 | 最外层，面向公网 | 内部，面向微服务 |
| 擅长 | 静态资源、SSL、负载均衡 | 动态路由、鉴权、限流 |
| 性能 | C 写的，极高 | Java 写的，相对低 |

**典型架构**：用户 → Nginx → Gateway → 微服务

### 5. 延伸知识点

**限流方式**：
| 方式 | 层级 | 特点 |
|------|------|------|
| Semaphore | 代码级 | 单机，控制并发数 |
| RateLimiter | 代码级 | 单机，按速率限流 |
| Gateway 限流 | 网关级 | 分布式 |
| Sentinel | 服务级 | 分布式，功能丰富 |

**Seata**：分布式事务解决方案，解决跨服务数据一致性问题

## 待学习
- AOP 五种通知（下次继续）

## 学生表现
- 对索引原理有深入追问（排序规则、B+Tree）
- 能联系实际工作经验（Collation 问题、Feign 调第三方）
- 理解能力强，总结到位
