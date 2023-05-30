import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'en-US',
  title: "前端每日三省",
  description: "定时更新技术博客或新闻",
  cleanUrls: true,
  head: [
    ['link', { rel: 'icon', href: '/images/icon/avator_ico.ico' }],
    ['meta', { name: 'referrer', content: 'no-referrer' }]
  ],
  themeConfig: {
    logo: "/images/Avator/avator_circle.png",
    nav: navConfig(),

    sidebar: {
      '/views/': siderbarGuide()
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/husanr' }
    ]
  }
})

function siderbarGuide() {
  return [
    {
      text: '开始',
      items: [
        { text: '联系方式', link: '/views/start/info' }
      ]
    },
    {
      text: 'ChatGPT专栏',
      items: [
        { text: '最近爆火的ChatGPT是什么？怎么使用？', link: '/views/ChatGPT/ChatGPT' },
        { text: '使用Laf云平台，两步将ChatGPT接入微信公众号', link: '/views/ChatGPT/wechat' },
        { text: '三步搭建无需魔法的个人专属ChatGPT网站', link: '/views/ChatGPT/web_gpt' },
        { text: '使用AirCode云平台，两步将ChatGPT接入微信公众号', link: '/views/ChatGPT/aircode_wechat' },
        { text: '三分钟把ChatGPT接入Siri，让你的语音助手化身智能AI', link: '/views/ChatGPT/siri' }
      ]
    }
  ]
}

function navConfig() {
  return [
    { text: '首页', link: '/' },
    {
      text: "精彩链接",
      items: [
        {
          text: 'CSDN',
          link: 'https://blog.csdn.net/weixin_42560424'
        },
        {
          text: '掘金',
          link: 'https://juejin.cn/user/1169536102434904'
        },
        {
          text: "微信公众号",
          link: "https://mp.weixin.qq.com/s/1e0oZ9aPImnNq7yYvnLG5g"
        }
      ]
    }
  ]
}
