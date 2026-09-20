import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "./auth/auth-middleware";
import {
  createTicket,
  listUserTickets,
  getTicketDetails,
  sendTicketReply,
  type TicketType,
} from "./tickets.server";

const createTicketSchema = z.object({
  requestType: z.enum(["refill", "speed_up", "payment", "other"]),
  orderIds: z.string().max(500).optional(),
  additionalInfo: z.string().max(2000).optional(),
  currentCount: z.number().nullable().optional(),
});

export const createTicketServerFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => createTicketSchema.parse(input))
  .handler(async ({ data, context }) => {
    return createTicket(context.userId, {
      requestType: data.requestType as TicketType,
      orderIds: data.orderIds,
      additionalInfo: data.additionalInfo,
      currentCount: data.currentCount,
    });
  });

export const listMyTicketsServerFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    return listUserTickets(context.userId);
  });

const getTicketSchema = z.object({
  ticketId: z.string().uuid(),
});

export const getTicketDetailsServerFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => getTicketSchema.parse(input))
  .handler(async ({ data, context }) => {
    return getTicketDetails(context.userId, data.ticketId);
  });

const replySchema = z.object({
  ticketId: z.string().uuid(),
  message: z.string().trim().min(1).max(2000),
});

export const sendTicketReplyServerFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => replySchema.parse(input))
  .handler(async ({ data, context }) => {
    return sendTicketReply(context.userId, data.ticketId, data.message);
  });
