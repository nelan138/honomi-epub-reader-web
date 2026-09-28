export type DeferredPromise<T> = {
   promise: Promise<T>;
   resolve: (value: T | PromiseLike<T>) => void;
   reject: (reason?: unknown) => void;
};
