import Link from "next/link";

const CARDS = [
  {
    icon: "🤖",
    title: "ИИ",
    subtitle: "Игра против машины",
    bullets: ["5 уровней сложности", "От новичка до гроссмейстера", "Безопасно для разминки и обучения"],
    cta: "ВЫБРАТЬ УРОВЕНЬ",
    href: "/play/bot",
    id: "ai",
  },
  {
    icon: "👥",
    title: "С ДРУГОМ",
    subtitle: "Приватная комната по ссылке",
    bullets: ["Создай комнату одним кликом", "Поделись ссылкой с другом", "Идеально для разборок"],
    cta: "СОЗДАТЬ КОМНАТУ",
    href: "/play/friend",
    id: "friend",
  },
] as const;

export default function PlayHubPage() {
  return (
    <>
      <style>{`
        .play-card {
          display: flex;
          flex-direction: column;
          background: #1C2333;
          border: 1.5px solid #C9A84C;
          border-radius: 8px;
          padding: 36px 28px;
          min-height: 400px;
          box-shadow: 0 0 32px rgba(201,168,76,0.15), 0 4px 16px rgba(0,0,0,0.3);
          transition: all 0.3s ease;
          text-decoration: none;
        }
        .play-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 0 48px rgba(201,168,76,0.25), 0 8px 24px rgba(0,0,0,0.4);
          border-color: #D4B268;
        }
        .play-card-btn {
          width: 100%;
          padding: 14px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          background: linear-gradient(135deg, #C9A84C, #8B6914);
          color: #0B0F1A;
          font-family: inherit;
          font-weight: 600;
          font-size: 0.9rem;
          letter-spacing: 0.08em;
          box-shadow: 0 0 24px rgba(201,168,76,0.25);
          transition: opacity 0.2s ease;
        }
        .play-card-btn:hover {
          opacity: 0.9;
        }
      `}</style>

      <div style={{ background: "#0B0F1A", minHeight: "100vh" }}>
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            padding: "80px 16px 64px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Header */}
          <p
            style={{
              fontFamily: "var(--font-cinzel, 'Cinzel', serif)",
              fontSize: "0.75rem",
              letterSpacing: "0.2em",
              color: "#C9A84C",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            АРЕНА
          </p>

          <h1
            style={{
              fontFamily: "var(--font-cinzel, 'Cinzel', serif)",
              fontWeight: 700,
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              color: "#EDE8DA",
              textAlign: "center",
              marginBottom: 16,
              lineHeight: 1.15,
            }}
          >
            Выбери режим битвы
          </h1>

          <p
            style={{
              fontFamily: "'Crimson Text', 'Georgia', serif",
              fontStyle: "italic",
              fontSize: "1.1rem",
              color: "#B8B8C8",
              textAlign: "center",
              marginBottom: 64,
            }}
          >
            Сразись с машиной или вызови друга на дуэль
          </p>

          {/* Cards grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 32,
              width: "100%",
              alignItems: "stretch",
            }}
          >
            {CARDS.map((card) => (
              <Link key={card.id} href={card.href} className="play-card">
                {/* Icon */}
                <div
                  style={{
                    fontSize: "3.5rem",
                    textAlign: "center",
                    marginBottom: 16,
                    textShadow: "0 0 24px rgba(201,168,76,0.5)",
                  }}
                >
                  {card.icon}
                </div>

                {/* Title */}
                <h2
                  style={{
                    fontFamily: "var(--font-cinzel, 'Cinzel', serif)",
                    fontWeight: 700,
                    fontSize: "1.75rem",
                    color: "#C9A84C",
                    letterSpacing: "0.1em",
                    textAlign: "center",
                    marginBottom: 8,
                  }}
                >
                  {card.title}
                </h2>

                {/* Subtitle */}
                <p
                  style={{
                    fontWeight: 400,
                    fontSize: "0.95rem",
                    color: "#B8B8C8",
                    textAlign: "center",
                    marginBottom: 20,
                  }}
                >
                  {card.subtitle}
                </p>

                {/* Divider */}
                <div
                  style={{
                    width: 40,
                    height: 1,
                    background: "#C9A84C",
                    opacity: 0.2,
                    margin: "0 auto 20px",
                  }}
                />

                {/* Bullets */}
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "0 0 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {card.bullets.map((b) => (
                    <li
                      key={b}
                      style={{
                        fontSize: "0.875rem",
                        color: "#B8B8C8",
                        lineHeight: 1.6,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span style={{ color: "#C9A84C", flexShrink: 0 }}>·</span>
                      {b}
                    </li>
                  ))}
                </ul>

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* CTA button */}
                <div className="play-card-btn" style={{ textAlign: "center" }}>
                  {card.cta}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
