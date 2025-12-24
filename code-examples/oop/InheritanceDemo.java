/**
 * 继承和多态示例
 * 
 * 展示 Java 中的继承、方法重写、多态
 */

// 父类 - Animal
class Animal {
    protected String name;
    
    public Animal(String name) {
        this.name = name;
    }
    
    // 可以被子类重写的方法
    public void makeSound() {
        System.out.println(name + " 发出声音");
    }
    
    public void eat() {
        System.out.println(name + " 正在吃东西");
    }
}

// 子类 - Dog
class Dog extends Animal {
    private String breed;  // 品种
    
    public Dog(String name, String breed) {
        super(name);  // 调用父类构造方法
        this.breed = breed;
    }
    
    // 重写父类方法
    @Override
    public void makeSound() {
        System.out.println(name + " 汪汪叫！");
    }
    
    // 子类特有方法
    public void fetch() {
        System.out.println(name + " 正在捡球");
    }
    
    public String getBreed() {
        return breed;
    }
}

// 子类 - Cat
class Cat extends Animal {
    private boolean isIndoor;
    
    public Cat(String name, boolean isIndoor) {
        super(name);
        this.isIndoor = isIndoor;
    }
    
    @Override
    public void makeSound() {
        System.out.println(name + " 喵喵叫！");
    }
    
    public void climb() {
        System.out.println(name + " 正在爬树");
    }
}

// 主类
public class InheritanceDemo {
    
    // 多态示例 - 接收父类类型参数
    public static void animalSound(Animal animal) {
        animal.makeSound();  // 根据实际对象类型调用对应方法
    }
    
    public static void main(String[] args) {
        // 创建对象
        Dog dog = new Dog("旺财", "金毛");
        Cat cat = new Cat("咪咪", true);
        
        System.out.println("=== 基本调用 ===");
        dog.makeSound();
        dog.eat();
        dog.fetch();
        
        System.out.println();
        cat.makeSound();
        cat.eat();
        cat.climb();
        
        System.out.println("\n=== 多态演示 ===");
        // 父类引用指向子类对象
        Animal animal1 = new Dog("小黑", "哈士奇");
        Animal animal2 = new Cat("小白", false);
        
        // 调用的是子类重写的方法
        animal1.makeSound();
        animal2.makeSound();
        
        System.out.println("\n=== 方法参数多态 ===");
        animalSound(dog);
        animalSound(cat);
        animalSound(animal1);
        
        System.out.println("\n=== instanceof 检查 ===");
        if (animal1 instanceof Dog) {
            Dog d = (Dog) animal1;  // 向下转型
            System.out.println("animal1 是 Dog，品种: " + d.getBreed());
        }
    }
}

/*
 * 预期输出:
 * === 基本调用 ===
 * 旺财 汪汪叫！
 * 旺财 正在吃东西
 * 旺财 正在捡球
 * 
 * 咪咪 喵喵叫！
 * 咪咪 正在吃东西
 * 咪咪 正在爬树
 * 
 * === 多态演示 ===
 * 小黑 汪汪叫！
 * 小白 喵喵叫！
 * 
 * === 方法参数多态 ===
 * 旺财 汪汪叫！
 * 咪咪 喵喵叫！
 * 小黑 汪汪叫！
 * 
 * === instanceof 检查 ===
 * animal1 是 Dog，品种: 哈士奇
 */
