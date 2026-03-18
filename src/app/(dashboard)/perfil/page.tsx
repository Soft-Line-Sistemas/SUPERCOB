import { getMyProfile } from './actions'
import { Profile } from './profile'

export default async function PerfilPage() {
  const me = await getMyProfile()
  return <Profile me={me as any} />
}

