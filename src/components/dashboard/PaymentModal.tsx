import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Activity, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

// Make sure to set VITE_STRIPE_PUBLISHABLE_KEY in your .env
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder",
);

function CheckoutForm({
  amount,
  onSuccess,
  onCancel,
}: {
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required", // Avoid redirect to handle success locally
    });

    if (error) {
      toast.error(error.message || "Payment failed");
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      toast.success("Payment successful! Funds are now in escrow.");
      setIsProcessing(false);
      onSuccess();
    } else {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
        <PaymentElement />
      </div>
      <div className="flex gap-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="w-full h-12 text-zinc-400 hover:text-white"
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="btn-primary w-full h-12"
          disabled={isProcessing || !stripe || !elements}
        >
          {isProcessing ? (
            <Activity className="h-5 w-5 animate-spin" />
          ) : (
            `Pay $${amount.toLocaleString()} to Escrow`
          )}
        </Button>
      </div>
      <p className="text-center text-[10px] uppercase tracking-widest text-zinc-500 font-semibold flex items-center justify-center gap-1 mt-4">
        <ShieldCheck className="h-3 w-3 text-emerald-500" />
        Secured by Stripe Connect
      </p>
    </form>
  );
}

export function PaymentModal({
  open,
  amount,
  userId,
  onSuccess,
  onClose,
}: {
  open: boolean;
  amount: number;
  userId: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [clientSecret, setClientSecret] = useState("");

  useEffect(() => {
    if (open && amount > 0) {
      // Fetch payment intent from server
      fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, userId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          } else {
            toast.error("Failed to initialize payment gateway.");
            console.error(data.error);
          }
        })
        .catch((err) => {
          toast.error("Network error while initializing payment.");
          console.error(err);
        });
    } else {
      setClientSecret("");
    }
  }, [open, amount, userId]);

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 p-8 shadow-2xl">
        <DialogHeader className="mb-4">
          <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-2">
            Secure Escrow Checkout
          </p>
          <DialogTitle className="text-2xl font-semibold tracking-tight text-white mt-2">
            Fund Campaign
          </DialogTitle>
        </DialogHeader>

        {clientSecret ? (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: { theme: "night" } }}
          >
            <CheckoutForm
              amount={amount}
              onSuccess={onSuccess}
              onCancel={onClose}
            />
          </Elements>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <Activity className="animate-spin h-6 w-6 text-zinc-500" />
            <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
              Connecting to Stripe...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
