'use client'

import { useEffect } from 'react'
import { subscribeToPush } from '@/lib/push-client'

/**
 * Login olmuş kullanıcının tabletinde SW kaydet + push'a subscribe ol.
 * İzin yoksa sessizce pas geçer; izin verildikten sonra PendingBell
 * tekrar deniyor.
 */
export default function PushInit() {
  useEffect(() => {
    subscribeToPush()
  }, [])
  return null
}
