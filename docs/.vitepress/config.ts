import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'en-US',
  title: "前端每日三省",
  description: "定时更新技术博客或新闻",
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: '首页', link: '/' }
    ],

    sidebar: [
      {
        text: 'ChatGPT',
        items: [
          { text: '使用Laf云平台，两步将ChatGPT接入微信公众号', link: '/views/ChatGPT/wechat' },
          { text: '三分钟把ChatGPT接入Siri，让你的语音助手化身智能AI', link: '/views/ChatGPT/siri' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})

function siderbarChatGPT() {
  return [
    { text: 'Guide', link: '/guide/what-is-vitepress', activeMatch: '/guide/' },
  ]
}
