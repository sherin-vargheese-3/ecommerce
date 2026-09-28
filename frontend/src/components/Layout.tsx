import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { useCart } from '../cart/useCart'
import { ErrorBoundary } from './ErrorBoundary'

export function Layout() {
  const { user, logout } = useAuth()
  const { cart } = useCart()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">Shop</Link>
        <nav>
          <NavLink to="/" end>Products</NavLink>
          {user?.role === 'CUSTOMER' && <NavLink to="/orders">Orders</NavLink>}
          {user?.role === 'ADMIN' && (
            <>
              <NavLink to="/admin" end>Dashboard</NavLink>
              <NavLink to="/admin/products">Manage products</NavLink>
              <NavLink to="/admin/orders">Manage orders</NavLink>
            </>
          )}
        </nav>
        <div className="account">
          {user?.role !== 'ADMIN' && (
            <NavLink to="/cart" className="cart-link">
              Cart{cart && cart.itemCount > 0 && <span className="cart-count" aria-label={`${cart.itemCount} items`}>{cart.itemCount}</span>}
            </NavLink>
          )}
          {user ? (
            <>
              <span className="muted">{user.name}</span>
              <button type="button" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <>
              <NavLink to="/login">Log in</NavLink>
              <NavLink to="/register">Register</NavLink>
            </>
          )}
        </div>
      </header>
      <main className="container">
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </>
  )
}
