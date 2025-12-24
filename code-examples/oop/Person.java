/**
 * 面向对象编程示例 - Person 类
 * 
 * 展示类的基本结构：属性、构造方法、getter/setter、方法
 */
public class Person {
    
    // 私有属性 - 封装
    private String name;
    private int age;
    private String email;
    
    // 无参构造方法
    public Person() {
        this.name = "未知";
        this.age = 0;
        this.email = "";
    }
    
    // 带参构造方法
    public Person(String name, int age) {
        this.name = name;
        this.age = age;
        this.email = "";
    }
    
    // 全参构造方法
    public Person(String name, int age, String email) {
        this.name = name;
        this.age = age;
        this.email = email;
    }
    
    // Getter 方法
    public String getName() {
        return name;
    }
    
    public int getAge() {
        return age;
    }
    
    public String getEmail() {
        return email;
    }
    
    // Setter 方法
    public void setName(String name) {
        this.name = name;
    }
    
    public void setAge(int age) {
        if (age >= 0 && age <= 150) {
            this.age = age;
        } else {
            System.out.println("年龄无效！");
        }
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    // 实例方法
    public void introduce() {
        System.out.println("大家好，我叫 " + name + "，今年 " + age + " 岁。");
    }
    
    // 重写 toString 方法
    @Override
    public String toString() {
        return "Person{name='" + name + "', age=" + age + ", email='" + email + "'}";
    }
    
    // 主方法 - 测试
    public static void main(String[] args) {
        // 使用无参构造
        Person p1 = new Person();
        System.out.println("p1: " + p1);
        
        // 使用带参构造
        Person p2 = new Person("张三", 25);
        p2.introduce();
        
        // 使用全参构造
        Person p3 = new Person("李四", 30, "lisi@example.com");
        System.out.println("p3: " + p3);
        
        // 使用 setter 修改属性
        p1.setName("王五");
        p1.setAge(28);
        p1.introduce();
    }
}

/*
 * 预期输出:
 * p1: Person{name='未知', age=0, email=''}
 * 大家好，我叫 张三，今年 25 岁。
 * p3: Person{name='李四', age=30, email='lisi@example.com'}
 * 大家好，我叫 王五，今年 28 岁。
 */
