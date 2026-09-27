import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './AboutPage.module.css';

export const metadata: Metadata = {
  title: 'Về EchoChunk - Phương Pháp Luyện Nói Tiếng Anh Theo Cụm (Speaking Chunks)',
  description:
    'Tìm hiểu phương pháp học tiếng Anh đột phá của EchoChunk: Lexical Approach, Speaking Chunks, Voice Shadowing AI và Spaced Repetition giúp bạn tự tin giao tiếp trôi chảy.',
  alternates: {
    canonical: '/gioi-thieu',
  },
  openGraph: {
    title: 'Về EchoChunk - Phương Pháp Luyện Nói Tiếng Anh Theo Cụm Đột Phá',
    description:
      'Chấm dứt thói quen dịch nhẩm từng từ. Luyện phản xạ nói tiếng Anh tự nhiên trong 5 giây cùng EchoChunk.',
    url: '/gioi-thieu',
    images: [
      {
        url: '/demo-shadowing.png',
        width: 1200,
        height: 630,
        alt: 'EchoChunk Fluency Engine Overview',
      },
    ],
  },
};

const FAQ_LIST = [
  {
    q: 'Speaking Chunk là gì và tại sao lại hiệu quả hơn học từ vựng đơn lẻ?',
    a: 'Speaking Chunk (cụm từ cố định trong văn nói) là các tổ hợp từ vựng thường xuyên xuất hiện cùng nhau theo thói quen của người bản xứ (Collocations, Idioms, Phrasal Verbs). Khi học theo cụm, não bộ lưu trữ nguyên cả khối câu hoàn chỉnh, giúp bạn phản xạ nói ngay tức khắc mà không cần suy nghĩ ngữ pháp hay dịch từng từ từ tiếng Việt sang tiếng Anh.',
  },
  {
    q: 'Phương pháp Shadowing tại EchoChunk có gì khác biệt?',
    a: 'EchoChunk cung cấp hệ thống audio phát âm chuẩn General American kết hợp phiên âm IPA chi tiết cho từng từ và cả câu. Người học vừa nghe vừa nhại lại đồng thời (Shadowing), giúp tai quen với hiện tượng nối âm, nuốt âm và uốn nắn khẩu hình chuẩn xác.',
  },
  {
    q: 'Thuật toán Spaced Repetition (SRS) trên EchoChunk hoạt động thế nào?',
    a: 'Dựa trên Đường cong quên lãng (Ebbinghaus Forgetting Curve), hệ thống sẽ theo dõi độ thành thạo của bạn đối với từng chunk. Cụm từ bạn đánh giá "Cần ôn" sẽ được lặp lại sau vài giờ, trong khi cụm từ "Đã nhớ" sẽ giãn cách ôn tập sau vài ngày hoặc vài tuần, tối ưu hóa 100% thời gian học tập.',
  },
  {
    q: 'Ứng dụng có hoàn toàn miễn phí không?',
    a: 'EchoChunk được xây dựng với mục tiêu giúp cộng đồng người học tiếng Anh tại Việt Nam tiếp cận phương pháp học khoa học và thực chiến nhất. Mọi tính năng cốt lõi (Shadowing, Phản xạ 5s, Điền từ, Kho 500+ Chunks) đều hoàn toàn miễn phí.',
  },
  {
    q: 'Dữ liệu học tập của tôi có được lưu lại khi chuyển thiết bị không?',
    a: 'Có. Khi bạn đăng nhập bằng tài khoản Google, toàn bộ tiến độ học tập (Streak, tiến độ ghi nhớ từng chunk, dữ liệu tùy chỉnh) sẽ được đồng bộ tự động lên đám mây thời gian thực, đồng thời lưu trữ offline tại trình duyệt để bạn học tập liên tục mọi lúc mọi nơi.',
  },
];

const TOPICS = [
  { icon: '💼', name: 'Interviews & Client Communication', vi: 'Phỏng vấn & Giao tiếp khách hàng', count: 38 },
  { icon: '🏢', name: 'Work & Business', vi: 'Tiếng Anh công sở & Đàm phán', count: 58 },
  { icon: '☕', name: 'Daily Life & Socializing', vi: 'Giao tiếp hàng ngày & Kết nối bạn bè', count: 34 },
  { icon: '✈️', name: 'Travel & Transport', vi: 'Du lịch & Di chuyển quốc tế', count: 31 },
  { icon: '💻', name: 'Science & Technology', vi: 'Công nghệ thông tin & Khoa học', count: 55 },
  { icon: '🥗', name: 'Food, Dining & Cafe', vi: 'Ẩm thực, Nhà hàng & Gọi món', count: 28 },
  { icon: '🏥', name: 'Health & Lifestyle', vi: 'Sức khỏe & Lối sống lành mạnh', count: 36 },
  { icon: '🗣️', name: 'Communication & Opinions', vi: 'Tranh luận & Trình bày quan điểm', count: 30 },
  { icon: '🛍️', name: 'Money & Shopping', vi: 'Tài chính & Mua sắm thông minh', count: 6 },
  { icon: '⛅', name: 'Weather & Climate', vi: 'Thời tiết, Khí hậu & Thiên nhiên', count: 26 },
  { icon: '👥', name: 'People & Society', vi: 'Con người, Xã hội & Đời sống', count: 12 },
  { icon: '🌿', name: 'Environment & Nature', vi: 'Môi trường & Hệ sinh thái', count: 7 },
];

