# 学习笔记 - 2025-12-24

## 学习概述
- **日期**: 2025-12-24
- **时长**: 约 15 分钟
- **主要主题**: 薄弱点复习

---

## 薄弱点复习测试

### 复习内容
1. 幻读 vs 不可重复读
2. Spring 事务失效（内部调用）
3. 缓存一致性（Cache Aside）
4. 单例模式双重检查锁
5. 工厂模式三种区别
6. 类加载双亲委派

### 测试结果：6/6 ✅

| 题目 | 答案 | 结果 |
|------|------|------|
| 行数变多是什么问题 | 幻读 | ✅ |
| 内部调用事务能生效吗 | 不能 | ✅ |
| Cache Aside 写操作顺序 | 先更新DB再删缓存 | ✅ |
| 双重检查锁为什么要volatile | 防止重排序+可见性 | ✅ |
| 产品族用什么工厂 | 抽象工厂 | ✅ |
| 双亲委派先找谁 | 父加载器 | ✅ |

### 掌握情况
- 幻读 vs 不可重复读：已掌握 ✅
- Spring 事务失效：已掌握 ✅
- 缓存一致性：已掌握 ✅
- 单例模式：已掌握 ✅
- 工厂模式区别：已掌握 ✅
- 双亲委派：已掌握 ✅

---


## Java 基础测试

### 测试结果：6.5/7 (93%)

| 题目 | 结果 | 备注 |
|------|------|------|
| 基本数据类型 | ✅ | 8种都对 |
| int vs Integer | ✅ | 默认值、缓存池 |
| == vs equals | ✅ | 地址 vs 内容 |
| String 两种创建 | ✅ | 常量池 vs 堆 |
| final 关键字 | ✅ | 变量/方法/类 |
| break vs continue | ✅ | 跳出 vs 跳过 |
| 方法重载规则 | ⚠️ | 返回值可以不同，不是必须相同 |

### 薄弱点
- 重载只看方法签名（方法名+参数），不看返回值

---

## 面向对象测试

### 测试结果：8/9 (89%)

| 题目 | 结果 | 备注 |
|------|------|------|
| 三大特性 | ✅ | 封装、继承、多态 |
| 访问修饰符 | ⚠️ | default 和 protected 搞混 |
| 抽象类 vs 接口 | ✅ | 单继承 vs 多实现 |
| 多态输出 | ✅ | Child |
| super vs this | ✅ | 父类 vs 本类 |
| 构造方法继承重写 | ✅ | 都不可以 |
| 单继承多实现 | ✅ | 正确 |
| 静态访问非静态 | ✅ | 不可以 |
| Object 方法 | ✅ | clone/equals/toString |

### 薄弱点
- default = 本类 + 同包（没有子类）
- protected = 本类 + 同包 + 子类

---

## 集合框架测试

### 测试结果：5.5/8 (69%)

| 题目 | 结果 | 备注 |
|------|------|------|
| ArrayList vs LinkedList | ✅ | 数组 vs 链表 |
| HashMap 底层 | ✅ | 数组+链表+红黑树 |
| HashMap vs Hashtable | ✅ | 线程安全、null key |
| HashSet 去重 | ❌ | 不知道 hashCode+equals |
| HashMap null | ✅ | key 一个，value 不限 |
| ConcurrentHashMap | ❌ | 不知道 CAS+synchronized |
| ArrayList 线程安全 | ✅ | CopyOnWriteArrayList |
| Comparable vs Comparator | ⚠️ | 都是接口，一个内部一个外部 |

### 薄弱点
- HashSet 去重：hashCode() + equals()
- ConcurrentHashMap：CAS + synchronized 锁单个桶
- Comparable：类自己实现 compareTo()
- Comparator：外部传入 compare()

---

## 今日总结

**测试模块**: 薄弱点复习 + Java基础 + 面向对象 + 集合框架
**总时长**: 约 45 分钟

| 模块 | 得分 | 状态 |
|------|------|------|
| 薄弱点复习 | 6/6 (100%) | ✅ 全部掌握 |
| Java 基础 | 6.5/7 (93%) | ✅ 掌握良好 |
| 面向对象 | 8/9 (89%) | ✅ 掌握良好 |
| 集合框架 | 5.5/8 (69%) | ⚠️ 需要加强 |

**新增薄弱点**:
- 访问修饰符 default vs protected
- HashSet 去重原理
- ConcurrentHashMap 原理
- Comparable vs Comparator
