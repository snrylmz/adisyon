export type Role = 'admin' | 'waiter' | 'cashier'

export type Profile = {
  id: string
  name: string
  role: Role
  pin: string
  active: boolean
  created_at: string
}

export type Category = {
  id: string
  name: string
  sort_order: number
  created_at: string
}

export type Product = {
  id: string
  category_id: string | null
  name: string
  price: number
  active: boolean
  sort_order: number
  created_at: string
}

export type Table = {
  id: string
  name: string
  sort_order: number
  created_at: string
}

export type OrderStatus = 'open' | 'closed' | 'cancelled'

export type Order = {
  id: string
  table_id: string
  status: OrderStatus
  opened_at: string
  closed_at: string | null
  opened_by: string | null
  closed_by: string | null
  total: number
}

export type OrderItem = {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  unit_price: number
  quantity: number
  note: string | null
  created_at: string
  created_by: string | null
}

export type TableWithOrder = Table & {
  open_order: (Order & { items_count: number }) | null
}

export type SessionUser = {
  id: string
  name: string
  role: Role
}
