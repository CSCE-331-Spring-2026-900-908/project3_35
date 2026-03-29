export default function MenuCard({ item, onCustomize }) {
  return (
    <article className="menu-card">
      <div className="menu-card__eyebrow">{item.category}</div>
      <h3>{item.name}</h3>
      <p>{item.description}</p>
      <div className="menu-card__footer">
        <span className="price">${item.basePrice.toFixed(2)}</span>
        <button type="button" className="button button--primary" onClick={() => onCustomize(item)}>
          Customize
        </button>
      </div>
    </article>
  );
}
