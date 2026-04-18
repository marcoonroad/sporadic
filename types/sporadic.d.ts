export = sporadic

export interface SporadicStream<T> {
  current: Promise<T>;
  next: Promise<SporadicStream<T>>;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
  produced: boolean;
  broken: boolean;
  stepper: ((value: T) => T) | null;
  pastValue: T | null;
  finalizer: (() => void) | null;
}

export interface SporadicDeferred<T> {
  resolve: (value: T) => void;
  reject: (reason: any) => void;
  promise: Promise<T>;
}

export type SporadicStreamPullStep<T> = Promise<{
  current: T;
  next: SporadicStream<T>;
}>

export type GenericStreamPullStep<T> = Promise<SporadicStream<T>> | SporadicStreamPullStep<T> | SporadicStream<T>

export interface Coroutine {
  suspend: (value: any) => Promise<any>;
  status: (coroutine?: Coroutine) => Promise<"RUNNING">;
  supplies: (coroutine?: Coroutine) => SporadicStream<any>;
  demands: (coroutine?: Coroutine) => SporadicStream<any>;
}

export interface SporadicChannel<T> {

}

export interface SporadicModule {
  streams: {
    open: <T>() => Promise<SporadicStream<T>>;
    reducer: <T>(initial: T, folding: (value: T) => T) => Promise<SporadicStream<T>>;
    push: <T>(stream: SporadicStream<T>, value: T) => Promise<SporadicStream<T>>;
    react: <T>(stream: SporadicStream<T>, callback: (value: T) => Promise) => Promise;
    close: <T>(stream: SporadicStream<T>) => Promise;
    protectedClose: <T>(stream: SporadicStream<T>) => Promise;
    every: (milliseconds: number) => Promise<SporadicStream<boolean>>;
    pull: <T>(stream: SporadicStream<T>) => SporadicStreamPullStep<T>;
    // extractValue: <T>(step: SporadicAsyncStream<T>) => Promise<T>;
    // extractNext: <T>(step: SporadicAsyncStream<T>) => Promise<SporadicStream<T>>;
    filter: <T>(stream: SporadicStream<T>, callback: (value: T) => bool) => SporadicStream<T>;
    map: <T, U>(stream: SporadicStream<T>, callback: (value: T) => U) => SporadicStream<U>;
    merge: <T, U>(left: SporadicStream<T>, right: SporadicStream<U>) => SporadicStream<T | U>;
    paired: <T, U>(left: SporadicStream<T>, right: SporadicStream<U>) => SporadicStream<[ T, U ]>;

  };
  channels: {
    open: <T>() => Promise<SporadicChannel<T>>;
    send: <T>(channel: SporadicChannel<T>, value: T) => Promise;
    receive: <T>(channel: SporadicChannel<T>) => Promise<T>;
    close: <T>(channel: SporadicChannel<T>) => Promise;
    closed: <T>(channel: SporadicChannel<T>) => Promise<boolean>;

  };
  coroutines: {
    resume: (coroutine: Coroutine, argument?: any) => Promise<any>;
    status: (coroutine: Coroutine) => Promise<"RUNNING" | "SUSPENDED">;
    create: (callback: (this: Coroutine, ...arguments: any[]) => any, options?: { streamsMode?: "DISABLE" }) => Coroutine;
    supplies: (coroutine: Coroutine) => SporadicStream<any>;
    demands: (coroutine: Coroutine) => SporadicStream<any>;
    complete: (coroutine: Coroutine) => Promise<any>;

  };
  actors: {

  };
  tasks: {
    spawn: <T>(callback: () => (T | void | Promise<T> | Promise<void>)) => Promise<T | void | null>;
    defer: <T>() => SporadicDeferred<T>;
    ignore: <T>(promise: Promise<T>) => Promise<boolean>;
    delay: (seconds: number) => Promise<number>;
    timeout: (seconds: number) => Promise<never>;
    already: () => Promise<void>;
    never: () => Promise<never>;
  };
};

export declare const sporadic: SporadicModule;
