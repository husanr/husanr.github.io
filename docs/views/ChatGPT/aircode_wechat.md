# 使用AirCode云平台，两步将ChatGPT接入微信公众号
**最近很火**的`ChatGPT`可以说已经满大街可见了，到处都有各种各样的体验地址，有收费的也有免费的，总之是五花八门、花里胡哨。

**所以呢**，最近我就在研究怎么才能方便快捷的体验到`ChatGPT`的强大功能，其中一个就是：把`ChatGPT`接入公众号。如下图（成果图）:


![](https://camo.githubusercontent.com/e9cef9807158d39cf95dc04160dde526ead2be97e0619d983db245176deb0690/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f65393832343764312d666462612d343966382d386362392d3535613163386139326431622e6a7067)

![欢迎关注体验](https://camo.githubusercontent.com/aa58b354dca93af8d8f1a8a8f1c7add1b8f26901d7696d3d8799554da14d3d4e/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f64353439343231632d366330652d343233392d383936622d3034346264373636373630342e706e67)

下面我来介绍一下具体怎么实现：
## 1. 首先注册一个AirCode平台账号
进入`aircode`官网：`https://aircode.io`


![AirCode官网](https://camo.githubusercontent.com/78436439fb1c7539691e08828a5b79de304df577c5710a3a4f3310b2f97c5d1d/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f30636661646537652d646233342d346363372d396563632d6436376133373731353630652e706e67)

点击右上角`Login`, 可以选择github登录

![可以选择github登录](https://camo.githubusercontent.com/555fec52938806d334b3a825b777a8f9f1ad5740a22ab32facddde6bf0100a52/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f35363961643139662d656535332d346437362d383639652d3433396430363436323932652e706e67)


注册登录之后，点击`New Node.js App`，建立一个应用，并起一个名字


![新建应用](https://camo.githubusercontent.com/3411fec54cf30565bc4668eed33346adf1cd8206ac3522857f81ddb330f07794/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f65656230373239382d353731342d343533302d623532642d6335636636336433353739622e706e67)

![项目名称](https://camo.githubusercontent.com/86275a6b1b75fb5d23c91a4aa1d22f085d0b093fd13857947cf6bfe8c8ac3abd/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f37353461383462372d306366382d346636652d383763322d3131383830353238663764322e706e67)


创建之后，进入控制台界面，默认有一个云函数`hello.js`

![控制台页面](https://camo.githubusercontent.com/1074971d25570ddc4b2601210cd340ea18d947df43ace11884b8e6bb934f8dfa/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f35383137316538322d316634362d343330652d616565362d3665326161363437613366362e706e67)

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

![安装依赖](https://camo.githubusercontent.com/ef5ec2d2ae9b1244773c30b10d50ad28ea795178eb18ab18d364b82e3cd9646f/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f62353765363131382d353233372d346230362d623138342d3935653132386535643962382e706e67)

在左下角搜索并点击加号安装依赖

![安装axios](https://camo.githubusercontent.com/1590e9c3eb4f29349c3adea5d64d856b746dbf7e78a9669c906fc240a2b8278f/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f61616236336462612d346436642d343735612d393965322d6235316566313166636435652e706e67)

![安装sha1](https://camo.githubusercontent.com/5de6062703e48e79ba5486103508902587946caeae9287c6abfbf1240da23daf/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f34663465623236652d613861302d343939312d613864302d6565356338393964653131632e706e67)

![安装xml2js](https://camo.githubusercontent.com/8241e64056e36739c0a5ea2c9dd3a81da181d51dc30b09ae9264f9f0b74252c7/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f30393566396631362d336661612d343636352d623935362d3239333939653261343333642e706e67)


点击`Deploy`按钮发布一下云函数

![deploy](https://camo.githubusercontent.com/e74aeb0f67dcfdf1fd25c70b231e245c15064e7204b6fc6d401d397aa37ab7c2/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f37373934636262352d393434382d343039342d623330342d6538356163643138393566332e706e67)


![](https://camo.githubusercontent.com/6c9ae50db1e9cee2b3c3a809c8c28c73e14738cfa34c796bf12547d8af14f03c/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f38653865653461632d646566642d343763652d386464662d3037356237323539333931622e706e67)

等待发布完成，复制云函数链接，下边在微信公众号平台会用到

![](https://camo.githubusercontent.com/317c84d163f4275c70ad6131aeef1e06db3eabb5c29147f3399f424c8043cbab/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f61393938633063342d653065372d343163652d393033372d3035393039653436353535372e706e67)



注意： 
1. `token`要与微信公众号中设置一致
2. `chatGPT`的`apiKey`要从openai官网获取，地址如下：`https://platform.openai.com/account/api-keys`


## 2. 第二步在微信公众平台操作
首先默认你有一个公众号，然后登录微信公众平台，点开左侧的设置与开发，点击基本设置，服务器配置那里点击修改配置

![修改配置](https://camo.githubusercontent.com/1c2f0890e4ee0861d1e7617037690e7af4f551cc409210b951537db69738a21a/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f61303831633766302d313462342d343236652d616433352d3361643130666231616163632e706e67)

把刚才复制的云函数地址粘贴到服务器URL这里，下边的token与云函数代码中的token保持一致，下边的EncodingAESKey点击右侧随机生成就行，然后点击提交

![提交配置](https://camo.githubusercontent.com/888ecb0a1140002c4a36559f8825df277fe6a9f85f39f6b62ed5976819e6aae4/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f36373866303939332d373431312d343038382d393833342d6462363438346638303134622e706e67)

返回token校验成功的话，我们就点击启用

![启用服务器配置](https://camo.githubusercontent.com/cab835940613d83dc906e48350452ecaf7ee745c42a34f0fad7e762700fbfe23/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f32613936366636382d626539382d343537392d623835322d6231646236663566316537392e706e67)


启用成功之后就可以在公众号对话框与ChatGPT对话啦，快去试试吧！

有问题可加入群聊，共同讨论

![](https://camo.githubusercontent.com/a87f27724ec8a906cc83d1f50d6dd685a30a69fa8053bae26e4969a5a0b928b8/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f31623336616336352d323532332d346437392d393937392d3933323535626361366565612e6a7067)


