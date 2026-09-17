export type NativeAuthStage =
  | "firebase_native"
  | "app_check"
  | "firebase_auth"
  | "secure_session"
  | "opsiqo_api";

export class NativeAuthStageError extends Error {
  constructor(
    public readonly stage: NativeAuthStage,
    public readonly code: string,
    message: string,
  ) {
    super(`[${code}] ${message}`);
    this.name = "NativeAuthStageError";
  }
}

export function isNativeAuthStageError(
  error: unknown,
): error is NativeAuthStageError {
  return error instanceof NativeAuthStageError;
}