export = sporadic

export interface SporadicInternalStream<T> {
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

export interface SporadicStream<T> {

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

export type GenericStreamPullStep<T> =
    Promise<SporadicInternalStream<T>>
  | Promise<SporadicStream<T>>
  | SporadicStreamPullStep<T>
  | SporadicStream<T>
  | SporadicInternalStream<T>;

export interface SporadicCoroutine {

}

export interface SporadicCoroutineThis {
  suspend: (value: any) => Promise<any>;
  status: () => Promise<"RUNNING">;
  supplies: () => SporadicStream<any>;
  demands: () => SporadicStream<any>;
}

export interface SporadicChannel<T> {

}

export type SporadicActor<T> = T & {
  kill: () => void;
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
    send: <T>(channel: SporadicChannel<T>, value: T, timeout?: number) => Promise;
    receive: <T>(channel: SporadicChannel<T>, timeout?: number) => Promise<T>;
    sendAfter: <T>(delay: number, channel: SporadicChannel<T>, value: T, timeout?: number) => Promise;
    receiveAfter: <T>(delay: number, channel: SporadicChannel, timeout?: number) => Promise<T>;
    close: <T>(channel: SporadicChannel<T>) => Promise;
    closed: <T>(channel: SporadicChannel<T>) => Promise<boolean>;

  };
  coroutines: {
    resume: (coroutine: SporadicCoroutine, argument?: any) => Promise<any>;
    status: (coroutine: SporadicCoroutine) => Promise<"RUNNING" | "SUSPENDED" | "DEAD">;
    create: (callback: (this: SporadicCoroutineThis, ...arguments: any[]) => any, options?: { streamsMode?: "COLLECT" | "DISABLE" }) => SporadicCoroutine;
    supplies: (coroutine: SporadicCoroutine) => SporadicStream<any>;
    demands: (coroutine: SporadicCoroutine) => SporadicStream<any>;
    complete: (coroutine: SporadicCoroutine) => Promise<any>;

  };
  actors: {
    create: <T extends { }>(object: T) => SporadicActor<T>;

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
