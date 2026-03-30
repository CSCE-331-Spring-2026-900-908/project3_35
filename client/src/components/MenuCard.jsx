export default function MenuCard({ item, onCustomize, labels }) {
  return (
    <article className="menu-card">
      <div className="menu-card__eyebrow">{item.displayCategory || item.category}</div>
      <h3>{item.displayName || item.name}</h3>
      <p>{item.displayDescription || item.description}</p>
      <div className="menu-card__footer">
        <span className="price">${item.basePrice.toFixed(2)}</span>
        <button type="button" className="button button--primary" onClick={() => onCustomize(item)}>
          {labels.customize}
        </button>
      </div>
    </article>
  );
}