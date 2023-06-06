# 已认证公众号使用客服接口解决5秒超时问题

laf平台云函数代码如下：
```js
// 引入crypto和cloud模块
import * as crypto from 'crypto';
import cloud from '@lafjs/cloud';

// 公众号配置
const APPID = process.env.APPID || '' // 微信公众号appid
const APPSECRET = process.env.APPSECRET || '' //微信公众号appsecret
const OPENAI_KEY = process.env.OPENAI_KEY || ''; // OpenAI 的 Key
const TOKEN = process.env.TOKEN || 'hello123';// 微信公众号的token

const CLEAR_MESSAGE = `✅ 记忆已清除`
const HELP_MESSAGE = 
`       ChatGPT 指令使用指南
   |    关键字  |      功能      |
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
  

  // 验证消息是否合法，若不合法则返回错误信息
  if (!verifySignature(signature, timestamp, nonce, TOKEN)) {
    return 'Invalid signature';
  }

  // 如果是首次验证，则返回 echostr 给微信服务器
  if (echostr) {
    return echostr;
  }

  // 处理接收到的消息
  const payload = event.body.xml;

  // 文本消息
  if (payload.msgtype[0] === 'text') {
    const newMessage = {
      msgid: payload.msgid[0],
      question: payload.content[0].trim(),
      username: payload.fromusername[0],
      sessionId: payload.fromusername[0],
      createdAt: Date.now()
    }
    let needWait = false
    // 修复请求响应超时问题：如果 5 秒内 AI 没有回复，则返回等待消息
    await Promise.race([
      replyText(newMessage),
      sleep(4000.0).then(() => {
        needWait = true
      }),
    ]);
    
    if(needWait) {
      return toXML(payload, "答案正在收集中，请稍后...")
    }
    return 'success';
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

  // 获取上下文 id
  const res = await Message.where({
    sessionId
  }).orderBy("createdAt", "desc").getOne();

  console.log("获取上下文", res)
  const parentId = res?.data?.parentMessageId


  // 给用户·对方正在输入·提示
  await changeState(sessionId)


  // 发送指令
  if (question.startsWith('/')) {
    return await processCommandText(message);
  }

  // 获取 OpenAI 回复内容
  const { error, answer, parentMessageId } = await getOpenAIReply(question, parentId);
  if (error) {
    console.error(`sessionId: ${sessionId}; question: ${question}; error: ${error}`);
    await replyBykefu(error, sessionId)
    return error;
  }

  // 将消息保存到数据库中
  const token = question.length + answer.length;
  const result = await Message.add({ token, answer, parentMessageId, ...message });
  console.debug(`[save message] result: ${result}`);

  await replyBykefu(answer, sessionId)
  
  return 'success';
}

// 公众号客服回复文本消息
export async function replyBykefu(message, touser) {

  const access_token = await getAccess_token()
  // 回复消息
  const res = await cloud.fetch.post(`https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${access_token}`, {
    "touser": touser,
    "msgtype": "text",
    "text":
    {
      "content": message
    }
  })
  return res
}

// 修改公众号回复状态
export async function changeState(touser) {
  const access_token = await getAccess_token()
  // 修改正在输入的状态
  const res = await cloud.fetch.post(`https://api.weixin.qq.com/cgi-bin/message/custom/typing?access_token=${access_token}`, {
    "touser": touser,
    "command": "Typing"
  })
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
      // console.log("parid", parentId)
      res = await api.sendMessage(question, { parentMessageId: parentId })
    } else {
      res = await api.sendMessage(question)
    }
    // console.log(res)

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

// 获取微信公众号ACCESS_TOKEN
async function getAccess_token() {
  const shared_access_token = await cloud.shared.get("mp_access_token")

  if (shared_access_token && shared_access_token.access_token && shared_access_token.exp > Date.now()) {
    return shared_access_token.access_token
  }
  // ACCESS_TOKEN不存在或者已过期
  // 获取微信公众号ACCESS_TOKEN
  const mp_access_token = await cloud.fetch.get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`)
  mp_access_token.data.access_token && cloud.shared.set("mp_access_token", {
    access_token: mp_access_token.data.access_token,
    exp: Date.now() + 7100 * 1000
  })
  // console.log('mp_access_token', mp_access_token.data)
  return mp_access_token.data.access_token
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
    await replyBykefu(CLEAR_MESSAGE, sessionId)
  } else {
    await replyBykefu(HELP_MESSAGE, sessionId)
  }
}
```

