import { useNavigate } from 'react-router-dom'
import { AuthForm, type AuthMode, type AuthValues } from '../../../components/organisms/auth-form/AuthForm'
import { requestPasswordReset } from '../../store/api'
import { AUTH_PATHS } from './authRoutes'
import { PageHeading } from './PageHeading'

/**
 * Forgot-password. AuthForm itself shows the neutral confirmation on success -- this page never
 * sees a result to act on, since `requestPasswordReset` never reveals whether the address
 * exists and never resolves with field errors.
 */
export function ResetPassword() {
  const navigate = useNavigate()

  const handleSubmit = async (values: AuthValues): Promise<void> => {
    await requestPasswordReset(values.email)
  }

  const handleModeChange = (mode: AuthMode) => navigate(AUTH_PATHS[mode])

  return (
    <div className="box-content max-w-md mx-auto px-gutter py-12 flex flex-col gap-6">
      <PageHeading>Hexline account</PageHeading>
      <AuthForm mode="reset-password" headingLevel={2} onSubmit={handleSubmit} onModeChange={handleModeChange} />
    </div>
  )
}
