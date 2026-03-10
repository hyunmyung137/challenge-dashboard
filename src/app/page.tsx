import Link from "next/link";
import ScrollRevealInit from "@/components/ScrollRevealInit";

export const metadata = {
  title: "꺼드럭 — 그렇게 잘 맞추면 왜 안 까?",
  description:
    "Binance, OKX, Bybit, Upbit, Bithumb 거래소 포트폴리오를 하나로. 검증된 포트폴리오 공개 링크.",
};

const TICKER_ITEMS = [
  "꺼드럭댈거면 포지션부터 까라",
  "•",
  "PNL이 진짜 알파다",
  "•",
  "노인증 노믿음",
  "•",
];

const FEATURES = [
  {
    icon: "📊",
    title: "Real-time Portfolio",
    desc: "모든 거래소의 포트폴리오를 한 화면에서 확인할 수 있습니다.",
  },
  {
    icon: "🔗",
    title: "Public Link",
    desc: "커스텀 포트폴리오 링크가 게시됩니다.",
  },
  {
    icon: "📈",
    title: "PnL History",
    desc: "전체 매매 내역과 포트폴리오 성과 차트를 제공합니다. 수익도 손실도 전부 공개됩니다.",
  },
  {
    icon: "📢",
    title: "Staked?",
    desc: "채널에 특정 티커를 언급하면 보유 여부를 자동으로 안내합니다.",
    comingSoon: true,
  },
];

const STEPS = [
  {
    num: "01",
    title: "거래소 연결",
    desc: "Binance, OKX, Bybit, Upbit, Bithumb에서 읽기 전용 API 키를 추가하세요. 출금 권한은 절대 사용하지 않습니다 — 읽기 전용만 요구합니다.",
  },
  {
    num: "02",
    title: "공개 링크 받기",
    desc: (
      <>
        검증된 포트폴리오가{" "}
        <strong style={{ color: "var(--white)" }}>kkeo.dk/@닉네임</strong>에 실시간으로 게시됩니다.
        편집 불가. 포지션 숨기기 불가. 있는 그대로입니다.
      </>
    ),
  },
  {
    num: "03",
    title: "콜 태그하기",
    desc: "알파 콜을 올릴 때 태그하시면, 그 시점의 거래소 포지션이 자동 검증됩니다. 확신 점수가 실시간으로 반영됩니다.",
  },
];

const SECURITY = [
  {
    title: "01 — 키 입력",
    desc: "지원 거래소의 읽기 전용 API 키와 본인만 아는 암호화 비밀번호를 입력합니다. 출금 권한은 절대 요구하지 않습니다.",
  },
  {
    title: "02 — 브라우저에서 암호화",
    desc: "키는 기기를 떠나기 전에 AES-256-GCM으로 로컬 암호화됩니다. 서버에는 암호화된 덩어리만 저장되며, 비밀번호는 브라우저 밖으로 나가지 않습니다.",
  },
  {
    title: "03 — 우리도 못 봄",
    desc: "DB에는 이중 암호화 데이터만 저장됩니다. 비밀번호 없이는 키 복구가 불가능합니다 — 설계부터 그렇습니다. 스키마 격리, 행 수준 보안, 전체 감사 로깅을 적용하고 있습니다.",
  },
];

const ALLOCATIONS = [
  { name: "BTC", color: "#c8ff00", pct: 58 },
  { name: "ETH", color: "#888", pct: 24 },
  { name: "Others", color: "#444", pct: 18 },
];

const EXCHANGE_CELLS = [
  { name: "Binance", val: "$2.1M" },
  { name: "Bybit", val: "$1.4M" },
  { name: "OKX", val: "$490K" },
  { name: "On-chain", val: "$228K" },
];

