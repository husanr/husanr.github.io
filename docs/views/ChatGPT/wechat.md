# 使用Laf云平台，两步将ChatGPT接入微信公众号
**最近很火**的`ChatGPT`可以说已经满大街可见了，到处都有各种各样的体验地址，有收费的也有免费的，总之是五花八门、花里胡哨。

**所以呢**，最近我就在研究怎么才能方便快捷的体验到`ChatGPT`的强大功能，其中一个就是：把`ChatGPT`接入公众号。如下图（成果图）:

![](https://camo.githubusercontent.com/e9cef9807158d39cf95dc04160dde526ead2be97e0619d983db245176deb0690/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f65393832343764312d666462612d343966382d386362392d3535613163386139326431622e6a7067)


![欢迎关注体验](https://camo.githubusercontent.com/aa58b354dca93af8d8f1a8a8f1c7add1b8f26901d7696d3d8799554da14d3d4e/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f64353439343231632d366330652d343233392d383936622d3034346264373636373630342e706e67)

下面我来介绍一下具体怎么实现：
## 1. 首先注册一个Laf平台账号
laf官网：https://laf.dev

注册登录之后，点击新建，建立一个应用

![新建应用](https://camo.githubusercontent.com/3fddd6968396e63e750552f7de8f98826d59aac522677e80718d3f6661eee53b/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f33393035306166642d373438352d343363392d613330312d6265346165656136636563362e6a7067)

输入应用名称，点击立即创建

![立即创建](https://camo.githubusercontent.com/1bf5febb12aa0280a2c5f66182fa9dc6456bdde5d8cabce7c2df69d0f26ac11d/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f61366339613836662d326235322d346130322d383765362d3235653538623561343865362e6a7067)


点击开发，进入应用开发界面

![点击开发](https://camo.githubusercontent.com/9b65c4228775c9855234bdeb0dffacf7542354736f83adfc43dd9edd2c0da484/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f37613038623438372d333131662d346130302d386133622d3138343032656461336636642e6a7067)

然后先把chatgpt的依赖安装一下

![安装依赖](https://camo.githubusercontent.com/4d1712f2a38e1da5f1850117ebb5fb696e32927a9a788f87e86da0a335b8b38f/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f36326663653332362d373335382d343932662d616537302d6536306533316138383133642e6a7067)

点击加号，搜索chatgpt，选中第一个，点击安装并重启

![搜索并安装chatgpt依赖](https://camo.githubusercontent.com/0865508d35bfab79f4849a98e1cfcd3bd18355f220ec7ed040f98ac4149cb3e9/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f61663864353335382d316131382d346437372d623936312d6465646664313439383466612e6a7067)

然后我们点击函数，函数列表右侧的加号，新增一个可以介入微信公众号的chatgpt云函数

![点击新增](https://camo.githubusercontent.com/ba60a1032b0a89373c375e414aa8a6fa2ce55a10e07db02396510097e761854d/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f31346462663334642d343337642d343133632d383938652d3031636430656538643962632e706e67)

输入函数名，点击确定

![新增云函数](https://camo.githubusercontent.com/76561b14541a00b1182ff5ef49739a88d764d1ffbd73febaafae0b63d60f6266/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f62386635363265352d613331322d343132612d623531352d3632363934373365623638642e706e67)

云函数代码如下：
```js
// 引入crypto和cloud模块
import * as crypto from 'crypto';
import cloud from '@lafjs/cloud';

const OPENAI_KEY = process.env.OPENAI_KEY || ''; // OpenAI 的 Key

const WAIT_MESSAGE = `处理中 ... \n\n请稍等3秒后发送【1】查看回复`
const NO_MESSAGE = `暂无内容，请稍后回复【1】再试`
const CLEAR_MESSAGE = `✅ 记忆已清除`
const HELP_MESSAGE = `ChatGPT 指令使用指南
   |    关键字  |   功能         |
   |      1    | 上一次问题的回复 |
   |   /clear  |    清除上下文   |
   |   /help   |   获取更多帮助  |
  `

// 不支持的消息类型
const UNSUPPORTED_MESSAGE_TYPES = {
  image: '暂不支持图片消息',
  voice: '暂不支持语音消息',
  video: '暂不支持视频消息',
  music: '暂不支持音乐消息',
  news: '暂不支持图文消息',
}

// 定义休眠函数
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// 创建数据库连接并获取Message集合
const db = cloud.database();
const Message = db.collection('messages')

// 处理接收到的微信公众号消息
export async function main(event) {
  const { signature, timestamp, nonce, echostr } = event.query;
  const token = 'hello123';

  // 验证消息是否合法，若不合法则返回错误信息
  if (!verifySignature(signature, timestamp, nonce, token)) {
    return 'Invalid signature';
  }

  // 如果是首次验证，则返回 echostr 给微信服务器
  if (echostr) {
    return echostr;
  }

  // 处理接收到的消息
  const payload = event.body.xml;
  // console.log("payload",payload)
  // 文本消息
  if (payload.msgtype[0] === 'text') {
    const newMessage = {
      msgid: payload.msgid[0],
      question: payload.content[0].trim(),
      username: payload.fromusername[0],
      sessionId: payload.fromusername[0],
      createdAt: Date.now()
    }

    // 修复请求响应超时问题：如果 5 秒内 AI 没有回复，则返回等待消息
    const responseText = await Promise.race([
      replyText(newMessage),
      sleep(4000.0).then(() => WAIT_MESSAGE),
    ]);
    return toXML(payload, responseText);
  }

  // 公众号事件
  if (payload.msgtype[0] === 'event') {
    // 公众号订阅
    if (payload.event[0] === 'subscribe') {
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


// 处理文本回复消息
async function replyText(message) {
  const { question, sessionId } = message;
  // 检查是否是重试操作，如果是重试操作，返回上一次的回复
  if (question === '1') {
    const lastMessage = await Message.where({
      sessionId
    }).orderBy("createdAt", "desc").get();
    if (lastMessage.data[0]) {
      return `${lastMessage.data[0].question}\n------------\n${lastMessage.data[0].answer}`;
    }

    return NO_MESSAGE;
  }

  // 获取上下文 id
  const res = await Message.where({
    sessionId
  }).orderBy("createdAt", "desc").getOne();

  const parentId = res?.data?.parentMessageId


  // 发送指令
  if (question.startsWith('/')) {
    return await processCommandText(message);
  }

  // 获取 OpenAI 回复内容
  const { error, answer, parentMessageId } = await getOpenAIReply(question, parentId);
  if (error) {
    console.error(`sessionId: ${sessionId}; question: ${question}; error: ${error}`);
    return error;
  }

  // 将消息保存到数据库中
  const token = question.length + answer.length;
  const result = await Message.add({ token, answer, parentMessageId, ...message });
  console.debug(`[save message] result: ${result}`);

  return answer;
}

// 获取 OpenAI API 的回复
async function getOpenAIReply(question, parentId) {

  const { ChatGPTAPI } = await import('chatgpt')
  let api = cloud.shared.get('api')
  if (!api) {
    api = new ChatGPTAPI({ apiKey: OPENAI_KEY })
    cloud.shared.set('api', api)
  }

  try {
    // 如果有上下文 id，就带上
    let res;

    if (parentId) {
      res = await api.sendMessage(question, { parentMessageId: parentId })
    } else {
      res = await api.sendMessage(question)
    }
    console.log(res)
    
    // 返回 OpenAI 回复的内容及上下文 id
    return { answer: res.text.replace("\n\n", ""), parentMessageId: res.parentMessageId }

  } catch (e) {
    console.log(e)
    if (e.statusCode === 429) {
      return {
        error: '问题太多了，我有点眩晕，请稍后再试'
      }
    }
    return {
      error: "问题太难了 出错了. (uДu〃).",
    }
  }

}

// 校验微信服务器发送的消息是否合法
function verifySignature(signature, timestamp, nonce, token) {
  const arr = [token, timestamp, nonce].sort();
  const str = arr.join('');
  const sha1 = crypto.createHash('sha1');
  sha1.update(str);
  return sha1.digest('hex') === signature;
}

// 返回组装 xml
function toXML(payload, content) {
  const timestamp = Date.now();
  const { tousername: fromUserName, fromusername: toUserName } = payload;
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
    const res = await Message.where({ sessionId }).remove({ multi: true })
    return CLEAR_MESSAGE;
  } else {
    return HELP_MESSAGE;
  }
}

```
注意： 
1. `token`要与微信公众号中设置一致
2. `chatGPT`的`apiKey`要从openai官网获取，地址如下：`https://platform.openai.com/account/api-keys`

云函数写完之后就点击发布，左侧的接口地址要保存一下，一会微信公众号那里要用

![发布云函数](https://camo.githubusercontent.com/fc7a272496ae06b59cda67fec93675eeb8c2875e6661d4c68d79252fb465d598/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f66613563623836622d623332342d343137392d383734392d3231653733393231323164322e706e67)

到这里，在Laf平台的操作基本结束。

## 2. 第二步在微信公众平台操作
首先默认你有一个公众号，然后登录微信公众平台，点开左侧的设置与开发，点击基本设置，服务器配置那里点击修改配置

![修改配置](https://camo.githubusercontent.com/1c2f0890e4ee0861d1e7617037690e7af4f551cc409210b951537db69738a21a/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f61303831633766302d313462342d343236652d616433352d3361643130666231616163632e706e67)

把刚才保存的接口地址复制到服务器URL这里，下边的token与云函数代码中的token保持一致，下边的EncodingAESKey点击右侧随机生成就行，然后点击提交

![提交配置](https://camo.githubusercontent.com/888ecb0a1140002c4a36559f8825df277fe6a9f85f39f6b62ed5976819e6aae4/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f36373866303939332d373431312d343038382d393833342d6462363438346638303134622e706e67)

返回token校验成功的话，我们就点击启用

![启用服务器配置](https://camo.githubusercontent.com/cab835940613d83dc906e48350452ecaf7ee745c42a34f0fad7e762700fbfe23/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f32613936366636382d626539382d343537392d623835322d6231646236663566316537392e706e67)


启用成功之后就可以在公众号对话框与ChatGPT对话啦，快去试试吧！附在下公众号，点击关注即可体验！
