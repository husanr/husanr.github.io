# 使用AirCode云平台，两步将ChatGPT接入微信公众号
**最近很火**的`ChatGPT`可以说已经满大街可见了，到处都有各种各样的体验地址，有收费的也有免费的，总之是五花八门、花里胡哨。

**所以呢**，最近我就在研究怎么才能方便快捷的体验到`ChatGPT`的强大功能，其中一个就是：把`ChatGPT`接入公众号。如下图（成果图）:


![](https://files.mdnice.com/user/24883/e98247d1-fdba-49f8-8cb9-55a1c8a92d1b.jpg)

![欢迎关注体验](https://files.mdnice.com/user/24883/d549421c-6c0e-4239-896b-044bd7667604.png)

下面我来介绍一下具体怎么实现：
## 1. 首先注册一个AirCode平台账号
进入`aircode`官网：`https://aircode.io`


![AirCode官网](https://files.mdnice.com/user/24883/0cfade7e-db34-4cc7-9ecc-d67a3771560e.png)

点击右上角`Login`, 可以选择github登录

![可以选择github登录](https://files.mdnice.com/user/24883/569ad19f-ee53-4d76-869e-439d0646292e.png)


注册登录之后，点击`New Node.js App`，建立一个应用，并起一个名字


![新建应用](https://files.mdnice.com/user/24883/eeb07298-5714-4530-b52d-c5cf63d3579b.png)

![项目名称](https://files.mdnice.com/user/24883/754a84b7-0cf8-4f6e-87c2-11880528f7d2.png)


创建之后，进入控制台界面，默认有一个云函数`hello.js`

![控制台页面](https://files.mdnice.com/user/24883/58171e82-1f46-430e-aee6-6e2aa647a3f6.png)

把下边云函数代码复制过去

云函数代码如下：
```js
const { db } = require('aircode');
const axios = require('axios');
const sha1 = require('sha1');
const xml2js = require('xml2js');

const TOKEN = process.env.TOKEN || 'YOUR TOKEN' // 微信服务器配置 Token 注意这个token可以随便设置但是必须要与微信公众号后台配置一致
const OPENAI_KEY = process.env.OPENAI_KEY || 'YOUR API-KEY'; // OpenAI 的 Key

const OPENAI_MODEL = process.env.MODEL || "gpt-3.5-turbo"; // 使用的 AI 模型
const OPENAI_MAX_TOKEN = process.env.MAX_TOKEN || 1024; // 最大 token 的值

const LIMIT_HISTORY_MESSAGES = 50 // 限制历史会话最大条数
const CONVERSATION_MAX_AGE = 60 * 60 * 1000 // 同一会话允许最大周期，默认：1 小时
const ADJACENT_MESSAGE_MAX_INTERVAL = 10 * 60 * 1000 //同一会话相邻两条消息的最大允许间隔时间，默认：10 分钟

const UNSUPPORTED_MESSAGE_TYPES = {
  image: '暂不支持图片消息',
  voice: '暂不支持语音消息',
  video: '暂不支持视频消息',
  music: '暂不支持音乐消息',
  news: '暂不支持图文消息',
}

const WAIT_MESSAGE = `处理中 ... \n\n请稍等几秒后发送【1】查看回复`
const NO_MESSAGE = `暂无内容，请稍后回复【1】再试`
const CLEAR_MESSAGE = `✅ 记忆已清除`
const HELP_MESSAGE =  `ChatGPT 指令使用指南
   |    关键字  |   功能         |
   |      1    | 上一次问题的回复 |
   |   /clear  |    清除上下文   |
   |   /help   |   获取更多帮助  |
`

const Message = db.table('messages')
const Event = db.table('events')


const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function toXML(payload, content) {
  const timestamp = Date.now();
  const { ToUserName: fromUserName, FromUserName: toUserName } = payload;
  return `
  <xml>
    <ToUserName><![CDATA[${toUserName}]]></ToUserName>
    <FromUserName><![CDATA[${fromUserName}]]></FromUserName>
    <CreateTime>${timestamp}</CreateTime>
    <MsgType><![CDATA[text]]></MsgType>
    <Content><![CDATA[${content}]]></Content>
  </xml>
  `
}


async function processCommandText({ sessionId, question }) {
  // 清理历史会话
  if (question === '/clear') {
    const now = new Date();
    await Message.where({ sessionId }).set({ deletedAt: now }).save()
    return CLEAR_MESSAGE;
  }
  else {
    return HELP_MESSAGE;
  }
}


// 构建 prompt
async function buildOpenAIPrompt(sessionId, question) {
  let prompt = [];

  // 获取最近的历史会话
  const now = new Date();
  // const earliestAt = new Date(now.getTime() - CONVERSATION_MAX_AGE)
  const historyMessages = await Message.where({
    sessionId,
    deletedAt: db.exists(false),
  //  createdAt: db.gt(earliestAt),
  }).sort({ createdAt: -1 }).limit(LIMIT_HISTORY_MESSAGES).find();

  let lastMessageTime = now;
  let tokenSize = 0;
  for (const message of historyMessages) {
    // 如果历史会话记录大于 OPENAI_MAX_TOKEN 或 两次会话间隔超过 10 分钟，则停止添加历史会话
    const timeSinceLastMessage = lastMessageTime ? lastMessageTime - message.createdAt : 0;
    if (tokenSize > OPENAI_MAX_TOKEN || timeSinceLastMessage > ADJACENT_MESSAGE_MAX_INTERVAL) {
      break
    }

    prompt.unshift({ role: 'assistant', content: message.answer, });
    prompt.unshift({ role: 'user', content: message.question, });
    tokenSize += message.token;
    lastMessageTime = message.createdAt;
  }

  prompt.push({ role: 'user', content: question });
  return prompt;
}


// 获取 OpenAI API 的回复
async function getOpenAIReply(prompt) {
  const data = JSON.stringify({
    model: OPENAI_MODEL,
    messages: prompt
  });

  const config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://api.openai.com/v1/chat/completions',
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json",
    },
    data: data,
    timeout: 50000
  };


  try {
      const response = await axios(config);
      console.debug(`[OpenAI response] ${response.data}`);
      if (response.status === 429) {
        return {
          error: '问题太多了，我有点眩晕，请稍后再试'
        }
      }
      // 去除多余的换行
      return {
        answer: response.data.choices[0].message.content.replace("\n\n", ""),
      }
  } catch(e){
     console.error(e.response.data);
     return {
      error: "问题太难了 出错了. (uДu〃).",
    }
  }

}

// 处理文本回复消息
async function replyText(message) {
  const { question, sessionId, msgid } = message;

  // 检查是否是重试操作
  if (question === '1') {
    const now = new Date();
    // const earliestAt = new Date(now.getTime() - CONVERSATION_MAX_AGE)
    const lastMessage = await Message.where({
      sessionId,
      deletedAt: db.exists(false),
    //  createdAt: db.gt(earliestAt),
    }).sort({ createdAt: -1 }).findOne();
    if (lastMessage) {
      return `${lastMessage.question}\n------------\n${lastMessage.answer}`;
    }

    return NO_MESSAGE;
  }

  // 发送指令
  if (question.startsWith('/')) {
    return await processCommandText(message);
  }

  // OpenAI 回复内容
  const prompt = await buildOpenAIPrompt(sessionId, question);
  const { error, answer } = await getOpenAIReply(prompt);
  console.debug(`[OpenAI reply] sessionId: ${sessionId}; prompt: ${prompt}; question: ${question}; answer: ${answer}`);
  if (error) {
    console.error(`sessionId: ${sessionId}; question: ${question}; error: ${error}`);
    return error;
  }

  // 保存消息
  const token = question.length + answer.length;
  const result = await Message.save({ token, answer, ...message });
  console.debug(`[save message] result: ${result}`);

  return answer;
}



// 处理微信事件消息
module.exports = async function(params, context) {
  const requestId = context.headers['x-aircode-request-id'];

  // 签名验证
  if (context.method === 'GET') {
    const _sign = sha1(new Array(TOKEN, params.timestamp, params.nonce).sort().join(''))
    if (_sign !== params.signature) {
      context.status(403)
      return 'Forbidden'
    }

    return params.echostr
  }

  // 解析 XML 数据
  let payload;
  xml2js.parseString(params, { explicitArray: false }, function(err, result) {
    if (err) {
      console.error(`[${requestId}] parse xml error: `, err);
      return
    }
    payload = result.xml;
  })
  console.debug(`[${requestId}] payload: `, payload);

  // 文本
  if (payload.MsgType === 'text') {
    const newMessage = {
      msgid: payload.MsgId,
      question: payload.Content.trim(),
      username: payload.FromUserName,
      sessionId: payload.FromUserName,
    }

    // 修复请求响应超时问题：如果 5 秒内 AI 没有回复，则返回等待消息
    const responseText = await Promise.race([
      replyText(newMessage),
      sleep(4000.0).then(() => WAIT_MESSAGE),
    ]);
    return toXML(payload, responseText);
  }

  // 事件
  if (payload.MsgType === 'event') {
    // 公众号订阅
    if (payload.Event === 'subscribe') {
      return toXML(payload, HELP_MESSAGE);
    }
  }

  // 暂不支持的消息类型
  if (payload.MsgType in UNSUPPORTED_MESSAGE_TYPES) {
    const responseText = UNSUPPORTED_MESSAGE_TYPES[payload.MsgType];
    return toXML(payload, responseText);
  }

  return 'success'
}
```

然后我们要把引入的几个依赖安装一下

![安装依赖](https://files.mdnice.com/user/24883/b57e6118-5237-4b06-b184-95e128e5d9b8.png)

在左下角搜索并点击加号安装依赖

![安装axios](https://files.mdnice.com/user/24883/aab63dba-4d6d-475a-99e2-b51ef11fcd5e.png)

![安装sha1](https://files.mdnice.com/user/24883/4f4eb26e-a8a0-4991-a8d0-ee5c899de11c.png)

![安装xml2js](https://files.mdnice.com/user/24883/095f9f16-3faa-4665-b956-29399e2a433d.png)


点击`Deploy`按钮发布一下云函数

![deploy](https://files.mdnice.com/user/24883/7794cbb5-9448-4094-b304-e85acd1895f3.png)


![](https://files.mdnice.com/user/24883/8e8ee4ac-defd-47ce-8ddf-075b7259391b.png)

等待发布完成，复制云函数链接，下边在微信公众号平台会用到

![](https://files.mdnice.com/user/24883/a998c0c4-e0e7-41ce-9037-05909e465557.png)



注意： 
1. `token`要与微信公众号中设置一致
2. `chatGPT`的`apiKey`要从openai官网获取，地址如下：`https://platform.openai.com/account/api-keys`


## 2. 第二步在微信公众平台操作
首先默认你有一个公众号，然后登录微信公众平台，点开左侧的设置与开发，点击基本设置，服务器配置那里点击修改配置

![修改配置](https://files.mdnice.com/user/24883/a081c7f0-14b4-426e-ad35-3ad10fb1aacc.png)

把刚才复制的云函数地址粘贴到服务器URL这里，下边的token与云函数代码中的token保持一致，下边的EncodingAESKey点击右侧随机生成就行，然后点击提交

![提交配置](https://files.mdnice.com/user/24883/678f0993-7411-4088-9834-db6484f8014b.png)

返回token校验成功的话，我们就点击启用

![启用服务器配置](https://files.mdnice.com/user/24883/2a966f68-be98-4579-b852-b1db6f5f1e79.png)


启用成功之后就可以在公众号对话框与ChatGPT对话啦，快去试试吧！
