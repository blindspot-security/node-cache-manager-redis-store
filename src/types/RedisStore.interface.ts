import {Store} from "cache-manager";
import {RedisClientType, RedisDefaultModules, RedisFunctions, RedisModules, RedisScripts} from "redis";
import {ScanReply} from '@redis/client/dist/lib/commands/SCAN';
import {RedisCommandRawReply} from "@redis/client/dist/lib/commands";

export interface RedisStore extends Store {
  isCacheableValue: (value: unknown) => boolean;

  getClient(): RedisClientType<RedisDefaultModules & RedisModules, RedisFunctions, RedisScripts>;

  scan(pattern: string, cursor? :number, count?: number): Promise<ScanReply>;

  atomicGetAndSet(key: string, updateFunction: (val: any) =>  any): Promise<RedisCommandRawReply>;

  flushAll(): Promise<void>

}
