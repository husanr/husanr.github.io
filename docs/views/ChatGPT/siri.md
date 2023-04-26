# 三分钟把ChatGPT接入Siri，让你的语音助手化身智能AI
`最近`，各种各样使用`ChatGPT`的方式都出现了，但是有很多都需要在电脑操作，或者点击别人的各种各样的链接，而且有些可能还要魔法上网才能实现，这些都是稍微有点繁琐的。

`那么`，最方便的还是直接使用我们的手机一键打开或者语音唤醒就可以实现链接`ChatGPT`的，下边我们就来看下怎么实现吧！

## 1. 效果展示
- 连续对话

![](https://camo.githubusercontent.com/776a625b88262f40c640e6a9b2b3daa402c6fcdc58fb8c3329ad70beb3b0ad3a/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f61616539336637312d306534622d343837332d383365612d3936306364323732653135662e706e67)


- 手动输入

![](https://camo.githubusercontent.com/16ae80056f321bee38dc394901ef60bff0b922d53e82e2434f8e9788dc563272/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f37323262306161312d383737622d346234342d626234322d3863623735323439313536332e706e67)



## 2. 云函数实现
我们仍然使用Laf云平台来实现，如何注册Laf和安装依赖，见上篇文章 [《使用Laf云平台，两步将ChatGPT接入微信公众号(含代码)》](https://mp.weixin.qq.com/s/1e0oZ9aPImnNq7yYvnLG5g)

- 创建Siri云函数

![创建云函数步骤](https://camo.githubusercontent.com/af51c83163cdae8e77cacc008f9524a02bd6501ac1bcae161b41b0736f1cb982/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f62653033636434612d393165352d343237392d383431662d6637623639363434313932392e706e67)

```js
// siri.js
// 引入必要的库
import cloud from '@lafjs/cloud';
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// 创建数据库连接
const db = cloud.database();
const ChatTable = db.collection('siri')


// 设置key和模型
const OPENAI_KEY = process.env.OPENAI_KEY || "YOUR API-KEY";
const OPENAI_MODEL = process.env.MODEL || "gpt-3.5-turbo";
const MAX_MESSAGES_PER_CHAT = 40;


export async function main(params, context) {
  console.log('siri入参:', params);
  const { question, cid } = params.body;

  // 创建一个id
  const chatId = cid ? cid : uuidv4();

  // 保存用户问题
  await ChatTable.add({ chatId, role: 'user', content: question });

  // 获取历史信息
  const chats = await ChatTable
    .where({ chatId })
    .orderBy("createdAt", "desc").limit(MAX_MESSAGES_PER_CHAT).get();

  // 组装问题prompt
  const messages = [
    { role: 'system', content: 'You are a helpful assistant.' },
    ...chats.data.map(one => ({ role: one.role, content: one.content })),
  ];

  const data = JSON.stringify({
    model: OPENAI_MODEL,
    messages: messages
  });

  const config: any = {
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
    // 发送请求
    const completion = await axios(config);

    const responseMessage = completion.data.choices[0].message;

    // 保存返回结果
    await ChatTable.add({ chatId, ...responseMessage });

    // 返回结果
    return { reply: responseMessage.content, cid: chatId };

  } catch (error) {
    // 打印错误日志
    console.log('error', error.response || error);


    let errorMessage;

    // 处理返回报错信息
    if (error.response) {
      const { status, statusText, data } = error.response;

      if (status === 401) {
        errorMessage = 'Unauthorized: Invalid OpenAI API key, please check your API key in the AirCode Environments tab.';
      } else if (data.error && data.error.message) {
        errorMessage = data.error.message;
      } else {
        errorMessage = `Request failed with status code ${status}: ${statusText}`;
      }
    } else if (error.request) {
      errorMessage = 'No response received from the server';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorMessage = `Network error: ${error.message}`;
    } else {
      errorMessage = `Request setup error: ${error.message}`;
    }
    return { error: errorMessage };
  }
};
```
最新代码可见：https://github.com/husanr/siri_gpt_laf

## 3. 添加快捷指令
- 打开以下链接，添加快捷指令。
https://www.icloud.com/shortcuts/6f550307e3724769b3e7fc493c07aae6
- 在打开的页面中点击`获取捷径`按钮，然后在弹出的窗口中点击`添加快捷指令`。
![](https://camo.githubusercontent.com/040b1e8150d1cbd4d5f9030bcdda28ff8863434efc754721789dd900f424e3e5/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f64623339633066662d313264342d343436322d623135662d6331643432333733626338662e706e67)

![](https://camo.githubusercontent.com/46c6948e0720a2334250415cae80aec6c29503e0d4e11c66b63b2c963639e819/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f66333230316465322d646638662d343964302d393633382d3231323839356662313237642e706e67)

- 添加过之后，在快捷指令中找到刚添加打开机器人快捷指令，点击右上角三个点进入编辑页面，然后把上边发布的Siri云函数的地址复制粘贴到文本的位置，然后点击完成。

![](https://camo.githubusercontent.com/11f73d293fe80f5eb8b2be8fa0122b7ff44d7835bc98802965c27fed4e5d0a5a/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f35313065356238392d643264362d346234352d386636652d6130323962373866386638642e706e67)


![](https://camo.githubusercontent.com/4a2bd32deabd48f4687299243531d6c266f3477b2aee6545822d56d9c4e46297/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f63303661653266622d346535362d343539612d383865312d6137663433616662383136332e706e67)


![](https://camo.githubusercontent.com/e078dfe0f679e3ee9ba9c4550c51fad2941277304733cf9fef62270ba44c60bd/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f39663361333633632d316535622d346332332d393934622d3064616339663634363637312e706e67)

- 到此，语音助手设置完成，你可以通过语音`嘿 Siri，打开机器人` 唤醒带有ChatGPT的语音助手了，快去体验吧！

![](https://camo.githubusercontent.com/776a625b88262f40c640e6a9b2b3daa402c6fcdc58fb8c3329ad70beb3b0ad3a/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f61616539336637312d306534622d343837332d383365612d3936306364323732653135662e706e67)

- 如果你想要在手机主屏幕通过输入文字与ChatGPT交互，那么你可以把快捷指令添加到主屏幕，如下：

![](https://camo.githubusercontent.com/679435d26956d4d5d286aec25c4bfe8b8e309a5639196adc99603bdfa734bb1b/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f34663462336661312d356163332d346339382d623537622d6132363062343465643335652e706e67)

![](https://camo.githubusercontent.com/51df5e785019049b0c653c4484618c8b4bc09d2fe6f2c40faf0326571f8af16c/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f66646533316662332d626332312d346339352d383062642d3839336138396131346365332e706e67)

![](https://camo.githubusercontent.com/16ae80056f321bee38dc394901ef60bff0b922d53e82e2434f8e9788dc563272/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f37323262306161312d383737622d346234342d626234322d3863623735323439313536332e706e67)

## 大功告成！

关注我的公众号，更多精彩内容等你来看！

![](https://camo.githubusercontent.com/2109e865215b80bd1e1270d74112121f8d75a3e8eeea4097f678c5b3653e0e5e/68747470733a2f2f66696c65732e6d646e6963652e636f6d2f757365722f32343838332f63333664363861372d343339662d343837362d623434632d3837656539336236383063632e706e67)




