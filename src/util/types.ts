import type { Request } from 'express';

export type AuthorizedRequest = Request & { user: { sub: number } };
