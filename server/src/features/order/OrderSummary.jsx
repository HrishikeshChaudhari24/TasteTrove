import { formatCurrency } from '../../utils/helpers';

function OrderSummary({ cart }) {
  if (!cart || cart.length === 0) return null;

  // Calculate subtotal
  const subtotal = cart.reduce((sum, item) => sum + item.totalAmount, 0);

  return (
    <div className="order-summary-sidebar">
      <h3 className="order-summary-title">Order Summary</h3>
      
      <div className="order-summary-items">
        {cart.map((item) => (
          <div key={item._id} className="order-summary-item">
            <div className="order-item-details">
              <span className="order-item-name">{item.name}</span>
              <span className="order-item-quantity">x{item.cartQuantity}</span>
            </div>
            <span className="order-item-price">
              {formatCurrency(item.totalAmount)}
            </span>
          </div>
        ))}
      </div>

      <div className="order-summary-divider"></div>

      <div className="order-summary-total">
        <span className="order-total-label">Subtotal</span>
        <span className="order-total-amount">
          {formatCurrency(subtotal)}
        </span>
      </div>
    </div>
  );
}

export default OrderSummary;
