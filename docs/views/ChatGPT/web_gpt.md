# 三步搭建无需魔法的个人专属ChatGPT网站

![主界面](https://files.mdnice.com/user/24883/5a3a7e43-b844-4cf0-aa25-4eff91b1cb1a.png)


## 1. 打开开源项目地址
大佬很大方，直接开源了项目，项目地址：[ChatGPT Next Web](https://github.com/Yidadaa/ChatGPT-Next-Web), 建议大家都给个star, 开源都不容易

## 2. 使用Vercel部署
其实大佬的`README`写的很详细，我在这里给大家简化一下，进入项目地址，向下拉可以看到这个页面，看不懂英文的可以点击`简体中文`(我也看不懂 -\_-!)

![点击Deploy](https://files.mdnice.com/user/24883/8e7cf855-c347-4dc9-a005-e1a7900cd551.png)

然后点击`Deploy`按钮，会跳转到`Vercel`官网，使用第三方登录，我这里选择使用`github`登录，比较方便

![github登录](https://files.mdnice.com/user/24883/e3f783c6-1308-4cac-b8d7-9c7c161a6432.png)

登录之后，点击 `create` 创建项目，项目名字可以自己修改

![create](https://files.mdnice.com/user/24883/5162f9f0-d455-403c-a63a-74397fa30d1d.png)

创建之后，我们按照下方图片中的顺序依次配置环境变量 `OPENAI_API_KEY`([官网获取自己的API-KEY](https://platform.openai.com/account/api-keys))、`CODE`(自定义code后面会用到，最好设置的长一点不容易被破解，以后也可以随时修改)，然后点击 `Deploy` 部署

![配置环境变量](https://files.mdnice.com/user/24883/6298767e-0688-48ca-a3dc-c27fccb1b711.png)

部署过程大概要1-2分钟，耐心等待一下

![部署](https://files.mdnice.com/user/24883/46bfd92c-cb94-4dac-ae12-fa8a08796197.png)

显示下边这个页面就说明已经部署好了，点击按钮去控制台

![部署完成](https://files.mdnice.com/user/24883/3432b004-debc-4bfa-b2a7-beb0230dd6a6.png)

然后点击 `visit` 按钮可以查看部署后的页面效果

![](https://files.mdnice.com/user/24883/8f97fa8f-bcae-455f-b9ea-ba19d3b8f683.png)
![](https://files.mdnice.com/user/24883/5eb9adbb-5e33-4a65-b4a4-147c5b507ec2.png)

是不是看起来已经完成了？nonono，到这里你会发现，这个页面你不用魔法是打不开的，怎样才能打开呢，我们需要一个国内对的域名来绑定一下就可以直连了

## 3. 绑定域名
在控制台页面，点击 `View Domains` 进入域名绑定页面

![View Domains](https://files.mdnice.com/user/24883/70501f81-c91f-4a40-924a-4892f079b5f0.png)

在下图所示输入框输入你的域名(可去阿里云或腾讯云等平台购买域名)，点击 `Add` 添加域名

![绑定域名](https://files.mdnice.com/user/24883/a83fe234-cfa6-48cd-9264-02925e5db8bf.png)

添加之后会显示让你配置域名的解析地址，我们打开域名服务商的控制台，按照 `Vecel` 提供的记录类型和记录值解析一下域名

![](https://files.mdnice.com/user/24883/08676878-d97f-4462-b934-2611509e35a2.png)

在阿里云控制台解析域名

![解析域名](https://files.mdnice.com/user/24883/b632923f-ae36-4253-8c78-2c550124063e.png)

添加解析记录

![添加记录](https://files.mdnice.com/user/24883/55e32287-bade-45b2-93be-0993fc7dbafa.png)

解析过之后回到 `Vercel` 控制台，点击 `Refresh` 刷新域名绑定状态

![Refresh](https://files.mdnice.com/user/24883/65fdbe3d-a4c2-465c-a53c-80a8931ded56.png)

绑定成功如下图所示

![绑定成功](https://files.mdnice.com/user/24883/6546f19d-d044-4619-97f5-769f2b7e372d.png)

此时，用域名访问即可打开刚才部署的项目，大功告成！

