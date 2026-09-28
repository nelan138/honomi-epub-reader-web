export class NotFoundError extends Error {
   readonly entity?: string;

   constructor(
      message: string,
      options?: { entity?: string; cause?: unknown },
   ) {
      super(message, { cause: options?.cause });
      this.name = "NotFoundError";
      this.entity = options?.entity;
   }
}

export class RuntimeError extends Error {
   constructor(message: string, options?: { cause?: unknown }) {
      super(message, options);
      this.name = "RuntimeError";
   }
}
