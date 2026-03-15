import type { Tables, Enums } from './database.types'

export type User = Tables<'users'>
export type ExpertProfile = Tables<'expert_profiles'>
export type Category = Tables<'categories'>
export type Request = Tables<'requests'>
export type Match = Tables<'matches'>
export type ExpertCategory = Tables<'expert_categories'>

export type UserRole = Enums<'user_role'>
export type RequestStatus = Enums<'request_status'>
export type MatchStatus = Enums<'match_status'>
