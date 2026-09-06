import sql from 'mssql';
import * as dotenv from 'dotenv';

dotenv.config();

const server = process.env.SQLSERVER_HOST || '180.151.91.194';
const port = parseInt(process.env.SQLSERVER_PORT || '50210', 10);
const user = process.env.SQLSERVER_USER || 'wspl';
const password = process.env.SQLSERVER_PASSWORD || 'TE-B}x]u';
const database = process.env.SQLSERVER_DATABASE || 'WaydineQA';

const config = {
  server,
  port,
  user,
  password,
  database,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function main() {
  console.log(`Connecting to SQL Server [${server}:${port}/${database}]...`);
  const pool = await new sql.ConnectionPool(config).connect();
  console.log('Connected successfully!');

  console.log('Creating blog_posts table if not exists...');
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'blog_posts')
    BEGIN
      CREATE TABLE blog_posts (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        slug NVARCHAR(150) NOT NULL UNIQUE,
        title NVARCHAR(255) NOT NULL,
        excerpt NVARCHAR(500) NOT NULL,
        content NVARCHAR(MAX) NOT NULL,
        category NVARCHAR(100) NOT NULL DEFAULT 'General',
        tags NVARCHAR(255) NULL,
        author NVARCHAR(100) NOT NULL DEFAULT 'Intopsmm Growth Team',
        read_time NVARCHAR(50) NOT NULL DEFAULT '6 min read',
        cover_image NVARCHAR(500) NULL,
        seo_title NVARCHAR(255) NULL,
        seo_description NVARCHAR(500) NULL,
        is_published BIT NOT NULL DEFAULT 1,
        published_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
      );
      CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
      CREATE INDEX idx_blog_posts_published ON blog_posts(is_published, published_at DESC);
      PRINT 'Created blog_posts table';
    END
    ELSE
    BEGIN
      PRINT 'blog_posts table already exists';
    END
  `);

  // Check if initial articles need seeding
  const countRes = await pool.request().query('SELECT COUNT(*) as count FROM blog_posts');
  if (countRes.recordset[0].count === 0) {
    console.log('Seeding 5 comprehensive pillar blog articles...');

    const articles = [
      {
        slug: 'how-to-grow-instagram-followers-organically-and-smm',
        title: 'The Complete Instagram Growth Blueprint: Proven Strategies for 2026',
        excerpt: 'Discover actionable strategies to rapidly scale your Instagram presence combining organic reach, reels optimization, and strategic SMM social proof.',
        category: 'Instagram',
        tags: 'Instagram,Growth,Followers,Reels,Marketing',
        read_time: '7 min read',
        seo_title: 'Complete Instagram Growth Guide 2026 | Intopsmm',
        seo_description: 'Master Instagram growth with proven algorithmic strategies, engagement optimization, and safe SMM booster techniques.',
        content: `
<h2>1. The 2026 Instagram Algorithm Landscape</h2>
<p>Instagram's discovery engine prioritizes accounts that generate immediate watch time and genuine interaction on short-form Reels. Whether you are a personal brand, digital creator, or e-commerce business, standing out requires both high-retention content and baseline social proof.</p>

<h2>2. The Power of Initial Social Proof</h2>
<p>Psychological research shows that social proof directly influences viewer conversion. When prospective followers visit a profile with active engagement and followers, their likelihood of following increases by over 300%. Utilizing high-retention <a href="/services/instagram">Instagram SMM services</a> gives your new campaigns the essential momentum needed to trigger the organic recommendation algorithm.</p>

<h2>3. Content Consistency & Hook Framework</h2>
<ul>
  <li><strong>First 3 Seconds:</strong> Hook the audience with a visual disruption or question.</li>
  <li><strong>Pacing:</strong> Keep cuts fast (under 2 seconds per scene).</li>
  <li><strong>Call to Action:</strong> Encourage saves and shares rather than simple likes.</li>
</ul>

<h2>4. Best Practices for Safe Account Growth</h2>
<p>Always choose non-drop, genuine high-quality provider servers with gradual drip-feed delivery. At Intopsmm, our services operate within safe platform thresholds to ensure account longevity and organic discoverability.</p>
        `,
      },
      {
        slug: 'youtube-algorithm-watch-time-optimization-guide',
        title: 'Cracking the YouTube Algorithm: Maximizing Watch Time and Views',
        excerpt: 'Learn how YouTube evaluates Click-Through Rate (CTR) and Average Percentage Viewed (APV) to suggest your videos to millions of organic viewers.',
        category: 'YouTube',
        tags: 'YouTube,WatchTime,Monetization,Views,SEO',
        read_time: '8 min read',
        seo_title: 'How to Optimize YouTube Watch Time & Views | Intopsmm Guide',
        seo_description: 'Understand YouTube APV, CTR optimization, and watch time milestones needed to achieve 4000 watch hours and channel monetization.',
        content: `
<h2>1. Why Watch Time is the Supreme YouTube Ranking Factor</h2>
<p>YouTube's primary objective is session duration: keeping viewers on the platform. The algorithm evaluates every video based on Click-Through Rate (CTR) and Average Percentage Viewed (APV). Videos that sustain viewer retention beyond 60% are actively pushed to Suggested Videos and the Home Browse features.</p>

<h2>2. Hitting the 4,000 Watch Hours Milestone</h2>
<p>Qualifying for the YouTube Partner Program requires 1,000 subscribers and 4,000 valid public watch hours within 12 months. For emerging creators, hitting this threshold purely organically can take over a year. Leveraging trusted <a href="/services/youtube">YouTube watch hours and subscriber services</a> provides a stable jump-start to achieve monetization fast and legally.</p>

<h2>3. Thumbnail and Title Synergy</h2>
<p>High CTR starts with curiosity and clarity. Pair your title with emotional or unexpected thumbnail imagery to drive higher initial impressions.</p>
        `,
      },
      {
        slug: 'telegram-channel-growth-and-monetization-strategies',
        title: 'Telegram Channel Marketing: Scale Subscribers & High-Retention Views',
        excerpt: 'A comprehensive handbook on building high-conversion Telegram channels, automated broadcasting, and boosting post impressions.',
        category: 'Telegram',
        tags: 'Telegram,Channels,Subscribers,Marketing',
        read_time: '6 min read',
        seo_title: 'Telegram Channel Growth & Marketing Guide | Intopsmm',
        seo_description: 'Actionable techniques to grow Telegram channel members, increase multiple-post views, and build lucrative broadcast communities.',
        content: `
<h2>1. Why Telegram is the Future of Direct Community Engagement</h2>
<p>Telegram channels offer unprecedented 100% organic message delivery without algorithmic suppression. Unlike traditional social media feeds where only 5-10% of your audience sees your updates, every Telegram subscriber receives a direct push notification.</p>

<h2>2. Scaling Initial Channel Credibility</h2>
<p>New members evaluate channel authority within seconds based on member count and per-post view ratios. Combining organic cross-promotions with dedicated <a href="/services/telegram">Telegram member and view boosts</a> ensures your channel projects the authority needed for high conversion rates.</p>

<h2>3. Content Scheduling & Retention</h2>
<p>Maintain consistent 2-3 daily value posts, pin critical announcements, and run interactive polls to keep members actively engaged.</p>
        `,
      },
      {
        slug: 'what-is-an-smm-panel-and-how-does-it-work',
        title: 'What is an SMM Panel? The Beginner’s Guide to Social Media Automation',
        excerpt: 'Everything you need to know about Social Media Marketing (SMM) panels, API integrations, order tracking, and provider markups.',
        category: 'Guide',
        tags: 'SMM,Automation,API,BeginnerGuide',
        read_time: '5 min read',
        seo_title: 'What is an SMM Panel & How Does it Work? | Complete Guide',
        seo_description: 'Learn how SMM panels automate social growth, connect to supplier APIs, and provide cost-effective social media marketing services in INR.',
        content: `
<h2>1. Defining Social Media Marketing (SMM) Panels</h2>
<p>An SMM (Social Media Marketing) panel is an automated web platform that allows individuals, marketing agencies, and social media managers to purchase social engagement services—such as followers, likes, comments, watch time, and impressions—at wholesale rates.</p>

<h2>2. How the Technology Works</h2>
<p>Modern panels like <a href="/">Intopsmm</a> interface directly with high-performance provider APIs. When an order is placed, it is automatically validated, transmitted, and tracked in real-time through the provider network without manual delays.</p>

<h2>3. Choosing a Safe and Reliable Panel</h2>
<ul>
  <li>Transparent pricing with instant INR wallet deposit (UPI QR support).</li>
  <li>Automated order status syncing and auto-refund mechanisms.</li>
  <li>Active 24/7 customer support via WhatsApp and ticketing.</li>
</ul>
        `,
      },
      {
        slug: 'tiktok-viral-growth-and-engagement-strategies',
        title: 'TikTok Virality Blueprint: How to Optimize Views, Shares & Watch Time',
        excerpt: 'Crack the TikTok For You Page (FYP) algorithm with strategic watch time optimization, trending audio adoption, and social proof.',
        category: 'TikTok',
        tags: 'TikTok,FYP,Viral,Views,Likes',
        read_time: '6 min read',
        seo_title: 'TikTok Virality & Engagement Guide 2026 | Intopsmm',
        seo_description: 'Proven strategies to crack the TikTok algorithm, boost completion rates, and use SMM engagement signals to reach the FYP.',
        content: `
<h2>1. The Anatomy of the TikTok FYP Algorithm</h2>
<p>The TikTok algorithm evaluates completion rate first and foremost. If 70% of viewers watch your video from start to finish, the system automatically distributes your content to a wider tier of viewers on the For You page.</p>

<h2>2. Accelerating Discovery with Social Proof</h2>
<p>Kickstarting fresh uploads with targeted <a href="/services/tiktok">TikTok video views and shares</a> alerts the recommendation algorithm that the content is generating immediate traction, boosting its organic reach.</p>
        `,
      },
    ];

    for (const a of articles) {
      const request = pool.request();
      request.input('slug', sql.NVarChar, a.slug);
      request.input('title', sql.NVarChar, a.title);
      request.input('excerpt', sql.NVarChar, a.excerpt);
      request.input('content', sql.NVarChar, a.content.trim());
      request.input('category', sql.NVarChar, a.category);
      request.input('tags', sql.NVarChar, a.tags);
      request.input('read_time', sql.NVarChar, a.read_time);
      request.input('seo_title', sql.NVarChar, a.seo_title);
      request.input('seo_description', sql.NVarChar, a.seo_description);

      await request.query(`
        INSERT INTO blog_posts (slug, title, excerpt, content, category, tags, read_time, seo_title, seo_description, is_published)
        VALUES (@slug, @title, @excerpt, @content, @category, @tags, @read_time, @seo_title, @seo_description, 1)
      `);
      console.log(`Seeded article: ${a.title}`);
    }
    console.log('✅ 5 Pillar articles seeded successfully!');
  } else {
    console.log(`Found ${countRes.recordset[0].count} existing blog posts.`);
  }

  await pool.close();
  console.log('✅ Blog migration finished successfully!');
}

main().catch((err) => {
  console.error('❌ Blog migration failed:', err.message);
  process.exit(1);
});
