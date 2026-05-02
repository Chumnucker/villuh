export type Quota = {
  count: number
  limit: number
}

export type Me = {
  user: {
    id: string
    name: string
    email: string
    image: string | null
  }
  org: {
    id: string
    name: string
    slug: string | null
    subscription_tier: string
    subscription_status: string
    setup_completed: boolean
    permissions: {
      write: boolean
      financial: boolean
      communications: boolean
      admin: boolean
    }
    quota: {
      units: Quota
      properties: Quota
      members: Quota
    }
  }
}
