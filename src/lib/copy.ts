import type { Language } from "./language";

export type Localized = {
  ja: string;
  en: string;
};

export const copy = {
  hero: {
    label: {
      ja: "ソーシャルセリング・アリーナプラットフォーム",
      en: "Social Selling Arena Platform",
    },
    titleMain: {
      ja: "販売を、最も熱狂的なスポーツに。",
      en: "Turn selling into the most competitive sport.",
    },
    subtitleKicker: {
      ja: "SELL RUSH – CINEMATIC SOCIAL SELLING EXPERIENCE",
      en: "SELL RUSH – CINEMATIC SOCIAL SELLING EXPERIENCE",
    },
    body: {
      ja: "インフルエンサーの「売る力」を競技に変える、インフルエンサーとブランドが販売バトルでつながるソーシャルセリング・プラットフォーム。スマホとSNSがあれば誰でも参加でき、在庫や広告費の前払いなしで「売ること」に集中できます。",
      en: "SELL RUSH turns creators’ selling power into a sport. It’s a social selling arena where influencers and brands compete through sales battles. All you need is your phone and social channels—no inventory risk, no upfront ad spend.",
    },
    ctaPrimary: {
      ja: "無料でアーリーアクセスに参加する",
      en: "Join early access for free",
    },
    ctaSecondary: {
      ja: "商品を掲載したい企業の方へ",
      en: "For brands looking to list products",
    },
    note: {
      ja: "正式リリース（現在は招待制）",
      en: "Official Release (Invitation-based access)",
    },
    dashboard: {
      title: {
        ja: "Arena Dashboard",
        en: "Arena Dashboard",
      },
      activeBattlesLabel: {
        ja: "Active Battles",
        en: "Active Battles",
      },
      creatorsLabel: {
        ja: "Creators",
        en: "Creators",
      },
      gmv24hLabel: {
        ja: "GMV / 24h",
        en: "GMV / 24h",
      },
      noteMock: {
        ja: "デモ表示です。実際のダッシュボードでは、あなたの売上とランキングがリアルタイムで更新されます。",
        en: "Demo display. In the real dashboard, your revenue and rankings update in real time.",
      },
      currentRankLabel: {
        ja: "Current Rank",
        en: "Current Rank",
      },
      estRewardLabel: {
        ja: "Est. Reward",
        en: "Est. Reward",
      },
      hotMessage: {
        ja: "クリック率とコンバージョンが今夜のバトルで急上昇中",
        en: "Click‑through and conversion rates are surging in tonight’s battle.",
      },
    },
  },

  easy: {
    label: {
      ja: "EASY TO START",
      en: "EASY TO START",
    },
    title: {
      ja: "EASY TO START – 誰でも始めやすい「販売ゲーム」",
      en: "EASY TO START – A selling game anyone can join",
    },
    body: {
      ja: "スマホ1台あれば、今日からプレイヤーになれる。必要なのは、SNSアカウントとネット環境だけ。在庫の仕入れや、広告費の前払いは一切不要です。投稿文や紹介文はAIが下書きを提案してくれるから、文章に自信がなくても大丈夫。学生から社会人まで、ライフスタイルに合わせて「自分のペース」でチャレンジできます。",
      en: "With just your phone, you can start playing today. All you need is your social account and an internet connection. No inventory risk. No upfront ad budget. AI helps you draft posts and captions, so you don’t have to be a copywriter. From students to professionals, you can play at your own pace.",
    },
    note: {
      ja: "※ 登録・利用に費用はかかりません。売上が発生した場合のみ成果報酬が発生します。",
      en: "* Joining and using the platform is free. Rewards are only generated when sales happen.",
    },
    cards: [
      {
        title: {
          ja: "スマホ＋SNSではじめられる",
          en: "Start with just your phone and social",
        },
        body: {
          ja: "必要なのは、あなたのSNSアカウントとネット環境だけ。自宅でも移動中でも、好きな場所がアリーナになります。",
          en: "All you need is your social account and a connection. Your home, commute, or café becomes your arena.",
        },
      },
      {
        title: {
          ja: "在庫・広告費の前払いなし",
          en: "No inventory or upfront ad spend",
        },
        body: {
          ja: "商品は企業側が管理。広告費も先払い不要で、売上が発生したときだけ成果報酬が発生します。",
          en: "Brands manage inventory. You don’t pay for ads upfront—revenue share only happens when sales are made.",
        },
      },
      {
        title: {
          ja: "AIサポートで投稿文も作りやすい",
          en: "AI support for effortless copy",
        },
        body: {
          ja: "投稿文や紹介文はAIが下書きを提案。言葉選びに悩む時間を減らし、「伝えたいこと」に集中できます。",
          en: "AI suggests drafts for your posts and captions, so you can spend less time wordsmithing and more time creating.",
        },
      },
      {
        title: {
          ja: "自分のペースで取り組める",
          en: "Play at your own pace",
        },
        body: {
          ja: "学生・社会人・副業、どんなライフスタイルにもフィット。1日30分からでもプレイできる設計です。",
          en: "Whether you’re a student or working full‑time, SELL RUSH fits your lifestyle. Even 30 minutes a day is enough to play.",
        },
      },
    ],
  },

  influencers: {
    label: {
      ja: "FOR INFLUENCERS & CREATORS",
      en: "FOR INFLUENCERS & CREATORS",
    },
    title: {
      ja: "For Influencers & Creators",
      en: "For Influencers & Creators",
    },
    leadArena: {
      ja: "あなたのSNSは、すでに立派な「販売アリーナ」です。",
      en: "Your social channels are already a powerful selling arena.",
    },
    lead1: {
      ja: "売って、売って、ちゃんと稼ごう。必要なのはフォロワーとのつながりだけ。在庫ゼロ・広告費ゼロで、SNS発信をそのまま「売上」と「実績」に変えられます。",
      en: "Sell, compete, and get paid fairly. All you need is the connection you already have with your followers. With zero inventory and zero ad spend, your posts turn directly into revenue and trackable performance.",
    },
    lead2: {
      ja: "投稿文やキャンペーン案は、AIと一緒に作成。ゲーム感覚でチャレンジしているうちに、「売る力」が自然と育っていきます。",
      en: "AI helps you craft posts and campaign ideas. As you keep playing, your selling skills grow naturally—just like leveling up in a game.",
    },
    benefits: [
      {
        ja: "売れやすい商品だけが集まるマーケットで、商品選びの悩みを減らせます。",
        en: "A curated marketplace of high‑potential products so you spend less time guessing what will sell.",
      },
      {
        ja: "紹介リンクを発行 → SNSで発信 → あとはダッシュボードを見るだけのシンプルな導線。",
        en: "Generate a link, post on social, then simply watch performance in your dashboard.",
      },
      {
        ja: "売上・報酬・ランキングがリアルタイムで更新され、自分の成長を数字で追えます。",
        en: "Revenue, rewards, and rankings update in real time, so you can literally see your growth.",
      },
      {
        ja: "ランキング上位のプレイヤーには、賞金や特別な報酬単価が用意されています。",
        en: "Top‑ranked players can earn prizes, bonuses, and special reward rates.",
      },
    ],
    dashboard: {
      title: {
        ja: "Creator Dashboard",
        en: "Creator Dashboard",
      },
      badge: {
        ja: "Tonight Battle",
        en: "Tonight Battle",
      },
      todayRevenueLabel: {
        ja: "今日の売上",
        en: "Today’s Revenue",
      },
      estRewardLabel: {
        ja: "報酬見込み",
        en: "Estimated Reward",
      },
      currentRankLabel: {
        ja: "現在の順位",
        en: "Current Rank",
      },
      summaryNote: {
        ja: "クリック率 / コンバージョン / 獲得報酬は、すべてリアルタイムで更新されます。",
        en: "Click‑through, conversion, and rewards all update in real time.",
      },
    },
  },

  earlyAccess: {
    title: {
      ja: "アーリーアクセスに参加する",
      en: "Join Early Access",
    },
    description: {
      ja: "正式リリース（現在は招待制）",
      en: "Official Release (Invitation-based access)",
    },
    emailLabel: {
      ja: "メールアドレス",
      en: "Email",
    },
    roleLabel: {
      ja: "あなたの立場",
      en: "You are",
    },
    roleCreatorInfluencer: {
      ja: "クリエイター / インフルエンサー",
      en: "Creator / Influencer",
    },
    roleBrandCompany: {
      ja: "ブランド / 企業",
      en: "Brand / Company",
    },
    submitLabel: {
      ja: "参加をリクエストする",
      en: "Request Access",
    },
    note: {
      ja: "スパム配信はありません。招待制アクセスのご案内のみお送りします。",
      en: "No spam. Invitation access notifications only.",
    },
    thanksLabel: {
      ja: "ありがとうございます",
      en: "THANK YOU",
    },
    thanksTitle: {
      ja: "ご参加ありがとうございます。",
      en: "Thanks for joining.",
    },
    thanksBody: {
      ja: "ご登録ありがとうございます。招待制アクセスの準備が整い次第、順次ご案内をお送りします。",
      en: "We’ll notify you when your access is ready. Invitation access will be granted in waves as we expand availability.",
    },
    closeLabel: {
      ja: "閉じる",
      en: "CLOSE",
    },
  },

  auth: {
    login: {
      title: {
        ja: "SELL RUSH にサインイン",
        en: "Sign in to SELL RUSH",
      },
      subtitle: {
        ja: "ご登録のメールアドレスに、ログイン用リンク（Magic Link）をお送りします。",
        en: "We’ll email you a magic link to sign in.",
      },
      tabPassword: {
        ja: "パスワードでログイン",
        en: "Sign in with password",
      },
      tabMagicLink: {
        ja: "メールでログイン（パスワード不要）",
        en: "Sign in with email (no password)",
      },
      emailLabel: {
        ja: "メールアドレス",
        en: "Email",
      },
      passwordLabel: {
        ja: "パスワード",
        en: "Password",
      },
      submit: {
        ja: "リンクを送信",
        en: "Send sign-in link",
      },
      submitPassword: {
        ja: "ログイン",
        en: "Sign in",
      },
      sentMessage: {
        ja: "ログイン用リンクをメールで送信しました。メールボックスをご確認ください。",
        en: "We’ve sent you a link to sign in. Please check your inbox.",
      },
      errorGeneric: {
        ja: "リンク送信中にエラーが発生しました。時間をおいて再度お試しください。",
        en: "Something went wrong while sending the link. Please try again.",
      },
      errorPassword: {
        ja: "メールアドレスまたはパスワードが正しくありません。",
        en: "Invalid email or password.",
      },
      errorPasswordNotSet: {
        ja: "このアカウントにはパスワードが設定されていません。Magic Link ログインをご利用ください。",
        en: "This account doesn't have a password set. Please use Magic Link login.",
      },
    },
    passwordSetup: {
      title: {
        ja: "パスワードを設定する（任意）",
        en: "Set a password (optional)",
      },
      description: {
        ja: "次回からはメールアドレスとパスワードで直接ログインできます。スキップも可能です。",
        en: "You can sign in with email and password next time. You can skip this step.",
      },
      passwordLabel: {
        ja: "パスワード",
        en: "Password",
      },
      confirmLabel: {
        ja: "パスワード（確認）",
        en: "Confirm password",
      },
      submit: {
        ja: "パスワードを設定",
        en: "Set password",
      },
      skip: {
        ja: "後で設定する",
        en: "Skip for now",
      },
      success: {
        ja: "パスワードを設定しました。次回からはメールアドレスとパスワードでログインできます。",
        en: "Password set successfully. You can sign in with email and password next time.",
      },
      errorMismatch: {
        ja: "パスワードが一致しません。",
        en: "Passwords do not match.",
      },
      errorGeneric: {
        ja: "パスワード設定中にエラーが発生しました。",
        en: "Something went wrong while setting the password.",
      },
    },
    activate: {
      titleCreator: {
        ja: "クリエイターとしてはじめる",
        en: "Set up your creator profile",
      },
      titleBrand: {
        ja: "ブランドとしてはじめる",
        en: "Set up your brand profile",
      },
      description: {
        ja: "最初に、表示名 / 会社名と利用規約への同意を設定してください。あとからいつでも変更できます。",
        en: "First, set your public name and agree to the terms. You can change these later.",
      },
      roleToggleCreator: {
        ja: "クリエイター / インフルエンサー",
        en: "Creator / Influencer",
      },
      roleToggleBrand: {
        ja: "ブランド / 企業",
        en: "Brand / Company",
      },
      displayNameLabel: {
        ja: "表示名",
        en: "Display name",
      },
      companyNameLabel: {
        ja: "会社名",
        en: "Company name",
      },
      agreeLabel: {
        ja: "利用規約に同意します",
        en: "I agree to the terms of service",
      },
      submit: {
        ja: "設定を完了する",
        en: "Complete setup",
      },
      loading: {
        ja: "セットアップ中...",
        en: "Setting up your account...",
      },
    },
    dashboard: {
      creator: {
        title: {
          ja: "クリエーターダッシュボード",
          en: "Creator Dashboard",
        },
        description: {
          ja: "ここに売上・ランキングなどが表示されます（デモ表示）。",
          en: "Your sales and ranking will appear here (demo display).",
        },
        statPrimaryLabel: {
          ja: "今日の売上（デモ表示）",
          en: "Today’s Sales (demo)",
        },
        statSecondaryLabel: {
          ja: "現在の順位（デモ表示）",
          en: "Current Rank (demo)",
        },
      },
      brand: {
        title: {
          ja: "ブランドダッシュボード",
          en: "Brand Dashboard",
        },
        description: {
          ja: "ここに商品別の売上やパフォーマンスが表示されます（デモ表示）。",
          en: "Product performance and sales will appear here (demo display).",
        },
        statPrimaryLabel: {
          ja: "本日の売上合計（デモ表示）",
          en: "Today’s GMV (demo)",
        },
        statSecondaryLabel: {
          ja: "注目のキャンペーン（デモ表示）",
          en: "Featured campaign (demo)",
        },
      },
      loading: {
        ja: "ダッシュボードを読み込み中...",
        en: "Loading your dashboard...",
      },
      logout: {
        ja: "ログアウト",
        en: "Log out",
      },
    },
  },

  navigation: {
    signIn: {
      ja: "ログイン",
      en: "Sign In",
    },
    dashboard: {
      ja: "ダッシュボード",
      en: "Dashboard",
    },
  },

  footer: {
    tagline: {
      ja: "データ駆動のソーシャルセリングプラットフォーム",
      en: "Data-driven social selling platform connecting creators and brands.",
    },
    services: {
      ja: "SERVICES",
      en: "SERVICES",
    },
    legal: {
      ja: "LEGAL",
      en: "LEGAL",
    },
    admin: {
      ja: "ADMIN",
      en: "ADMIN",
    },
    linkProduct: {
      ja: "Product",
      en: "Product",
    },
    linkHowItWorks: {
      ja: "How It Works",
      en: "How It Works",
    },
    linkForBrands: {
      ja: "For Brands",
      en: "For Brands",
    },
    linkTerms: {
      ja: "Terms",
      en: "Terms",
    },
    linkPrivacy: {
      ja: "Privacy",
      en: "Privacy",
    },
    linkAdminLogin: {
      ja: "Admin Login",
      en: "Admin Login",
    },
    copyright: {
      ja: "© 2025 SELL RUSH Platform",
      en: "© 2025 SELL RUSH Platform",
    },
  },
} as const;

export const t = (obj: Localized, lang: Language): string => obj[lang];


