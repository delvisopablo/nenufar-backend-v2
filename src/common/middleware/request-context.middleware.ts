import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export type RequestWithContext = Request & {
  requestId?: string;
};

export function requestContextMiddleware(
  req: RequestWithContext,
  res: Response,
  next: NextFunction,
) {
  const incomingRequestId = req.header('x-request-id');
  const requestId =
    incomingRequestId && incomingRequestId.trim().length > 0
      ? incomingRequestId.trim()
      : randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}
