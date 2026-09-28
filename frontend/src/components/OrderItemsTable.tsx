import type { Order } from '../types/order'
import { formatPrice } from '../utils/format'

/** Order lines as purchased: names and prices are the values captured at checkout. */
export function OrderItemsTable({ order }: { order: Order }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th className="num">Price</th>
            <th className="num">Qty</th>
            <th className="num">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.productId}>
              <td>{item.productName}</td>
              <td className="num">{formatPrice(item.unitPrice)}</td>
              <td className="num">{item.quantity}</td>
              <td className="num">{formatPrice(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th colSpan={3}>Total</th>
            <th className="num">{formatPrice(order.total)}</th>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
