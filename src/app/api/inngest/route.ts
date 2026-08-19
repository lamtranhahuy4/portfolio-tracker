import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { updatePricesCron, forexSnapshotCron } from "@/inngest/functions";

// Khởi tạo Inngest API endpoint cho Vercel/Next.js
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    updatePricesCron,
    forexSnapshotCron
  ],
});
