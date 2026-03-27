# GitHub + Vercel 部署完整教程

> 🎯 适合初学者的一步一步指南，教你如何将项目部署到 GitHub 和 Vercel

## 目录
- [一、项目准备工作](#一项目准备工作)
- [二、GitHub 仓库创建与代码提交](#二github-仓库创建与代码提交)
- [三、Vercel 账户注册与项目部署](#三vercel-账户注册与项目部署)
- [四、部署后验证与访问](#四部署后验证与访问)
- [五、常见问题排查](#五常见问题排查)
- [六、不同项目类型的部署要点](#六不同项目类型的部署要点)

---

## 一、项目准备工作

### 1.1 确认项目类型

本教程以 **静态网站**（HTML/CSS/JavaScript）为例，也就是我们的 HR面试助手项目。

### 1.2 检查项目文件

确保你的项目文件夹包含以下核心文件：
```
HR - Pretalk/
├── index.html          ✅ 必须有（首页）
├── style.css           ✅ 样式文件
├── app.js              ✅ 逻辑文件
└── ...                 其他文件
```

### 1.3 创建必要的配置文件（可选但推荐）

虽然静态网站不需要特殊配置文件，但添加以下文件可以让项目更专业：

#### 创建 .gitignore 文件（推荐）
在项目根目录创建 `.gitignore` 文件，用于忽略不需要提交的文件：

```gitignore
# 操作系统文件
.DS_Store
Thumbs.db

# 编辑器文件
.vscode/
.idea/
*.swp
*.swo

# 日志文件
*.log

# 临时文件
*.tmp
```

#### 创建 package.json（可选，仅用于 Node.js 项目）
如果你的项目是 React/Vue/Node.js 项目，需要这个文件。**我们的静态项目不需要**。

### 1.4 环境变量说明

**静态网站不需要环境变量！**

如果你的项目需要使用 API 密钥等敏感信息：
- ❌ 不要直接写在代码里
- ✅ 让用户在应用界面中自行配置（像我们的项目那样）
- ✅ 或使用 Vercel 的 Environment Variables（详见后文）

---

## 二、GitHub 仓库创建与代码提交

### 2.1 注册/登录 GitHub 账号

1. 访问 [github.com](https://github.com)
2. 如果没有账号，点击右上角「Sign up」注册
3. 如果已有账号，点击「Sign in」登录

### 2.2 创建新仓库

#### 步骤1：点击新建仓库
登录后，在页面右上角点击 **+** 号，选择 **New repository**

#### 步骤2：填写仓库信息
按照以下信息填写：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| Repository name | 仓库名称（英文） | `hr-interview-helper` |
| Description | 仓库描述（可选） | `HR面试助手 - 首次电话沟通` |
| Public/Private | 公开或私有 | 根据需要选择 |
| Initialize this repository with | 不要勾选任何选项 | ❌ 都不选 |

**重要：** 不要勾选「Add a README file」、「Add .gitignore」等，因为我们已经有这些文件了。

#### 步骤3：创建仓库
点击绿色的 **Create repository** 按钮

### 2.3 在本地初始化 Git

现在需要在你的电脑上打开终端（Terminal/命令提示符）。

#### macOS 用户：
1. 按 `Command + Space` 打开 Spotlight
2. 输入 `Terminal` 并回车

#### Windows 用户：
1. 按 `Win + R`
2. 输入 `cmd` 并回车

#### 进入项目目录：
在终端中输入以下命令（注意替换为你的实际路径）：

```bash
cd "/Users/bytedance/Documents/trae_projects/HR - Pretalk"
```

**提示：** 如果路径中有空格，需要用引号括起来。

### 2.4 初始化 Git 并提交代码

依次执行以下命令：

#### 1. 初始化 Git 仓库
```bash
git init
```

#### 2. 添加所有文件
```bash
git add .
```

#### 3. 创建第一次提交
```bash
git commit -m "Initial commit: HR面试助手"
```

#### 4. 重命名分支为 main（推荐）
```bash
git branch -M main
```

#### 5. 关联 GitHub 仓库
⚠️ **重要：** 替换下面的 `你的用户名` 和 `仓库名`！

```bash
git remote add origin https://github.com/你的用户名/仓库名.git
```

**示例：**
```bash
git remote add origin https://github.com/zhangsan/hr-interview-helper.git
```

#### 6. 推送到 GitHub
```bash
git push -u origin main
```

### 2.5 验证代码已上传

1. 刷新你的 GitHub 仓库页面
2. 你应该能看到所有的项目文件了！🎉

---

## 三、Vercel 账户注册与项目部署

### 3.1 注册 Vercel 账户

1. 访问 [vercel.com](https://vercel.com)
2. 点击右上角 **Sign Up**
3. 选择 **Continue with GitHub**（推荐，最方便）
4. 授权 Vercel 访问你的 GitHub 账号
5. 完成注册！

### 3.2 导入 GitHub 项目

#### 步骤1：进入 Dashboard
登录 Vercel 后，你会看到 Dashboard 页面。

#### 步骤2：点击 New Project
点击 **+ New Project** 按钮。

#### 步骤3：选择仓库
在 **Import Git Repository** 部分：
1. 找到你的 GitHub 仓库（如 `hr-interview-helper`）
2. 点击 **Import** 按钮

#### 步骤4：配置项目（通常保持默认即可）

| 配置项 | 说明 | 静态网站建议 |
|--------|------|-------------|
| Project Name | 项目名称 | 自动生成，可修改 |
| Framework Preset | 框架预设 | Vercel 会自动检测为 Other |
| Root Directory | 根目录 | `./`（默认即可） |
| Build Command | 构建命令 | 留空（静态网站不需要） |
| Output Directory | 输出目录 | 留空 |

#### 步骤5：部署！
点击黑色的 **Deploy** 按钮！

### 3.3 等待部署完成

- Vercel 会开始部署你的项目
- 通常只需要 **30秒 - 2分钟**
- 你会看到实时的部署日志
- 完成后会显示 **Congratulations!** 🎉

---

## 四、部署后验证与访问

### 4.1 获取访问链接

部署成功后，Vercel 会给你一个访问链接，格式类似：
```
https://hr-interview-helper.vercel.app
```

### 4.2 验证网站

1. 点击这个链接
2. 确认网站正常加载
3. 测试各项功能：
   - ✅ 页面显示正常
   - ✅ 点击按钮有反应
   - ✅ 样式加载正确

### 4.3 分享你的网站！

现在你可以把这个链接分享给任何人了！

---

## 五、常见问题排查

### 问题1：git push 时提示认证失败

**症状：**
```
fatal: Authentication failed for 'https://github.com/...'
```

**解决方案：**

#### 方法A：使用 Personal Access Token（推荐）

1. 访问 GitHub → Settings → Developer settings → Personal access tokens
2. 点击 Generate new token → Generate new token (classic)
3. 勾选 `repo` 权限
4. 点击 Generate token
5. **复制这个 token**（只显示一次！）
6. 再次 push 时，用户名填你的 GitHub 用户名，密码填这个 token

#### 方法B：使用 SSH（推荐长期使用）

1. 生成 SSH key
2. 添加到 GitHub
3. 修改 remote URL 为 SSH 格式

### 问题2：Vercel 部署后页面 404

**症状：** 访问链接显示 404 Not Found

**解决方案：**

1. 检查仓库根目录是否有 `index.html`
2. 确认文件名是小写的 `index.html`（不是 Index.html）
3. 在 Vercel 项目设置中检查 Root Directory 是否正确

### 问题3：样式/图片没有加载

**症状：** 页面能打开，但样式乱了或图片不显示

**解决方案：**

1. 检查 HTML 中的路径是否正确
2. 使用相对路径（如 `./style.css` 而不是绝对路径）
3. 检查文件名大小写（Linux 系统区分大小写）

### 问题4：如何更新网站？

**答案：** 很简单！只需要：

```bash
# 1. 修改你的代码文件
# 2. 提交更改
git add .
git commit -m "Update: 描述你的修改"
git push
```

Vercel 会自动检测到 GitHub 的更新，并自动重新部署！通常几十秒内就完成了。

### 问题5：如何自定义域名？

**答案：**

1. 在 Vercel 项目中进入 Settings → Domains
2. 输入你的域名（如 `hr.example.com`）
3. 按照 Vercel 的提示配置 DNS
4. 等待 DNS 生效（可能需要几小时）

---

## 六、不同项目类型的部署要点

### 6.1 静态网站（HTML/CSS/JS）✅ 我们的项目类型

**特点：** 不需要构建，直接部署

**部署要点：**
- ✅ 确保根目录有 `index.html`
- ✅ 使用相对路径引用资源
- ✅ 不需要 Build Command
- ✅ Vercel 自动检测为静态网站

### 6.2 React 应用

**特点：** 需要构建

**部署要点：**
- ✅ 确保有 `package.json`
- ✅ Build Command: `npm run build`
- ✅ Output Directory: `build`
- ✅ Vercel 会自动检测 React 并配置好

### 6.3 Vue 应用

**部署要点：**
- ✅ Build Command: `npm run build`
- ✅ Output Directory: `dist`
- ✅ Vercel 自动支持 Vue

### 6.4 Next.js 应用

**部署要点：**
- ✅ Vercel 官方推荐框架
- ✅ 零配置部署
- ✅ 支持 SSR/SSG

### 6.5 Node.js API

**部署要点：**
- ✅ 创建 `api/` 目录
- ✅ 文件名就是路由
- ✅ Vercel 自动转换为 Serverless Functions

---

## 七、高级功能（可选）

### 7.1 添加环境变量

如果你的项目需要环境变量（如 API 密钥）：

1. 进入 Vercel 项目 → Settings → Environment Variables
2. 添加变量名和值
3. 点击 Save
4. 重新部署一次

### 7.2 预览部署

每次你推送到 GitHub 的非 main 分支，Vercel 都会自动创建一个预览部署！

**用法：**
```bash
git checkout -b feature/new-feature
git add .
git commit -m "Add new feature"
git push -u origin feature/new-feature
```

Vercel 会给你一个预览链接，可以在合并前先测试！

### 7.3 查看部署历史

在 Vercel 项目中，点击「Deployments」标签，可以看到：
- 所有部署历史
- 每次部署的状态
- 可以回滚到任意版本

---

## 🎉 总结

恭喜！你已经学会了：

✅ 将代码推送到 GitHub  
✅ 使用 Vercel 部署静态网站  
✅ 自动更新和重新部署  
✅ 排查常见问题  

现在你可以开始分享你的网站了！

---

**需要帮助？**
- GitHub 文档: [docs.github.com](https://docs.github.com)
- Vercel 文档: [vercel.com/docs](https://vercel.com/docs)
- 查看我们的 [FAQ.md](./FAQ.md)
