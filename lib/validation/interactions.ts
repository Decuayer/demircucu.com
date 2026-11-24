import { z } from "zod";
import { email, id, optionalText, requiredText } from "./common";

export const COMMENT_MAX_LENGTH = 2000;

export const commentSchema = z.object({
  postId: id,
  content: requiredText(COMMENT_MAX_LENGTH),
});

export const likeSchema = z.object({ postId: id });

/**
 * Contact form. `website` is a honeypot: hidden from people, filled by naive bots. A non-empty
 * value is accepted silently and discarded by the action.
 */
export const contactSchema = z.object({
  name: requiredText(100),
  email,
  subject: optionalText(150),
  message: requiredText(5000).pipe(z.string().min(10, { error: "messageTooShort" })),
  website: z.string().max(200).optional(),
});
