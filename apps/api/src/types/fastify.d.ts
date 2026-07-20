import "fastify";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    locale: "ko" | "en";
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub?: string;
      role?: "ADMIN" | "GENERAL";
      fileId?: string;
      action?: string;
    };
    user: { sub: string; role: "ADMIN" | "GENERAL" };
  }
}
