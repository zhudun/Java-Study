/**
 * Java 入门示例 - Hello World
 * 
 * 这是学习 Java 的第一个程序，展示了 Java 程序的基本结构。
 */
public class HelloWorld {
    
    /**
     * main 方法是 Java 程序的入口点
     * 
     * @param args 命令行参数
     */
    public static void main(String[] args) {
        // 输出 "Hello, World!" 到控制台
        System.out.println("Hello, World!");
        
        // 输出欢迎信息
        System.out.println("欢迎开始学习 Java！");
        
        // 演示变量
        String name = "Java 学习者";
        System.out.println("你好, " + name + "!");
        
        // 演示基本数据类型
        int age = 25;
        double height = 1.75;
        boolean isLearning = true;
        
        System.out.println("年龄: " + age);
        System.out.println("身高: " + height + " 米");
        System.out.println("正在学习: " + isLearning);
    }
}

/*
 * 预期输出:
 * Hello, World!
 * 欢迎开始学习 Java！
 * 你好, Java 学习者!
 * 年龄: 25
 * 身高: 1.75 米
 * 正在学习: true
 * 
 * 编译和运行:
 * javac HelloWorld.java
 * java HelloWorld
 */
