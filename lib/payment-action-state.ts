export type PaymentActionState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export const initialPaymentActionState: PaymentActionState = { status: "idle" };
