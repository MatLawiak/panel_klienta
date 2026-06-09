/**
 * Dekoracyjne tło TwistedPixel — obrócone kwadraty (sygnet marki).
 * Fresh Peach + Crazy Orange z niską przezroczystością, częściowo poza viewportem.
 * Renderowane pod treścią (z-index 0); treść strony powinna mieć position+zIndex.
 */
export function BrandBackground() {
  const shapes: React.CSSProperties[] = [
    { top: "-90px",  left: "-70px",  width: "260px", height: "260px", background: "rgba(246,176,144,0.20)" },
    { top: "12%",    right: "-110px", width: "320px", height: "320px", background: "rgba(235,93,28,0.06)" },
    { bottom: "-120px", left: "8%",  width: "300px", height: "300px", background: "rgba(246,176,144,0.16)" },
    { bottom: "6%",  right: "12%",   width: "120px", height: "120px", background: "rgba(249,224,100,0.18)" },
    { top: "44%",    left: "-60px",  width: "150px", height: "150px", background: "rgba(235,93,28,0.05)" },
  ]
  return (
    <div className="tp-decor" aria-hidden="true">
      {shapes.map((s, i) => <span key={i} style={s} />)}
    </div>
  )
}
