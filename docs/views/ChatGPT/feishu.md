# 将ChatGPT接入飞书机器人

>原文地址：https://aircode.cool/q4y1msdim4

## 1. 注册登录飞书

![登录](https://files.mdnice.com/user/24883/3938bc24-cb4a-47e0-a67d-1997c40ae47f.png)

## 2. 进入管理后台

![管理后台](https://files.mdnice.com/user/24883/80a1f501-f63d-4330-bbce-aeb201ae58bb.png)

## 3. 点击应用管理

![应用管理](https://files.mdnice.com/user/24883/be5fdf92-3c45-4a9e-8287-84b3f7f2bc7d.png)

## 4. 点击创建应用

![点击创建应用](https://files.mdnice.com/user/24883/42353724-42ed-4024-989a-f3baec2d35f6.png)

## 5. 创建自建应用

![创建自建应用](https://files.mdnice.com/user/24883/bc041fcd-522d-4710-934b-5dfc5481dfb6.png)

## 6. 定义名称，描述，图标，点击创建

![创建](https://files.mdnice.com/user/24883/6b48ad58-57f7-4dad-8c58-f8ea2db5baff.png)

## 7. 点击添加机器人功能

![添加机器人功能](https://files.mdnice.com/user/24883/e52ff959-7b19-4600-b707-8112edb6c55a.png)

## 8. 点击凭证和基础信息，id和secret复制后边云函数会用到

![复制凭证](https://files.mdnice.com/user/24883/11671dcd-995d-4469-90e8-05cd0760b115.png)

## 9. 使用laf.dev云平台编写云函数来接入飞书应用

没使用过的laf平台的可以先看我上篇文章，[使用Laf云平台，两步将ChatGPT接入微信公众号](https://husanr.github.io/views/ChatGPT/wechat)

![laf.dev](https://files.mdnice.com/user/24883/e86ac1f1-db3b-4583-b1ee-2c2e526cc181.png)

云函数代码：
```js
// 引入依赖
import cloud from '@lafjs/cloud';
import axios from "axios"

// 引入 OpenAI 的 SDK
const openai = require("openai");

const OPENAI_KEY = process.env.OPENAI_KEY || '设置openai的apikey';//openai的apikey
// 从环境变量中获取飞书机器人的 App ID 和 App Secret
const FSAPPID = process.env.FSAPPID || '设置飞书应用的appid'; //飞书应用的appid
const FSAPPSECRET = process.env.FSAPPSECRET || '设置飞书应用的appid';//飞书的appsecret

// 创建Contents集合
const db = cloud.database();
const Contents = db.collection('contents')

let chatGPT = null;
if (OPENAI_KEY) {
  // 获取openai返回
  const configuration = new openai.Configuration({ apiKey: OPENAI_KEY });
  const api = new openai.OpenAIApi(configuration);
  chatGPT = async (content) => {
    return await api.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content }],
    });
  };
}


// 获取飞书的tenant_access_token 
const getTenantToken = async () => {
  const url = 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal';
  const res = await axios.post(url, {
    'app_id': FSAPPID, 'app_secret': FSAPPSECRET,
  });
  return res.data.tenant_access_token;
};

// 用飞书机器人回复用户消息的方法
const feishuReply = async (objs) => {
  const tenantToken = await getTenantToken();
  const url = `https://open.feishu.cn/open-apis/im/v1/messages/${objs.msgId}/reply`;
  let content = objs.content;

  // 实现 @ 用户能力
  if (objs.openId) content = `<at user_id="${objs.openId}"></at> ${content}`;
  try {
    const res = await axios({
      url,
      method: "POST",
      headers: { 'Authorization': `Bearer ${tenantToken}`, 'Content-Type': 'application/json', },
      data: { msg_type: 'text', content: JSON.stringify({ text: content }) },
    });
    return res.data.data;
  } catch (err) {
    console.log("err", err)
  }

};

// 飞书 ChatGPT 机器人的入口函数
export async function main(param) {
  const params = param.body
  // 判断是否开启了事件 Encrypt Key，如果开启提示错误
  if (params.encrypt) return { error: '请在飞书机器人配置中移除 Encrypt Key。' }

  // 用来做飞书接口校验，飞书接口要求有 challenge 参数时需直接返回
  if (params.challenge) return { challenge: params.challenge };


  // 所有调用当前函数的参数都可以直接从 params 中获取
  // 飞书机器人每条用户消息都会有 event_id
  const eventId = params.header.event_id;

  // 搜索 contents 表中是否有 eventId 与当前这次一致的
  const contentObj = await Contents.where({ eventId }).getOne();
  console.log("contentObj", contentObj)

  // 如果 contentObj 有值，则代表这条 event 出现过
  if (contentObj.data) return;
  const message = params.event.message;
  const msgType = message.message_type;

  // 获取发送消息的人信息
  const sender = params.event.sender;

  // 用户发送过来的内容
  let content = '';

  // 返回给用户的消息
  let replyContent = '';

  // 目前 ChatGPT 仅支持文本内容
  if (msgType === 'text') {

    // 获取用户具体消息，机器人默认将收到的消息直接返回
    content = JSON.parse(message.content).text;

    // 如果是 at 所有人，则不处理
    if (content.indexOf('@_all') >= 0) return;

    // 获取用户发送的内容实体，去掉 at 符号等
    content = content.replace('@_user_1 ', '');

    // 默认将用户发送的内容回复给用户，仅是一个直接返回对话的机器人
    replyContent = content;

    // 将消息体信息储存到数据库中，以备后续查询历史或做上下文支持使用
    await Contents.add({
      eventId: params.header.event_id,
      msgId: message.message_id,
      uuid: message.chat_id,
      openId: sender.sender_id.open_id,
      content,
    });

    // 如果配置了 OpenAI Key 则让 ChatGPT 回复
    if (OPENAI_KEY) {
      // 将用户具体消息发送给 ChatGPT
      try {
        const result = await chatGPT(content);
        console.log("res", result.data.choices[0].message)
        // 将获取到的 ChatGPT 回复给用户
        replyContent = `${result.data.choices[0].message.content.trim()}`;
      } catch (err) {
        console.log("err", err)
        return err;
      }
    }

  } 

  // 将处理后的消息通过飞书机器人发送给用户
  await feishuReply({
    msgId: message.message_id,
    openId: sender.sender_id.open_id,
    content: replyContent,
  });

  // 整个函数调用结束，需要有返回
  return null;
}
```

## 10. 点击事件订阅，点击请求地址配置，配置后点击保存

![请求地址配置](https://files.mdnice.com/user/24883/6750159a-b62e-4d8d-82e3-6495a88ce927.png)

![配置云函数地址](https://files.mdnice.com/user/24883/82da2ecd-c7bd-4bf8-92c7-df29e361b92e.png)

## 11. 点击添加事件

![添加事件](https://files.mdnice.com/user/24883/d4dfef27-0682-4002-b58c-6ddce2713479.png)

## 12. 点击消息与群组，右侧找到接收消息后勾选，点击确认添加

![添加接收消息](https://files.mdnice.com/user/24883/e1c6c13d-31d6-4491-a317-e7a79d63a46d.png)

## 13. 点击开通权限

![开通权限](https://files.mdnice.com/user/24883/808e5927-61e1-42e9-b7f3-0a73b180879b.png)

![点击按钮](https://files.mdnice.com/user/24883/f10c964b-c9a2-4c3a-9503-37e6f3f031cf.png)

**注意开通上边四个，接收所有消息不用开通，上边有两个需要审核，一会去后台管理审核**

![开通上边四个，两个去要审核](https://files.mdnice.com/user/24883/e3919344-b641-45bc-b206-2d8fcd9dc9f4.png)

## 14. 点击创建版本

![创建版本](https://files.mdnice.com/user/24883/a78c3456-fba4-4d12-98ec-72fa44de1f21.png)

输入相关信息点击保存

![输入版本号](https://files.mdnice.com/user/24883/84775792-d0e4-41d1-ad87-fa873e81ee20.png)

![申请线上发布](https://files.mdnice.com/user/24883/8289adef-ff69-4dd9-a1f3-8e482c84a188.png)


## 15. 回到管理后台

![回到管理后台](https://files.mdnice.com/user/24883/7c5aaaad-2e86-4bf5-819a-ef60ff098290.png)

## 16. 点击应用审核

![应用审核](https://files.mdnice.com/user/24883/098788fc-5e1f-4754-abf4-2ad8e03fa85a.png)

![点击审核](https://files.mdnice.com/user/24883/8714df32-b2e8-4fa2-bef5-d69b34b0edb5.png)

![点击通过](https://files.mdnice.com/user/24883/ba5e0f5d-d4b7-488c-96fe-6b196ad74a00.png)

## 17. 开通权限

此时，我们可以登录飞书app，打开我们刚刚添加的应用

![打开开发者助手](https://files.mdnice.com/user/24883/898a511f-abdc-4d94-b734-e0b7379ba660.png)

![打开应用](https://files.mdnice.com/user/24883/5239270b-fd15-4cec-9743-6850a2c71f9d.png)

这时候会发现给机器人发消息，它并不会回复，因为对应的权限还没有开通

![没有回复](https://files.mdnice.com/user/24883/2aea2a00-bce5-47d4-bd74-c9e7f58a463c.png)


接下来去开通权限，回到开放平台，点击机器人，点击如何开发

![点击机器人](https://files.mdnice.com/user/24883/8adb25b4-6f9d-4204-a822-3ee0b08eb674.png)

点击 API调试台

![调试台](https://files.mdnice.com/user/24883/266006f4-cfa6-4ea8-ae6b-71b9323eb5d1.png)

点击权限配置，勾选未开通权限，点击批量开通

![开通权限](https://files.mdnice.com/user/24883/3adab164-2adb-4769-8b28-062011e4ca3c.png)

开通过后，机器人就会回复了

![开通权限后](https://files.mdnice.com/user/24883/495b55dc-cbce-44d6-b094-d2817874f26e.png)

我们还可以把机器人添加进群@它来进行对话

![添加群应用](https://files.mdnice.com/user/24883/7a59247a-2036-4c9d-863e-788a6e0fc1c3.png)


最新代码地址：[将ChatGPT接入飞书机器人](https://husanr.github.io/views/ChatGPT/feishu)
