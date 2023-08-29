# 将ChatGPT接入钉钉（超详细教程）

>原文地址：https://aircode.cool/xspb3by9fs

## 1. 进入钉钉官网

- 官网地址：`https://www.dingtalk.com/`

![点击登录](https://files.mdnice.com/user/24883/dd8c55c7-d64d-41ef-8e00-939a209d7bc6.png)

- 手机钉钉app扫码登录

![扫码登录](https://files.mdnice.com/user/24883/be7bf5dc-eff5-4658-b28b-519a79beb873.png)

- 点击 创建企业/组织/团队

![创建企业](https://files.mdnice.com/user/24883/a1e91857-1181-4cce-8657-1ae4338df76a.png)

- 手机号注册钉钉

![注册钉钉](https://files.mdnice.com/user/24883/be8c6f56-a341-4147-b625-7869ddf69ff1.png)

- 输入验证码

![输入验证码](https://files.mdnice.com/user/24883/356a7392-eda4-49c0-80ba-4a4c86278d03.png)

- 完善企业信息

![完善企业信息](https://files.mdnice.com/user/24883/dc9d3bc4-6b21-45f1-9f41-8d8c710379fb.png)

- 重新返回扫码登录，登录之后选择刚刚创建的企业

![返回扫码登录选择企业](https://files.mdnice.com/user/24883/6eedca7f-01c7-4c42-b14b-8c5194e6a1dd.png)

- 登录完成，选择应用管理，点击创建应用

![创建应用](https://files.mdnice.com/user/24883/570c0c08-f83a-4c74-a88e-f91acce5fc1a.png)

- 点击开始

![开始](https://files.mdnice.com/user/24883/c6eec872-89e3-45b9-a206-eaef8ad35354.png)

- 选择组织

![选择组织](https://files.mdnice.com/user/24883/06e9edf4-2caa-4d90-9094-c8d8d66a55b5.png)

- 点击创建应用

![创建应用](https://files.mdnice.com/user/24883/70c911e5-c693-492a-aabe-f4a6baed52fa.png)

- 输入应用信息，点击确认创建

![输入应用信息确认创建](https://files.mdnice.com/user/24883/3a46d230-0bff-44fc-be25-034d42525e2f.png)

- 创建之后点击 机器人与消息推送，打开机器人配置 

![机器人配置](https://files.mdnice.com/user/24883/c9bd8c9f-6aa1-4e23-97b5-ac1c268aa78d.png)

- 输入机器人配置信息，点击发布

![发布机器人](https://files.mdnice.com/user/24883/4fb1ddbc-c1ab-4502-a472-2b3e17919a27.png)

- 点击 权限管理，搜索 企业内机器人发送消息权限，勾选权限，点击申请权限

![申请权限](https://files.mdnice.com/user/24883/138626d9-6561-4be3-b19e-74710f89c0d6.png)

## 2. 在云平台发布云函数

- 不会只用laf平台的，见上篇文章 [使用Laf云平台，两步将ChatGPT接入微信公众号](https://husanr.github.io/views/ChatGPT/wechat)

![发布云函数](https://files.mdnice.com/user/24883/f45ea5f4-5f6e-49b5-9acd-40524d7226c5.png)

- 创建一个新的云函数，把下方代码复制粘贴过去
```ts
// 引入crypto和cloud模块
import * as crypto from 'crypto';
import cloud from '@lafjs/cloud';
import axios from "axios"
const { Configuration, OpenAIApi } = require('openai');


// 从环境变量中获取到钉钉和 OpenAI 的相关配置
const APP_KEY = process.env.DING_APP_KEY || '';// 钉钉的AppKey
const APP_SECRET = process.env.DING_APP_SECRET || '';//钉钉的AppSecret
const OPENAI_KEY = process.env.OPENAI_KEY || '';//openai的apikey
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

// 创建数据库连接并获取Message集合
const db = cloud.database();
// const ChatsTable = db.collection('chats')

// 主方法
export async function main(param) {
  const params = param.body
  console.log(params)
  
  // 如果设置了 SECRET，则进行验证
  if (APP_SECRET) {
    //从 Headers 中拿到 timestamp 和 sign 进行验证
    const { timestamp, sign } = param.headers;
    if (generateSign(timestamp) !== sign) {
      return;
    }
  }

  // 打印请求参数到日志，方便排查
  console.log('Received params:', params);

  const { msgtype, text, conversationId } = params;

  // 示例中，我们只支持文本消息
  if (msgtype !== 'text') {
    return reply(params, '目前仅支持文本格式的消息。');
  }

  // 如果没有配置 OPENAI_KEY，则提醒需要配置
  if (!OPENAI_KEY) {
    return reply(
      params,
      '你没有配置正确的 OpenAI API Key，请配置过后再次尝试'
    );
  }

  // 将用户的问题存入数据表中，后续方便进行排查，或者支持连续对话
  const { content } = text;
  const ChatsTable = db.collection('chats')
  await ChatsTable.add({ conversationId, role: 'user', content });

  // 构建发送给 GPT 的消息体
  const messages = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content },
  ];

  const openai = new OpenAIApi(new Configuration({ apiKey: OPENAI_KEY }));

  try {
    // 请求 GPT 获取回复
    const completion = await openai.createChatCompletion({
      model: OPENAI_MODEL,
      messages,
    });

    const responseMessage = completion.data.choices[0].message;

    // 将 ChatGPT 的响应也存入数据库
    await ChatsTable.add({ conversationId, ...responseMessage });

    // 回复钉钉用户消息
    return reply(params, responseMessage.content);
  } catch (error) {
    // 错误处理，首先打印错误到日志中，方便排查
    console.error(error.response || error);

    // 根据不同的情况来生成不同的错误信息
    const errorMessage = handleError(error);

    // 回复错误信息给用户
    return reply(params, `错误：${errorMessage}`);
  }
};

// 辅助方法，用于根据钉钉的规则生成签名，校验消息合法性
function generateSign(timestamp) {
  const stringToSign = timestamp + '\n' + APP_SECRET;
  const hmac = crypto.createHmac('sha256', APP_SECRET);
  hmac.update(stringToSign);
  const sign = hmac.digest().toString('base64');
  return sign;
}

// 辅助方法，获取钉钉机器人的 AccessToken
async function getAccessToken() {
  if (!APP_KEY || !APP_SECRET) {
    throw new Error(
      '没有正确设置 APP_KEY 和 APP_SECRET 环境变量，请配置过后再次尝试。'
    );
  }

  // 先从数据库中获取 token 看下是否过期，这样不用每次都发起请求
  const TokenTable = db.collection('token');
  const item = await TokenTable.where({}).orderBy("createdAt", "desc").getOne();
  const now = Date.now();

  // 如果 token 还在有效期内，则直接返回
  if (item && item.expiredAt > now) {
    return item.token;
  }

  // 否则，请求钉钉获取 token
  const { data } = await axios.post(
    'https://api.dingtalk.com/v1.0/oauth2/accessToken',
    {
      appKey: APP_KEY,
      appSecret: APP_SECRET,
    }
  );

  const token = data.accessToken;
  const expiredAt = now + data.expireIn * 1000;

  // 将 token 存入数据库
  await TokenTable.add({ token, expiredAt });

  // 返回 token
  return token;
}

// 辅助方法，用于钉钉发送单聊消息
async function sendPrivateMessage(userId, content) {
  const token = await getAccessToken();
  return axios.post(
    'https://api.dingtalk.com/v1.0/robot/oToMessages/batchSend',
    {
      robotCode: APP_KEY,
      userIds: [userId],
      msgKey: 'sampleText',
      msgParam: JSON.stringify({ content }),
    },
    {
      headers: {
        'x-acs-dingtalk-access-token': token,
      },
    }
  );
}

// 辅助方法，用于钉钉发送群聊消息
async function sendGroupMessage(conversationId, content) {
  const token = await getAccessToken();
  return axios.post(
    'https://api.dingtalk.com/v1.0/robot/groupMessages/send',
    {
      robotCode: APP_KEY,
      openConversationId: conversationId,
      msgKey: 'sampleText',
      msgParam: JSON.stringify({ content }),
    },
    {
      headers: {
        'x-acs-dingtalk-access-token': token,
      },
    }
  );
}

// 辅助方法，回复用户的消息
async function reply(event, content) {
  // 如果没有配置钉钉的 Key 和 Secret，则通过直接返回的形式回复
  // 注意这种形式虽然简单，但可能因为超时而无法在钉钉中获得响应
  if (!APP_KEY || !APP_SECRET) {
    return {
      msgtype: 'text',
      text: { content },
    };
  }

  // 如果配置了 Key 和 Secret，则通过调用接口回复
  // 根据 conversationType 判断是群聊还是单聊
  if (event.conversationType === '1') {
    // 单聊
    await sendPrivateMessage(event.senderStaffId, content);
  } else {
    // 群聊
    await sendGroupMessage(event.conversationId, content);
  }
  return { ok: 1 };
}

// 辅助方法，处理错误，生成错误消息
function handleError(error) {
  let errorMessage;

  if (error.response) {
    // 如果有 error.response，代表请求发出了，而服务器回复了错误
    const { status, statusText, data } = error.response;

    if (status === 401) {
      // 401 代表 OpenAI 认证失败了
      errorMessage =
        '你没有配置正确的 OpenAI API Key，请配置过后再次尝试。';
    } else if (data.error && data.error.message) {
      // 如果 OpenAI 返回了错误消息，则使用 OpenAI 的
      errorMessage = data.error.message;
    } else {
      // 否则，使用默认的错误消息
      errorMessage = `Request failed with status code ${status}: ${statusText}`;
    }
  } else if (error.request) {
    // 如果有 error.request，代表请求发出了，但没有得到服务器响应
    errorMessage =
      'OpenAI 服务器没有响应，可以前往 https://status.openai.com/ 查看其服务状态。';
  } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    // 网络错误，例如 DNS 解析错误或者建连失败
    errorMessage = `Network error: ${error.message}`;
  } else {
    errorMessage = error.message;
  }

  return errorMessage;
}

```

- 注意：
   - 1. 看下代码中的依赖有哪些，别忘记安装依赖，有些依赖在内置依赖中，无需再次安装。
   - 2. 代码中的环境变量，改为自己的参数，不要忘记填写，后面都有备注
   - 3. 不要忘记发布！不要忘记发布！不要忘记发布！


- 然后回到钉钉的机器人与消息推送中，把上边发布好的云函数地址粘贴到这里

![粘贴云函数地址](https://files.mdnice.com/user/24883/9270d6b7-a9af-447e-a84c-5ce6c8068008.png)

## 3. 在app端测试机器人功能

- 创建好应用之后会有一个内部群自动创建，我们点击进入内部群

![进入内部群](https://files.mdnice.com/user/24883/0fdd8d82-f7ef-4401-aea7-fea1e16ae5c0.png)

- 点击右上角三个点

![点击右上角三个点](https://files.mdnice.com/user/24883/f3b2b5ec-8e0e-41ef-a61a-603f8bc41dae.png)

- 拉到底部，点击机器人选项

![点击机器人](https://files.mdnice.com/user/24883/a3bfeb3d-c2db-47ee-8d9a-4daa1a86154c.png)

- 点击加号添加机器人

![添加机器人](https://files.mdnice.com/user/24883/72111749-9991-40c5-a019-005aa3256704.png)

- 在输入框搜索 我们刚才创建的机器人应用

![搜索应用](https://files.mdnice.com/user/24883/e9c21c90-fe18-4761-84d4-6a48ed046fe4.png)

![搜索添加](https://files.mdnice.com/user/24883/55e257ab-adb2-4885-95f0-95a89c19392c.png)

- 点击添加

![点击添加](https://files.mdnice.com/user/24883/ca6b6203-fce6-46fa-8b32-580e667b8270.png)

- 添加之后@机器人发送消息，有回复就是成功了

![发送消息](https://files.mdnice.com/user/24883/52822b3b-c220-4a2b-9c94-f79085a18863.png)

- 点击机器人的头像，可以给机器人发消息

![](https://files.mdnice.com/user/24883/15571a52-fb8f-4f52-994b-7eb23a118cc6.png)

![](https://files.mdnice.com/user/24883/f25d688c-ff7d-4d28-b2ac-a6b6dc339178.png)

到此为止，大功告成！
有兴趣可以加好友进群讨论

![](https://files.mdnice.com/user/24883/e8264b3c-63f6-4314-82d6-31d91079b89c.png)
