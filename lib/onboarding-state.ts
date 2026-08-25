export type OnboardingState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const initialOnboardingState: OnboardingState = { status: "idle" };
