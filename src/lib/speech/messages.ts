import { practice, type RefusalReason } from "@/config/practice";

import type { GenerationErrorCode } from "./stream";

const NOT_COUNTED = "This didn't use up a free speech.";

/** What the Create page says when generation stops. */
export function generationErrorMessage(code: GenerationErrorCode, reason?: RefusalReason): string {
  switch (code) {
    case "refused":
      return reason && Object.hasOwn(practice.refusalReasons, reason)
        ? practice.refusalReasons[reason]
        : practice.refusalReasons.not_a_topic;
    case "blocked":
      return `We couldn't write a speech on this topic. Try rephrasing this topic. ${NOT_COUNTED}`;
    case "failed":
      return `Something went wrong while writing your speech. Try rephrasing this topic, or try again in a minute. ${NOT_COUNTED}`;
    case "busy":
      return `We're busy right now, please try again in a minute. ${NOT_COUNTED}`;
    case "free_used":
      return `You've used your ${practice.limits.freeSpeeches} free speeches.`;
    case "daily_limit":
      return "You've reached today's limit of attempts. Please try again tomorrow.";
    case "unavailable":
      return "Writing new speeches isn't available right now. Please try again later.";
    case "invalid":
      return `Please check your topic: it needs ${practice.topic.minLength} to ${practice.topic.maxLength} characters.`;
    case "unauthorized":
      return "Your session has ended. Please sign in again.";
  }
}
