import java.util.*;

/**
 * 集合框架示例
 * 
 * 展示 List, Set, Map 的基本使用
 */
public class CollectionDemo {
    
    public static void main(String[] args) {
        // ========== List 示例 ==========
        System.out.println("=== ArrayList 示例 ===");
        
        // 创建 ArrayList
        List<String> fruits = new ArrayList<>();
        
        // 添加元素
        fruits.add("苹果");
        fruits.add("香蕉");
        fruits.add("橙子");
        fruits.add("苹果");  // List 允许重复
        
        System.out.println("水果列表: " + fruits);
        System.out.println("第一个水果: " + fruits.get(0));
        System.out.println("列表大小: " + fruits.size());
        
        // 遍历 - foreach
        System.out.print("遍历: ");
        for (String fruit : fruits) {
            System.out.print(fruit + " ");
        }
        System.out.println();
        
        // ========== Set 示例 ==========
        System.out.println("\n=== HashSet 示例 ===");
        
        // 创建 HashSet
        Set<String> colors = new HashSet<>();
        
        colors.add("红色");
        colors.add("蓝色");
        colors.add("绿色");
        colors.add("红色");  // 重复元素不会被添加
        
        System.out.println("颜色集合: " + colors);
        System.out.println("包含红色: " + colors.contains("红色"));
        System.out.println("集合大小: " + colors.size());
        
        // ========== Map 示例 ==========
        System.out.println("\n=== HashMap 示例 ===");
        
        // 创建 HashMap
        Map<String, Integer> scores = new HashMap<>();
        
        // 添加键值对
        scores.put("张三", 85);
        scores.put("李四", 92);
        scores.put("王五", 78);
        
        System.out.println("成绩表: " + scores);
        System.out.println("张三的成绩: " + scores.get("张三"));
        
        // 遍历 Map
        System.out.println("遍历 Map:");
        for (Map.Entry<String, Integer> entry : scores.entrySet()) {
            System.out.println("  " + entry.getKey() + ": " + entry.getValue() + "分");
        }
        
        // 检查键是否存在
        if (scores.containsKey("李四")) {
            System.out.println("李四在成绩表中");
        }
        
        // ========== 泛型示例 ==========
        System.out.println("\n=== 泛型示例 ===");
        
        // 泛型类使用
        List<Integer> numbers = new ArrayList<>();
        numbers.add(1);
        numbers.add(2);
        numbers.add(3);
        
        // 计算总和
        int sum = 0;
        for (Integer num : numbers) {
            sum += num;
        }
        System.out.println("数字列表: " + numbers);
        System.out.println("总和: " + sum);
        
        // ========== Collections 工具类 ==========
        System.out.println("\n=== Collections 工具类 ===");
        
        List<Integer> nums = new ArrayList<>(Arrays.asList(5, 2, 8, 1, 9));
        System.out.println("原始列表: " + nums);
        
        Collections.sort(nums);
        System.out.println("排序后: " + nums);
        
        Collections.reverse(nums);
        System.out.println("反转后: " + nums);
        
        System.out.println("最大值: " + Collections.max(nums));
        System.out.println("最小值: " + Collections.min(nums));
    }
}

/*
 * 预期输出:
 * === ArrayList 示例 ===
 * 水果列表: [苹果, 香蕉, 橙子, 苹果]
 * 第一个水果: 苹果
 * 列表大小: 4
 * 遍历: 苹果 香蕉 橙子 苹果 
 * 
 * === HashSet 示例 ===
 * 颜色集合: [红色, 蓝色, 绿色]
 * 包含红色: true
 * 集合大小: 3
 * 
 * === HashMap 示例 ===
 * 成绩表: {李四=92, 张三=85, 王五=78}
 * 张三的成绩: 85
 * 遍历 Map:
 *   李四: 92分
 *   张三: 85分
 *   王五: 78分
 * 李四在成绩表中
 * 
 * === 泛型示例 ===
 * 数字列表: [1, 2, 3]
 * 总和: 6
 * 
 * === Collections 工具类 ===
 * 原始列表: [5, 2, 8, 1, 9]
 * 排序后: [1, 2, 5, 8, 9]
 * 反转后: [9, 8, 5, 2, 1]
 * 最大值: 9
 * 最小值: 1
 */
