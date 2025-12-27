# 学习笔记 - 2025-12-27

## 学习概述
- **日期**: 2025-12-27
- **主题**: 华为 OD 算法专场 Day 1
- **目标**: 中等难度算法题训练

---

## 华为 OD 算法考试特点

1. **题型分布**: 通常 2-3 道题，100-400 分
2. **时间限制**: 150 分钟
3. **常考类型**:
   - 字符串处理
   - 数组/滑动窗口
   - DFS/BFS
   - 动态规划
   - 贪心算法
   - 模拟题

---

## 解题技巧总结

### 1. 输入输出处理
```java
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // 读取整数
        int n = sc.nextInt();
        // 读取一行字符串
        String line = sc.nextLine();
        // 读取数组
        int[] arr = new int[n];
        for (int i = 0; i < n; i++) {
            arr[i] = sc.nextInt();
        }
    }
}
```

### 2. 常用数据结构
- HashMap: 计数、去重
- HashSet: 判重
- PriorityQueue: 堆/Top K
- Deque: 单调栈/队列
- StringBuilder: 字符串拼接

---

