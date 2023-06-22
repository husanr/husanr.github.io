import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'en-US',
  title: "前端每日三省",
  description: "定时更新技术博客或新闻",
  cleanUrls: true,
  head: [
    ['link', { rel: 'icon', href: '/images/icon/avator_ico.ico' }],
    ['meta', { name: 'referrer', content: 'no-referrer' }],
    ['meta', { name: 'keywords', content: 'ChatGPT接入微信公众号, ChatGPT, chatgpt, gpt, GPT, 接入微信公众号' }],

    // google analytics
    ['script', { src: 'https://www.googletagmanager.com/gtag/js?id=G-4V5K0X3ELN', position: 'head' }],
    ['script', {}, `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-4V5K0X3ELN');
    `],
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
        { text: 'ChatGPT接入微信公众号(Laf)', link: '/views/ChatGPT/wechat' },
        { text: 'ChatGPT接入微信公众号(AirCode)', link: '/views/ChatGPT/aircode_wechat' },
        { text: 'ChatGPT接入飞书(Laf)', link: '/views/ChatGPT/feishu' },
        { text: '已认证公众号使用客服接口解决5秒超时问题', link: '/views/ChatGPT/wechat_kefu' },
        { text: '搭建ChatGPT网站', link: '/views/ChatGPT/web_gpt' },
        { text: 'ChatGPT接入Siri', link: '/views/ChatGPT/siri' }
      ]
    },
    {
      text: 'Claude专栏',
      items: [
        { text: '如何使用Claude', link: '/views/Claude/use-claude' }
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
    },
    { text: '联系我', link: '/views/start/info' }
  ]
}
