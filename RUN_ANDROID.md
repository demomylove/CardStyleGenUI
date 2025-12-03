# 如何编译并运行 CardStyleGenUI 项目到 Android 模拟器

本文档将指导你如何配置环境、安装依赖，并将项目运行在 Android 模拟器上。

## 1. 环境准备

在开始之前，请确保你的开发环境满足以下要求。

### 1.1 基础工具
*   **Node.js**: 需要 Node.js >= 20。
    *   检查版本: `node --version`
*   **Java Development Kit (JDK)**: 推荐使用 JDK 17。
    *   检查版本: `javac --version`

### 1.2 Android 开发环境
*   **Android Studio**: 下载并安装最新版本的 Android Studio。
*   **Android SDK**: 在 Android Studio 中安装以下 SDK 组件 (SDK Manager):
    *   Android SDK Platform (推荐 Android 13/14, API Level 33/34)
    *   Android SDK Build-Tools
    *   Android SDK Platform-Tools
    *   Android Emulator

### 1.3 环境变量配置
确保配置了 `ANDROID_HOME` 环境变量，并将相关工具添加到 `PATH` 中。

**macOS/Linux (在 ~/.zshrc 或 ~/.bashrc 中添加):**
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

**Windows:**
*   新建系统变量 `ANDROID_HOME`，值为 SDK 路径 (通常是 `C:\Users\你的用户名\AppData\Local\Android\Sdk`)
*   在 Path 变量中添加 `%ANDROID_HOME%\platform-tools` 和 `%ANDROID_HOME%\emulator`

## 2. 项目安装

打开终端，进入项目根目录，安装项目依赖：

```bash
# 使用 npm
npm install

# 或者使用 yarn (如果已安装)
yarn install
```

## 3. 启动 Android 模拟器

你可以通过以下两种方式启动模拟器：

**方式 A: 通过 Android Studio**
1.  打开 Android Studio。
2.  点击 "Virtual Device Manager" (手机图标)。
3.  点击目标模拟器旁边的 "Play" 按钮启动。

**方式 B: 通过命令行**
```bash
# 列出所有可用模拟器
emulator -list-avds

# 启动指定模拟器
emulator -avd <模拟器名称>
```

确保 `adb devices` 命令能看到已连接的模拟器：
```bash
adb devices
# 输出示例:
# List of devices attached
# emulator-5554	device
```

## 4. 编译并运行

### 第一步：启动 Metro Bundler
在一个新的终端窗口中运行：

```bash
npm start
```
保持此窗口开启。

### 第二步：编译并安装应用
在另一个终端窗口中运行：

```bash
npm run android
```

此命令会执行以下操作：
1.  编译 Android 原生代码 (Gradle Build)。
2.  启动 App 并连接到 Metro Bundler。

## 5. 常见问题排查

**Q: 编译报错 `SDK location not found`?**
A: 检查 `android/local.properties` 文件是否存在。如果不存在，请创建该文件并添加 SDK 路径：
```properties
sdk.dir=/Users/你的用户名/Library/Android/sdk
```
(Windows 用户请注意路径格式，如 `sdk.dir=C:\\Users\\用户名\\AppData\\Local\\Android\\Sdk`)

**Q: 报错 `Task :app:installDebug FAILED`?**
A: 确保模拟器已启动且连接正常。尝试运行 `cd android && ./gradlew clean` 清理缓存后再试。

**Q: Metro 连接失败?**
A: 在模拟器上按 `CMD + M` (Mac) 或 `CTRL + M` (Windows) 打开开发者菜单，选择 "Reload"。或者在终端按 `r` 键重载。
