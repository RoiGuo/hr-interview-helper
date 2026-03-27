# 部署指南

本文档提供多种部署方案，你可以根据需要选择最适合的方式。

## 目录
- [方式一：直接分享文件（最简单）](#方式一直接分享文件最简单)
- [方式二：本地服务器](#方式二本地服务器)
- [方式三：GitHub Pages（免费）](#方式三github-pages免费)
- [方式四：Vercel（免费）](#方式四vercel免费)
- [方式五：Netlify（免费）](#方式五netlify免费)
- [方式六：云存储OSS](#方式六云存储oss)

---

## 方式一：直接分享文件（最简单）

### 适用场景
- 小范围团队内部使用
- 不需要持续更新
- 用户技术能力较强

### 步骤
1. **打包文件**
   ```
   将以下文件打包成 zip 压缩包：
   - index.html
   - style.css
   - app.js
   - README.md
   - FAQ.md
   ```

2. **分享给用户**
   - 通过邮件、网盘、企业微信等方式分享
   - 建议文件命名：`HR面试助手_v1.0.zip`

3. **用户使用**
   - 下载并解压压缩包
   - 双击 `index.html` 在浏览器中打开
   - 查看 `README.md` 了解使用方法

### 优点
- ✅ 无需服务器
- ✅ 部署最快
- ✅ 完全离线可用（首次加载后）

### 缺点
- ❌ 更新需要重新分发
- ❌ 用户需要手动管理文件
- ❌ 不便于版本控制

---

## 方式二：本地服务器

### 适用场景
- 团队局域网内使用
- 需要定期更新
- 有一台长期运行的电脑

### 使用 Python 启动（推荐）

#### macOS / Linux
```bash
# 进入项目目录
cd "/Users/bytedance/Documents/trae_projects/HR - Pretalk"

# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

#### Windows
```cmd
# 进入项目目录
cd "C:\path\to\HR - Pretalk"

# Python 3
python -m http.server 8000
```

### 使用 Node.js 启动
```bash
# 安装 http-server（首次）
npm install -g http-server

# 启动服务器
http-server -p 8000
```

### 使用 PHP 启动
```bash
php -S localhost:8000
```

### 访问应用
启动成功后，在浏览器访问：
```
http://localhost:8000
```

局域网内其他用户访问：
```
http://[你的电脑IP]:8000
```

### 获取本机IP地址
- **macOS/Linux:** `ifconfig` 或 `ip addr`
- **Windows:** `ipconfig`

### 优点
- ✅ 快速启动
- ✅ 局域网内共享
- ✅ 便于更新

### 缺点
- ❌ 需要电脑一直运行
- ❌ 外网访问需要配置端口转发

---

## 方式三：GitHub Pages（免费）

### 适用场景
- 公开或内部团队使用
- 需要版本控制
- 免费托管

### 步骤

#### 1. 创建 GitHub 仓库
1. 访问 github.com 并登录
2. 点击 "New repository"
3. 填写仓库名称（如：hr-interview-helper）
4. 选择 "Public" 或 "Private"
5. 点击 "Create repository"

#### 2. 上传文件
**方法A：网页上传（简单）**
1. 在仓库页面点击 "uploading an existing file"
2. 拖拽所有文件到上传区域
3. 填写提交信息
4. 点击 "Commit changes"

**方法B：Git命令行（推荐）**
```bash
# 初始化仓库
git init
git add .
git commit -m "Initial commit"

# 关联远程仓库
git remote add origin https://github.com/你的用户名/仓库名.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

#### 3. 启用 GitHub Pages
1. 进入仓库的 "Settings"
2. 左侧菜单选择 "Pages"
3. 在 "Build and deployment" 下：
   - Source: 选择 "Deploy from a branch"
   - Branch: 选择 `main` 分支，文件夹选择 `/ (root)`
4. 点击 "Save"

#### 4. 访问应用
等待几分钟后，访问：
```
https://你的用户名.github.io/仓库名/
```

### 更新应用
```bash
# 修改文件后
git add .
git commit -m "Update: 描述更新内容"
git push
```
GitHub Pages 会自动重新部署。

### 优点
- ✅ 完全免费
- ✅ 支持 HTTPS
- ✅ 版本控制
- ✅ 自动部署
- ✅ 全球CDN加速

### 缺点
- ❌ 仓库公开时所有人都能访问
- ❌ 私有仓库需要 GitHub Pro 才能使用 Pages（付费）

---

## 方式四：Vercel（免费）

### 适用场景
- 快速部署
- 不需要 Git 知识
- 优秀的性能

### 步骤

#### 方法A：使用 Git 仓库（推荐）
1. 先将代码推送到 GitHub（参考方式三）
2. 访问 vercel.com 并使用 GitHub 账号登录
3. 点击 "New Project"
4. 选择你的仓库
5. 点击 "Import"
6. 保持默认配置，点击 "Deploy"
7. 等待部署完成，获得访问链接

#### 方法B：直接拖拽上传
1. 访问 vercel.com/dashboard
2. 点击 "New Project"
3. 将项目文件夹拖拽到上传区域
4. 等待部署完成

### 自定义域名
在 Vercel  dashboard 中：
1. 进入项目设置
2. 选择 "Domains"
3. 添加你的域名
4. 按照提示配置 DNS

### 优点
- ✅ 部署超级简单
- ✅ 完全免费
- ✅ 全球CDN
- ✅ 自动HTTPS
- ✅ 支持预览部署

### 缺点
- ❌ 免费版有流量限制（足够个人/小团队使用）

---

## 方式五：Netlify（免费）

### 适用场景
- 最简单的部署方式
- 拖拽即用
- 表单集成

### 步骤

#### 方法A：拖拽部署
1. 访问 netlify.com
2. 注册/登录账号
3. 在首页找到 "Add new site" → "Deploy manually"
4. 将项目文件夹拖拽到上传区域
5. 等待上传完成，获得访问链接

#### 方法B：Git 自动部署
1. 将代码推送到 GitHub
2. 在 Netlify 点击 "New site from Git"
3. 选择 GitHub
4. 选择仓库
5. 点击 "Deploy site"

### 优点
- ✅ 最简单的部署方式
- ✅ 完全免费
- ✅ 拖拽即用
- ✅ 自动HTTPS

### 缺点
- ❌ 免费版有流量限制

---

## 方式六：云存储OSS

### 适用场景
- 企业内部使用
- 需要更高的可控性
- 已有云服务

### 阿里云 OSS
1. 登录阿里云控制台
2. 进入 OSS 服务
3. 创建 Bucket
4. 设置 "公共读" 权限
5. 上传所有文件
6. 开启 "静态网站托管"
7. 配置默认首页为 index.html
8. 获得访问地址

### 腾讯云 COS
步骤类似阿里云 OSS。

### 优点
- ✅ 企业级可靠性
- ✅ 完全可控
- ✅ 可配置 CDN
- ✅ 支持自定义域名

### 缺点
- ❌ 需要付费
- ❌ 配置相对复杂

---

## 推荐方案对比

| 部署方式 | 难度 | 费用 | 速度 | 维护 | 推荐度 |
|---------|------|------|------|------|--------|
| 直接分享文件 | ⭐ 简单 | 免费 | 快 | 高 | ⭐⭐⭐ |
| 本地服务器 | ⭐⭐ 简单 | 免费 | 快 | 中 | ⭐⭐⭐ |
| GitHub Pages | ⭐⭐ 中等 | 免费 | 快 | 低 | ⭐⭐⭐⭐⭐ |
| Vercel | ⭐ 简单 | 免费 | 很快 | 低 | ⭐⭐⭐⭐⭐ |
| Netlify | ⭐ 简单 | 免费 | 很快 | 低 | ⭐⭐⭐⭐⭐ |
| 云存储OSS | ⭐⭐⭐ 复杂 | 付费 | 快 | 中 | ⭐⭐⭐ |

---

## 安全建议

### 公共部署
- 不要在代码中硬编码 API 密钥
- 提醒用户自行配置 API
- 建议使用私密仓库

### 数据保护
- 告知用户数据存储在浏览器本地
- 建议不要在公共电脑上使用
- 提醒定期清除浏览器数据

---

## 后续维护

### 更新应用
1. 修改代码
2. 测试功能正常
3. 提交到 Git（如使用）
4. 推送到部署平台
5. 自动部署完成

### 监控使用
- GitHub Pages: 查看仓库的 Traffic 统计
- Vercel/Netlify: 查看 Analytics 面板

---

**选择最适合你的部署方式，开始分享吧！** 🚀