export default function LandingPage() {
  return (
    <div style={{ cursor: "crosshair" }}>
      <ScrollRevealInit />

      {/* ─── TICKER ─── */}
      <div className="ticker">
        <div className="ticker-track">
          {/* Duplicate for seamless loop */}
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i}>{item}</span>
          ))}
        </div>
      </div>

      {/* ─── NAV ─── */}
      <nav className="landing-nav">

        <Link href="/" className="logo">
          꺼드<em>럭</em>
        </Link>
        <ul
          style={{
            listStyle: "none",
            display: "flex",
            gap: "2rem",
            alignItems: "center",
          }}
        >
          <li className="hidden-mobile">
            <Link
              href="#features"
              style={{
                fontSize: ".85rem",
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "var(--muted)",
                textDecoration: "none",
              }}
            >
              기능
            </Link>
          </li>
          <li className="hidden-mobile">
            <Link
              href="#how-it-works"
              style={{
                fontSize: ".85rem",
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "var(--muted)",
                textDecoration: "none",
              }}
            >
              사용법
            </Link>
          </li>
          <li className="hidden-mobile">
            <Link
              href="#security"
              style={{
                fontSize: ".85rem",
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "var(--muted)",
                textDecoration: "none",
              }}
            >
              보안
            </Link>
          </li>
          <li>
            <Link href="/login" className="nav-pill">
              로그인 →
            </Link>
          </li>
        </ul>
      </nav>

      {/* ─── HERO ─── */}
      <section className="hero">
        <div>
          <h1 className="hero-head">
            <span className="l1 glitch">했제</span>{" "}
            <span className="l2">그만하고</span>
          </h1>

          <p
            className="font-display"
            style={{
              fontSize: "clamp(1.8rem, 3.2vw, 2.8rem)",
              color: "var(--white)",
              letterSpacing: ".04em",
              marginBottom: "1rem",
              lineHeight: 1,
            }}
          >
            포트폴리오 까고 꺼드럭대.
          </p>

          <div className="hero-actions">
            <Link
              href="/login"
              className="btn-acid"
              style={{ fontSize: "1.15rem", padding: "1.1rem 3rem" }}
            >
              시작하기 →
            </Link>
          </div>

          <div className="exchanges" style={{ gap: "1rem", alignItems: "center" }}>
            <span className="exch-label">지원 거래소:</span>
            {["Binance", "OKX", "Bybit", "Upbit", "Bithumb"].map((name) => (
              <span key={name} className="exch-name">{name}</span>
            ))}
          </div>
        </div>

        {/* LIVE CARD */}
        <div className="hero-card reveal">
          <div className="card-header">
            <div className="card-header-title">kkeo.dk/@cobie</div>
            <div className="live-dot">LIVE</div>
          </div>
          <div className="card-body">
            <div className="portfolio-total">$4,218,340</div>
            <div className="portfolio-pnl">↑ +$312,490 (8.0%) 이번 달</div>

            {ALLOCATIONS.map((a) => (
              <div key={a.name} className="alloc-row">
                <div className="alloc-name">
                  <div className="alloc-dot" style={{ background: a.color }} />
                  {a.name}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
                  <div className="alloc-bar-wrap">
                    <div
                      className="alloc-bar"
                      style={{ width: `${a.pct}%`, background: a.color }}
                    />
                  </div>
                  <div className="alloc-val">{a.pct}%</div>
                </div>
              </div>
            ))}
          </div>
          <div className="exchange-grid">
            {EXCHANGE_CELLS.map((e) => (
              <div key={e.name} className="exch-cell">
                <div className="exch-cell-name">{e.name}</div>
                <div className="exch-cell-val">{e.val}</div>
              </div>
            ))}
          </div>
          <div className="card-footer-line">
            🔒 읽기 전용 API · 제로 지식 암호화 · 12초 전 동기화
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* ─── FEATURES ─── */}
      <section
        id="features"
        className="landing-section"
      >
        <div className="section-tag reveal">// 기능</div>
        <div className="section-title reveal">
          투명한
          <br />
          <em>포트폴리오 공개</em>
        </div>

        <div className="feat-grid reveal">
          {FEATURES.map((f) => (
            <div key={f.title} className="feat">
              <div className="feat-icon">{f.icon}</div>
              <h3>
                {f.title}
                {f.comingSoon && (
                  <span style={{ fontSize: ".6em", color: "var(--acid)", background: "rgba(205,255,0,.1)", padding: ".15em .5em", borderRadius: "4px", marginLeft: ".6em", fontWeight: 500, letterSpacing: ".08em" }}>
                    COMING SOON
                  </span>
                )}
              </h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* ─── HOW IT WORKS ─── */}
      <section className="how-section" id="how-it-works">
        <div className="how-inner">
          <div className="section-tag reveal">// 사용법</div>
          <div className="section-title reveal">말 말고 인증.</div>

          <div className="steps reveal">
            {STEPS.map((s) => (
              <div key={s.num} className="step">
                <div className="step-ghost">{s.num}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECURITY ─── */}
      <section
        id="security"
        className="landing-section"
      >
        <div className="section-tag reveal">// 보안</div>
        <div className="section-title reveal">
          ZKP,
          <br />
          <em>주인장도 모름</em>
        </div>

        <div className="sec-grid reveal">
          {SECURITY.map((s) => (
            <div key={s.title} className="sec-item">
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="sec-badge reveal">
          🔒 <strong style={{ color: "var(--profit)" }}>읽기 전용</strong> API만
          사용해주세요
        </div>
      </section>

      {/* ─── CTA ─── */}
      <div className="divider" />
      <div className="cta-wrap">
        <h2 className="reveal">
          포트폴리오 공개는
          <span className="acid-line">꺼드럭에서</span>
        </h2>
        <p className="reveal">
          실력으로 승부보세요.
        </p>
        <div className="cta-btns reveal">
          <Link href="/login" className="btn-acid">
            시작하기 →
          </Link>
          <Link href="#features" className="btn-ghost">
            기능 보기
          </Link>
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <footer className="landing-footer">
        <div className="logo" style={{ fontSize: "1.3rem" }}>
          꺼드<em>럭</em>
        </div>
        <div>문의 TG <a href="https://t.me/wiseq137" target="_blank" rel="noopener noreferrer" style={{ color: "var(--acid)" }}>@wiseq137</a></div>
        <div style={{ color: "#555" }}>© 2025 꺼드럭. DYOR.</div>
      </footer>
    </div>
  );
}
