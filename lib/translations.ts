export const translations = {
  en: {
    // 元数据
    metaTitle: 'Pillmotion - Let Creativity Flow Freely',
    metaDescription: 'From inspiration to final film, AI generates scripts, storyboards, characters and scenes with one click. Supporting real-time collaboration and copyright certification, making creation boundless.',

    // 标题
    companyName: 'Pillmotion',
    // 首页
    heroTitle: 'Let Creativity Flow Freely',
    heroDescription: 'From inspiration to final film, AI generates scripts, storyboards, characters and scenes with one click. Supporting real-time collaboration and copyright certification, making creation boundless.',
    getStarted: 'Get Started',
    learnMore: 'Learn More',

    // 功能部分
    ourServices: 'Core Features',
    aiNewsTitle: 'Script Generation',
    aiNewsDesc: 'Input your outline, AI automatically generates draft scripts with real-time optimization and collaborative editing',
    aiResearchTitle: 'Character & Scene Design',
    aiResearchDesc: 'AI generates 2D/3D characters and scenes based on text descriptions, supporting style transfer',
    aiTranslationTitle: 'Storyboard Generation',
    aiTranslationDesc: 'Automatically breaks down scripts into storyboards with camera angle and movement suggestions',
    aiProgrammingTitle: 'AIGC Content Library',
    aiProgrammingDesc: 'Open sharing of scripts, character models, sound effects and other assets, supporting trading and sharing',
    aiVoiceTitle: 'Collaboration Management',
    aiVoiceDesc: 'Project task allocation, progress tracking, and multi-person collaboration to ensure timely completion',
    aiNavigatorTitle: 'Copyright Protection',
    aiNavigatorDesc: 'Blockchain-based certification ensures copyright ownership and compliance',

    // 产品部分
    ourProducts: 'Transparent Pricing',
    bestValue: "Best Value",
    buyNow: "Buy Now",
    basicPlan: "Basic",
    proPlan: "Pro",
    maxPlan: "Max",
    perMonth: "/ month",
    basicPlanCredits: "1500 Credits / month",
    proPlanCredits: "4000 Credits / month",
    maxPlanCredits: "10000 Credits / month",
    proMoreCredits: "33% more credits",
    maxMoreCredits: "67% more credits",

    // 导航
    home: 'Home',
    features: 'Features',
    pricing: 'Pricing',

    // 页脚
    footerDesc: 'AI platform for boundless creativity',
    footerFollow: 'Follow Us',
    footerRights: 'All rights reserved.',
  },
  zh: {
    // 元数据
    metaTitle: '药丸运动 - 让创意自由流动',
    metaDescription: '从灵感到成片，AI一键生成剧本、分镜、角色与场景，支持多人实时协作与版权存证，让创作无边界',

    // 标题
    companyName: '药丸运动',
    // 首页
    heroTitle: '让创意自由流动',
    heroDescription: '从灵感到成片，AI一键生成剧本、分镜、角色与场景，支持多人实时协作与版权存证，让创作无边界',
    getStarted: '开始使用',
    learnMore: '了解更多',

    // 功能部分
    ourServices: '核心功能',
    aiNewsTitle: '剧本生成',
    aiNewsDesc: '输入大纲，AI自动生成剧本初稿，并支持实时优化和多人协作编辑',
    aiResearchTitle: '角色与场景设计',
    aiResearchDesc: 'AI根据文字描述生成2D/3D角色和场景，支持风格迁移',
    aiTranslationTitle: '分镜与故事板生成',
    aiTranslationDesc: '将剧本自动拆解为分镜脚本，生成包含镜头角度和运镜建议的动态故事板',
    aiProgrammingTitle: 'AIGC素材库',
    aiProgrammingDesc: '开放共享剧本、角色模型、音效等素材，支持交易与共享',
    aiVoiceTitle: '协作管理',
    aiVoiceDesc: '项目任务分配、进度追踪、多人协作，确保项目按期完成',
    aiNavigatorTitle: '版权保护与合规性',
    aiNavigatorDesc: '通过区块链存证，确保创作内容的版权归属，保障合规性',

    // 产品部分
    ourProducts: '透明定价',
    bestValue: "最受欢迎",
    buyNow: "立即购买",
    basicPlan: "基础版",
    proPlan: "专业版",
    maxPlan: "至尊版",
    perMonth: "/月",
    basicPlanCredits: "1500积分/月",
    proPlanCredits: "4000积分/月",
    maxPlanCredits: "10000积分/月",
    proMoreCredits: "多33%积分",
    maxMoreCredits: "多67%积分",


    // 导航
    home: '首页',
    features: '功能',
    pricing: '定价',

    // 页脚
    footerDesc: '让创意自由流动的AI平台',
    footerFollow: '关注我们',
    footerRights: '版权所有',
  }
};

export type TranslationKey = keyof typeof translations.en;

export function getTranslation(language: 'en' | 'zh', key: TranslationKey): string {
  return translations[language][key] || translations.en[key] || key;
}
