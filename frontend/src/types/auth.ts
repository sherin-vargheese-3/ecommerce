export type Role = 'CUSTOMER' | 'ADMIN'

export interface User {
  id: number
  email: string
  name: string
  role: Role
}

export interface AuthResponse {
  token: string
  user: User
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest extends LoginRequest {
  name: string
}
