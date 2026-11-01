export class AuthError extends Error {}
export class AuthConfigurationError extends Error {}

export function requiredSecret(name: string) {
  const value = process.env[name]
  if (!value || Buffer.byteLength(value, "utf8") < 32) {
    throw new AuthConfigurationError(
      `Configure ${name} with at least 32 random bytes.`
    )
  }
  return value
}
