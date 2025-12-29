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

## 题目 1：滑动窗口最大值（中等）

**题目**：给定数组和窗口大小 k，返回每个窗口的最大值

**解法**：单调队列 O(n)

```java
public int[] maxSlidingWindow(int[] nums, int k) {
    int n = nums.length;
    int[] result = new int[n - k + 1];
    Deque<Integer> deque = new LinkedList<>();  // 存下标
    
    for (int i = 0; i < n; i++) {
        // 1. 移除过期元素
        while (!deque.isEmpty() && deque.peekFirst() < i - k + 1) {
            deque.pollFirst();
        }
        // 2. 维护单调递减
        while (!deque.isEmpty() && nums[deque.peekLast()] < nums[i]) {
            deque.pollLast();
        }
        // 3. 入队
        deque.offerLast(i);
        // 4. 记录结果
        if (i >= k - 1) {
            result[i - k + 1] = nums[deque.peekFirst()];
        }
    }
    return result;
}
```

**核心技巧**：
- 队列存下标，不是值
- 维护单调递减，队首就是最大值
- 检查队首是否过期

---

## 今日总结

- 学习了单调队列解决滑动窗口最大值问题
- 明天继续华为 OD 算法专场