export default function AboutPage() {
  const jsonLdFaq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_LIST.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  const jsonLdAbout = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'Về EchoChunk - Nền Tảng Luyện Nói Tiếng Anh Theo Cụm',
    description:
      'Học nói tiếng Anh giao tiếp phản xạ tự nhiên theo phương pháp Lexical Approach, Speaking Chunks, Voice Shadowing và Spaced Repetition.',
    url: 'https://speaking-english.taiphanvan.id.vn/gioi-thieu',
  };

  return (
    <div className={styles.container}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdAbout) }}
      />

      {/* Hero Section */}
      <header className={styles.hero}>
        <div className={styles.badge}>
          <span>🚀</span>
          <span>Phương pháp tiếp cận từ vựng hiện đại (Lexical Approach)</span>
        </div>
        <h1 className={styles.heroTitle}>
          Nói Tiếng Anh Trôi Chảy Tự Nhiên Bằng Cụm Từ Định Hình Sẵn
        </h1>
        <p className={styles.heroSubtitle}>
          EchoChunk ra đời để giúp bạn xóa bỏ vĩnh viễn thói quen ghép từng từ vựng và dịch nhẩm ngữ pháp trong đầu.
          Tập trung vào <strong>Speaking Chunks</strong> — những khối ngôn ngữ bản xứ tự nhiên nhất giúp bạn phản xạ trôi chảy chỉ sau 5 giây.
        </p>
        <div className={styles.ctaGroup}>
          <Link href="/luyen-noi" className={styles.btnPrimary}>
            <span>Bắt đầu luyện nói ngay</span>
            <span>→</span>
          </Link>
          <Link href="/kho-tu-vung" className={styles.btnSecondary}>
            <span>Khám phá 500+ Chunks</span>
          </Link>
        </div>
      </header>

      {/* Comparison Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Sự Khác Biệt Giữa Học Từ Đơn Lẻ Và Học Theo Cụm</h2>
          <p className={styles.sectionDesc}>
            Tại sao học tiếng Anh nhiều năm vẫn ấp úng khi giao tiếp thực tế? Bí quyết nằm ở cách não bộ lưu trữ dữ liệu.
          </p>
        </div>

        <div className={styles.comparisonGrid}>
          <div className={styles.comparisonCardBad}>
            <div className={styles.cardHeader} style={{ color: 'var(--notion-red-text)' }}>
              <span>❌</span>
              <span>Cách học truyền thống (Word-by-word)</span>
            </div>
            <ul className={styles.comparisonList}>
              <li>
                <span>•</span>
                <span>Học từ vựng đơn lẻ rời rạc (Ví dụ: &quot;experience&quot; = kinh nghiệm).</span>
              </li>
              <li>
                <span>•</span>
                <span>Khi nói phải trải qua 3 bước: Chọn từ → Nhớ thì ngữ pháp → Dịch từ tiếng Việt.</span>
              </li>
              <li>
                <span>•</span>
                <span>Dễ mắc lỗi Collocation ngô nghê, dịch word-by-word khiến người bản ngữ khó hiểu.</span>
              </li>
              <li>
                <span>•</span>
                <span>Tốc độ nói bị ngắt quãng, thiếu tự nhiên và thiếu tự tin.</span>
              </li>
            </ul>
          </div>

          <div className={styles.comparisonCardGood}>
            <div className={styles.cardHeader} style={{ color: 'var(--notion-green-text)' }}>
              <span>✅</span>
              <span>Phương pháp EchoChunk (Speaking Chunks)</span>
            </div>
            <ul className={styles.comparisonList}>
              <li>
                <span>•</span>
                <span>Nạp nguyên khối cụm từ hoàn chỉnh (Ví dụ: &quot;hands-on experience with...&quot;).</span>
              </li>
              <li>
                <span>•</span>
                <span>Não bộ truy xuất trực tiếp cả câu tức thì, không tốn thời gian suy nghĩ công thức ngữ pháp.</span>
              </li>
              <li>
                <span>•</span>
                <span>Diễn đạt chuẩn văn phong bản ngữ, tự động nối âm và lên xuống ngữ điệu nhịp nhàng.</span>
              </li>
              <li>
                <span>•</span>
                <span>Phản xạ bật câu trong 5 giây, tự tin làm chủ mọi cuộc hội thoại công sở và phỏng vấn.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5 Core Pillars */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>5 Trụ Cột Tính Năng Đột Phá Trên EchoChunk</h2>
          <p className={styles.sectionDesc}>
            Sự kết hợp hoàn hảo giữa phương pháp ngôn ngữ học hiện đại và công nghệ cá nhân hóa việc học.
          </p>
        </div>

        <div className={styles.pillarGrid}>
          <div className={styles.pillarCard}>
            <div className={styles.pillarIcon}>🎙️</div>
            <h3 className={styles.pillarTitle}>Voice Shadowing & IPA Engine</h3>
            <p className={styles.pillarDesc}>
              Bắt chước ngữ điệu chuẩn Mỹ với hệ thống audio chất lượng cao và phiên âm IPA chuẩn xác cho từng âm tiết.
            </p>
          </div>

          <div className={styles.pillarCard}>
            <div className={styles.pillarIcon}>⚡</div>
            <h3 className={styles.pillarTitle}>5-Second Quick Reflex Drill</h3>
            <p className={styles.pillarDesc}>
              Đồng hồ đếm ngược 5 giây ép bộ não phản xạ bật câu tiếng Anh ngay tức thì, triệt tiêu thói quen dịch nhẩm.
            </p>
          </div>

          <div className={styles.pillarCard}>
            <div className={styles.pillarIcon}>🧩</div>
            <h3 className={styles.pillarTitle}>Contextual Gap-Filling</h3>
            <p className={styles.pillarDesc}>
              Thử thách điền từ vào chỗ trống trong các câu đàm thoại đời thực, củng cố ngữ cảnh sử dụng chuẩn xác.
            </p>
          </div>

          <div className={styles.pillarCard}>
            <div className={styles.pillarIcon}>🧠</div>
            <h3 className={styles.pillarTitle}>Spaced Repetition System (SRS)</h3>
            <p className={styles.pillarDesc}>
              Thuật toán lặp lại ngắt quãng tính toán chính xác chu kỳ quên để nhắc bạn ôn tập đúng thời điểm vàng.
            </p>
          </div>

          <div className={styles.pillarCard}>
            <div className={styles.pillarIcon}>🎬</div>
            <h3 className={styles.pillarTitle}>YouTube Karaoke Study Room</h3>
            <p className={styles.pillarDesc}>
              Luyện nghe và Shadowing trực tiếp từ các video YouTube truyền cảm hứng với phụ đề Karaoke song ngữ.
            </p>
          </div>
        </div>
      </section>

      {/* Topics Overview */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>12 Chủ Đề Speaking Chunks Thực Chiến</h2>
          <p className={styles.sectionDesc}>
            Kho dữ liệu hơn 500 cụm từ được tuyển chọn và phân loại theo nhu cầu giao tiếp thực tế của người đi làm và du học sinh.
          </p>
        </div>

        <div className={styles.topicGrid}>
          {TOPICS.map((topic, idx) => (
            <div key={idx} className={styles.topicCard}>
              <div className={styles.topicHeader}>
                <span style={{ fontSize: '20px' }}>{topic.icon}</span>
                <span>{topic.vi}</span>
              </div>
              <div className={styles.topicCount}>
                {topic.count} cụm từ thực chiến • {topic.name}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Câu Hỏi Thường Gặp (FAQ)</h2>
          <p className={styles.sectionDesc}>
            Những thắc mắc phổ biến nhất của người học khi bắt đầu với EchoChunk.
          </p>
        </div>

        <div className={styles.faqContainer}>
          {FAQ_LIST.map((item, idx) => (
            <details key={idx} className={styles.faqItem}>
              <summary className={styles.faqSummary}>
                <span>{item.q}</span>
                <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>+</span>
              </summary>
              <div className={styles.faqBody}>
                <p>{item.a}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Final Call to Action */}
      <div className={styles.finalBanner}>
        <h2 className={styles.bannerTitle}>Sẵn Sàng Nâng Tầm Phản Xạ Tiếng Anh?</h2>
        <p className={styles.bannerText}>
          Chỉ cần dành ra 15 phút mỗi ngày cùng EchoChunk để biến các cụm từ tiếng Anh thụ động thành phản xạ giao tiếp tự nhiên.
        </p>
        <Link href="/luyen-noi" className={styles.btnPrimary} style={{ fontSize: '16px', padding: '14px 32px' }}>
          <span>Bắt đầu học miễn phí ngay</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}
